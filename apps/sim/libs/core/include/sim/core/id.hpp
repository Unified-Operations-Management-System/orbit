#include <cstdint>

namespace sim::core {

template <class Tag> struct id {
  std::uint32_t value;
};

template <class Tag> struct gen_id {
  std::uint32_t index : 24;
  std::uint32_t gen : 8;
};

} // namespace sim::core
