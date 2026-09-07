module.exports = {
  dependencies: {
    // This alias only supplies Reanimated 3.6 JavaScript sources to the
    // Harmony adapter. Never autolink its Android or iOS native projects.
    'react-native-reanimated-harmony-compat': {
      platforms: {
        android: null,
        ios: null,
      },
    },
  },
};
