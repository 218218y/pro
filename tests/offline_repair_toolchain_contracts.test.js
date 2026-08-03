import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
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

function platformConstraintAccepts(values, target) {
  if (!Array.isArray(values) || values.length === 0) return true;
  const allowed = values.filter(value => !value.startsWith('!'));
  const blocked = values.filter(value => value.startsWith('!')).map(value => value.slice(1));
  return !blocked.includes(target) && (allowed.length === 0 || allowed.includes(target));
}

function supportsLinuxX64Glibc(lockEntry) {
  return (
    platformConstraintAccepts(lockEntry.os, 'linux') &&
    platformConstraintAccepts(lockEntry.cpu, 'x64') &&
    platformConstraintAccepts(lockEntry.libc, 'glibc')
  );
}

test('offline TypeScript manifest is exact, native, and lockfile-backed', () => {
  const manifest = readJson('vendor/offline/manifest.json');
  const pkg = readJson('package.json');
  const lock = readJson('package-lock.json');
  const typescript = manifest.typescript;

  assert.equal(typescript.version, lock.packages['node_modules/typescript'].version);
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

  assert.equal(esbuild.version, lock.packages['node_modules/esbuild'].version);
  assert.equal(pkg.devDependencies.esbuild, lock.packages[''].devDependencies.esbuild);
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

test('offline npm vendor synchronizer adopts lockfile packages and cleans superseded archives', () => {
  const pkg = readJson('package.json');
  const lock = readJson('package-lock.json');
  const manifest = readJson('vendor/offline/manifest.json');
  const tool = path.join(root, 'tools/wp_refresh_offline_npm_vendor.mjs');

  assert.equal(
    pkg.scripts['vendor:offline:packages:refresh'],
    'node tools/wp_refresh_offline_npm_vendor.mjs --all'
  );
  assert.equal(
    pkg.scripts['vendor:offline:packages:adopt'],
    'node tools/wp_refresh_offline_npm_vendor.mjs --all --adopt-existing'
  );
  assert.equal(
    pkg.scripts['vendor:offline:packages:check'],
    'node tools/wp_refresh_offline_npm_vendor.mjs --all --check'
  );
  assert.equal(
    pkg.scripts['vendor:offline:packages:downloads'],
    'node tools/wp_refresh_offline_npm_vendor.mjs --all --print-downloads'
  );
  assert.equal(
    pkg.scripts['vendor:offline:tsx:adopt'],
    'node tools/wp_refresh_offline_npm_vendor.mjs --component tsx --adopt-existing'
  );
  assert.match(pkg.scripts['deps:update:sync-generated'], /vendor:offline:packages:refresh/u);
  assert.match(pkg.scripts['deps:update:sync-generated'], /vendor:offline:tsx-tests:refresh/u);

  const checkedIn = spawnSync(process.execPath, [tool, '--all', '--check'], {
    cwd: root,
    encoding: 'utf8',
  });
  assert.equal(checkedIn.status, 0, checkedIn.stderr || checkedIn.stdout);
  for (const component of ['esbuild', 'tsx', 'prettier', 'typescript']) {
    assert.match(checkedIn.stdout, new RegExp(`OK: ${component} `, 'u'));
  }

  const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'offline-npm-vendor-'));
  try {
    const fixtureVendor = path.join(fixtureRoot, 'vendor/offline/tsx');
    fs.mkdirSync(fixtureVendor, { recursive: true });
    fs.copyFileSync(path.join(root, 'package-lock.json'), path.join(fixtureRoot, 'package-lock.json'));
    fs.copyFileSync(
      path.join(root, manifest.tsx.package.file),
      path.join(fixtureVendor, path.basename(manifest.tsx.package.file))
    );
    fs.writeFileSync(path.join(fixtureVendor, 'tsx-0.0.0.tgz'), 'superseded');

    const staleManifest = structuredClone(manifest);
    staleManifest.tsx = {
      ...staleManifest.tsx,
      version: '0.0.0',
      package: {
        ...staleManifest.tsx.package,
        file: 'vendor/offline/tsx/tsx-0.0.0.tgz',
        url: 'https://registry.npmjs.org/tsx/-/tsx-0.0.0.tgz',
        integrity: `sha512-${'A'.repeat(86)}==`,
      },
    };
    fs.writeFileSync(
      path.join(fixtureRoot, 'vendor/offline/manifest.json'),
      `${JSON.stringify(staleManifest, null, 2)}\n`
    );

    const adopt = spawnSync(
      process.execPath,
      [tool, '--root', fixtureRoot, '--component', 'tsx', '--adopt-existing'],
      { cwd: root, encoding: 'utf8' }
    );
    assert.equal(adopt.status, 0, adopt.stderr || adopt.stdout);
    assert.match(adopt.stdout, /adopting vendor\/offline\/tsx\/tsx-/u);

    const synced = JSON.parse(
      fs.readFileSync(path.join(fixtureRoot, 'vendor/offline/manifest.json'), 'utf8')
    );
    const lockEntry = lock.packages['node_modules/tsx'];
    assert.equal(synced.tsx.version, lockEntry.version);
    assert.equal(synced.tsx.package.url, lockEntry.resolved);
    assert.equal(synced.tsx.package.integrity, lockEntry.integrity);
    assert.equal(synced.tsx.esbuildRange, lockEntry.dependencies.esbuild);
    assert.equal(fs.existsSync(path.join(fixtureVendor, 'tsx-0.0.0.tgz')), false);

    const check = spawnSync(
      process.execPath,
      [tool, '--root', fixtureRoot, '--component', 'tsx', '--check'],
      { cwd: root, encoding: 'utf8' }
    );
    assert.equal(check.status, 0, check.stderr || check.stdout);

    const downloads = spawnSync(
      process.execPath,
      [tool, '--root', fixtureRoot, '--component', 'tsx', '--print-downloads'],
      { cwd: root, encoding: 'utf8' }
    );
    assert.equal(downloads.status, 0, downloads.stderr || downloads.stdout);
    assert.match(
      downloads.stdout,
      new RegExp(lockEntry.resolved.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&'), 'u')
    );
    assert.match(downloads.stdout, /vendor\/offline\/tsx\/tsx-/u);

    const incompatibleManifest = structuredClone(synced);
    incompatibleManifest.esbuild.version = '0.29.0';
    fs.writeFileSync(
      path.join(fixtureRoot, 'vendor/offline/manifest.json'),
      `${JSON.stringify(incompatibleManifest, null, 2)}\n`
    );
    const incompatible = spawnSync(
      process.execPath,
      [tool, '--root', fixtureRoot, '--component', 'tsx', '--check'],
      { cwd: root, encoding: 'utf8' }
    );
    assert.notEqual(incompatible.status, 0);
    assert.match(incompatible.stderr, /does not satisfy TSX dependency/u);
    fs.writeFileSync(
      path.join(fixtureRoot, 'vendor/offline/manifest.json'),
      `${JSON.stringify(synced, null, 2)}\n`
    );

    fs.appendFileSync(path.join(fixtureRoot, synced.tsx.package.file), 'tamper');
    const tampered = spawnSync(
      process.execPath,
      [tool, '--root', fixtureRoot, '--component', 'tsx', '--check'],
      { cwd: root, encoding: 'utf8' }
    );
    assert.notEqual(tampered.status, 0);
    assert.match(tampered.stderr, /integrity mismatch/u);
  } finally {
    fs.rmSync(fixtureRoot, { recursive: true, force: true });
  }
});

test('offline TSX-test workspace profile is lock-derived and Linux x64 glibc only', () => {
  const pkg = readJson('package.json');
  const lock = readJson('package-lock.json');
  const manifest = readJson('vendor/offline/manifest.json');
  const profile = manifest.workspace.profiles['tsx-tests'];
  const tool = path.join(root, 'tools/wp_refresh_offline_npm_vendor.mjs');

  assert.deepEqual(manifest.workspace.platform, {
    key: 'linux-x64',
    os: 'linux',
    cpu: 'x64',
    libc: 'glibc',
  });
  assert.equal(
    manifest.workspace.lockfileSha256,
    crypto
      .createHash('sha256')
      .update(fs.readFileSync(path.join(root, 'package-lock.json')))
      .digest('hex')
  );
  assert.deepEqual(profile.rootDependencies, Object.keys(pkg.dependencies).sort());
  assert.equal(profile.packageCount, profile.packages.length);
  assert.ok(profile.packageCount > profile.rootDependencies.length);

  const names = new Set(profile.packages.map(entry => entry.name));
  for (const requiredName of [
    'react',
    'react-dom',
    'scheduler',
    'three',
    'zustand',
    'pdf-lib',
    'pdfjs-dist',
    '@supabase/supabase-js',
    '@napi-rs/canvas-linux-x64-gnu',
  ]) {
    assert.ok(names.has(requiredName), `${requiredName} must be present in the TSX-test profile`);
  }

  for (const entry of profile.packages) {
    assertLockEntry(entry, entry.version, lock.packages);
    assert.equal(entry.installPath, entry.lockPath);
    assert.equal(supportsLinuxX64Glibc(lock.packages[entry.lockPath]), true, entry.lockPath);
    assert.doesNotMatch(entry.lockPath, /darwin|win32|arm64|musl/u);
    assert.match(entry.file, /^vendor\/offline\/runtime\//u);
  }

  assert.equal(
    pkg.scripts['vendor:offline:tsx-tests:plan'],
    'node tools/wp_refresh_offline_npm_vendor.mjs --profile tsx-tests --sync-plan'
  );
  assert.equal(
    pkg.scripts['vendor:offline:tsx-tests:check-plan'],
    'node tools/wp_refresh_offline_npm_vendor.mjs --profile tsx-tests --check-plan'
  );
  assert.equal(
    pkg.scripts['vendor:offline:tsx-tests:downloads'],
    'node tools/wp_refresh_offline_npm_vendor.mjs --profile tsx-tests --print-downloads --missing-only'
  );
  assert.equal(
    pkg.scripts['vendor:offline:tsx-tests:refresh'],
    'node tools/wp_refresh_offline_npm_vendor.mjs --profile tsx-tests'
  );
  assert.equal(
    pkg.scripts['vendor:offline:tsx-tests:adopt'],
    'node tools/wp_refresh_offline_npm_vendor.mjs --profile tsx-tests --adopt-existing'
  );
  assert.equal(
    pkg.scripts['vendor:offline:tsx-tests:check'],
    'node tools/wp_refresh_offline_npm_vendor.mjs --profile tsx-tests --check'
  );

  const planCheck = spawnSync(process.execPath, [tool, '--profile', 'tsx-tests', '--check-plan'], {
    cwd: root,
    encoding: 'utf8',
  });
  assert.equal(planCheck.status, 0, planCheck.stderr || planCheck.stdout);
  assert.match(planCheck.stdout, /workspace plan tsx-tests/u);

  const downloads = spawnSync(process.execPath, [tool, '--profile', 'tsx-tests', '--print-downloads'], {
    cwd: root,
    encoding: 'utf8',
  });
  assert.equal(downloads.status, 0, downloads.stderr || downloads.stdout);
  assert.match(downloads.stdout, /react-\d+\.\d+\.\d+\.tgz/u);
  assert.match(downloads.stdout, /vendor\/offline\/runtime\/react-/u);
  assert.doesNotMatch(downloads.stdout, /vendor\/offline\/(?:tsx|esbuild)\//u);

  const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'offline-workspace-vendor-'));
  try {
    const fixtureLock = structuredClone(lock);
    fixtureLock.packages[''] = {
      ...fixtureLock.packages[''],
      dependencies: { tsx: pkg.devDependencies.tsx },
      devDependencies: {},
    };
    fs.mkdirSync(path.join(fixtureRoot, 'vendor/offline/runtime'), { recursive: true });
    fs.writeFileSync(
      path.join(fixtureRoot, 'package-lock.json'),
      `${JSON.stringify(fixtureLock, null, 2)}\n`
    );
    fs.writeFileSync(
      path.join(fixtureRoot, 'vendor/offline/manifest.json'),
      `${JSON.stringify(manifest, null, 2)}\n`
    );
    const fixtureArchives = [
      [manifest.tsx.package.file, `runtime/tsx-${manifest.tsx.version}.tgz`],
      [manifest.esbuild.package.file, `runtime/esbuild-${manifest.esbuild.version}.tgz`],
      [
        manifest.esbuild.platforms['linux-x64'].file,
        `runtime/esbuild__linux-x64-${manifest.esbuild.version}.tgz`,
      ],
    ];
    for (const [source, target] of fixtureArchives) {
      fs.copyFileSync(path.join(root, source), path.join(fixtureRoot, 'vendor/offline', target));
    }
    fs.writeFileSync(path.join(fixtureRoot, 'vendor/offline/runtime/stale-0.0.0.tgz'), 'stale');

    const adopt = spawnSync(
      process.execPath,
      [tool, '--root', fixtureRoot, '--profile', 'tsx-tests', '--adopt-existing'],
      { cwd: root, encoding: 'utf8' }
    );
    assert.equal(adopt.status, 0, adopt.stderr || adopt.stdout);
    assert.match(adopt.stdout, /workspace tsx-tests \(3 packages\)/u);

    const fixtureManifest = JSON.parse(
      fs.readFileSync(path.join(fixtureRoot, 'vendor/offline/manifest.json'), 'utf8')
    );
    assert.deepEqual(fixtureManifest.workspace.profiles['tsx-tests'].rootDependencies, ['tsx']);
    assert.equal(fixtureManifest.workspace.profiles['tsx-tests'].packageCount, 3);
    assert.equal(fs.existsSync(path.join(fixtureRoot, 'vendor/offline/runtime/stale-0.0.0.tgz')), false);
  } finally {
    fs.rmSync(fixtureRoot, { recursive: true, force: true });
  }
});

test('offline AST compatibility window validates fallback and active parser boundaries independently', () => {
  const probe = String.raw`
from copy import deepcopy
import json
from pathlib import Path
import sys
import tempfile

sys.path.insert(0, str(Path.cwd() / "tools"))
import bootstrap_offline_repair_core as core

assert core._bounded_range_accepts("0.141.0", ">=0.141.0 <0.143.0")
assert core._bounded_range_accepts("0.142.9", ">=0.141.0 <0.143.0")
assert not core._bounded_range_accepts("0.143.0", ">=0.141.0 <0.143.0")

manifest = core.load_manifest()
offline_boundary_manifest = deepcopy(manifest)
offline_boundary_manifest["ast"]["version"] = "0.143.0"
try:
    core.validate_manifest_against_project(offline_boundary_manifest)
except core.OfflineCoreError as error:
    assert "Offline AST version 0.143.0" in str(error)
else:
    raise AssertionError("incompatible offline fallback was accepted")

lock = json.loads(core.LOCK_PATH.read_text(encoding="utf-8"))
lock["packages"]["node_modules/oxc-parser"]["version"] = "0.143.0"
with tempfile.TemporaryDirectory() as temp_dir:
    original_lock_path = core.LOCK_PATH
    test_lock_path = Path(temp_dir) / "package-lock.json"
    test_lock_path.write_text(json.dumps(lock), encoding="utf-8")
    core.LOCK_PATH = test_lock_path
    try:
        core.validate_manifest_against_project(manifest)
    except core.OfflineCoreError as error:
        assert "Project oxc-parser 0.143.0" in str(error)
    else:
        raise AssertionError("incompatible active parser was accepted")
    finally:
        core.LOCK_PATH = original_lock_path

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

test('generated report checks can install their formatter through the offline Node runner', () => {
  const pkg = readJson('package.json');
  assert.equal(
    pkg.scripts['check:generated-reports:offline'],
    'python tools/run_offline_node24.py --with-prettier tools/wp_generated_report_contract.mjs --check'
  );
  assert.equal(
    pkg.scripts['report:generated:offline'],
    'python tools/run_offline_node24.py --with-prettier tools/wp_generated_report_contract.mjs --write'
  );

  const nodeRunner = fs.readFileSync(path.join(root, 'tools/run_offline_node24.py'), 'utf8');
  assert.match(nodeRunner, /--with-prettier/u);
  assert.match(nodeRunner, /prettier=args\.with_prettier/u);
  assert.match(nodeRunner, /core\.install_prettier\(manifest, executable\)/u);
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
    /wardrobe_dimension_runtime_public_surface_contract\.test\.js/
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

  assert.equal(tsx.version, lockEntry.version);
  assert.equal(pkg.devDependencies.tsx, lock.packages[''].devDependencies.tsx);
  assert.equal(tsx.executable, 'dist/cli.mjs');
  assert.equal(tsx.esbuildRange, '~0.28.0');
  assertLockEntry(tsx.package, tsx.version, lock.packages);
  assert.equal(lockEntry.dependencies.esbuild, tsx.esbuildRange);
  assert.equal(manifest.esbuild.version, lock.packages['node_modules/esbuild'].version);
  assert.equal(lock.packages['node_modules/esbuild'].version, manifest.esbuild.version);
});

test('offline TSX scripts install the lock-derived runtime profile without npx or npm', () => {
  const pkg = readJson('package.json');
  const manifest = readJson('vendor/offline/manifest.json');
  assert.equal(pkg.scripts['setup:offline:tsx'], 'python tools/bootstrap_offline_tsx.py');
  assert.equal(
    pkg.scripts['setup:offline:tsx:engine'],
    'python tools/bootstrap_offline_tsx.py --engine-only'
  );
  assert.equal(pkg.scripts['verify:offline:tsx'], 'python tools/verify_offline_repair_vendor.py --tsx-only');
  assert.equal(
    pkg.scripts['verify:offline:tsx:engine'],
    'python tools/verify_offline_repair_vendor.py --tsx-engine-only'
  );
  assert.equal(pkg.scripts['test:offline:tsx'], 'python tools/selftest_offline_tsx.py');
  assert.match(
    pkg.scripts['test:offline:wave-c-runtime'],
    /run_offline_tsx_tests\.py tests\/wave_c1_dimension_consolidation_runtime\.test\.ts/u
  );

  const bootstrap = fs.readFileSync(path.join(root, 'tools/bootstrap_offline_repair_core.py'), 'utf8');
  const selfTest = fs.readFileSync(path.join(root, 'tools/selftest_offline_tsx.py'), 'utf8');
  const runner = fs.readFileSync(path.join(root, 'tools/run_offline_tsx_tests.py'), 'utf8');
  const nodeRunner = fs.readFileSync(path.join(root, 'tools/run_offline_node24.py'), 'utf8');
  const processRunner = fs.readFileSync(path.join(root, 'tools/offline_process_runner.py'), 'utf8');
  assert.match(bootstrap, /def install_tsx\(/u);
  assert.match(bootstrap, /def install_workspace_profile\(/u);
  assert.match(bootstrap, /workspace-runtime-ok/u);
  assert.match(bootstrap, /def _tilde_range_accepts\(/u);
  assert.match(bootstrap, /--import", "tsx"/u);
  assert.match(selfTest, /offline_tsx_runtime_smoke\.test\.tsx/u);
  assert.match(selfTest, /"--import",\s*"tsx",\s*"--test"/u);
  assert.match(selfTest, /process_runner\.run_isolated/u);
  assert.doesNotMatch(selfTest, /tools\/wp_run_tsx_tests\.mjs/u);
  assert.doesNotMatch(selfTest, /install_(?:tsx|workspace_profile)\([^\n]*force=True/u);
  assert.doesNotMatch(selfTest, /\["\/bin\/sh"/u);
  assert.match(runner, /tools\/wp_run_tsx_tests\.mjs/u);
  assert.match(runner, /install_workspace_profile/u);
  assert.match(runner, /process_runner\.run_isolated/u);
  assert.match(nodeRunner, /--with-runtime/u);
  assert.match(nodeRunner, /install_workspace_profile/u);
  assert.match(nodeRunner, /process_runner\.run_isolated/u);
  assert.match(processRunner, /_PR_SET_CHILD_SUBREAPER = 36/u);
  assert.match(processRunner, /libc\.prctl\(_PR_SET_CHILD_SUBREAPER, 1, 0, 0, 0\)/u);
  assert.match(processRunner, /start_new_session=True/u);
  assert.match(processRunner, /os\.killpg\(process_group_id, signal\.SIGTERM\)/u);
  assert.match(processRunner, /os\.killpg\(process_group_id, signal\.SIGKILL\)/u);
  assert.match(processRunner, /os\.waitpid\(-1, os\.WNOHANG\)/u);
  assert.match(processRunner, /finally:\s*terminate_process_group\(process\.pid\)\s*reap_descendants\(\)/u);
  assert.equal(
    pkg.scripts['test:offline:tsx-runtime-smoke'],
    'python tools/run_offline_tsx_tests.py tests/offline_tsx_runtime_smoke.test.tsx'
  );
  assert.equal(
    pkg.scripts['test:offline:order-pdf-diagnostic'],
    'python tools/run_offline_tsx_tests.py tests/order_pdf_diagnostic_classifier_runtime.test.ts'
  );

  const runtimeSmoke = fs.readFileSync(path.join(root, 'tests/offline_tsx_runtime_smoke.test.tsx'), 'utf8');
  for (const packageName of [
    '@pdf-lib/fontkit',
    '@supabase/supabase-js',
    'pdf-lib',
    'pdfjs-dist/legacy/build/pdf.mjs',
    'react',
    'react-dom/server',
    'three',
    'zustand/vanilla',
  ]) {
    assert.match(runtimeSmoke, new RegExp(`from ['"]${packageName.replaceAll('/', '\\/')}['"]`, 'u'));
  }
  assert.doesNotMatch(runtimeSmoke, /@playwright\/test/u);

  const classifier = fs.readFileSync(
    path.join(root, 'tests/support/order_pdf_diagnostic_classifier.ts'),
    'utf8'
  );
  const classifierTest = fs.readFileSync(
    path.join(root, 'tests/order_pdf_diagnostic_classifier_runtime.test.ts'),
    'utf8'
  );
  const e2eHelper = fs.readFileSync(path.join(root, 'tests/e2e/helpers/project_flows.ts'), 'utf8');
  assert.doesNotMatch(classifier, /@playwright\/test/u);
  assert.doesNotMatch(classifierTest, /@playwright\/test/u);
  assert.match(classifierTest, /support\/order_pdf_diagnostic_classifier\.js/u);
  assert.match(e2eHelper, /support\/order_pdf_diagnostic_classifier\.js/u);
  assert.doesNotMatch(
    manifest.workspace.profiles['tsx-tests'].packages.map(entry => entry.name).join('\n'),
    /^(?:@playwright\/test|playwright|playwright-core)$/mu
  );
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
