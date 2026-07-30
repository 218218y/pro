import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { resolveOriginStores } from '../tools/wp_cloud_sync_origin_config.mjs';
import { resolveNpmRunInvocation } from '../tools/wp_start_dev_pair.mjs';

function read(file) {
  return readFileSync(file, 'utf8');
}

test('local main and site2 use fixed distinct browser origins', () => {
  const pkg = JSON.parse(read('package.json'));
  const pair = read('tools/wp_start_dev_pair.mjs');

  assert.match(pkg.scripts['start:local'], /--host localhost --port 5173 --strictPort/u);
  assert.match(pkg.scripts['start:local'], /--open \/index_pro\.html/u);
  assert.match(pkg.scripts['start:site2'], /--host localhost --port 5174 --strictPort/u);
  assert.match(pkg.scripts['start:site2'], /--open \/index_site2\.html/u);
  assert.equal(pkg.scripts['start:pair'], 'node tools/wp_start_dev_pair.mjs');
  assert.match(pkg.scripts['start:e2e'], /--host 127\.0\.0\.1 --port 5175 --strictPort/u);
  assert.match(pair, /start\('start:local'/u);
  assert.match(pair, /start\('start:site2'/u);
  assert.doesNotMatch(pair, /npm\.cmd/u);
});

test('dev pair launches npm scripts safely on Windows across supported Node lines', () => {
  assert.deepEqual(
    resolveNpmRunInvocation('start:local', {
      platform: 'win32',
      execPath: 'C:\\Program Files\\nodejs\\node.exe',
      env: {
        npm_execpath: 'C:\\Program Files\\nodejs\\node_modules\\npm\\bin\\npm-cli.js',
      },
    }),
    {
      command: 'C:\\Program Files\\nodejs\\node.exe',
      args: ['C:\\Program Files\\nodejs\\node_modules\\npm\\bin\\npm-cli.js', 'run', 'start:local'],
    }
  );

  assert.deepEqual(
    resolveNpmRunInvocation('start:site2', {
      platform: 'win32',
      execPath: 'C:\\Program Files\\nodejs\\node.exe',
      env: { ComSpec: 'C:\\Windows\\System32\\cmd.exe' },
    }),
    {
      command: 'C:\\Windows\\System32\\cmd.exe',
      args: ['/d', '/s', '/c', 'npm run start:site2'],
    }
  );
});

test('Cloud Sync origin config keeps production and development mappings in one validated source', () => {
  assert.deepEqual(resolveOriginStores('production'), {
    'https://pro.bargig-furniture.com': 'bargig',
    'https://pro218.bargig-furniture.com': 'bargig',
  });
  assert.deepEqual(resolveOriginStores('development'), {
    'https://pro.bargig-furniture.com': 'bargig',
    'https://pro218.bargig-furniture.com': 'bargig',
    'http://localhost:5173': 'bargig',
    'http://localhost:5174': 'bargig',
  });
});

test('origin-only helper cannot rotate room credentials and deploy uses the same origin source', () => {
  const helper = read('tools/wp_supabase_cloud_sync_origins.ps1');
  const deploy = read('tools/wp_supabase_cloud_sync_deploy.ps1');

  assert.match(helper, /wp_cloud_sync_origin_config\.mjs/u);
  assert.match(helper, /WP_CLOUD_SYNC_ORIGIN_STORES/u);
  assert.match(helper, /ValidateSet\('Development', 'Production'\)/u);
  assert.doesNotMatch(helper, /WP_CLOUD_SYNC_ROOM_TOKEN_SECRET/u);
  assert.match(helper, /--env-file/u);
  assert.match(helper, /UTF8Encoding/u);
  assert.doesNotMatch(helper, /secrets set[^]*WP_CLOUD_SYNC_ORIGIN_STORES=\$originStoresJson/u);
  assert.match(deploy, /wp_cloud_sync_origin_config\.mjs/u);
  assert.match(deploy, /--environment' 'production/u);
  assert.match(deploy, /--env-file/u);
  assert.match(deploy, /UTF8Encoding/u);
  assert.doesNotMatch(deploy, /WP_CLOUD_SYNC_ORIGIN_STORES=\{"https:\/\/pro\./u);
});
