#pragma once

#include "kernel/event.hpp"

#include <cstdint>
#include <string>
#include <vector>

namespace sim::kernel {

enum class stop_reason {
  queue_empty,
  end_time,
  requested,
  tick_storm,
  model_error,
};

struct recent_event {
  sim_time time{};
  block_id target{};
  event_kind kind{};
};

struct run_stats {
  std::uint64_t events_dispatched{0};
  std::uint64_t stale_discarded{0};
  sim_time final_time{0};
};

struct run_result {
  stop_reason reason{stop_reason::queue_empty};
  std::string detail;
  run_stats stats;
  std::vector<recent_event> recent_events;
};

} // namespace sim::kernel
