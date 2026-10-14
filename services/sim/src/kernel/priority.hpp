#pragma once

#include <cstdint>

namespace sim::kernel {

enum class priority : std::uint8_t {
  system = 0,
  handshake = 1,
  fault = 2,
  completion = 3,
  arrival = 4,
  normal = 5,
};

}
