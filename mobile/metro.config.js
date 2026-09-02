const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');
const {
  createHarmonyMetroConfig,
} = require('@react-native-oh/react-native-harmony/metro.config');

/**
 * Metro configuration
 * https://facebook.github.io/metro/docs/configuration
 *
 * @type {import('metro-config').MetroConfig}
 */
const config = {
  resolver: {
    // Assistant UI publishes React Native-safe subpath exports such as
    // `@assistant-ui/core/react`. Metro 0.76 keeps package exports disabled by
    // default, so RN 0.72 needs this compatibility switch.
    unstable_enablePackageExports: true,
  },
};

module.exports = mergeConfig(
  getDefaultConfig(__dirname),
  createHarmonyMetroConfig({
    reactNativeHarmonyPackageName: '@react-native-oh/react-native-harmony',
  }),
  config,
);
