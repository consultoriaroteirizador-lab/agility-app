// npm run web:smoke [-- --clear]: sobe o app no navegador com os substitutos de web-smoke/.
const { spawnSync } = require('child_process');

const port = process.env.PORT || '8095';
const result = spawnSync('npx', ['expo', 'start', '--web', '--port', port, ...process.argv.slice(2)], {
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, EXPO_WEB_SMOKE: '1', BROWSER: process.env.BROWSER || 'none' },
});
process.exit(result.status ?? 1);
