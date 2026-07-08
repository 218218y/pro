import path from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  DIST_BUILD_INFO_REL,
  exists,
  getLatestMtimeMs,
  getOldestMtimeMs,
  isDistSourceFile,
  mkdirp,
  resolveBundleDistEntry,
  resolveTscInvocation,
  rmrf,
} from './wp_bundle_shared.js';
import { createLocalTypeScriptNotFoundMessage } from './wp_typescript_resolver.js';

export function shouldRebuildDistModules(root, options = {}) {
  const entryAbs = resolveBundleDistEntry(root);
  const buildInfoAbs = path.join(root, DIST_BUILD_INFO_REL);

  if (options.forceDistRebuild) {
    return { rebuild: true, reason: 'forced by --force-dist-rebuild', entryAbs, buildInfoAbs };
  }
  if (!exists(entryAbs)) {
    return { rebuild: true, reason: 'missing built ESM entry', entryAbs, buildInfoAbs };
  }
  if (!exists(buildInfoAbs)) {
    return {
      rebuild: true,
      reason: 'missing TypeScript incremental build info',
      entryAbs,
      buildInfoAbs,
    };
  }

  const latestInputMs = getLatestMtimeMs(
    [
      path.join(root, 'esm'),
      path.join(root, 'types'),
      path.join(root, 'tsconfig.json'),
      path.join(root, 'tsconfig.dist.json'),
      path.join(root, 'package.json'),
    ],
    isDistSourceFile
  );

  const freshnessBarrierMs = getOldestMtimeMs([entryAbs, buildInfoAbs]);
  if (!Number.isFinite(freshnessBarrierMs) || freshnessBarrierMs < latestInputMs) {
    return {
      rebuild: true,
      reason: 'dist/esm entry or TypeScript build info is older than a source or config file',
      entryAbs,
      buildInfoAbs,
    };
  }

  return {
    rebuild: false,
    reason: 'dist/esm entry and TypeScript build info are fresh',
    buildInfoAbs,
    entryAbs,
  };
}

export function buildDistModules(root, options = {}) {
  const processEnv = options.env || process.env;
  const spawnImpl = options.spawnImpl || spawnSync;
  const tsconfigAbs = path.join(root, 'tsconfig.dist.json');
  if (!exists(tsconfigAbs)) {
    throw new Error(`[WP Bundle] Missing tsconfig: ${path.relative(root, tsconfigAbs)}`);
  }

  const tscInvocation = resolveTscInvocation(root, { env: processEnv, spawnImpl });
  if (!tscInvocation) {
    throw new Error(createLocalTypeScriptNotFoundMessage('[WP Bundle] '));
  }
  if (tscInvocation.warning) console.warn(`[WP Bundle] ${tscInvocation.warning}`);

  const distAbs = path.join(root, 'dist');
  const distEsmAbs = path.join(distAbs, 'esm');
  const distTypesAbs = path.join(distAbs, 'types');
  const freshness = shouldRebuildDistModules(root, options);

  if (!freshness.rebuild && exists(freshness.entryAbs)) {
    console.log(`[WP Bundle] Reusing dist modules (${freshness.reason}).`);
    return freshness.entryAbs;
  }

  mkdirp(distAbs);
  if (options.forceDistRebuild) {
    rmrf(distEsmAbs);
    rmrf(distTypesAbs);
    rmrf(freshness.buildInfoAbs);
  }

  console.log(`[WP Bundle] Building dist modules (tsc:${tscInvocation.source}) - ${freshness.reason}...`);
  const res = spawnImpl(
    tscInvocation.cmd,
    [...(Array.isArray(tscInvocation.args) ? tscInvocation.args : []), '-p', tsconfigAbs],
    {
      stdio: 'inherit',
      cwd: root,
      env: processEnv,
    }
  );
  if (res.status !== 0) {
    throw new Error(`[WP Bundle] TypeScript build failed (exit ${res.status ?? 'unknown'})`);
  }

  const entryAbs = resolveBundleDistEntry(root);
  if (!exists(entryAbs)) {
    throw new Error(`[WP Bundle] Build completed but missing entry: ${path.relative(root, entryAbs)}`);
  }

  return entryAbs;
}
