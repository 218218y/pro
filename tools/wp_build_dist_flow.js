import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { exists, mkdirp, resolveTscInvocation, rmrf } from './wp_build_dist_shared.js';
import { copyEsmMjsVerbatim, copyStaticDistAssets } from './wp_build_dist_assets.js';
import { createBuildDistSuccessMessage, resolveBuildDistPaths } from './wp_build_dist_state.js';

function createBuildDistError(message, exitCode = 1) {
  const err = new Error(message);
  err.exitCode = typeof exitCode === 'number' ? exitCode : 1;
  err.buildDistHandled = true;
  return err;
}

export function cleanDistOutputs({ paths, assets }) {
  rmrf(paths.distEsmAbs);
  rmrf(paths.distTypesAbs);
  rmrf(paths.tsBuildInfoAbs);
  if (!assets) return;

  rmrf(path.join(paths.distAbs, 'css'));
  rmrf(path.join(paths.distAbs, 'libs'));
  rmrf(path.join(paths.distAbs, 'docs'));
  for (const f of ['index_pro.html', 'index_pro_esm.html', 'wp_logo_data.js', 'wp_runtime_config.mjs']) {
    const p = path.join(paths.distAbs, f);
    if (exists(p)) rmrf(p);
  }
}

export function runTypescriptDistBuild({
  root,
  tscInvocation,
  tsconfigAbs,
  spawnImpl = spawnSync,
  processEnv = process.env,
}) {
  const invocation = tscInvocation || null;
  if (!invocation || typeof invocation.cmd !== 'string' || !invocation.cmd) {
    throw createBuildDistError('[WP BuildDist] Missing TypeScript invocation.');
  }
  return spawnImpl(
    invocation.cmd,
    [...(Array.isArray(invocation.args) ? invocation.args : []), '-p', tsconfigAbs],
    {
      stdio: 'inherit',
      cwd: root,
      env: processEnv,
    }
  );
}

export function runBuildDistFlow({
  root,
  args,
  spawnImpl = spawnSync,
  processEnv = process.env,
  log = console.log,
  warn = console.warn,
} = {}) {
  const paths = resolveBuildDistPaths({ root, tsconfig: args.tsconfig });

  for (const option of args.unknownOptions || []) {
    warn('[WP BuildDist] Unknown option:', option);
  }

  if (!exists(paths.tsconfigAbs)) {
    throw createBuildDistError(`[WP BuildDist] Missing tsconfig: ${path.relative(root, paths.tsconfigAbs)}`);
  }

  const tscInvocation = resolveTscInvocation(root);
  if (!tscInvocation) {
    throw createBuildDistError(
      '[WP BuildDist] Missing dependency: typescript (expected node_modules/typescript or a system tsc on PATH)\n              Run: npm i'
    );
  }

  if (args.clean) cleanDistOutputs({ paths, assets: args.assets });

  mkdirp(paths.distAbs);

  log(`[WP BuildDist] Building dist modules (tsc:${tscInvocation.source})...`);
  const res = runTypescriptDistBuild({
    root,
    tscInvocation,
    tsconfigAbs: paths.tsconfigAbs,
    spawnImpl,
    processEnv,
  });
  if (res.status !== 0) {
    throw createBuildDistError(`[WP BuildDist] TypeScript build failed (exit ${res.status ?? 'unknown'})`);
  }

  if (!exists(paths.entryAbs) && exists(paths.tsBuildInfoAbs)) {
    warn('[WP BuildDist] Missing entry after incremental build; retrying once without tsbuildinfo...');
    rmrf(paths.tsBuildInfoAbs);
    const retry = runTypescriptDistBuild({
      root,
      tscInvocation,
      tsconfigAbs: paths.tsconfigAbs,
      spawnImpl,
      processEnv,
    });
    if (retry.status !== 0) {
      throw createBuildDistError(
        `[WP BuildDist] TypeScript rebuild failed (exit ${retry.status ?? 'unknown'})`
      );
    }
  }

  if (!exists(paths.entryAbs)) {
    throw createBuildDistError(
      `[WP BuildDist] Build completed but missing entry: ${path.relative(root, paths.entryAbs)}`
    );
  }

  copyEsmMjsVerbatim({ root, distEsmAbs: paths.distEsmAbs });

  if (args.assets) {
    log('[WP BuildDist] Copying static assets to dist/...');
    copyStaticDistAssets({ root, distAbs: paths.distAbs });
  }

  return {
    paths,
    successMessage: createBuildDistSuccessMessage({ assets: args.assets }),
  };
}
