const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const validate = (target, api) => {
  const env = { ...process.env, VERCEL_ENV: target };
  delete env.EXPO_PUBLIC_API_URL;
  if (api !== undefined) env.EXPO_PUBLIC_API_URL = api;
  return spawnSync(process.execPath, [path.join(__dirname, 'build-vercel.js'), '--validate-only'], {
    env, encoding: 'utf8'
  });
};

test('preview builds without the Production variable use the public showcase API', () => {
  const result = validate('preview');
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /using the public Poth Collective API origin/);
});

test('explicit API settings take priority in previews and production', () => {
  for (const target of ['preview', 'production']) {
    const result = validate(target, 'https://custom-api.example');
    assert.equal(result.status, 0, result.stderr);
    assert.doesNotMatch(result.stdout, /using the public/);
  }
});

test('production still requires an explicit API origin', () => {
  assert.equal(validate('production').status, 1);
});

test('invalid explicit settings fail rather than silently selecting another API', () => {
  for (const api of ['http://localhost:5000', 'https://api.example/api', 'not-a-url']) {
    assert.equal(validate('preview', api).status, 1, api);
  }
});
