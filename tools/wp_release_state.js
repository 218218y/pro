import path from 'node:path';
import { resolveSafeUnderRoot } from './wp_release_build.js';
import { normalizeObservabilityBuildMode } from './wp_observability_build.js';

export function parseReleaseArgs({ root, args }) {
  const argv = Array.isArray(args) ? args.slice() : [];

  let distRootRel = 'dist';
  let templatePath = null;
  let outDirRel = null;
  let wantMinify = true;
  let wantHtmlMinify = true;
  let wantCssMinify = true;
  let keepSourceMap = false;
  let wantObfuscate = false;
  let obfuscateMode = 'balanced';
  let wantPostMinify = true;
  let hashAssets = true;
  let buildDistSite = true;
  let distKeepSourceMap = true;
  let buildMode = 'client';

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--site2') {
      distRootRel = 'dist/site2';
      templatePath = path.join(root, 'tools', 'index_release_bundle_site2.html');
    }
  }

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dist-root' && argv[i + 1]) {
      distRootRel = argv[++i];
      continue;
    }
    if (a === '--template' && argv[i + 1]) {
      templatePath = argv[++i];
      continue;
    }
    if (a === '--out' && argv[i + 1]) {
      outDirRel = argv[++i];
      continue;
    }
    if (a === '--build-mode' && argv[i + 1]) {
      buildMode = normalizeObservabilityBuildMode(argv[++i], buildMode);
      continue;
    }
    if (a === '--client') {
      buildMode = 'client';
      continue;
    }
    if (a === '--perf') {
      buildMode = 'perf';
      continue;
    }

    if (a === '--no-minify') wantMinify = false;
    if (a === '--minify') wantMinify = true;
    if (a === '--no-html-minify') wantHtmlMinify = false;
    if (a === '--html-minify') wantHtmlMinify = true;
    if (a === '--no-css-minify') wantCssMinify = false;
    if (a === '--css-minify') wantCssMinify = true;
    if (a === '--debug' || a === '--keep-sourcemap') {
      keepSourceMap = true;
      buildMode = 'debug';
    }
    if (a === '--no-sourcemap') keepSourceMap = false;

    if (a === '--obfuscate') wantObfuscate = true;
    if (a === '--obfuscate-lite') {
      wantObfuscate = true;
      obfuscateMode = 'lite';
    }
    if (a === '--obfuscate-strong') {
      wantObfuscate = true;
      obfuscateMode = 'strong';
    }
    if (a === '--no-obfuscate') wantObfuscate = false;
    if (a === '--no-post-minify') wantPostMinify = false;
    if (a === '--post-minify') wantPostMinify = true;

    if (a === '--no-dist-site') buildDistSite = false;
    if (a === '--dist-site') buildDistSite = true;
    if (a === '--no-dist-sourcemap') distKeepSourceMap = false;
    if (a === '--dist-sourcemap') distKeepSourceMap = true;
    if (a === '--no-hash') hashAssets = false;
    if (a === '--hash') hashAssets = true;
  }

  if (wantObfuscate && keepSourceMap) {
    console.warn('[WP Release] NOTE: Obfuscation + source maps defeats part of the purpose.');
    console.warn('             Disabling source maps for this build (omit --debug if you want security).');
    keepSourceMap = false;
  }

  return {
    distRootRel,
    templatePath,
    outDirRel,
    wantMinify,
    wantHtmlMinify,
    wantCssMinify,
    keepSourceMap,
    wantObfuscate,
    obfuscateMode,
    wantPostMinify,
    hashAssets,
    buildDistSite,
    distKeepSourceMap,
    buildMode,
  };
}

export function resolveReleasePaths({ root, distRootRel, outDirRel }) {
  const distDir = resolveSafeUnderRoot(root, distRootRel, 'dist-root');
  const bundlePath = path.join(distDir, 'wardrobepro.bundle.js');
  const bundleMapPath = `${bundlePath}.map`;
  const defaultOutAbs = path.join(distDir, 'release');
  const outAbs = outDirRel ? path.resolve(root, outDirRel) : defaultOutAbs;
  const rootAbs = path.resolve(root);

  if (outAbs === rootAbs || !outAbs.startsWith(rootAbs + path.sep)) {
    throw new Error(
      `[WP Release] Unsafe --out path: ${outDirRel}. Must be a subfolder of the repo root (e.g. "dist/release").`
    );
  }

  return {
    distDir,
    bundlePath,
    bundleMapPath,
    releaseDir: outAbs,
  };
}
