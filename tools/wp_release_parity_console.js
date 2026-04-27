import path from 'node:path';
import { formatRefForConsole, posixRel } from './wp_release_parity_shared.js';

export function printReleaseParityReport({ args, report, log = console.log, error = console.error }) {
  log('[WP Release Parity] checks:', Object.keys(report.checks).join(', ') || '(none)');
  if (report.checks.threeVendorContract) {
    const c = report.checks.threeVendorContract;
    if (c.ok) {
      log(
        `[WP Release Parity] Three vendor contract OK (${c.requiredCount} used symbols / ${c.exportedCount} exported)`
      );
    } else {
      error('[WP Release Parity] Three vendor contract FAILED. Missing symbols:');
      for (const s of c.missing) error(`  - ${s}`);
    }
  }

  if (report.checks.distArtifacts) {
    const d = report.checks.distArtifacts;
    if (d.exists === false) log('[WP Release Parity] dist artifacts: skipped (dist missing)');
    else {
      log(
        `[WP Release Parity] dist artifacts: checked html refs=${d.checkedHtmlRefs}, js files=${d.checkedJsFiles}, js refs=${d.checkedJsRefs}`
      );
    }
  }

  if (report.checks.releaseArtifacts) {
    const r = report.checks.releaseArtifacts;
    if (r.exists === false) log('[WP Release Parity] release artifacts: skipped (dist/release missing)');
    else {
      log(
        `[WP Release Parity] release artifacts: checked html refs=${r.checkedHtmlRefs}, js files=${r.checkedJsFiles}, js refs=${r.checkedJsRefs}`
      );
      if (Array.isArray(r.releaseVendorFiles) && r.releaseVendorFiles.length) {
        log(`[WP Release Parity] release vendor files: ${r.releaseVendorFiles.join(', ')}`);
      }
    }
  }

  if (report.missingRefs.length) {
    error('[WP Release Parity] Broken/missing local references found:');
    for (const x of report.missingRefs) {
      const where = x.file || '(unknown)';
      const ref = x.ref ? ` -> ${formatRefForConsole(x.ref)}` : '';
      error(`  - [${x.scope}] ${x.kind}: ${where}${ref}`);
    }
  }

  for (const note of report.notes || []) log('[WP Release Parity] note:', note);

  if (args.manifestOut) {
    const out = path.isAbsolute(args.manifestOut)
      ? args.manifestOut
      : posixRel(report.root, path.join(report.root, args.manifestOut));
    log('[WP Release Parity] manifest:', out);
  }

  if (report.ok) log('[WP Release Parity] OK');
}
