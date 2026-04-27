import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileExists, getNodeArgs } from './wp_test_shared.js';
import {
  createNoTestsMessage,
  createRunBanner,
  createSkippedE2ENotice,
  createTestRunFlags,
  selectRunnableTests,
} from './wp_test_state.js';

export function ensureDistBuilt({ projectRoot, childEnv, noBuild, runners = {} }) {
  const entry = path.join(projectRoot, 'dist', 'esm', 'main.js');
  if (fileExists(entry)) return { built: false };

  if (noBuild) {
    throw new Error('[WardrobePro] tests: dist is missing. Build first: npm run build:dist');
  }

  const runCmd =
    runners.runCmd ||
    function runCmd({ args, cwd, env }) {
      return spawnSync(process.execPath, args, {
        stdio: 'inherit',
        cwd,
        env,
      });
    };

  console.log('[WardrobePro] tests: dist is missing; building (no assets)...');
  const res = runCmd({
    args: ['tools/wp_build_dist.js', '--no-assets'],
    cwd: projectRoot,
    env: childEnv,
  });
  if ((res?.status ?? 0) !== 0) {
    throw new Error(`[WardrobePro] build dist failed with status ${res?.status || 1}`);
  }
  return { built: true };
}

export function runTestFlow({ projectRoot, childEnv, flags, runners = {} }) {
  ensureDistBuilt({
    projectRoot,
    childEnv,
    noBuild: flags.noBuild,
    runners,
  });

  const selected = selectRunnableTests({
    projectRoot,
    pattern: flags.pattern,
  });

  if (!selected.files.length) {
    return {
      ok: true,
      files: [],
      skippedE2E: selected.skippedE2E,
      message: createNoTestsMessage({ skippedE2E: selected.skippedE2E }),
      note: '',
    };
  }

  const nodeArgs = getNodeArgs({
    projectRoot,
    forceTsx: flags.forceTsx,
  });
  const runFlags = createTestRunFlags(flags);
  const notice = createSkippedE2ENotice(selected.skippedE2E);
  const runOne =
    runners.runOne ||
    function runOne({ filePath, nodeArgs: nodeArgList, cwd, env }) {
      return spawnSync(process.execPath, [...nodeArgList, filePath], {
        stdio: 'inherit',
        cwd,
        env,
      });
    };

  console.log(createRunBanner({ files: selected.files, flags: runFlags }));
  if (notice) console.log(notice);

  let fail = 0;
  for (const filePath of selected.files) {
    const rel = path.relative(projectRoot, filePath);
    const res = runOne({
      filePath,
      nodeArgs,
      cwd: projectRoot,
      env: childEnv,
    });
    if ((res?.status ?? 0) !== 0) {
      console.error(`[WardrobePro] Test failed: ${rel}`);
      fail += 1;
    }
  }

  return {
    ok: fail === 0,
    fail,
    files: selected.files,
    skippedE2E: selected.skippedE2E,
    banner: createRunBanner({ files: selected.files, flags: runFlags }),
    note: notice,
    nodeArgs,
  };
}
