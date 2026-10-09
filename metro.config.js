const { getDefaultConfig } = require('expo/metro-config');


const config = getDefaultConfig(__dirname);

const { transformer, resolver } = config;

config.transformer = {
  ...transformer,
  babelTransformerPath: require.resolve('react-native-svg-transformer'),
};
config.resolver = {
  ...resolver,
  assetExts: resolver.assetExts.filter(ext => ext !== 'svg'),
  sourceExts: [...resolver.sourceExts, 'svg'],
};

// Smoke no navegador (npm run web:smoke): ver web-smoke/README.md.
if (process.env.EXPO_WEB_SMOKE === '1') require('./web-smoke/metro')(config, __dirname);

module.exports = config
