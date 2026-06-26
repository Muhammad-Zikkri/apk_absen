module.exports = {
  preset: 'react-native',
  setupFiles: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@react-native-async-storage/async-storage$':
      '@react-native-async-storage/async-storage/jest/async-storage-mock',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(@react-native|react-native|react-native-gesture-handler|react-native-reanimated|react-native-safe-area-context|react-native-screens|@react-navigation)/)',
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
};
