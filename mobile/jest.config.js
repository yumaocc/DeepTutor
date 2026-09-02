module.exports = {
  preset: 'react-native',
  transformIgnorePatterns: [
    'node_modules/(?!(?:\\.pnpm/)?(?:(jest-)?react-native|@react-native(?:\\+|/)|@assistant-ui(?:\\+|/)|assistant-stream|nanoid|zustand))',
  ],
};
