// WardrobePro Release Packager (canonical entrypoint)
// - Keeps CLI surface/public output stable while delegating helpers to focused seams.

import fs from 'node:fs';
import path from 'node:path';

import {
  exists,
  mkdirp,
  rmrf,
  logSize,
  copyFile,
  copyDir,
  copyDirContents,
  listReleaseChunkRelFiles,
} from './wp_release_shared.js';
import { parseReleaseArgs, resolveReleasePaths } from './wp_release_state.js';
import {
  resolveFinalReleaseAssets,
  rewriteReleaseHtml,
  writeReleaseMetadata,
} from './wp_release_finalize.js';
import { applyContentHashingToRelease } from './wp_release_hashing.js';
import {
  buildThreeVendor,
  buildAppBundle,
  buildReleaseHtml,
  resolveSafeUnderRoot,
  prepareDistSite,
  ensureDistBundleCurrent,
  maybeMinifyBundle,
  maybeMinifyHtml,
  maybeMinifyCssDir,
  maybeObfuscateReleaseJs,
} from './wp_release_build.js';

export { applyContentHashingToRelease } from './wp_release_hashing.js';
export { resolveReleaseJsObfuscationPolicy } from './wp_release_build.js';
export { parseReleaseArgs } from './wp_release_state.js';
export { resolveFinalReleaseAssets, rewriteReleaseHtml } from './wp_release_finalize.js';

async function main() {
  const root = process.cwd();
  const config = parseReleaseArgs({ root, args: process.argv.slice(2) });
  const { distDir, bundlePath, bundleMapPath, releaseDir } = resolveReleasePaths({
    root,
    distRootRel: config.distRootRel,
    outDirRel: config.outDirRel,
  });

  const templateAbs = config.templatePath
    ? resolveSafeUnderRoot(root, config.templatePath, 'template')
    : null;
  const htmlTemplate = buildReleaseHtml(root, templateAbs);

  if (config.buildDistSite) {
    ensureDistBundleCurrent({
      root,
      distDir,
      bundlePath,
      bundleMapPath,
      distKeepSourceMap: config.distKeepSourceMap,
      buildMode: config.buildMode,
    });
    prepareDistSite({ root, distDir, htmlTemplate });
  }

  rmrf(releaseDir);
  mkdirp(releaseDir);

  const releaseBundlePath = path.join(releaseDir, 'wardrobepro.bundle.js');
  const releaseBundleMapPath = `${releaseBundlePath}.map`;
  console.log(
    `[WP Release] Building release app bundle (${config.wantMinify ? 'native minify: Oxc' : 'no minify'})...`
  );
  buildAppBundle({
    root,
    outFileAbs: releaseBundlePath,
    minify: config.wantMinify,
    sourcemap: config.keepSourceMap,
    buildMode: config.buildMode,
  });
  const minifyInfo = {
    minified: Boolean(config.wantMinify),
    engine: config.wantMinify ? 'oxc' : 'none',
    source: 'vite-native',
  };
  logSize('Release bundle after native build', releaseBundlePath);

  let obfuscateInfo = { obfuscated: false };
  if (config.wantObfuscate) {
    obfuscateInfo = await maybeObfuscateReleaseJs({
      inJsPath: releaseBundlePath,
      outJsPath: releaseBundlePath,
      wantObfuscate: config.wantObfuscate,
      requestedMode: config.obfuscateMode,
      keepSourceMap: false,
    });
    if (exists(releaseBundleMapPath)) fs.rmSync(releaseBundleMapPath, { force: true });
  }

  let postMinifyInfo = { minified: false, ran: false };
  if (obfuscateInfo.obfuscated && config.wantPostMinify && config.wantMinify) {
    postMinifyInfo = await maybeMinifyBundle({
      inJsPath: releaseBundlePath,
      inMapPath: releaseBundleMapPath,
      outJsPath: releaseBundlePath,
      outMapPath: releaseBundleMapPath,
      wantMinify: true,
      keepSourceMap: false,
    });
    postMinifyInfo.ran = true;
  }
  logSize('Release bundle final', releaseBundlePath);

  const distChunkFiles = listReleaseChunkRelFiles(releaseDir);
  for (const relFile of distChunkFiles) {
    const outJs = path.join(releaseDir, relFile);
    const outMap = `${outJs}.map`;

    let chunkObfuscateInfo = { obfuscated: false };
    if (config.wantObfuscate) {
      chunkObfuscateInfo = await maybeObfuscateReleaseJs({
        inJsPath: outJs,
        outJsPath: outJs,
        wantObfuscate: config.wantObfuscate,
        requestedMode: config.obfuscateMode,
        keepSourceMap: false,
      });
      if (exists(outMap)) fs.rmSync(outMap, { force: true });
    }

    if (chunkObfuscateInfo.obfuscated && config.wantPostMinify && config.wantMinify) {
      await maybeMinifyBundle({
        inJsPath: outJs,
        inMapPath: outMap,
        outJsPath: outJs,
        outMapPath: outMap,
        wantMinify: true,
        keepSourceMap: false,
      });
      if (exists(outMap)) fs.rmSync(outMap, { force: true });
    }
  }

  const cssSrc = path.join(root, 'css');
  if (exists(cssSrc)) copyDirContents(cssSrc, releaseDir, { exclude: ['logo.png'] });
  const cssMinifyInfo = exists(releaseDir)
    ? maybeMinifyCssDir({ cssDir: releaseDir, wantMinify: config.wantCssMinify })
    : { minified: false };

  const libsSrc = path.join(root, 'libs');
  const releaseLibsDir = path.join(releaseDir, 'libs');
  mkdirp(releaseLibsDir);

  const vendorOutAbs = path.join(releaseLibsDir, 'three.vendor.js');
  console.log('[WP Release] Building Three vendor bundle (tree-shaken)...');
  buildThreeVendor({
    root,
    outFileAbs: vendorOutAbs,
    minify: true,
    sourcemap: config.keepSourceMap,
    buildMode: config.buildMode,
  });
  rmrf(path.join(releaseLibsDir, '.tmp_vite_three_vendor'));
  rmrf(path.join(releaseLibsDir, 'temp'));

  if (exists(libsSrc)) copyDir(libsSrc, releaseLibsDir, { exclude: ['logo.png', 'three'] });

  const logoSrc = path.join(root, 'logo.png');
  if (exists(logoSrc)) copyFile(logoSrc, path.join(releaseDir, 'logo.png'));

  const logoDataSrc = path.join(root, 'wp_logo_data.js');
  if (exists(logoDataSrc)) copyFile(logoDataSrc, path.join(releaseDir, 'wp_logo_data.js'));

  const publicSrc = path.join(root, 'public');
  if (exists(publicSrc)) copyDirContents(publicSrc, releaseDir);

  const distAssetsSrc = path.join(distDir, 'assets');
  const releaseAssetsDir = path.join(releaseDir, 'assets');
  if (!exists(releaseAssetsDir) && exists(distAssetsSrc)) copyDir(distAssetsSrc, releaseAssetsDir);

  const supaCfgMjs = path.join(root, 'wp_runtime_config.mjs');
  if (exists(supaCfgMjs)) copyFile(supaCfgMjs, path.join(releaseDir, 'wp_runtime_config.mjs'));

  const hashed = config.hashAssets
    ? applyContentHashingToRelease({ releaseDirAbs: releaseDir, keepSourceMap: config.keepSourceMap })
    : {
        buildId: new Date()
          .toISOString()
          .replace(/[^0-9]/g, '')
          .slice(0, 12),
        js: {},
        css: {},
        three: {},
      };

  const finalAssets = resolveFinalReleaseAssets({
    releaseDir,
    hashAssets: config.hashAssets,
    hashed,
    keepSourceMap: config.keepSourceMap,
    chunkLogicalFiles: distChunkFiles,
  });

  const html = rewriteReleaseHtml({
    htmlTemplate,
    releaseDir,
    hashAssets: config.hashAssets,
    hashed,
    bundleRelFinal: finalAssets.bundleRelFinal,
    threeVendorMetaFinal: finalAssets.threeVendorMetaFinal,
    buildId: finalAssets.buildId,
  });
  const htmlInfo = await maybeMinifyHtml({ html, wantMinify: config.wantHtmlMinify });
  fs.writeFileSync(path.join(releaseDir, 'index.html'), htmlInfo.html, 'utf8');

  writeReleaseMetadata({
    root,
    releaseDir,
    minifyInfo,
    htmlInfo,
    cssMinifyInfo,
    obfuscateInfo,
    obfuscateMode: config.obfuscateMode,
    keepSourceMap: config.keepSourceMap,
    hashAssets: config.hashAssets,
    buildMode: config.buildMode,
    buildId: finalAssets.buildId,
    bundleRelFinal: finalAssets.bundleRelFinal,
    bundleAbsFinal: finalAssets.bundleAbsFinal,
    bundleMapRelFinal: finalAssets.bundleMapRelFinal,
    threeVendorMetaFinal: finalAssets.threeVendorMetaFinal,
    chunksFinal: finalAssets.chunksFinal,
    postMinifyInfo,
  });

  console.log(`[WP Release] Done. Release folder ready at (${config.buildMode}):`, releaseDir);
}

main().catch(err => {
  console.error('[WP Release] Failed:', err && err.stack ? err.stack : err);
  process.exit(1);
});
