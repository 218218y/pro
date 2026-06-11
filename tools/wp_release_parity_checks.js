import fs from 'node:fs';
import path from 'node:path';
import { runThreeVendorContractCheck } from './wp_three_vendor_contract.js';
import { checkBuildSiteArtifacts } from './wp_release_parity_artifacts.js';
import { exists, parseArgs } from './wp_release_parity_shared.js';

export async function runReleaseParityChecks(options = {}) {
  const args = { ...parseArgs([]), ...options };
  const root = path.resolve(args.root);

  const report = {
    ok: true,
    root,
    checks: {},
    missingRefs: [],
    notes: [],
  };

  if (!args.artifactsOnly) {
    const contract = await runThreeVendorContractCheck({
      root,
      scanPaths: args.scanPaths,
      strict: true,
    });
    report.checks.threeVendorContract = {
      ok: !!contract.ok,
      missing: contract.missing || [],
      requiredCount: contract.requiredCount,
      exportedCount: contract.exportedCount,
      filesWithThreeUsage: contract.filesWithThreeUsage,
      scannedFileCount: contract.scannedFileCount,
      manifest: {
        vendorEntry: contract.vendorEntry,
        scannedPaths: contract.scannedPaths,
      },
    };
    if (!contract.ok) report.ok = false;
  }

  if (!args.sourceOnly) {
    const distDir = path.join(root, 'dist');
    const releaseDir = path.join(root, 'dist', 'release');

    if (exists(distDir)) {
      const distRes = checkBuildSiteArtifacts({ root, siteDir: distDir, label: 'dist' });
      report.checks.distArtifacts = distRes.summary;
      if (!distRes.ok) {
        report.ok = false;
        report.missingRefs.push(...distRes.issues.map(x => ({ scope: 'dist', ...x })));
      }
    } else if (args.requireDist) {
      report.ok = false;
      report.checks.distArtifacts = { exists: false, siteDir: 'dist' };
      report.missingRefs.push({ scope: 'dist', file: 'dist', kind: 'site-missing', ref: '' });
    } else {
      report.notes.push('dist/ not found; skipped dist artifact checks');
    }

    if (exists(releaseDir)) {
      const releaseRes = checkBuildSiteArtifacts({ root, siteDir: releaseDir, label: 'release' });
      report.checks.releaseArtifacts = releaseRes.summary;
      if (!releaseRes.ok) {
        report.ok = false;
        report.missingRefs.push(...releaseRes.issues.map(x => ({ scope: 'release', ...x })));
      }
    } else if (args.requireRelease) {
      report.ok = false;
      report.checks.releaseArtifacts = { exists: false, siteDir: 'dist/release' };
      report.missingRefs.push({ scope: 'release', file: 'dist/release', kind: 'site-missing', ref: '' });
    } else {
      report.notes.push('dist/release not found; skipped release artifact checks');
    }
  }

  if (args.manifestOut) {
    const outAbs = path.isAbsolute(args.manifestOut) ? args.manifestOut : path.join(root, args.manifestOut);
    fs.mkdirSync(path.dirname(outAbs), { recursive: true });
    fs.writeFileSync(outAbs, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  }

  return report;
}
