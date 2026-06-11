import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  parseVerifyArgs,
  classifyFormatCheckResult,
  createVerifySuccessMessage,
} from '../tools/wp_verify_state.js';
import { ensureDistBuilt, runVerifyFlow } from '../tools/wp_verify_flow.js';

function tempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'wp-verify-'));
}

test('verify args parsing preserves gate/no-build/skip-bundle/soft-format policy', () => {
  assert.deepEqual(parseVerifyArgs(['--gate', '--no-build', '--ci']), {
    gate: true,
    noBuild: true,
    skipBundle: true,
    softFormat: false,
  });
  assert.deepEqual(parseVerifyArgs(['--strict', '--skip-bundle', '--soft-format']), {
    gate: true,
    noBuild: false,
    skipBundle: true,
    softFormat: true,
  });
  assert.deepEqual(parseVerifyArgs([]), {
    gate: false,
    noBuild: false,
    skipBundle: false,
    softFormat: false,
  });
});

test('format check classification warns in normal mode and fails in strict gate mode', () => {
  const diff = {
    ok: false,
    code: 1,
    error: null,
    stdout: 'Code style issues found in the above file. Run Prettier with --write.',
    stderr: '',
  };

  const warn = classifyFormatCheckResult(diff, { gate: false });
  assert.equal(warn.ok, true);
  assert.equal(warn.hasFormatWarn, true);
  assert.match(warn.message, /warning only/);

  const fatal = classifyFormatCheckResult(diff, { gate: true });
  assert.equal(fatal.ok, false);
  assert.equal(fatal.fatal, true);
  assert.match(fatal.message, /gate mode/);

  const softGate = classifyFormatCheckResult(diff, { gate: true, softFormat: true });
  assert.equal(softGate.ok, true);
  assert.equal(softGate.hasFormatWarn, true);
  assert.match(softGate.message, /soft-format/);

  assert.match(createVerifySuccessMessage({ gate: true, hasFormatWarn: false }), /gate mode/);
  assert.match(createVerifySuccessMessage({ gate: false, hasFormatWarn: true }), /formatting warnings/);
});

test('ensureDistBuilt refuses missing dist in no-build mode and requests build otherwise', () => {
  const projectRoot = tempDir();
  assert.throws(
    () => ensureDistBuilt({ projectRoot, childEnv: process.env, noBuild: true }),
    /dist is missing/
  );

  const calls = [];
  const out = ensureDistBuilt({
    projectRoot,
    childEnv: process.env,
    noBuild: false,
    runners: {
      runCmd(args) {
        calls.push(args);
      },
    },
  });

  assert.equal(out.built, true);
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].args, ['tools/wp_build_dist.js', '--no-assets']);
});

test('verify flow orders core checks and skips bundle commands when requested', () => {
  const projectRoot = tempDir();
  const distMain = path.join(projectRoot, 'dist', 'esm');
  fs.mkdirSync(distMain, { recursive: true });
  fs.writeFileSync(path.join(distMain, 'main.js'), 'export {}\n', 'utf8');

  const steps = [];
  const result = runVerifyFlow({
    projectRoot,
    childEnv: process.env,
    flags: { gate: false, noBuild: false, skipBundle: true },
    runners: {
      npmRun({ scriptName }) {
        steps.push(`npm:${scriptName}`);
      },
      npmRunCapture({ scriptName }) {
        steps.push(`npm:${scriptName}`);
        return { ok: true, code: 0, error: null, stdout: '', stderr: '' };
      },
      runCmd({ args }) {
        steps.push(`node:${args[0]}`);
      },
    },
  });

  assert.equal(result.skipBundle, true);
  assert.equal(result.hasFormatWarn, false);
  assert.ok(steps.includes('npm:check:refactor-guardrails'));
  assert.ok(steps.includes('npm:test'));
  assert.ok(steps.indexOf('npm:check:refactor-guardrails') < steps.indexOf('npm:test'));
  assert.ok(steps.includes('node:tools/wp_esm_check.js'));
  assert.ok(!steps.includes('npm:bundle'));
  assert.ok(!steps.includes('npm:bundle:site2'));
});

test('verify flow runs both client release bundle targets in order when bundling is enabled', () => {
  const projectRoot = tempDir();
  const distMain = path.join(projectRoot, 'dist', 'esm');
  fs.mkdirSync(distMain, { recursive: true });
  fs.writeFileSync(path.join(distMain, 'main.js'), 'export {}\n', 'utf8');

  const steps = [];
  runVerifyFlow({
    projectRoot,
    childEnv: process.env,
    flags: { gate: false, noBuild: false, skipBundle: false },
    runners: {
      npmRun({ scriptName }) {
        steps.push(`npm:${scriptName}`);
      },
      npmRunCapture({ scriptName }) {
        steps.push(`npm:${scriptName}`);
        return { ok: true, code: 0, error: null, stdout: '', stderr: '' };
      },
      runCmd({ args }) {
        steps.push(`node:${args.join(' ')}`);
      },
    },
  });

  const bundleIndex = steps.indexOf('npm:bundle');
  const parityIndex = steps.indexOf(
    'node:tools/wp_release_parity.js --require-dist --require-release --artifacts-only'
  );
  const site2Index = steps.indexOf('npm:bundle:site2');
  assert.ok(bundleIndex >= 0, 'verify should run the primary release bundle');
  assert.ok(parityIndex > bundleIndex, 'verify should run release parity after the primary bundle');
  assert.ok(site2Index > parityIndex, 'verify should build the site2 release after parity succeeds');
});
