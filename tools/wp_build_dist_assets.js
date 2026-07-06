import fs from 'node:fs';
import path from 'node:path';
import { copyDir, copyDirContents, copyFile, exists } from './wp_build_dist_shared.js';
import { WEB_APP_ICON_ASSETS, normalizeRootWebAssetName } from './wp_web_icon_assets.js';

export const ROOT_STATIC_DIST_ASSETS = WEB_APP_ICON_ASSETS;

export function copyRootStaticDistAssets({ root, distAbs, assets = ROOT_STATIC_DIST_ASSETS }) {
  if (!root || !distAbs) return [];

  const copied = [];
  for (const assetName of assets || []) {
    const name = normalizeRootWebAssetName(assetName);
    if (!name) continue;

    const src = path.join(root, name);
    if (!exists(src)) continue;

    try {
      if (!fs.statSync(src).isFile()) continue;
    } catch {
      continue;
    }

    copyFile(src, path.join(distAbs, name));
    copied.push(name);
  }

  return copied;
}

export function copyEsmMjsVerbatim({ root, distEsmAbs }) {
  const srcDir = path.join(root, 'esm');
  if (!exists(srcDir) || !exists(distEsmAbs)) return;

  const entries = fs.readdirSync(srcDir, { withFileTypes: true });
  for (const e of entries) {
    if (!e.isFile()) continue;
    if (!e.name.endsWith('.mjs')) continue;
    copyFile(path.join(srcDir, e.name), path.join(distEsmAbs, e.name));
  }
}

export function copyStaticDistAssets({ root, distAbs }) {
  for (const f of ['index_pro.html', 'index_pro_esm.html']) {
    const src = path.join(root, f);
    if (exists(src)) copyFile(src, path.join(distAbs, f));
  }

  copyDir(path.join(root, 'css'), path.join(distAbs, 'css'));
  copyDir(path.join(root, 'libs'), path.join(distAbs, 'libs'));
  copyDir(path.join(root, 'docs'), path.join(distAbs, 'docs'));
  copyDirContents(path.join(root, 'public'), distAbs);
  copyRootStaticDistAssets({ root, distAbs });

  const logo = path.join(root, 'wp_logo_data.js');
  if (exists(logo)) copyFile(logo, path.join(distAbs, 'wp_logo_data.js'));

  const supaMjs = path.join(root, 'wp_runtime_config.mjs');
  if (!exists(supaMjs)) throw new Error('[build-dist] Missing required wp_runtime_config.mjs');
  copyFile(supaMjs, path.join(distAbs, 'wp_runtime_config.mjs'));
}
