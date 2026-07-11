import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  assertSiteProfileReleaseAllowed,
  auditSiteProfiles,
  listSiteProfileIds,
  validateSiteProfile,
} from '../tools/wp_site_profile_contract.mjs';
import { loadSiteProfile } from '../tools/wp_site_profiles.mjs';

const ROOT = process.cwd();

test('site profile contract audits every store from one registry', async () => {
  assert.deepEqual(listSiteProfileIds(ROOT), ['bargig', 'store-1', 'store-2']);
  const result = await auditSiteProfiles(ROOT);
  assert.equal(result.ok, true);
  assert.equal(result.profiles.find(profile => profile.id === 'bargig').releaseStatus, 'active');
  assert.equal(result.warnings.filter(issue => issue.code === 'placeholder-share-url').length, 4);
});

test('site release blocks draft profiles and confines explicit overrides to local preview mode', async () => {
  const draftProfile = await loadSiteProfile(ROOT, 'store-1');
  const activeProfile = await loadSiteProfile(ROOT, 'bargig');

  assert.equal(assertSiteProfileReleaseAllowed({ profile: activeProfile }), 'release');
  assert.throws(
    () => assertSiteProfileReleaseAllowed({ profile: draftProfile }),
    /Refusing to release draft profile/
  );
  assert.equal(
    assertSiteProfileReleaseAllowed({ profile: draftProfile, allowDraft: true, env: {} }),
    'preview'
  );
  for (const env of [{ CI: 'true' }, { CI: '1' }, { GITHUB_ACTIONS: 'TRUE' }]) {
    assert.throws(
      () =>
        assertSiteProfileReleaseAllowed({
          profile: draftProfile,
          allowDraft: true,
          env,
        }),
      /disabled in CI/
    );
  }
  assert.equal(
    assertSiteProfileReleaseAllowed({
      profile: draftProfile,
      allowDraft: true,
      env: { CI: '0', GITHUB_ACTIONS: 'false' },
    }),
    'preview'
  );
});

test('active site profiles reject placeholder deployment URLs', async () => {
  const profile = await loadSiteProfile(ROOT, 'store-1');
  const result = validateSiteProfile({
    projectRoot: ROOT,
    profile: { ...profile, releaseStatus: 'active' },
  });
  assert.equal(result.errors.filter(issue => issue.code === 'placeholder-share-url').length, 2);
});

test('site profile contract rejects missing assets and directory/id drift', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'wp-site-profile-contract-'));
  const profile = await loadSiteProfile(ROOT, 'store-1');
  const result = validateSiteProfile({
    projectRoot: root,
    profile: {
      ...profile,
      id: 'other-store',
      profileDir: path.join(root, 'sites', 'store-1'),
      assets: { logoData: './missing-logo.js', orderPdfTemplate: './missing.pdf' },
    },
  });
  assert.ok(result.errors.some(issue => issue.code === 'directory-id-mismatch'));
  assert.equal(result.errors.filter(issue => issue.code === 'missing-asset').length, 2);
});
