add_library(sim_kernel INTERFACE)
add_library(sim::kernel ALIAS sim_kernel)

target_include_directories(sim_kernel INTERFACE ${CMAKE_CURRENT_SOURCE_DIR}/..)

target_compile_features(sim_kernel INTERFACE cxx_std_23)
