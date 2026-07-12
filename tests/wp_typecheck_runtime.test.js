import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  createMissingConfigMessage,
  createSkippedMissingConfigMessage,
  DEFAULT_ALL_MODES,
  MODE_TO_CONFIG,
  parseTypecheckArgs,
  resolveTypecheckBuildInfoPath,
  resolveTypecheckExtraArgs,
  resolveTypecheckIncrementalArgs,
  resolveTypecheckConfigPath,
  resolveTypecheckModes,
} from '../tools/wp_typecheck_state.js';
import { createTypecheckHelpText, resolveTsc } from '../tools/wp_typecheck_shared.js';
import { resolveTypeScriptTool } from '../tools/wp_typescript_resolver.js';
import { runTypecheckFlow } from '../tools/wp_typecheck_flow.js';
import { parseTypecheckParallelArgs, resolveTypecheckWorkerCount } from '../tools/wp_typecheck_parallel.mjs';
import { resolveTypecheckModesForFiles } from '../tools/wp_typecheck_changed.mjs';

function tempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'wp-typecheck-'));
}

test('typecheck args parsing preserves help/mode/all semantics', () => {
  assert.deepEqual(parseTypecheckArgs(['--mode', 'runtime']), {
    help: false,
    mode: 'runtime',
    runAll: false,
    unknownOptions: [],
  });

  assert.deepEqual(parseTypecheckArgs(['--all']), {
    help: false,
    mode: null,
    runAll: true,
    unknownOptions: [],
  });
  assert.deepEqual(parseTypecheckArgs(['--mode', 'runtime', '--badflag']).unknownOptions, ['--badflag']);

  assert.equal(resolveTypecheckModes({ runAll: false, mode: 'services' })[0], 'services');
  assert.ok(resolveTypecheckModes({ runAll: true, mode: null }).includes('strict-runtime'));
  assert.match(createTypecheckHelpText(), /wp_typecheck\.js --mode runtime/);
});

test('typecheck parallel and changed-file routing stay bounded and layer-aware', () => {
  assert.deepEqual(parseTypecheckParallelArgs(['--workers', '3', '--modes', 'services,strict-services']), {
    help: false,
    workers: '3',
    modes: ['services', 'strict-services'],
  });
  assert.equal(resolveTypecheckWorkerCount({ requested: '20', modeCount: 3, cpuCount: 8 }), 3);
  assert.deepEqual(resolveTypecheckModesForFiles(['esm/native/services/example.ts']), [
    'services',
    'strict-services',
  ]);
  assert.deepEqual(resolveTypecheckModesForFiles(['esm/native/adapters/browser/example.ts']), [
    'adapters-browser',
    'strict-adapters-browser',
  ]);
  assert.deepEqual(resolveTypecheckModesForFiles(['types/app.ts']), [...DEFAULT_ALL_MODES]);
});

test('typecheck incremental cache paths are isolated per config and can be disabled explicitly', () => {
  const root = tempDir();
  assert.deepEqual(resolveTypecheckIncrementalArgs(root, 'services', {}), [
    '--incremental',
    '--tsBuildInfoFile',
    resolveTypecheckBuildInfoPath(root, 'services'),
  ]);
  assert.deepEqual(resolveTypecheckIncrementalArgs(root, 'services', { WP_TYPECHECK_INCREMENTAL: '0' }), []);
  assert.notEqual(
    resolveTypecheckBuildInfoPath(root, 'services'),
    resolveTypecheckBuildInfoPath(root, 'strict-services')
  );
});

test('typecheck refuses WP_TSC_BIN and system tsc unless manual fallback is explicit', () => {
  const root = tempDir();
  const systemProbe = () => ({ status: 0 });

  assert.equal(resolveTsc(root, { env: { WP_TSC_BIN: '/custom/tsc' }, spawnImpl: systemProbe }), null);

  const resolved = resolveTsc(root, {
    env: { WP_ALLOW_SYSTEM_TSC: '1', WP_TSC_BIN: '/custom/tsc' },
    spawnImpl: systemProbe,
  });
  assert.equal(resolved.kind, 'manual-bin');
  assert.equal(resolved.command, '/custom/tsc');
  assert.deepEqual(resolved.argsPrefix, []);
  assert.equal(resolved.label, '/custom/tsc');
  assert.equal(resolved.source, 'manual-env-bin');
  assert.match(resolved.warning, /manual mode/i);

  const blocked = resolveTsc(root, {
    env: { WP_ALLOW_SYSTEM_TSC: '1', CI: '1', WP_TSC_BIN: '/custom/tsc' },
    spawnImpl: systemProbe,
  });
  assert.equal(blocked.kind, 'blocked');
  assert.match(blocked.errorMessage, /manual-only.*refused in CI\/release/i);

  fs.mkdirSync(path.join(root, 'node_modules', 'typescript', 'lib'), { recursive: true });
  const localTsc = path.join(root, 'node_modules', 'typescript', 'lib', 'tsc.js');
  fs.writeFileSync(localTsc, '// stub\n', 'utf8');
  const local = resolveTsc(root, {
    env: { WP_ALLOW_SYSTEM_TSC: '1', WP_TSC_BIN: '/custom/tsc' },
    spawnImpl: systemProbe,
  });
  assert.equal(local.kind, 'node-script');
  assert.equal(local.command, process.execPath);
  assert.deepEqual(local.argsPrefix, [localTsc]);
  assert.equal(local.source, 'local-node-modules-lib-fallback');
});

test('TypeScript resolver exposes node-script, direct-bin, manual-bin and system command plans', () => {
  const root = tempDir();
  const localLibTsc = path.join(root, 'node_modules', 'typescript', 'lib', 'tsc.js');
  fs.mkdirSync(path.dirname(localLibTsc), { recursive: true });
  fs.writeFileSync(localLibTsc, '// stub\n', 'utf8');

  const nodeScript = resolveTypeScriptTool(root, { node: '/custom/node', env: {} });
  assert.equal(nodeScript.kind, 'node-script');
  assert.equal(nodeScript.command, '/custom/node');
  assert.deepEqual(nodeScript.argsPrefix, [localLibTsc]);
  assert.equal(nodeScript.script, localLibTsc);
  assert.equal(nodeScript.source, 'local-node-modules-lib-fallback');

  const directRoot = tempDir();
  const directTsc = path.join(directRoot, 'node_modules', '.bin', 'tsc');
  fs.mkdirSync(path.dirname(directTsc), { recursive: true });
  fs.writeFileSync(directTsc, '#!/usr/bin/env node\n', 'utf8');

  const directBin = resolveTypeScriptTool(directRoot, { env: {}, platform: 'linux' });
  assert.equal(directBin.kind, 'direct-bin');
  assert.equal(directBin.command, directTsc);
  assert.deepEqual(directBin.argsPrefix, []);
  assert.equal(directBin.source, 'local-node-modules-bin');

  const fullInstallRoot = tempDir();
  const packageBin = path.join(fullInstallRoot, 'node_modules', '.bin', 'tsc');
  const packageLib = path.join(fullInstallRoot, 'node_modules', 'typescript', 'lib', 'tsc.js');
  fs.mkdirSync(path.dirname(packageBin), { recursive: true });
  fs.mkdirSync(path.dirname(packageLib), { recursive: true });
  fs.writeFileSync(packageBin, '#!/usr/bin/env node\n', 'utf8');
  fs.writeFileSync(packageLib, '// fallback only\n', 'utf8');

  const fullInstall = resolveTypeScriptTool(fullInstallRoot, {
    node: '/custom/node',
    env: {},
    platform: 'linux',
  });
  assert.equal(fullInstall.kind, 'direct-bin');
  assert.equal(fullInstall.command, packageBin);
  assert.deepEqual(fullInstall.argsPrefix, []);
  assert.equal(fullInstall.source, 'local-node-modules-bin');

  const manual = resolveTypeScriptTool(tempDir(), {
    env: { WP_ALLOW_SYSTEM_TSC: '1', WP_TSC_BIN: '/manual/tsc' },
    spawnImpl: () => {
      throw new Error('manual bin should not probe system tsc');
    },
  });
  assert.equal(manual.kind, 'manual-bin');
  assert.equal(manual.command, '/manual/tsc');
  assert.deepEqual(manual.argsPrefix, []);

  const system = resolveTypeScriptTool(tempDir(), {
    env: { WP_ALLOW_SYSTEM_TSC: '1' },
    spawnImpl: () => ({ status: 0 }),
  });
  assert.equal(system.kind, 'system');
  assert.equal(system.command, 'tsc');
  assert.deepEqual(system.argsPrefix, []);
});

test('TypeScript resolver avoids npm .cmd shims on Windows local installs', () => {
  const root = tempDir();
  const packageBin = path.join(root, 'node_modules', 'typescript', 'bin', 'tsc');
  const cmdShim = path.join(root, 'node_modules', '.bin', 'tsc.cmd');
  fs.mkdirSync(path.dirname(packageBin), { recursive: true });
  fs.mkdirSync(path.dirname(cmdShim), { recursive: true });
  fs.writeFileSync(packageBin, '#!/usr/bin/env node\nimport "../lib/tsc.js";\n', 'utf8');
  fs.writeFileSync(cmdShim, '@ECHO off\r\n', 'utf8');

  const resolved = resolveTypeScriptTool(root, {
    node: 'C:\\Program Files\\nodejs\\node.exe',
    env: {},
    platform: 'win32',
  });

  assert.equal(resolved.kind, 'node-script');
  assert.equal(resolved.command, 'C:\\Program Files\\nodejs\\node.exe');
  assert.deepEqual(resolved.argsPrefix, [packageBin]);
  assert.equal(resolved.source, 'local-node-modules-package-bin');
  assert.equal(resolved.bin, packageBin);
});

test('TypeScript resolver rejects a Windows install that exposes only the unsafe tsc.cmd shim', () => {
  const root = tempDir();
  const cmdShim = path.join(root, 'node_modules', '.bin', 'tsc.cmd');
  fs.mkdirSync(path.dirname(cmdShim), { recursive: true });
  fs.writeFileSync(cmdShim, '@ECHO off\r\n', 'utf8');

  const resolved = resolveTypeScriptTool(root, {
    node: 'C:\\Program Files\\nodejs\\node.exe',
    env: {},
    platform: 'win32',
  });

  assert.equal(resolved, null);
});

test('typecheck flow runs Windows package bin through node instead of tsc.cmd', () => {
  const root = tempDir();
  const configPath = resolveTypecheckConfigPath(root, 'boot');
  const packageBin = path.join(root, 'node_modules', 'typescript', 'bin', 'tsc');
  const cmdShim = path.join(root, 'node_modules', '.bin', 'tsc.cmd');
  fs.writeFileSync(configPath, '{"compilerOptions":{}}\n', 'utf8');
  fs.mkdirSync(path.dirname(packageBin), { recursive: true });
  fs.mkdirSync(path.dirname(cmdShim), { recursive: true });
  fs.writeFileSync(packageBin, '#!/usr/bin/env node\nimport "../lib/tsc.js";\n', 'utf8');
  fs.writeFileSync(cmdShim, '@ECHO off\r\n', 'utf8');

  const invocations = [];
  const result = runTypecheckFlow({
    root,
    node: 'C:\\Program Files\\nodejs\\node.exe',
    platform: 'win32',
    runAll: false,
    mode: 'boot',
    spawnImpl(cmd, args, options) {
      invocations.push({ cmd, args, cwd: options.cwd });
      return { status: 0 };
    },
  });

  assert.equal(result.ok, true);
  assert.equal(invocations.length, 1);
  assert.equal(invocations[0].cmd, 'C:\\Program Files\\nodejs\\node.exe');
  assert.deepEqual(invocations[0].args.slice(0, 3), [packageBin, '-p', configPath]);
  assert.doesNotMatch(invocations[0].cmd, /tsc\.cmd$/i);
});

test('typecheck flow rejects unknown options and CI system tsc fallback', () => {
  const root = tempDir();
  fs.writeFileSync(resolveTypecheckConfigPath(root, 'runtime'), '{"compilerOptions":{}}\n', 'utf8');

  const unknown = runTypecheckFlow({
    root,
    runAll: false,
    mode: 'runtime',
    unknownOptions: ['--badflag'],
  });
  assert.equal(unknown.ok, false);
  assert.equal(unknown.reason, 'unknown-options');
  assert.match(unknown.errorMessage, /Unknown option\(s\): --badflag/);

  const blocked = runTypecheckFlow({
    root,
    runAll: false,
    mode: 'runtime',
    env: { WP_ALLOW_SYSTEM_TSC: '1', CI: '1' },
    spawnImpl() {
      return { status: 0 };
    },
  });
  assert.equal(blocked.ok, false);
  assert.equal(blocked.reason, 'system-tsc-refused');
  assert.match(blocked.errorMessage, /manual-only.*Run npm ci/);
});

test('typecheck flow runs matching config and reports success', () => {
  const root = tempDir();
  fs.writeFileSync(resolveTypecheckConfigPath(root, 'runtime'), '{"compilerOptions":{}}\n', 'utf8');
  fs.mkdirSync(path.join(root, 'node_modules', 'typescript', 'lib'), { recursive: true });
  fs.writeFileSync(path.join(root, 'node_modules', 'typescript', 'lib', 'tsc.js'), '// stub\n', 'utf8');

  const invocations = [];
  const logs = [];
  const result = runTypecheckFlow({
    root,
    node: '/usr/bin/node',
    runAll: false,
    mode: 'runtime',
    log: msg => logs.push(msg),
    spawnImpl(cmd, args, options) {
      invocations.push({ cmd, args, cwd: options.cwd, stdio: options.stdio });
      return { status: 0 };
    },
  });

  assert.equal(result.ok, true);
  assert.equal(invocations.length, 1);
  assert.equal(invocations[0].cmd, '/usr/bin/node');
  assert.equal(invocations[0].args[0], path.join(root, 'node_modules', 'typescript', 'lib', 'tsc.js'));
  assert.equal(invocations[0].args[1], '-p');
  assert.equal(invocations[0].args[2], resolveTypecheckConfigPath(root, 'runtime'));
  assert.ok(logs.some(line => /typecheck completed successfully/i.test(line)));
});

test('typecheck dist mode preserves noEmit while using local TypeScript', () => {
  const root = tempDir();
  fs.writeFileSync(resolveTypecheckConfigPath(root, 'dist'), '{"compilerOptions":{}}\n', 'utf8');
  fs.mkdirSync(path.join(root, 'node_modules', 'typescript', 'lib'), { recursive: true });
  fs.writeFileSync(path.join(root, 'node_modules', 'typescript', 'lib', 'tsc.js'), '// stub\n', 'utf8');

  assert.deepEqual(resolveTypecheckExtraArgs('dist'), ['--noEmit']);

  const invocations = [];
  const result = runTypecheckFlow({
    root,
    node: '/usr/bin/node',
    runAll: false,
    mode: 'dist',
    spawnImpl(cmd, args) {
      invocations.push({ cmd, args });
      return { status: 0 };
    },
  });

  assert.equal(result.ok, true);
  assert.equal(invocations[0].args.at(-1), '--noEmit');
});

test('typecheck flow skips missing configs for --all and errors for unknown or missing single mode', () => {
  const root = tempDir();
  fs.writeFileSync(resolveTypecheckConfigPath(root, 'boot'), '{"compilerOptions":{}}\n', 'utf8');
  fs.mkdirSync(path.join(root, 'node_modules', 'typescript', 'lib'), { recursive: true });
  fs.writeFileSync(path.join(root, 'node_modules', 'typescript', 'lib', 'tsc.js'), '// stub\n', 'utf8');

  const warnings = [];
  const allResult = runTypecheckFlow({
    root,
    node: '/usr/bin/node',
    runAll: true,
    mode: null,
    warn: msg => warnings.push(msg),
    spawnImpl() {
      return { status: 0 };
    },
  });
  assert.equal(allResult.ok, true);
  assert.ok(warnings.includes(createSkippedMissingConfigMessage(MODE_TO_CONFIG['strict-boot'])));

  const unknownMode = runTypecheckFlow({
    root,
    runAll: false,
    mode: 'wat',
    spawnImpl() {
      return { status: 0 };
    },
  });
  assert.equal(unknownMode.ok, false);
  assert.match(unknownMode.errorMessage, /Unknown mode/);

  const missingConfig = runTypecheckFlow({
    root,
    runAll: false,
    mode: 'services',
    spawnImpl() {
      return { status: 0 };
    },
  });
  assert.equal(missingConfig.ok, false);
  assert.equal(missingConfig.errorMessage, createMissingConfigMessage(MODE_TO_CONFIG.services));
});

test('package typecheck scripts route through wp_typecheck instead of direct tsc', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8'));
  const typecheckScripts = Object.entries(pkg.scripts).filter(([name]) => name.startsWith('typecheck'));
  assert.ok(typecheckScripts.length > 0);
  for (const [name, script] of typecheckScripts) {
    if (name === 'typecheck:wp') continue;
    assert.match(
      script,
      /node tools\/(?:wp_typecheck\.js|wp_typecheck_parallel\.mjs|wp_typecheck_changed\.mjs)|npm run typecheck:all/
    );
    assert.doesNotMatch(script, /\btsc\b/);
  }
});
