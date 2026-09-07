module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    '@babel/plugin-transform-export-namespace-from',
    // Reanimated must stay last so worklet transforms see the final AST.
    'react-native-reanimated/plugin',
  ],
};
