add_library(sim_kernel STATIC kernel.cpp)
add_library(sim::kernel ALIAS sim_kernel)

target_include_directories(sim_kernel PUBLIC ${CMAKE_CURRENT_SOURCE_DIR}/..)

target_compile_features(sim_kernel PUBLIC cxx_std_23)
target_link_libraries(sim_kernel PRIVATE sim_warnings)
