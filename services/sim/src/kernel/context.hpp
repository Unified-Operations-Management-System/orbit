#pragma once

#include "kernel/event.hpp"
#include "kernel/priority.hpp"
#include <string_view>

namespace sim::kernel {

struct schedule_options {
  priority prio{priority::normal};
  channel chan{no_channel};
};

class services {
public:
  virtual ~services() = default;

  virtual sim_time now() const noexcept = 0;

  virtual void schedule(block_id from, block_id target, sim_time delay,
                        event_kind kind, payload data,
                        schedule_options opts) = 0;

  virtual void cancel(block_id self, channel chan) = 0;

  virtual void request_stop(block_id from, std::string_view reason) = 0;
};

class context {
public:
  context(services &services, block_id self) noexcept
      : _services(&services), _self(self) {}

  void schedule(block_id target, sim_time delay, event_kind kind,
                payload data = {}, schedule_options opts = {}) {
    _services->schedule(_self, target, delay, kind, data, opts);
  }

  void schedule_self(sim_time delay, event_kind kind, payload data = {},
                     schedule_options opts = {}) {
    _services->schedule(_self, _self, delay, kind, data, opts);
  }

  block_id self() const noexcept { return _self; }

  sim_time now() const noexcept { return _services->now(); }

private:
  services *_services;
  block_id _self;
};

} // namespace sim::kernel
