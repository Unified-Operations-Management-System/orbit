#include <array>
#include <cstdint>
#include <optional>
#include <string_view>

namespace sim::model {

struct stable_id {
  std::array<std::uint8_t, 16> bytes{};
  auto operator<=>(const stable_id &) const = default;

  static std::optional<stable_id> parse(std::string_view s);
  std::string to_string() const;
};

template <class Rng> stable_id make_stable_id(std::uint64_t unix_ms, Rng &rng) {
  stable_id id;
  const std::uint64_t a = rng();
  const std::uint64_t b = rng();

  for (int i = 0; i < 6; ++i)
    id.bytes[i] = std::uint8_t(unix_ms >> (8 * (5 - i)));

  id.bytes[6] = 0x70 | std::uint8_t(a & 0x0F);
  id.bytes[7] = std::uint8_t(a >> 4);
  id.bytes[8] = 0x80 | std::uint8_t(b & 0x3F);

  for (int i = 0; i < 7; ++i)
    id.bytes[9 + i] = std::uint8_t(b >> (6 + 8 * i));

  return id;
}

} // namespace sim::model
