add_executable(sim_cli main.cpp)
set_target_properties(sim_cli PROPERTIES OUTPUT_NAME sim)
target_link_libraries(sim_cli PRIVATE sim::kernel sim_warnings)
