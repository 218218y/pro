import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  createMissingConfigMessage,
  createSkippedMissingConfigMessage,
  MODE_TO_CONFIG,
  parseTypecheckArgs,
  resolveTypecheckExtraArgs,
  resolveTypecheckConfigPath,
  resolveTypecheckModes,
} from '../tools/wp_typecheck_state.js';
import { createTypecheckHelpText, resolveTsc } from '../tools/wp_typecheck_shared.js';
import { resolveTypeScriptTool } from '../tools/wp_typescript_resolver.js';
import { runTypecheckFlow } from '../tools/wp_typecheck_flow.js';

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
  assert.equal(local.source, 'local-node-modules');
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
  assert.equal(nodeScript.source, 'local-node-modules');

  const directRoot = tempDir();
  const directTsc = path.join(
    directRoot,
    'node_modules',
    '.bin',
    process.platform === 'win32' ? 'tsc.cmd' : 'tsc'
  );
  fs.mkdirSync(path.dirname(directTsc), { recursive: true });
  fs.writeFileSync(directTsc, '#!/usr/bin/env node\n', 'utf8');

  const directBin = resolveTypeScriptTool(directRoot, { env: {} });
  assert.equal(directBin.kind, 'direct-bin');
  assert.equal(directBin.command, directTsc);
  assert.deepEqual(directBin.argsPrefix, []);
  assert.equal(directBin.source, 'local-node-modules-bin');

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
    assert.match(script, /node tools\/wp_typecheck\.js|npm run typecheck:all/);
    assert.doesNotMatch(script, /\btsc\b/);
  }
});
