import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
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

function isVersionInBoundedRange(version, range) {
  const match = /^>=(\d+\.\d+\.\d+) <(\d+\.\d+\.\d+)$/u.exec(range);
  if (!match) return false;
  const parse = value => value.split('.').map(Number);
  const compare = (left, right) => {
    for (let index = 0; index < 3; index += 1) {
      if (left[index] !== right[index]) return left[index] - right[index];
    }
    return 0;
  };
  const actual = parse(version);
  return compare(actual, parse(match[1])) >= 0 && compare(actual, parse(match[2])) < 0;
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

test('offline AST fallback is signed independently and compatible with the active parser', () => {
  const manifest = readJson('vendor/offline/manifest.json');
  const pkg = readJson('package.json');
  const lock = readJson('package-lock.json');
  const ast = manifest.ast;
  const activeParser = lock.packages['node_modules/oxc-parser'];
  const activeVersion = activeParser.version;

  assert.equal(pkg.devDependencies['oxc-parser'], '>=0.142.0 <0.143.0');
  assert.equal(lock.packages[''].devDependencies['oxc-parser'], pkg.devDependencies['oxc-parser']);
  assert.equal(isVersionInBoundedRange(activeVersion, '>=0.142.0 <0.143.0'), true);
  assert.match(ast.version, /^0\.(?:141|142)\.\d+$/u);
  assert.equal(ast.compatibleProjectRange, '>=0.141.0 <0.143.0');
  assert.equal(isVersionInBoundedRange(activeVersion, ast.compatibleProjectRange), true);
  assert.equal(isVersionInBoundedRange(ast.version, ast.compatibleProjectRange), true);
  assert.equal(lock.packages['node_modules/@oxc-project/types'].version, activeVersion);
  assert.equal(activeParser.dependencies['@oxc-project/types'], `^${activeVersion}`);
  for (const [packageName, expectedVersion] of Object.entries(activeParser.optionalDependencies)) {
    assert.equal(expectedVersion, activeVersion, `${packageName} must match the active parser`);
    assert.equal(
      lock.packages[`node_modules/${packageName}`]?.version,
      activeVersion,
      `${packageName} lock entry must match the active parser`
    );
  }

  for (const entry of [...ast.packages, ...Object.values(ast.bindings)]) {
    assert.match(entry.file, new RegExp(ast.version.replaceAll('.', '\\.'), 'u'));
    assert.match(entry.url, new RegExp(ast.version.replaceAll('.', '\\.'), 'u'));
    assert.match(entry.integrity, /^sha512-[A-Za-z0-9+/]+={0,2}$/u);
  }
});

test('offline Oxc vendor refresh command validates the checked-in bundle without network access', () => {
  const pkg = readJson('package.json');
  assert.equal(pkg.scripts['vendor:offline:oxc:refresh'], 'node tools/wp_refresh_offline_oxc_vendor.mjs');
  assert.equal(
    pkg.scripts['vendor:offline:oxc:adopt'],
    'node tools/wp_refresh_offline_oxc_vendor.mjs --adopt-existing'
  );
  assert.equal(
    pkg.scripts['vendor:offline:oxc:check'],
    'node tools/wp_refresh_offline_oxc_vendor.mjs --check'
  );

  const result = spawnSync(process.execPath, ['tools/wp_refresh_offline_oxc_vendor.mjs', '--check'], {
    cwd: root,
    encoding: 'utf8',
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /offline 0\.(?:141|142)\.\d+; active 0\.142\.\d+/u);
});

test('offline AST compatibility window accepts reviewed patches and rejects a boundary crossing', () => {
  const probe = String.raw`
from pathlib import Path
import sys

sys.path.insert(0, str(Path.cwd() / "tools"))
import bootstrap_offline_repair_core as core

assert core._bounded_range_accepts("0.141.0", ">=0.141.0 <0.143.0")
assert core._bounded_range_accepts("0.142.9", ">=0.141.0 <0.143.0")
assert not core._bounded_range_accepts("0.143.0", ">=0.141.0 <0.143.0")
manifest = core.load_manifest()
manifest["ast"]["compatibleProjectRange"] = ">=0.141.0 <0.142.0"
try:
    core.validate_manifest_against_project(manifest)
except core.OfflineCoreError as error:
    assert "Project oxc-parser" in str(error)
else:
    raise AssertionError("incompatible active parser was accepted")
print("ast-window-ok")
`;
  const result = spawnSync(process.env.PYTHON ?? 'python', ['-c', probe], {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1' },
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.equal(result.stdout.trim(), 'ast-window-ok');
});

test('offline native manifests and archives are scoped to Linux x64 glibc', () => {
  const manifest = readJson('vendor/offline/manifest.json');
  const nativePlatformMaps = [
    manifest.node.platforms,
    manifest.ast.bindings,
    manifest.esbuild.platforms,
    manifest.typescript.platforms,
  ];

  for (const platforms of nativePlatformMaps) {
    assert.deepEqual(Object.keys(platforms), ['linux-x64']);
  }

  const manifestText = JSON.stringify(manifest);
  assert.doesNotMatch(manifestText, /win32-x64|linux-arm64|win-x64|msvc/u);

  const archiveNames = fs.readdirSync(path.join(root, 'vendor/offline'), { recursive: true });
  assert.deepEqual(
    archiveNames.filter(name => /win32|win-x64|windows|arm64/iu.test(name)),
    []
  );

  for (const wrapper of [
    'bootstrap_offline_repair_core.bat',
    'bootstrap_offline_prettier.bat',
    'bootstrap_offline_typescript.bat',
    'bootstrap_offline_esbuild.bat',
    'bootstrap_offline_tsx.bat',
  ]) {
    assert.equal(fs.existsSync(path.join(root, 'tools', wrapper)), false);
  }
});

test('offline platform selection rejects Windows before archive lookup or download guidance', () => {
  const probe = String.raw`
from pathlib import Path
import sys
from unittest.mock import patch

sys.path.insert(0, str(Path.cwd() / "tools"))
import bootstrap_offline_repair_core as core
import verify_offline_repair_vendor as verify

cases = (
    ("linux", "x86_64", True, "linux-x64"),
    ("linux", "aarch64", True, core.UNSUPPORTED_PLATFORM_MESSAGE),
    ("linux", "x86_64", False, core.UNSUPPORTED_PLATFORM_MESSAGE),
    ("win32", "AMD64", False, core.UNSUPPORTED_PLATFORM_MESSAGE),
    ("darwin", "x86_64", False, core.UNSUPPORTED_PLATFORM_MESSAGE),
)
for system, machine, glibc, expected in cases:
    with (
        patch.object(core.sys, "platform", system),
        patch.object(core.platform, "machine", return_value=machine),
        patch.object(core, "_is_glibc_linux", return_value=glibc),
    ):
        try:
            actual = core.platform_key()
        except core.OfflineCoreError as error:
            actual = str(error)
        if actual != expected:
            raise AssertionError(f"{system}/{machine}/glibc={glibc}: {actual!r}")

with (
    patch.object(core.sys, "platform", "win32"),
    patch.object(core.platform, "machine", return_value="AMD64"),
    patch.object(core, "_require_file", side_effect=AssertionError("archive lookup attempted")),
):
    result = verify.main([])
if result != 2:
    raise AssertionError(f"unexpected verifier status: {result}")
print("platform-matrix-ok")
`;
  const result = spawnSync(process.env.PYTHON ?? 'python', ['-c', probe], {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1' },
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.equal(result.stdout.trim(), 'platform-matrix-ok');
  assert.equal(
    result.stderr.trim(),
    'offline vendor verification error: Offline repair vendor supports Linux x64 glibc only'
  );
  assert.doesNotMatch(result.stderr, /https?:\/\/|archive|download/iu);
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
