#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const FILES = Object.freeze({
  featureCanonical: 'esm/native/features/canonical_codec_runtime.ts',
  savedModel: 'esm/native/features/model_record/saved_model_codec.ts',
  modelRegistry: 'esm/native/services/models_registry_normalization.ts',
  cloudSupport: 'esm/native/services/cloud_sync_support_shared_core.ts',
  cloudCodec: 'esm/native/services/cloud_collections_codec.ts',
  cloudRepository: 'esm/native/services/cloud_sync_collections_repository.ts',
  projectMaps: 'esm/native/features/project_config/project_config_snapshot_canonical_map_runtime.ts',
  projectCurrent: 'esm/native/io/project_schema_current.ts',
  projectValidation: 'esm/native/io/project_schema_validation.ts',
  projectCodec: 'esm/native/io/project_schema_codec.ts',
  projectExport: 'esm/native/io/project_io_orchestrator_export_ops.ts',
  settingsCodec: 'esm/native/ui/settings_backup_codec.ts',
  settingsCollections: 'esm/native/ui/settings_backup_shared_collections.ts',
  settingsExport: 'esm/native/ui/settings_backup_export.ts',
});

function read(projectRoot, file) {
  return fs.readFileSync(path.join(projectRoot, file), 'utf8');
}

function requireNeedle(failures, label, source, needle) {
  if (!source.includes(needle)) failures.push(`${label}: missing ${needle}`);
}

function requireNoNeedle(failures, label, source, needle) {
  if (source.includes(needle)) failures.push(`${label}: forbidden duplicate ownership ${needle}`);
}

export function runDomainCodecContract(projectRoot = process.cwd()) {
  const failures = [];
  const sources = {};
  for (const [key, file] of Object.entries(FILES)) {
    const full = path.join(projectRoot, file);
    if (!fs.existsSync(full)) {
      failures.push(`${file}: missing canonical codec owner/consumer`);
      continue;
    }
    sources[key] = read(projectRoot, file);
  }

  const featureCanonical = sources.featureCanonical || '';
  for (const needle of [
    'serializeCanonicalFeatureValue',
    'cloneCanonicalFeatureValue',
    'fingerprintCanonicalFeatureValue',
  ]) {
    requireNeedle(failures, FILES.featureCanonical, featureCanonical, needle);
  }

  const savedModel = sources.savedModel || '';
  for (const needle of [
    'export function validateSavedModel',
    'export function normalizeSavedModelList',
    'export const savedModelCodec',
    'validate: validateSavedModel',
    'serializeCanonicalFeatureValue',
    'fingerprintCanonicalFeatureValue',
  ]) {
    requireNeedle(failures, FILES.savedModel, savedModel, needle);
  }

  const cloudCodec = sources.cloudCodec || '';
  for (const needle of [
    'export const CLOUD_COLLECTIONS_SCHEMA_VERSION = 1',
    'savedModelCodec.validate',
    'savedModelCodec.clone',
    'export const cloudCollectionsCodec',
    'parseCloudCollectionsEnvelope',
  ]) {
    requireNeedle(failures, FILES.cloudCodec, cloudCodec, needle);
  }

  const cloudRepository = sources.cloudRepository || '';
  requireNeedle(failures, FILES.cloudRepository, cloudRepository, "from './cloud_collections_codec.js'");
  requireNeedle(failures, FILES.cloudRepository, cloudRepository, 'cloudCollectionsCodec.serialize');
  for (const duplicate of [
    'function isStoredModel(',
    'function isStoredModelSettings(',
    'function isStoredModelToggles(',
    'function parseEnvelope(',
    'function stableSerialize(',
  ]) {
    requireNoNeedle(failures, FILES.cloudRepository, cloudRepository, duplicate);
  }

  const cloudSupport = sources.cloudSupport || '';
  requireNeedle(failures, FILES.cloudSupport, cloudSupport, 'readSavedModelRecordList');
  requireNeedle(failures, FILES.cloudSupport, cloudSupport, "from './saved_model_codec_access.js'");
  requireNoNeedle(failures, FILES.cloudSupport, cloudSupport, 'function isSavedModelLike(');

  const modelRegistry = sources.modelRegistry || '';
  requireNeedle(failures, FILES.modelRegistry, modelRegistry, 'savedModelCodec.normalize(next)');

  const projectMaps = sources.projectMaps || '';
  for (const needle of [
    'export function normalizeKnownProjectConfigMap',
    'export function validateKnownProjectConfigMap',
    'export function cloneKnownProjectConfigMap',
    'export function serializeKnownProjectConfigMap',
    'export function fingerprintKnownProjectConfigMap',
    'export const projectConfigMapCodec',
  ]) {
    requireNeedle(failures, FILES.projectMaps, projectMaps, needle);
  }

  const projectCurrent = sources.projectCurrent || '';
  requireNeedle(failures, FILES.projectCurrent, projectCurrent, 'normalizeKnownProjectConfigMap');
  for (const retiredReader of [
    'readSplitDoorsMapValue(',
    'readSplitDoorsBottomMapValue(',
    'readMirrorLayoutConfigMap(',
    'readDoorTrimConfigMap(',
  ]) {
    requireNoNeedle(failures, FILES.projectCurrent, projectCurrent, retiredReader);
  }

  const projectValidation = sources.projectValidation || '';
  requireNeedle(failures, FILES.projectValidation, projectValidation, 'validateKnownProjectConfigMap');
  requireNeedle(failures, FILES.projectValidation, projectValidation, 'KNOWN_PROJECT_CONFIG_MAP_KEYS');

  const projectCodec = sources.projectCodec || '';
  for (const needle of [
    'export const projectSchemaCodec',
    'serializeProjectDataForFile',
    'validateProjectData',
  ]) {
    requireNeedle(failures, FILES.projectCodec, projectCodec, needle);
  }
  const projectExport = sources.projectExport || '';
  requireNeedle(
    failures,
    FILES.projectExport,
    projectExport,
    'serializeProjectDataForFile(projectData, 2, {'
  );
  requireNeedle(failures, FILES.projectExport, projectExport, 'schemaId: deps.schemaId');
  requireNeedle(failures, FILES.projectExport, projectExport, 'schemaVersion: deps.schemaVersion');
  requireNoNeedle(failures, FILES.projectExport, projectExport, 'JSON.stringify(projectData');

  const settingsCodec = sources.settingsCodec || '';
  for (const needle of [
    'export const SETTINGS_BACKUP_SCHEMA_VERSION = 1',
    'export function normalizeSettingsBackupData',
    'export function parseSettingsBackup',
    'export const settingsBackupCodec',
    'validateSavedModelForSettingsBackup',
    'schemaVersion: SETTINGS_BACKUP_SCHEMA_VERSION',
  ]) {
    requireNeedle(failures, FILES.settingsCodec, settingsCodec, needle);
  }
  const settingsCollections = sources.settingsCollections || '';
  requireNeedle(
    failures,
    FILES.settingsCollections,
    settingsCollections,
    'normalizeSavedModelForSettingsBackup(cloned)'
  );
  for (const duplicate of [
    'function normalizeSettingsBackupData(',
    'function parseSettingsBackup(',
    'function isSettingsBackupData(',
  ]) {
    requireNoNeedle(failures, FILES.settingsCollections, settingsCollections, duplicate);
  }
  const settingsExport = sources.settingsExport || '';
  requireNeedle(failures, FILES.settingsExport, settingsExport, 'settingsBackupCodec.validate');
  requireNeedle(failures, FILES.settingsExport, settingsExport, 'settingsBackupCodec.clone');

  return { ok: failures.length === 0, failures };
}

function main() {
  const result = runDomainCodecContract();
  if (!result.ok) {
    console.error(`[domain-codecs] FAILED with ${result.failures.length} issue(s)`);
    for (const failure of result.failures) console.error(`- ${failure}`);
    process.exit(1);
  }
  console.log('[domain-codecs] ok (5 canonical persistence domains)');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
