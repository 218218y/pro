#!/usr/bin/env node
// WardrobePro multi-store release wrapper.
// Builds one store/variant release from sites/<store>/site.profile.mjs without forking app code.

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

import {
  copySiteRuntimeAssets,
  loadSiteProfile,
  parseSiteReleaseArgs,
  writeSiteTemplate,
} from './wp_site_profiles.mjs';
import {
  assertSiteProfileAudit,
  assertSiteProfileReleaseAllowed,
  auditSiteProfiles,
} from './wp_site_profile_contract.mjs';

function rel(root, p) {
  return path.relative(root, p).replace(/\\/g, '/');
}

async function main() {
  const root = process.cwd();
  const args = parseSiteReleaseArgs(process.argv.slice(2));
  const profileAudit = await auditSiteProfiles(root);
  assertSiteProfileAudit(profileAudit);
  const profile = await loadSiteProfile(root, args.store);
  const releaseMode = assertSiteProfileReleaseAllowed({ profile, allowDraft: args.allowDraft });
  if (releaseMode === 'preview' && (args.distRootRel || args.outDirRel)) {
    throw new Error(
      '[WP Site Profile] Draft previews use an isolated .artifacts path; --dist-root and --out are not allowed.'
    );
  }
  for (const warning of profileAudit.warnings.filter(item => item.storeId === args.store)) {
    console.warn(
      `[WP Site ${releaseMode === 'preview' ? 'Preview' : 'Release'}] ${warning.code}: ${warning.message}`
    );
  }
  const variant = profile.variants[args.variant];

  const distRootRel =
    releaseMode === 'preview'
      ? path.posix.join('.artifacts', 'site-preview', profile.id, variant.name)
      : args.distRootRel || path.posix.join('dist', 'sites', profile.id, variant.name);
  const outDirRel = args.outDirRel || path.posix.join(distRootRel, 'release');
  const workDir = path.join(root, '.artifacts', 'site-release', profile.id, variant.name);
  const templatePath = path.join(workDir, 'index_release_bundle.html');

  writeSiteTemplate(root, profile, variant.name, templatePath);

  const releaseArgs = [
    path.join('tools', 'wp_release.js'),
    '--build-mode',
    'client',
    '--obfuscate',
    '--dist-root',
    distRootRel,
    '--out',
    outDirRel,
    '--template',
    rel(root, templatePath),
    ...args.passthrough,
  ];

  const label = releaseMode === 'preview' ? 'Preview' : 'Release';
  console.log(`[WP Site ${label}] Building ${profile.id}/${variant.name} -> ${outDirRel}`);
  execFileSync('node', releaseArgs, { cwd: root, stdio: 'inherit' });

  const releaseDir = path.resolve(root, outDirRel);
  const distDir = path.resolve(root, distRootRel);

  // Overwrite root-level runtime assets with the selected store profile.
  // wp_release.js still builds/copies the shared app. The store wrapper owns only per-site config/assets.
  copySiteRuntimeAssets({ root, profile, variantName: variant.name, targetDir: releaseDir });
  copySiteRuntimeAssets({ root, profile, variantName: variant.name, targetDir: distDir });

  // Keep the selected release template beside the generated artifacts for traceability.
  fs.copyFileSync(templatePath, path.join(releaseDir, 'index.template.site-profile.html'));

  console.log(`[WP Site ${label}] Done: ${rel(root, releaseDir)}`);
}

main().catch(err => {
  console.error('[WP Site Release] Failed:', err && err.stack ? err.stack : err);
  process.exit(1);
});
