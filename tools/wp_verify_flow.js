import { createVerifySuccessMessage, classifyFormatCheckResult } from './wp_verify_state.js';
import { fileExists, header, npmRun, npmRunCapture, runCmd } from './wp_verify_shared.js';

function createVerifyError(message, exitCode, cause) {
  const err = new Error(message);
  err.exitCode = typeof exitCode === 'number' ? exitCode : 1;
  err.verifyHandled = true;
  if (cause) err.cause = cause;
  return err;
}

export function ensureDistBuilt({ projectRoot, childEnv, noBuild, runners = {} }) {
  const runCmdImpl = runners.runCmd || runCmd;
  const entry = `${projectRoot}/dist/esm/main.js`;
  if (fileExists(entry)) return { built: false, entry };

  if (noBuild) {
    throw createVerifyError('[WardrobePro] verify: dist is missing. Build first: npm run build:dist', 1);
  }

  header('[WardrobePro] build dist (no assets)');
  runCmdImpl({
    projectRoot,
    childEnv,
    cmd: process.execPath,
    args: ['tools/wp_build_dist.js', '--no-assets'],
    label: 'node tools/wp_build_dist.js --no-assets',
  });
  return { built: true, entry };
}

export function runVerifyFlow({ projectRoot, childEnv, flags, runners = {} }) {
  const runCmdImpl = runners.runCmd || runCmd;
  const npmRunImpl = runners.npmRun || npmRun;
  const npmRunCaptureImpl = runners.npmRunCapture || npmRunCapture;
  const gate = flags && flags.gate === true;
  const skipBundle = flags && flags.skipBundle === true;
  const noBuild = flags && flags.noBuild === true;

  npmRunImpl({ projectRoot, childEnv, scriptName: gate ? 'check:gate' : 'check:strict' });

  const fmt = npmRunCaptureImpl({ projectRoot, childEnv, scriptName: 'format:check' });
  const formatState = classifyFormatCheckResult(fmt, { gate });
  if (formatState.message) {
    const writer = formatState.ok ? console.warn : console.error;
    writer(formatState.message);
  }
  if (!formatState.ok) {
    throw createVerifyError(
      formatState.message || '\n❌ Verify failed at: npm run format:check',
      formatState.exitCode,
      formatState.cause
    );
  }

  npmRunImpl({ projectRoot, childEnv, scriptName: gate ? 'lint:strict' : 'lint' });
  npmRunImpl({ projectRoot, childEnv, scriptName: 'typecheck:all' });

  runCmdImpl({
    projectRoot,
    childEnv,
    cmd: process.execPath,
    args: ['tools/wp_pdf_template_check.js'],
    label: 'node tools/wp_pdf_template_check.js',
  });

  runCmdImpl({
    projectRoot,
    childEnv,
    cmd: process.execPath,
    args: ['tools/wp_cycles.js', 'esm'],
    label: 'node tools/wp_cycles.js esm',
  });

  ensureDistBuilt({ projectRoot, childEnv, noBuild, runners: { runCmd: runCmdImpl } });
  runCmdImpl({
    projectRoot,
    childEnv,
    cmd: process.execPath,
    args: ['tools/wp_esm_check.js'],
    label: 'node tools/wp_esm_check.js',
  });

  runCmdImpl({
    projectRoot,
    childEnv,
    cmd: process.execPath,
    args: ['tools/wp_three_vendor_contract.js'],
    label: 'node tools/wp_three_vendor_contract.js',
  });

  npmRunImpl({ projectRoot, childEnv, scriptName: 'ui:contract' });
  npmRunImpl({ projectRoot, childEnv, scriptName: 'contract:layers' });
  npmRunImpl({ projectRoot, childEnv, scriptName: 'contract:api' });
  npmRunImpl({ projectRoot, childEnv, scriptName: 'wiring:guard' });
  npmRunImpl({ projectRoot, childEnv, scriptName: 'ui:dom-guard' });
  npmRunImpl({ projectRoot, childEnv, scriptName: 'ui:bindkey-guard' });
  npmRunImpl({ projectRoot, childEnv, scriptName: 'check:refactor-guardrails' });
  npmRunImpl({ projectRoot, childEnv, scriptName: 'test' });

  if (!skipBundle) {
    npmRunImpl({ projectRoot, childEnv, scriptName: 'bundle' });
    runCmdImpl({
      projectRoot,
      childEnv,
      cmd: process.execPath,
      args: ['tools/wp_release_parity.js', '--require-dist', '--require-release', '--artifacts-only'],
      label: 'node tools/wp_release_parity.js --require-dist --require-release --artifacts-only',
    });
    npmRunImpl({ projectRoot, childEnv, scriptName: 'bundle:site2' });
  }

  return {
    gate,
    skipBundle,
    hasFormatWarn: formatState.hasFormatWarn === true,
    successMessage: createVerifySuccessMessage({ gate, hasFormatWarn: formatState.hasFormatWarn === true }),
  };
}
