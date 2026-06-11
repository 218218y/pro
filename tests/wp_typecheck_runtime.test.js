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
  resolveTypecheckConfigPath,
  resolveTypecheckModes,
} from '../tools/wp_typecheck_state.js';
import { createTypecheckHelpText, resolveTsc } from '../tools/wp_typecheck_shared.js';
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

  assert.equal(resolveTypecheckModes({ runAll: false, mode: 'services' })[0], 'services');
  assert.ok(resolveTypecheckModes({ runAll: true, mode: null }).includes('strict-runtime'));
  assert.match(createTypecheckHelpText(), /wp_typecheck\.js --mode runtime/);
});

test('typecheck resolves WP_TSC_BIN before local or global lookup', () => {
  const root = tempDir();
  const resolved = resolveTsc(root, { env: { WP_TSC_BIN: '/custom/tsc' } });
  assert.deepEqual(resolved, { kind: 'bin', cmd: '/custom/tsc', label: '/custom/tsc' });
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
  assert.equal(invocations[0].args[2], resolveTypecheckConfigPath(root, 'runtime'));
  assert.ok(logs.some(line => /typecheck completed successfully/i.test(line)));
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
