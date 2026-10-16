#include "kernel/kernel.hpp"
#include "kernel/event.hpp"
#include "kernel/run_result.hpp"

#include <cstddef>
#include <cstdint>
#include <utility>
#include <vector>

namespace sim::kernel {

kernel::kernel(kernel_config config) : _config(config) {
  _queue.reserve(_config.queue_reserve);
  _recent.resize(_config.recent_event_capacity);
}

block_id kernel::add_block(std::unique_ptr<block> blk) {
  if (_ran)
    throw std::logic_error("kernel::add_block() called after run()");

  if (!blk)
    throw std::invalid_argument("kernel::add_block() called with nullptr");

  const std::size_t channels = blk->channel_count();
  if (channels >= no_channel)
    throw std::invalid_argument(
        "block::channel_count() must be less than no_channel");

  const auto id = static_cast<block_id>(_slots.size());
  const std::size_t offset = _generations.size();
  _generations.resize(offset + channels, generation{0});
  _slots.push_back(slot{std::move(blk), context{*this, id}, offset, channels});
  return id;
}

void kernel::schedule(block_id from, block_id target, sim_time delay,
                      event_kind kind, payload data, schedule_options opts) {
  (void)from;

  if (delay < 0)
    throw model_error("kernel::schedule() called with negative delay");

  if (target >= _slots.size())
    throw model_error("kernel::schedule() called with invalid target block_id");

  if (delay > std::numeric_limits<sim_time>::max() - _now)
    throw model_error("kernel::schedule() delay would overflow sim_time");

  generation gen = 0;
  if (opts.chan != no_channel) {
    const slot &target_slot = _slots[target];
    if (opts.chan >= target_slot.channel_count)
      throw model_error("kernel::schedule() called with invalid channel");

    gen = _generations[target_slot.gen_offset + opts.chan];
  }

  _queue.push(event{
      .time = _now + delay,
      .seq = _next_seq++,
      .data = data,
      .target = target,
      .gen = gen,
      .kind = kind,
      .prio = opts.prio,
      .chan = opts.chan,
  });
}

void kernel::cancel(block_id self, channel chan) {
  const slot &current_slot = _slots[self];
  if (chan >= current_slot.channel_count)
    throw model_error("kernel::cancel() called with invalid channel");

  ++_generations[current_slot.gen_offset + chan];
}

void kernel::request_stop(block_id from, std::string_view reason) {
  (void)from;

  if (_stop_requested)
    return;

  _stop_requested = true;
  _stop_detail = reason;
}

run_result kernel::run() {
  if (_ran)
    throw std::logic_error("kernel::run() called more than once");

  _ran = true;
  run_result result;
  bool failed = false;

  auto fail = [&](std::string msg) {
    if (failed)
      return;

    failed = true;
    result.reason = stop_reason::model_error;
    result.detail = std::move(msg);
  };

  auto guarded = [&](auto &&call) {
    try {
      call();
    } catch (const model_error &e) {
      fail(e.what());
    } catch (const std::exception &e) {
      fail(e.what());
    } catch (...) {
      fail("unknown exception");
    }
  };

  for (std::size_t i = 0; i < _slots.size(); ++i) {
    if (failed)
      break;

    slot &s = _slots[i];
    guarded([&]() { s.instance->init(s.ctx); });
  }

  std::uint64_t tick_events = 0;
  while (!failed) {
    if (_stop_requested) {
      result.reason = stop_reason::requested;
      result.detail = _stop_detail;
      break;
    }

    if (_queue.empty()) {
      result.reason = stop_reason::queue_empty;
      break;
    }

    const event e = _queue.pop();
    if (_is_stale(e)) {
      ++_stats.stale_discarded;
      continue;
    }

    if (e.time > _now) {
      _now = e.time;
      tick_events = 0;
    }

    _record_recent(e);
    if (++tick_events > _config.tick_event_cap) {
      result.reason = stop_reason::tick_storm;
      result.detail = "tick event cap exceeded";
      result.recent_events = _collect_recent();
      break;
    }

    slot &s = _slots[e.target];
    guarded([&]() { s.instance->handle(s.ctx, e); });
    ++_stats.events_dispatched;
  }

  for (std::size_t i = 0; i < _slots.size(); ++i) {
    slot &s = _slots[i];
    guarded([&]() { s.instance->finish(s.ctx); });
  }

  _stats.final_time = _now;
  result.stats = _stats;
  return result;
}

bool kernel::_is_stale(const event &e) const noexcept {
  if (e.chan == no_channel)
    return false;

  return e.gen != _generations[_slots[e.target].gen_offset + e.chan];
}

void kernel::_record_recent(const event &e) noexcept {
  if (_recent.empty())
    return;

  _recent[_recent_next] = recent_event{e.time, e.target, e.kind};
  _recent_next = (_recent_next + 1) % _recent.size();
  if (_recent_count < _recent.size())
    ++_recent_count;
}

std::vector<recent_event> kernel::_collect_recent() const {
  std::vector<recent_event> out;
  out.reserve(_recent_count);

  const std::size_t start = (_recent_next + _recent.size() - _recent_count) %
                            (_recent.empty() ? 1 : _recent.size());
  for (std::size_t i = 0; i < _recent_count; ++i)
    out.push_back(_recent[(start + i) % _recent.size()]);

  return out;
}

} // namespace sim::kernel
