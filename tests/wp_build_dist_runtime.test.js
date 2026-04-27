import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  createBuildDistHelpText,
  createBuildDistSuccessMessage,
  parseBuildDistArgs,
  resolveBuildDistPaths,
} from '../tools/wp_build_dist_state.js';
import { copyStaticDistAssets } from '../tools/wp_build_dist_assets.js';
import { runBuildDistFlow } from '../tools/wp_build_dist_flow.js';

function tempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'wp-build-dist-'));
}

test('build-dist args parsing keeps clean/assets/help/unknown policy', () => {
  assert.deepEqual(parseBuildDistArgs(['--no-clean', '--no-assets', '--tsconfig', 'foo.json', '--wat']), {
    clean: false,
    assets: false,
    tsconfig: 'foo.json',
    help: false,
    unknownOptions: ['--wat'],
  });

  assert.deepEqual(parseBuildDistArgs(['--help']), {
    clean: true,
    assets: true,
    tsconfig: 'tsconfig.dist.json',
    help: true,
    unknownOptions: [],
  });

  assert.match(createBuildDistHelpText(), /WardrobePro dist builder/);
  assert.match(createBuildDistSuccessMessage({ assets: false }), /dist\/esm \+ dist\/types$/);
});

test('build-dist path resolution stays rooted under project dist', () => {
  const root = '/tmp/example-root';
  const out = resolveBuildDistPaths({ root, tsconfig: 'tsconfig.dist.json' });
  assert.equal(out.root, root);
  assert.equal(out.distAbs, path.join(root, 'dist'));
  assert.equal(out.distEsmAbs, path.join(root, 'dist', 'esm'));
  assert.equal(out.entryAbs, path.join(root, 'dist', 'esm', 'main.js'));
  assert.equal(out.tsBuildInfoAbs, path.join(root, 'dist', '.tsconfig.dist.tsbuildinfo'));
});

test('static asset copy mirrors html/runtime/public assets into dist', () => {
  const root = tempDir();
  const distAbs = path.join(root, 'dist');
  fs.mkdirSync(distAbs, { recursive: true });

  fs.writeFileSync(path.join(root, 'index_pro.html'), '<html></html>\n', 'utf8');
  fs.mkdirSync(path.join(root, 'css'), { recursive: true });
  fs.writeFileSync(path.join(root, 'css', 'app.css'), 'body{}\n', 'utf8');
  fs.mkdirSync(path.join(root, 'libs'), { recursive: true });
  fs.writeFileSync(path.join(root, 'libs', 'vendor.js'), 'export {};\n', 'utf8');
  fs.mkdirSync(path.join(root, 'docs'), { recursive: true });
  fs.writeFileSync(path.join(root, 'docs', 'guide.md'), '# hi\n', 'utf8');
  fs.mkdirSync(path.join(root, 'public', 'img'), { recursive: true });
  fs.writeFileSync(path.join(root, 'public', 'img', 'logo.png'), 'png', 'utf8');
  fs.writeFileSync(path.join(root, 'wp_logo_data.js'), 'export const logo = 1;\n', 'utf8');
  fs.writeFileSync(path.join(root, 'wp_runtime_config.mjs'), 'export default {};\n', 'utf8');

  copyStaticDistAssets({ root, distAbs });

  assert.equal(fs.readFileSync(path.join(distAbs, 'index_pro.html'), 'utf8'), '<html></html>\n');
  assert.equal(fs.readFileSync(path.join(distAbs, 'css', 'app.css'), 'utf8'), 'body{}\n');
  assert.equal(fs.readFileSync(path.join(distAbs, 'libs', 'vendor.js'), 'utf8'), 'export {};\n');
  assert.equal(fs.readFileSync(path.join(distAbs, 'docs', 'guide.md'), 'utf8'), '# hi\n');
  assert.equal(fs.readFileSync(path.join(distAbs, 'img', 'logo.png'), 'utf8'), 'png');
  assert.equal(fs.readFileSync(path.join(distAbs, 'wp_logo_data.js'), 'utf8'), 'export const logo = 1;\n');
  assert.equal(fs.readFileSync(path.join(distAbs, 'wp_runtime_config.mjs'), 'utf8'), 'export default {};\n');
});

test('static asset copy keeps repository tests out of dist outputs', () => {
  const root = tempDir();
  const distAbs = path.join(root, 'dist');
  fs.mkdirSync(distAbs, { recursive: true });

  fs.writeFileSync(path.join(root, 'index_pro.html'), '<html></html>\n', 'utf8');
  fs.mkdirSync(path.join(root, 'tests', 'e2e', 'helpers'), { recursive: true });
  fs.writeFileSync(
    path.join(root, 'tests', 'e2e', 'authoring_builds.spec.ts'),
    'test("x", () => {});\n',
    'utf8'
  );
  fs.writeFileSync(path.join(root, 'tests', 'e2e', 'helpers', 'project_flows.ts'), 'export {};\n', 'utf8');

  copyStaticDistAssets({ root, distAbs });

  assert.equal(fs.existsSync(path.join(distAbs, 'tests')), false);
  assert.equal(fs.existsSync(path.join(distAbs, 'e2e')), false);
});

test('build-dist retries once without tsbuildinfo when incremental build misses entry', () => {
  const root = tempDir();
  const tsconfigAbs = path.join(root, 'tsconfig.dist.json');
  fs.writeFileSync(tsconfigAbs, '{"compilerOptions":{}}\n', 'utf8');
  fs.mkdirSync(path.join(root, 'node_modules', 'typescript', 'bin'), { recursive: true });
  fs.writeFileSync(
    path.join(root, 'node_modules', 'typescript', 'bin', 'tsc'),
    '#!/usr/bin/env node\n',
    'utf8'
  );
  fs.mkdirSync(path.join(root, 'esm'), { recursive: true });
  fs.writeFileSync(path.join(root, 'esm', 'probe.mjs'), 'export {};\n', 'utf8');
  fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
  fs.writeFileSync(path.join(root, 'dist', '.tsconfig.dist.tsbuildinfo'), 'stale\n', 'utf8');

  const logs = [];
  const warns = [];
  let calls = 0;
  const result = runBuildDistFlow({
    root,
    args: parseBuildDistArgs(['--no-assets']),
    log: msg => logs.push(msg),
    warn: (...msg) => warns.push(msg.join(' ')),
    spawnImpl() {
      calls += 1;
      if (calls === 1) {
        fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
        fs.writeFileSync(path.join(root, 'dist', '.tsconfig.dist.tsbuildinfo'), 'retry-me\n', 'utf8');
      }
      if (calls === 2) {
        fs.mkdirSync(path.join(root, 'dist', 'esm'), { recursive: true });
        fs.writeFileSync(path.join(root, 'dist', 'esm', 'main.js'), 'export {};\n', 'utf8');
      }
      return { status: 0 };
    },
  });

  assert.equal(calls, 2);
  assert.equal(fs.existsSync(path.join(root, 'dist', '.tsconfig.dist.tsbuildinfo')), false);
  assert.equal(fs.readFileSync(path.join(root, 'dist', 'esm', 'probe.mjs'), 'utf8'), 'export {};\n');
  assert.match(result.successMessage, /dist\/esm \+ dist\/types/);
  assert.ok(logs.some(line => /Building dist modules/.test(line)));
  assert.ok(warns.some(line => /retrying once without tsbuildinfo/i.test(line)));
});
