import path from 'node:path';

import { normalizeObservabilityBuildMode } from './wp_observability_build.js';

export function parseBundleArgs(argv) {
  const out = {
    outFile: path.join('dist', 'wardrobepro.bundle.js'),
    sourcemap: true,
    forceDistRebuild: false,
    minify: false,
    buildMode: 'client',
  };

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--out' && argv[i + 1]) {
      out.outFile = argv[++i];
      continue;
    }
    if (a === '--sourcemap') {
      out.sourcemap = true;
      continue;
    }
    if (a === '--no-sourcemap') {
      out.sourcemap = false;
      continue;
    }
    if (a === '--force-dist-rebuild') {
      out.forceDistRebuild = true;
      continue;
    }
    if (a === '--minify') {
      out.minify = true;
      continue;
    }
    if (a === '--no-minify') {
      out.minify = false;
      continue;
    }
    if (a === '--build-mode' && argv[i + 1]) {
      out.buildMode = normalizeObservabilityBuildMode(argv[++i], out.buildMode);
      continue;
    }
    if (a === '--client') {
      out.buildMode = 'client';
      continue;
    }
    if (a === '--perf') {
      out.buildMode = 'perf';
      continue;
    }
    if (a === '--debug') {
      out.buildMode = 'debug';
      continue;
    }
    if (a === '--index' && argv[i + 1]) {
      i++;
      continue;
    }
    if (a.startsWith('-')) console.warn('[WP Bundle] Unknown option:', a);
  }

  return out;
}

export function maybeHandleBundleHelp(argv) {
  for (const a of argv) {
    if (a === '-h' || a === '--help') {
      console.log('WardrobePro bundle generator (Pure ESM)');
      console.log('  --force-dist-rebuild   Ignore freshness checks and rebuild dist/esm before bundling');
      console.log('  --minify               Use Vite 8 native minification (Oxc + Lightning CSS)');
      console.log('  --no-minify            Keep bundle readable (default)');
      console.log('  --build-mode <mode>    Observability build mode: client | perf | debug');
      return true;
    }
  }
  return false;
}

export function resolveBundlePaths({ root, outFile }) {
  const outFileAbs = path.isAbsolute(outFile) ? outFile : path.join(root, outFile);
  const outDirAbs = path.dirname(outFileAbs);
  const legacyTmpDirAbs = path.join(outDirAbs, '.tmp_vite_bundle');
  return { outFileAbs, outDirAbs, legacyTmpDirAbs };
}
