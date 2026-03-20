module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      'react-compiler',

      'react-native-worklets/plugin',
    ],
  };
};
