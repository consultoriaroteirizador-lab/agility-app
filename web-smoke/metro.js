// Modo navegador para smoke (EXPO_WEB_SMOKE=1). Ver web-smoke/README.md.
/* global __dirname */
const fs = require('fs');
const path = require('path');

// Modulos nativos sem versao web: na web, o import vira o substituto de stubs/.
const STUBS = {
  'react-native-background-geolocation': 'native-fns.js',
  'react-native-maps': 'native-components.js',
  'expo-maps': 'native-components.js',
  '@maplibre/maplibre-react-native': 'native-components.js',
  'expo-secure-store': 'secure-store.js',
};

module.exports = function applyWebSmoke(config, projectRoot) {
  const nodeModules = path.join(projectRoot, 'node_modules');

  // Worktree com node_modules em juncao: o Metro so serve arquivos dentro das
  // watchFolders, e o bundle de entrada mora fora do projeto.
  if (fs.lstatSync(nodeModules).isSymbolicLink()) {
    const target = fs.readlinkSync(nodeModules);
    if (/^[a-z]:/.test(target)) {
      const fixed = target.replace(/^[a-z]/, (c) => c.toUpperCase());
      throw new Error(
        `[web-smoke] node_modules aponta para "${target}", com o drive em minuscula; o Metro monta ` +
          `"C:\\c:\\..." e falha. Recrie a juncao: cmd /c "rmdir node_modules" e ` +
          `cmd /c "mklink /J node_modules ${fixed}"`,
      );
    }
    config.watchFolders = [...(config.watchFolders || []), fs.realpathSync.native(nodeModules)];
    config.server = { ...config.server, unstable_serverRoot: path.parse(projectRoot).root };
    // O cache padrao e compartilhado por todos os worktrees da juncao e guarda a
    // raiz de rotas de quem compilou antes: o app abria em "Welcome to Expo".
    const { FileStore } = require('metro-cache');
    config.cacheStores = [new FileStore({ root: path.join(projectRoot, '.expo', 'web-smoke-metro-cache') })];
  }

  const previous = config.resolver.resolveRequest;
  config.resolver.resolveRequest = (context, moduleName, platform) => {
    if (platform === 'web') {
      const stubbed = Object.keys(STUBS).find((m) => moduleName === m || moduleName.startsWith(`${m}/`));
      if (stubbed) return { type: 'sourceFile', filePath: path.join(__dirname, 'stubs', STUBS[stubbed]) };
    }
    return previous ? previous(context, moduleName, platform) : context.resolveRequest(context, moduleName, platform);
  };

  return config;
};
