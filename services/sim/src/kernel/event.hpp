#pragma once

#include "kernel/priority.hpp"

#include <compare>
#include <cstdint>
#include <limits>
#include <type_traits>

namespace sim::kernel {

using sim_time = std::int64_t;
using block_id = std::uint32_t;
using event_kind = std::uint16_t;
using sequence = std::uint64_t;
using generation = std::uint32_t;
using channel = std::uint8_t;

inline constexpr sim_time micros_per_second = 1'000'000;
inline constexpr channel no_channel = std::numeric_limits<channel>::max();

struct payload {
  std::uint64_t a{};
  std::uint64_t b{};
};

struct event {
  sim_time time{};
  sequence seq{};
  payload data{};
  block_id target{};
  generation gen{};
  event_kind kind{};
  priority prio{priority::normal};
  channel chan{no_channel};
};

constexpr std::strong_ordering order(const event &lhs,
                                     const event &rhs) noexcept {
  if (const auto c = lhs.time <=> rhs.time; c != 0)
    return c;

  if (const auto c = lhs.prio <=> rhs.prio; c != 0)
    return c;

  return lhs.seq <=> rhs.seq;
}

constexpr bool fires_before(const event &lhs, const event &rhs) noexcept {
  return order(lhs, rhs) < 0;
}

static_assert(std::is_trivially_copyable_v<event>);
static_assert(sizeof(event) <= 48);

} // namespace sim::kernel
