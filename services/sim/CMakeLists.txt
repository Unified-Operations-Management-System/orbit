cmake_minimum_required(VERSION 3.25)

project(orbit_sim VERSION 0.1.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 23)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)
set(CMAKE_EXPORT_COMPILE_COMMANDS ON)

if(NOT CMAKE_BUILD_TYPE AND NOT CMAKE_CONFIGURATION_TYPES)
  set(CMAKE_BUILD_TYPE Release CACHE STRING "Build type" FORCE)
endif()

add_library(sim_warnings INTERFACE)
if(MSVC)
  target_compile_options(sim_warnings INTERFACE /W4 /permissive-)
else()
  target_compile_options(sim_warnings INTERFACE -Wall -Wextra -Wpedantic -Wconversion -Wshadow)
endif()

add_subdirectory(src)

option(SIM_BUILD_TESTS "Build simulator tests" ON)
if(SIM_BUILD_TESTS)
  enable_testing()
  add_subdirectory(tests)
endif()
