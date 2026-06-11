import fs from 'node:fs';
import path from 'node:path';
import {
  exists,
  mkdirp,
  listReleaseChunkRelFiles,
  listReleaseCssRelFiles,
  rewriteSourcemapCommentInPlace,
  escapeRegExp,
  insertHashBeforeExt,
  shortHashOfFile,
} from './wp_release_shared.js';

// Content-hash ownership for release assets.

export function applyContentHashingToRelease({ releaseDirAbs, keepSourceMap }) {
  // Content-hash JS chunks in-place (2-pass rewrite to break circular deps).
  // We keep index.html un-hashed and expect the server to serve it with no-cache.
  const bundleRel = 'wardrobepro.bundle.js';
  const bundleAbs = path.join(releaseDirAbs, bundleRel);
  if (!exists(bundleAbs)) throw new Error('[WP Release] Missing release bundle before hashing.');

  const chunkRels = listReleaseChunkRelFiles(releaseDirAbs);
  const jsLogicalRels = [bundleRel, ...chunkRels];

  // Optional: hash the Three vendor bundle too (loaded by index.html).
  const threeVendorLogicalRel = path.posix.join('libs', 'three.vendor.js');
  const threeVendorAbs = path.join(releaseDirAbs, 'libs', 'three.vendor.js');
  const hasThreeVendor = exists(threeVendorAbs);

  // Build a stable mapping for CSS (content doesn't reference JS names).
  const cssLogicalRels = listReleaseCssRelFiles(releaseDirAbs);
  const cssMap = {};
  for (const f of cssLogicalRels) {
    const h = shortHashOfFile(path.join(releaseDirAbs, f), 8);
    cssMap[f] = insertHashBeforeExt(f, h);
  }

  // Iteratively rewrite JS references until the hashed names stabilize.
  let jsMap = {};
  let lastSig = '';

  for (let pass = 0; pass < 4; pass++) {
    const nextMap = {};
    for (const logicalRel of jsLogicalRels) {
      const abs = path.join(releaseDirAbs, logicalRel);
      const h = shortHashOfFile(abs, 8);
      nextMap[logicalRel] = insertHashBeforeExt(logicalRel, h);
    }

    // Signature to detect stabilization.
    const sig = JSON.stringify(nextMap);
    jsMap = nextMap;
    if (sig === lastSig) break;
    lastSig = sig;

    // Rewrite references inside ALL app JS files (bundle + chunks).
    // We replace both unhashed and previously-hashed variants.
    const jsAbsFiles = jsLogicalRels.map(r => path.join(releaseDirAbs, r));
    for (const jsAbs of jsAbsFiles) {
      let code = fs.readFileSync(jsAbs, 'utf8');
      for (const [logicalRel, hashedRel] of Object.entries(jsMap)) {
        const logicalBase = path.posix.basename(logicalRel);
        const hashedBase = path.posix.basename(hashedRel);
        const baseNoExt = logicalBase.replace(/\.js$/i, '');
        const re = new RegExp(`${escapeRegExp(baseNoExt)}(?:\\.[a-f0-9]{6,64})?\\.js`, 'gi');
        code = code.replace(re, hashedBase);
      }
      fs.writeFileSync(jsAbs, code, 'utf8');
    }
  }

  // Hash three.vendor.js (independent, no circular deps).
  const threeMap = {};
  if (hasThreeVendor) {
    const h = shortHashOfFile(threeVendorAbs, 8);
    threeMap[threeVendorLogicalRel] = path.posix.join('libs', insertHashBeforeExt('three.vendor.js', h));
  }

  // Now rename files on disk (bundle + chunks + optional maps + css + three vendor).
  const renameOps = [];

  for (const [logicalRel, hashedRel] of Object.entries(jsMap)) {
    const fromAbs = path.join(releaseDirAbs, logicalRel);
    const toAbs = path.join(releaseDirAbs, hashedRel);
    renameOps.push([fromAbs, toAbs]);
    if (keepSourceMap) {
      const fromMap = `${fromAbs}.map`;
      const toMap = `${toAbs}.map`;
      if (exists(fromMap)) renameOps.push([fromMap, toMap]);
      // Update sourcemap comment to point to the renamed .map
      if (exists(`${toAbs}.map`)) {
        // We'll rewrite after rename, because the JS file moves.
      }
    }
  }

  for (const [logicalRel, hashedRel] of Object.entries(cssMap)) {
    const fromAbs = path.join(releaseDirAbs, logicalRel);
    const toAbs = path.join(releaseDirAbs, hashedRel);
    renameOps.push([fromAbs, toAbs]);
  }

  for (const [logicalRel, hashedRel] of Object.entries(threeMap)) {
    const fromAbs = path.join(releaseDirAbs, logicalRel);
    const toAbs = path.join(releaseDirAbs, hashedRel);
    renameOps.push([fromAbs, toAbs]);
    if (keepSourceMap) {
      const fromMap = `${fromAbs}.map`;
      const toMap = `${toAbs}.map`;
      if (exists(fromMap)) renameOps.push([fromMap, toMap]);
    }
  }

  // Execute renames (stable -> hashed). Order doesn't matter because names don't collide.
  for (const [fromAbs, toAbs] of renameOps) {
    if (!exists(fromAbs)) continue;
    mkdirp(path.dirname(toAbs));
    if (exists(toAbs)) fs.rmSync(toAbs, { force: true });
    fs.renameSync(fromAbs, toAbs);
  }

  // Fix sourcemap comments after renaming.
  if (keepSourceMap) {
    for (const hashedRel of Object.values(jsMap)) {
      const jsAbs = path.join(releaseDirAbs, hashedRel);
      const mapName = `${path.posix.basename(hashedRel)}.map`;
      const mapAbs = `${jsAbs}.map`;
      if (exists(mapAbs)) rewriteSourcemapCommentInPlace(jsAbs, mapName);
      else rewriteSourcemapCommentInPlace(jsAbs, null);
    }
    if (hasThreeVendor) {
      const hashedRel = Object.values(threeMap)[0];
      const jsAbs = path.join(releaseDirAbs, hashedRel);
      const mapName = `${path.posix.basename(hashedRel)}.map`;
      const mapAbs = `${jsAbs}.map`;
      if (exists(mapAbs)) rewriteSourcemapCommentInPlace(jsAbs, mapName);
      else rewriteSourcemapCommentInPlace(jsAbs, null);
    }
  }

  // A single build id for query-stringed config files.
  const buildId = shortHashOfFile(path.join(releaseDirAbs, jsMap[bundleRel]), 10);

  return {
    buildId,
    js: jsMap,
    css: cssMap,
    three: threeMap,
  };
}
