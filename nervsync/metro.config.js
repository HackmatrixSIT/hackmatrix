const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// tfjs-react-native depends on some native modules that are not available in Expo Go
// We mock them if they are not used or resolve to empty
config.resolver.extraNodeModules = {
    'react-native-fs': require.resolve('noop-logger'), // or just a dummy
    '@react-native-async-storage/async-storage': require.resolve('@react-native-async-storage/async-storage'),
};

// Ensure we ignore the problematic sub-packages if necessary
config.resolver.blacklistRE = /node_modules\/.*\/node_modules\/react-native-fs\/.*/;

module.exports = config;
