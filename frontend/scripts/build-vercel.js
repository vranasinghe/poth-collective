// Vercel previews may not inherit Production-scoped variables. This public
// showcase endpoint is safe to embed; explicit settings always take priority.
const { spawnSync } = require('node:child_process');
const path = require('node:path');

if (process.env.VERCEL_ENV === 'preview' && !process.env.EXPO_PUBLIC_API_URL) {
  process.env.EXPO_PUBLIC_API_URL = 'https://poth-collective.onrender.com';
  console.log('Preview build: using the public Poth Collective API origin.');
}

require('./validate-build-env');
if (process.argv.includes('--validate-only')) process.exit(0);

const result = spawnSync(process.execPath, [
  path.join(__dirname, '../node_modules/expo/bin/cli'), 'export', '--platform', 'web'
], { stdio: 'inherit', env: process.env });
if (result.error) console.error(result.error.message);
process.exit(result.status ?? 1);
