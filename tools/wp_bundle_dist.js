import path from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  DIST_BUILD_INFO_REL,
  exists,
  getLatestMtimeMs,
  getOldestMtimeMs,
  isDistSourceFile,
  mkdirp,
  resolveBuiltEntry,
  resolveTscInvocation,
  rmrf,
} from './wp_bundle_shared.js';

export function shouldRebuildDistModules(root, options = {}) {
  const { entryAbs, preferred, fallback } = resolveBuiltEntry(root);
  const buildInfoAbs = path.join(root, DIST_BUILD_INFO_REL);

  if (options.forceDistRebuild) {
    return { rebuild: true, reason: 'forced by --force-dist-rebuild', preferred, fallback, buildInfoAbs };
  }
  if (!exists(entryAbs)) {
    return { rebuild: true, reason: 'missing built ESM entry', preferred, fallback, buildInfoAbs };
  }
  if (!exists(buildInfoAbs)) {
    return {
      rebuild: true,
      reason: 'missing TypeScript incremental build info',
      preferred,
      fallback,
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
      preferred,
      fallback,
      buildInfoAbs,
    };
  }

  return {
    rebuild: false,
    reason: 'dist/esm entry and TypeScript build info are fresh',
    preferred,
    fallback,
    buildInfoAbs,
    entryAbs,
  };
}

export function buildDistModules(root, options = {}) {
  const tsconfigAbs = path.join(root, 'tsconfig.dist.json');
  if (!exists(tsconfigAbs)) {
    throw new Error(`[WP Bundle] Missing tsconfig: ${path.relative(root, tsconfigAbs)}`);
  }

  const tscInvocation = resolveTscInvocation(root);
  if (!tscInvocation) {
    throw new Error(
      '[WP Bundle] Missing dependency: typescript (expected node_modules/typescript or a system tsc on PATH)'
    );
  }

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
  const res = spawnSync(
    tscInvocation.cmd,
    [...(Array.isArray(tscInvocation.args) ? tscInvocation.args : []), '-p', tsconfigAbs],
    {
      stdio: 'inherit',
      cwd: root,
      env: process.env,
    }
  );
  if (res.status !== 0) {
    throw new Error(`[WP Bundle] TypeScript build failed (exit ${res.status ?? 'unknown'})`);
  }

  const { preferred, fallback, entryAbs } = resolveBuiltEntry(root);
  if (!exists(entryAbs)) {
    throw new Error(
      `[WP Bundle] Build completed but missing entry: ${path.relative(root, preferred)} (or fallback: ${path.relative(root, fallback)})`
    );
  }

  return entryAbs;
}
