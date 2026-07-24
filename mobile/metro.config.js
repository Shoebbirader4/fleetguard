const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Enable symlinks for monorepo setup
config.watchFolders = [
  path.resolve(__dirname, '../shared'),
];

// Add support for .cjs files
config.resolver.sourceExts.push('cjs');

// Configure Metro for WatermelonDB
config.transformer.getTransformOptions = async () => ({
  transform: {
    experimentalImportSupport: false,
    inlineRequires: true,
  },
});

module.exports = config;
