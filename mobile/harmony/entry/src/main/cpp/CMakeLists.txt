project(deeptutor_rnoh_app)
cmake_minimum_required(VERSION 3.4.1)

set(CMAKE_SKIP_BUILD_RPATH TRUE)
set(RNOH_APP_DIR "${CMAKE_CURRENT_SOURCE_DIR}")
set(OH_MODULES "${CMAKE_CURRENT_SOURCE_DIR}/../../../oh_modules")
set(RNOH_CPP_DIR "${OH_MODULES}/@rnoh/react-native-openharmony/src/main/cpp")
set(CMAKE_ASM_FLAGS "-Wno-error=unused-command-line-argument -Qunused-arguments")
set(CMAKE_CXX_FLAGS "-fstack-protector-strong -Wl,-z,relro,-z,now,-z,noexecstack -s -fPIE -pie")

add_compile_definitions(WITH_HITRACE_SYSTRACE)
set(WITH_HITRACE_SYSTRACE 1)

add_subdirectory("${RNOH_CPP_DIR}" ./rn)
add_subdirectory(
  "${OH_MODULES}/@react-native-oh-tpl/async-storage/src/main/cpp"
  ./async-storage
)
add_subdirectory(
  "${OH_MODULES}/@react-native-oh-tpl/netinfo/src/main/cpp"
  ./netinfo
)
add_subdirectory(
  "${OH_MODULES}/@react-native-oh-tpl/react-native-gesture-handler/src/main/cpp"
  ./gesture-handler
)
add_subdirectory(
  "${OH_MODULES}/@react-native-oh-tpl/react-native-reanimated/src/main/cpp"
  ./reanimated
)
add_subdirectory(
  "${OH_MODULES}/@react-native-oh-tpl/react-native-safe-area-context/src/main/cpp"
  ./safe-area
)

add_library(rnoh_app SHARED
  "./PackageProvider.cpp"
  "${RNOH_CPP_DIR}/RNOHAppNapiBridge.cpp"
)

target_link_libraries(rnoh_app PUBLIC
  rnoh
  rnoh_async_storage
  rnoh_netinfo
  rnoh_gesture_handler
  rnoh_reanimated
  rnoh_safe_area
)
