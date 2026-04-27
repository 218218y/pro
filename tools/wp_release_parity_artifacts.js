import fs from 'node:fs';
import path from 'node:path';
import {
  collectHtmlLocalRefs,
  collectJsLocalRefs,
  dedupeMissing,
  listFilesRecursive,
} from './wp_release_parity_refs.js';
import { exists, posixRel, resolveRefFile } from './wp_release_parity_shared.js';

export function checkBuildSiteArtifacts({ root, siteDir, label }) {
  const issues = [];
  const warnings = [];
  const htmlPath = path.join(siteDir, 'index.html');
  const summary = {
    label,
    exists: exists(siteDir),
    siteDir: posixRel(root, siteDir),
    htmlExists: exists(htmlPath),
    checkedHtmlRefs: 0,
    checkedJsFiles: 0,
    checkedJsRefs: 0,
    releaseVendorFiles: [],
  };

  if (!summary.exists) {
    return {
      ok: false,
      skipped: true,
      summary,
      issues: [{ file: summary.siteDir, kind: 'site-missing', ref: '' }],
      warnings,
    };
  }

  if (!summary.htmlExists) {
    issues.push({ file: posixRel(root, htmlPath), kind: 'html-missing', ref: 'index.html' });
  } else {
    const html = fs.readFileSync(htmlPath, 'utf8');
    const refs = collectHtmlLocalRefs(html);
    summary.checkedHtmlRefs = refs.length;
    for (const item of refs) {
      const abs = resolveRefFile(siteDir, item.ref);
      if (!abs || !exists(abs)) {
        issues.push({ file: posixRel(root, htmlPath), kind: item.kind, ref: item.ref });
      }
    }
  }

  const jsFiles = listFilesRecursive(siteDir, ['.js'], {
    skipDirs: label === 'dist' ? [path.join(siteDir, 'release')] : [],
  });
  summary.checkedJsFiles = jsFiles.length;
  for (const js of jsFiles) {
    let text;
    try {
      text = fs.readFileSync(js, 'utf8');
    } catch {
      continue;
    }
    const refs = collectJsLocalRefs(text);
    summary.checkedJsRefs += refs.length;
    for (const item of refs) {
      const abs = resolveRefFile(path.dirname(js), item.ref, {
        jsLike: item.kind.startsWith('js:'),
        siteRootDir: siteDir,
      });
      if (!abs || !exists(abs)) {
        issues.push({ file: posixRel(root, js), kind: item.kind, ref: item.ref });
      }
    }
  }

  if (label === 'release') {
    const releaseVendorDir = path.join(siteDir, 'libs');
    if (exists(releaseVendorDir)) {
      const vendorFiles = fs
        .readdirSync(releaseVendorDir)
        .filter(name => /^three\.vendor(?:\.[a-f0-9]{6,64})?\.js$/i.test(name))
        .sort();
      summary.releaseVendorFiles = vendorFiles;
      if (!vendorFiles.length) {
        issues.push({
          file: posixRel(root, releaseVendorDir),
          kind: 'release-vendor-missing',
          ref: 'three.vendor*.js',
        });
      }
    } else {
      issues.push({ file: posixRel(root, releaseVendorDir), kind: 'release-libs-missing', ref: 'libs/' });
    }
  }

  return { ok: issues.length === 0, skipped: false, summary, issues: dedupeMissing(issues), warnings };
}
