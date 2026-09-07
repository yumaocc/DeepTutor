const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');
const {
  createHarmonyMetroConfig,
} = require('@react-native-oh/react-native-harmony/metro.config');

const harmonyConfig = createHarmonyMetroConfig({
  reactNativeHarmonyPackageName: '@react-native-oh/react-native-harmony',
});
const resolveHarmonyRequest = harmonyConfig.resolver.resolveRequest;

// The published Harmony Reanimated port is based on Reanimated 3.6, while
// Android/iOS on RN 0.77 require 3.16. Redirect only the Harmony port's
// internal source imports to a separately installed 3.6 compatibility copy.
harmonyConfig.resolver.resolveRequest = (context, moduleName, platform) => {
  if (
    context.originModulePath.includes(
      '@react-native-oh-tpl/react-native-reanimated',
    ) &&
    moduleName.startsWith('react-native-reanimated/')
  ) {
    return context.resolveRequest(
      context,
      moduleName.replace(
        'react-native-reanimated',
        'react-native-reanimated-harmony-compat',
      ),
      platform,
    );
  }

  return resolveHarmonyRequest(context, moduleName, platform);
};

/**
 * Metro configuration
 * https://facebook.github.io/metro/docs/configuration
 *
 * @type {import('metro-config').MetroConfig}
 */
const config = {
  resolver: {
    // Assistant UI publishes React Native-safe subpath exports such as
    // `@assistant-ui/core/react`, so Metro must honor package exports.
    unstable_enablePackageExports: true,
  },
};

module.exports = mergeConfig(
  getDefaultConfig(__dirname),
  harmonyConfig,
  config,
);
