#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadSiteProfile, resolveProfileAsset } from './wp_site_profiles.mjs';

const VALID_RELEASE_STATUSES = new Set(['active', 'draft']);
const PLACEHOLDER_HOST_RE = /(?:^|\.)(?:example\.(?:com|org|net)|invalid|test)$/i;
const STORE_ID_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SQL_IDENTIFIER_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;

function normalizeRel(projectRoot, file) {
  return path.relative(projectRoot, file).replace(/\\/g, '/');
}

function parseHttpsUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url : null;
  } catch {
    return null;
  }
}

function isPlaceholderUrl(value) {
  const url = parseHttpsUrl(value);
  return !url || PLACEHOLDER_HOST_RE.test(url.hostname) || url.hostname === 'localhost';
}

function addIssue(target, profile, code, message) {
  target.push({ storeId: profile.id, code, message });
}

export function listSiteProfileIds(projectRoot = process.cwd()) {
  const sitesRoot = path.join(projectRoot, 'sites');
  if (!fs.existsSync(sitesRoot)) return [];
  return fs
    .readdirSync(sitesRoot, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .filter(entry => fs.existsSync(path.join(sitesRoot, entry.name, 'site.profile.mjs')))
    .map(entry => entry.name)
    .sort();
}

export function validateSiteProfile({ projectRoot = process.cwd(), profile }) {
  const errors = [];
  const warnings = [];
  const profileDirName = path.basename(profile.profileDir || '');

  if (!STORE_ID_RE.test(profile.id)) {
    addIssue(errors, profile, 'invalid-id', 'profile id must use lowercase kebab-case');
  }
  if (profileDirName !== profile.id) {
    addIssue(
      errors,
      profile,
      'directory-id-mismatch',
      `profile id ${profile.id} does not match directory ${profileDirName}`
    );
  }
  if (!VALID_RELEASE_STATUSES.has(profile.releaseStatus)) {
    addIssue(
      errors,
      profile,
      'invalid-release-status',
      `releaseStatus must be one of: ${Array.from(VALID_RELEASE_STATUSES).join(', ')}`
    );
  }
  if (profile.id !== 'bargig' && !profile.storageNamespace) {
    addIssue(errors, profile, 'missing-storage-namespace', 'non-Bargig stores require storageNamespace');
  }
  if (!SQL_IDENTIFIER_RE.test(profile.supabase.table)) {
    addIssue(errors, profile, 'invalid-table', `invalid Supabase table name: ${profile.supabase.table}`);
  }
  if (!profile.supabase.realtimeChannelPrefix) {
    addIssue(errors, profile, 'missing-channel-prefix', 'realtimeChannelPrefix is required');
  }
  if (!parseHttpsUrl(profile.supabase.url)) {
    addIssue(errors, profile, 'invalid-supabase-url', 'Supabase URL must be a valid HTTPS URL');
  }

  for (const [assetKey, fallback] of [
    ['logoData', './wp_logo_data.js'],
    ['orderPdfTemplate', './order_template.pdf'],
  ]) {
    const asset = resolveProfileAsset(projectRoot, profile, assetKey, fallback);
    if (!fs.existsSync(asset)) {
      addIssue(
        errors,
        profile,
        'missing-asset',
        `${assetKey} does not exist: ${normalizeRel(projectRoot, asset)}`
      );
    }
  }

  for (const [variantName, variant] of Object.entries(profile.variants || {})) {
    const shareBaseUrl = variant.shareBaseUrl || profile.supabase.shareBaseUrl;
    if (!parseHttpsUrl(shareBaseUrl)) {
      addIssue(errors, profile, 'invalid-share-url', `${variantName}.shareBaseUrl must be a valid HTTPS URL`);
      continue;
    }
    if (isPlaceholderUrl(shareBaseUrl)) {
      const target = profile.releaseStatus === 'active' ? errors : warnings;
      addIssue(
        target,
        profile,
        'placeholder-share-url',
        `${variantName}.shareBaseUrl still uses a placeholder host`
      );
    }
  }

  return { errors, warnings };
}

function collectDuplicateIssues(profiles, key, readValue, label) {
  const owners = new Map();
  const errors = [];
  for (const profile of profiles) {
    const value = readValue(profile);
    if (!value) continue;
    const existing = owners.get(value);
    if (!existing) {
      owners.set(value, profile.id);
      continue;
    }
    errors.push({
      storeId: profile.id,
      code: `duplicate-${key}`,
      message: `${label} ${value} is already owned by ${existing}`,
    });
  }
  return errors;
}

export async function auditSiteProfiles(projectRoot = process.cwd()) {
  const ids = listSiteProfileIds(projectRoot);
  const profiles = [];
  const errors = [];
  const warnings = [];

  for (const id of ids) {
    try {
      const profile = await loadSiteProfile(projectRoot, id);
      profiles.push(profile);
      const result = validateSiteProfile({ projectRoot, profile });
      errors.push(...result.errors);
      warnings.push(...result.warnings);
    } catch (error) {
      errors.push({
        storeId: id,
        code: 'load-failed',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  errors.push(
    ...collectDuplicateIssues(
      profiles,
      'storage-namespace',
      profile => profile.storageNamespace,
      'storageNamespace'
    ),
    ...collectDuplicateIssues(
      profiles,
      'supabase-table',
      profile => profile.supabase.table,
      'Supabase table'
    ),
    ...collectDuplicateIssues(
      profiles,
      'realtime-channel-prefix',
      profile => profile.supabase.realtimeChannelPrefix,
      'realtimeChannelPrefix'
    )
  );

  return {
    ok: errors.length === 0,
    profiles: profiles.map(profile => ({
      id: profile.id,
      releaseStatus: profile.releaseStatus,
      storageNamespace: profile.storageNamespace,
      supabaseTable: profile.supabase.table,
      realtimeChannelPrefix: profile.supabase.realtimeChannelPrefix,
    })),
    errors,
    warnings,
  };
}

export function assertSiteProfileAudit(result) {
  if (result.ok) return result;
  const details = result.errors.map(issue => `${issue.storeId}:${issue.code}: ${issue.message}`).join('\n');
  throw new Error(`[WP Site Profile] contract failed\n${details}`);
}

function isEnabledEnvironmentFlag(value) {
  if (value === true) return true;
  if (typeof value !== 'string') return false;
  const normalized = value.trim().toLowerCase();
  return normalized !== '' && normalized !== '0' && normalized !== 'false' && normalized !== 'no';
}

export function assertSiteProfileReleaseAllowed({ profile, allowDraft = false, env = process.env }) {
  if (profile.releaseStatus === 'active') return 'release';
  if (profile.releaseStatus !== 'draft') {
    throw new Error(
      `[WP Site Profile] ${profile.id} has unsupported releaseStatus "${profile.releaseStatus || ''}"`
    );
  }
  if (!allowDraft) {
    throw new Error(
      `[WP Site Profile] Refusing to release draft profile "${profile.id}". ` +
        'Activate the profile after replacing placeholders, or use --allow-draft for a local preview artifact.'
    );
  }
  if (isEnabledEnvironmentFlag(env?.CI) || isEnabledEnvironmentFlag(env?.GITHUB_ACTIONS)) {
    throw new Error(`[WP Site Profile] Draft preview override is disabled in CI for profile "${profile.id}"`);
  }
  return 'preview';
}

async function main() {
  const result = await auditSiteProfiles();
  for (const warning of result.warnings) {
    console.warn(`[site-profile-audit] warning ${warning.storeId}:${warning.code}: ${warning.message}`);
  }
  if (!result.ok) {
    console.error('[site-profile-audit] FAILED');
    for (const error of result.errors) {
      console.error(`- ${error.storeId}:${error.code}: ${error.message}`);
    }
    process.exitCode = 1;
    return;
  }
  console.log(
    `[site-profile-audit] ok (${result.profiles.length} profiles, ${result.warnings.length} draft warning(s))`
  );
}

const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === currentFile) main();
