import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const readJson = relative => JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8'));

function assertLockEntry(manifestEntry, expectedVersion, packages) {
  const lockEntry = packages[manifestEntry.lockPath];
  assert.ok(lockEntry, `${manifestEntry.lockPath} must exist in package-lock.json`);
  assert.equal(lockEntry.version, expectedVersion);
  assert.equal(lockEntry.resolved, manifestEntry.url);
  assert.equal(lockEntry.integrity, manifestEntry.integrity);
}

test('offline TypeScript manifest is exact, native, and lockfile-backed', () => {
  const manifest = readJson('vendor/offline/manifest.json');
  const pkg = readJson('package.json');
  const lock = readJson('package-lock.json');
  const typescript = manifest.typescript;

  assert.equal(typescript.version, '7.0.2');
  assert.equal(pkg.devDependencies.typescript, typescript.version);
  assert.equal(typescript.launcher, 'bin/tsc');
  assertLockEntry(typescript.package, typescript.version, lock.packages);

  const expected = {
    'linux-x64': ['node_modules/@typescript/typescript-linux-x64', 'lib/tsc'],
    'linux-arm64': ['node_modules/@typescript/typescript-linux-arm64', 'lib/tsc'],
    'win32-x64': ['node_modules/@typescript/typescript-win32-x64', 'lib/tsc.exe'],
  };
  assert.deepEqual(Object.keys(typescript.platforms).sort(), Object.keys(expected).sort());
  for (const [platform, [lockPath, executable]] of Object.entries(expected)) {
    const entry = typescript.platforms[platform];
    assert.equal(entry.lockPath, lockPath);
    assert.equal(entry.installPath, lockPath);
    assert.equal(entry.executable, executable);
    assertLockEntry(entry, typescript.version, lock.packages);
  }
});

test('offline esbuild manifest is exact, native, hashed, and lockfile-backed', () => {
  const manifest = readJson('vendor/offline/manifest.json');
  const pkg = readJson('package.json');
  const lock = readJson('package-lock.json');
  const esbuild = manifest.esbuild;

  assert.equal(esbuild.version, '0.28.1');
  assert.equal(pkg.devDependencies.esbuild, `^${esbuild.version}`);
  assert.equal(esbuild.launcher, 'bin/esbuild');
  assertLockEntry(esbuild.package, esbuild.version, lock.packages);

  const expected = {
    'linux-x64': ['node_modules/@esbuild/linux-x64', 'bin/esbuild'],
    'linux-arm64': ['node_modules/@esbuild/linux-arm64', 'bin/esbuild'],
    'win32-x64': ['node_modules/@esbuild/win32-x64', 'esbuild.exe'],
  };
  assert.deepEqual(Object.keys(esbuild.platforms).sort(), Object.keys(expected).sort());
  for (const [platform, [lockPath, executable]] of Object.entries(expected)) {
    const entry = esbuild.platforms[platform];
    assert.equal(entry.lockPath, lockPath);
    assert.equal(entry.installPath, lockPath);
    assert.equal(entry.executable, executable);
    assert.match(entry.binarySha256, /^[a-f0-9]{64}$/u);
    assertLockEntry(entry, esbuild.version, lock.packages);
  }
});

test('offline TypeScript scripts use the pinned compiler and preserve declaration snapshots', () => {
  const pkg = readJson('package.json');
  assert.equal(pkg.scripts['setup:offline:typescript'], 'python tools/bootstrap_offline_typescript.py');
  assert.match(pkg.scripts['typecheck:offline'], /--node-only --with-typescript/);
  assert.match(pkg.scripts['typecheck:offline:all'], /--node-only --with-typescript/);
  assert.match(pkg.scripts['typecheck:offline:dist'], /--node-only --with-typescript/);
  assert.match(pkg.scripts['test:offline:declaration-snapshot'], /--with-typescript --with-esbuild/);
  assert.doesNotMatch(pkg.scripts['test:offline:declaration-snapshot'], /--node-only/);
  assert.match(
    pkg.scripts['test:offline:declaration-snapshot'],
    /wardrobe_dimension_public_surface_semantic_contract\.test\.js/
  );

  const resolver = fs.readFileSync(path.join(root, 'tools/wp_typescript_resolver.js'), 'utf8');
  assert.match(resolver, /Local TypeScript version mismatch/);
  assert.match(resolver, /do not regenerate declarations or snapshots with the wrong compiler/);
});

test('offline esbuild scripts install the focused runtime without npm', () => {
  const pkg = readJson('package.json');
  assert.equal(pkg.scripts['setup:offline:esbuild'], 'python tools/bootstrap_offline_esbuild.py');
  assert.equal(
    pkg.scripts['verify:offline:esbuild'],
    'python tools/verify_offline_repair_vendor.py --esbuild-only'
  );
  assert.equal(pkg.scripts['test:offline:esbuild'], 'python tools/selftest_offline_esbuild.py');

  const bootstrap = fs.readFileSync(path.join(root, 'tools/bootstrap_offline_repair_core.py'), 'utf8');
  assert.match(bootstrap, /def install_esbuild\(/);
  assert.match(bootstrap, /esbuild binary SHA-256 mismatch/);
  assert.match(bootstrap, /transformSync/);
  assert.doesNotMatch(bootstrap, /subprocess\.(?:run|Popen)\(\s*\[\s*['"]npm/u);
});

test('offline TSX manifest is exact, lockfile-backed, and reuses pinned esbuild', () => {
  const manifest = readJson('vendor/offline/manifest.json');
  const pkg = readJson('package.json');
  const lock = readJson('package-lock.json');
  const tsx = manifest.tsx;
  const lockEntry = lock.packages[tsx.package.lockPath];

  assert.equal(tsx.version, '4.23.1');
  assert.equal(pkg.devDependencies.tsx, lock.packages[''].devDependencies.tsx);
  assert.equal(tsx.executable, 'dist/cli.mjs');
  assert.equal(tsx.esbuildRange, '~0.28.0');
  assertLockEntry(tsx.package, tsx.version, lock.packages);
  assert.equal(lockEntry.dependencies.esbuild, tsx.esbuildRange);
  assert.equal(manifest.esbuild.version, '0.28.1');
  assert.equal(lock.packages['node_modules/esbuild'].version, manifest.esbuild.version);
});

test('offline TSX scripts run focused TypeScript tests without npx or a full install', () => {
  const pkg = readJson('package.json');
  assert.equal(pkg.scripts['setup:offline:tsx'], 'python tools/bootstrap_offline_tsx.py');
  assert.equal(pkg.scripts['verify:offline:tsx'], 'python tools/verify_offline_repair_vendor.py --tsx-only');
  assert.equal(pkg.scripts['test:offline:tsx'], 'python tools/selftest_offline_tsx.py');
  assert.match(
    pkg.scripts['test:offline:wave-c-runtime'],
    /run_offline_tsx_tests\.py tests\/wave_c1_dimension_consolidation_runtime\.test\.ts/u
  );

  const bootstrap = fs.readFileSync(path.join(root, 'tools/bootstrap_offline_repair_core.py'), 'utf8');
  const selfTest = fs.readFileSync(path.join(root, 'tools/selftest_offline_tsx.py'), 'utf8');
  const runner = fs.readFileSync(path.join(root, 'tools/run_offline_tsx_tests.py'), 'utf8');
  assert.match(bootstrap, /def install_tsx\(/u);
  assert.match(bootstrap, /def _tilde_range_accepts\(/u);
  assert.match(bootstrap, /--import", "tsx"/u);
  assert.match(selfTest, /wave_c1_dimension_consolidation_runtime\.test\.ts/u);
  assert.match(selfTest, /wardrobe_dimension_public_surface_semantic_contract\.test\.js/u);
  assert.match(runner, /tools\/wp_run_tsx_tests\.mjs/u);
  assert.doesNotMatch(bootstrap, /subprocess\.(?:run|Popen)\(\s*\[\s*['"](?:npm|npx)/u);
});

test('offline Python caches are ignored and bootstrap JSON parsing stays single-read', () => {
  const gitignore = fs.readFileSync(path.join(root, '.gitignore'), 'utf8');
  assert.match(gitignore, /(?:^|\n)__pycache__\/(?:\n|$)/u);
  assert.match(gitignore, /(?:^|\n)\*\.py\[cod\](?:\n|$)/u);
  const bootstrap = fs.readFileSync(path.join(root, 'tools/bootstrap_offline_repair_core.py'), 'utf8');
  assert.equal((bootstrap.match(/json\.loads\(package_json\.read_text/gu) ?? []).length, 1);
  assert.equal(
    (bootstrap.match(/platform_entry = typescript\.get\("platforms", \{\}\)\.get\(key\)/gu) ?? []).length,
    1
  );
});
