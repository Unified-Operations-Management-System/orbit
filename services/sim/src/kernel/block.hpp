#pragma once

#include "kernel/context.hpp"
#include "kernel/event.hpp"

#include <cstddef>

namespace sim::kernel {

class block {
public:
  block() = default;
  virtual ~block() = default;

  block(const block &) = delete;
  block &operator=(const block &) = delete;

  virtual void init(context &ctx) = 0;
  virtual void handle(context &ctx, const event &e) = 0;
  virtual void finish(context &ctx) = 0;

  virtual std::size_t channel_count() const noexcept { return 0; }
};

} // namespace sim::kernel
