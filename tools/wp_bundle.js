#!/usr/bin/env node
/**
 * WardrobePro bundle generator (Pure ESM).
 */
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { loadViteBuild } from './wp_bundle_shared.js';
import { parseBundleArgs, maybeHandleBundleHelp, resolveBundlePaths } from './wp_bundle_state.js';
import { buildDistModules } from './wp_bundle_dist.js';
import { buildBundleArtifacts } from './wp_bundle_emit.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function runBundleCli(argv = process.argv.slice(2)) {
  if (maybeHandleBundleHelp(argv)) return { help: true };

  const args = parseBundleArgs(argv);
  const root = path.resolve(__dirname, '..');
  const entryAbs = buildDistModules(root, { forceDistRebuild: args.forceDistRebuild });
  const { outFileAbs, outDirAbs, legacyTmpDirAbs } = resolveBundlePaths({ root, outFile: args.outFile });

  const viteBuild = await loadViteBuild();
  if (!viteBuild) process.exit(1);

  await buildBundleArtifacts({
    root,
    entryAbs,
    outFileAbs,
    outDirAbs,
    legacyTmpDirAbs,
    args,
    viteBuild,
  });

  console.log('[WP Bundle] Done:', path.relative(root, outFileAbs));
  return { outFileAbs, sourcemap: args.sourcemap };
}

runBundleCli().catch(err => {
  console.error('[WP Bundle] Failed:', err && err.stack ? err.stack : String(err));
  process.exit(1);
});
