#pragma once

#include "kernel/event.hpp"

#include <algorithm>
#include <cassert>
#include <cstddef>
#include <vector>

namespace sim::kernel {

class event_queue {
public:
  void reserve(std::size_t n) { _heap.reserve(n); }

  void push(const event &e) {
    _heap.push_back(e);
    sift_up(_heap.size() - 1);
  }

  event pop() {
    assert(!empty());
    const event result = _heap.front();
    const event last = _heap.back();

    _heap.pop_back();
    if (!_heap.empty()) {
      _heap.front() = last;
      sift_down(0);
    }

    return result;
  }

  const event &top() const noexcept {
    assert(!empty());
    return _heap.front();
  }

  void clear() noexcept { _heap.clear(); }

  bool empty() const noexcept { return _heap.empty(); }

  std::size_t size() const noexcept { return _heap.size(); }

private:
  static constexpr std::size_t arity = 4;

  std::vector<event> _heap;

  void sift_up(std::size_t i) noexcept {
    const event e = _heap[i];
    while (i > 0) {
      const std::size_t parent = (i - 1) / arity;
      if (!fires_before(e, _heap[parent]))
        break;

      _heap[i] = _heap[parent];
      i = parent;
    }

    _heap[i] = e;
  }

  void sift_down(std::size_t i) noexcept {
    const std::size_t n = _heap.size();
    const event e = _heap[i];

    for (;;) {
      const std::size_t first = arity * i + 1;
      if (first >= n)
        break;

      std::size_t best = first;
      std::size_t end = std::min(first + arity, n);
      for (std::size_t c = first + 1; c < end; ++c)
        if (fires_before(_heap[c], _heap[best]))
          best = c;

      if (!fires_before(_heap[best], e))
        break;

      _heap[i] = _heap[best];
      i = best;
    }

    _heap[i] = e;
  }
};

} // namespace sim::kernel
