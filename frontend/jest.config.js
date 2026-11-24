module.exports = {
    preset: 'jest-expo',
    testMatch: ['<rootDir>/src/**/__tests__/**/*.test.(ts|tsx)'],
    // The Expo preset already transpiles React Native and Expo packages; font packages ship ESM too
    transformIgnorePatterns: [
        'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg))'
    ]
};
