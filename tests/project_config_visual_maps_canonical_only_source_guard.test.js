import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
  readDoorTrimConfigMap,
  readSplitDoorsBottomMapValue,
  readSplitDoorsMapValue,
} from '../esm/native/features/project_config/project_config_map_readers.ts';
import { normalizeKnownMapSnapshot } from '../esm/native/runtime/maps_access_normalizers.ts';

const PROJECT_ROOT = process.cwd();

const PROTECTED_STORAGE_PROJECT_FILES = [
  'esm/native/runtime/maps_access_normalizers.ts',
  'esm/native/runtime/maps_access_normalizers_shared.ts',
  'esm/native/runtime/maps_access_normalizers_visuals.ts',
  'esm/native/runtime/cfg_access_shared.ts',
  'esm/native/features/project_config/project_config_map_readers.ts',
  'esm/native/features/project_config/project_config_snapshot_canonical_map_runtime.ts',
  'esm/native/kernel/kernel_project_capture_payload.ts',
  'esm/native/kernel/kernel_state_kernel_config_maps_shared.ts',
  'esm/native/io/project_schema_current.ts',
  'esm/native/io/project_config_persisted_snapshot.ts',
  'esm/native/io/project_io_load_helpers_maps.ts',
  'esm/native/io/project_payload_shared.ts',
  'esm/native/io/project_load_canonical_snapshot.ts',
  'esm/native/io/project_schema_validation.ts',
];

const FORBIDDEN_ALIAS_CONVERSION_HELPERS = [
  'toCanonicalDoorVisualMapKey',
  'toCanonicalDoorTrimTargetKey',
  'toCanonicalDoorGrooveTargetKey',
  'toCanonicalGroovesMapKey',
  'toCanonicalGrooveLinesCountMapKey',
  'toCanonicalRemovedDoorPartId',
  'toCanonicalRemovedDoorsMapKey',
  'toDoorStyleOverrideMapKey',
  'resolveDoorSplitAuthoringBaseKey',
  'splitKey',
  'splitBottomKey',
  'splitPosKey',
  'buildDoorVisualLookupKeys',
  'listDoorTrimTargetLookupKeys',
  'listDoorGrooveTargetLookupKeys',
  'listCanonicalRemovedDoorLookupKeys',
  'resolveDoorVisualSegmentIdentity',
  'resolveRemovedDoorPartIdentity',
  'stripDoorVisualSurfaceSuffix',
  'stripDoorVisualDecorationSuffix',
  'stripDoorTrimTargetDecorationSuffix',
  'stripDoorGrooveDecorationSuffix',
  'readDoorTrimMap',
  'readDoorTrimListForPart',
];

const ALLOWED_CANONICAL_ONLY_HELPERS = [
  'isCanonicalDoorVisualMapKey',
  'isCanonicalDoorTrimTargetKey',
  'isCanonicalGroovesMapKey',
  'isCanonicalGrooveLinesCountMapKey',
  'isCanonicalRemovedDoorsMapKey',
  'isCanonicalSplitDoorsMapKey',
  'isCanonicalSplitPositionMapKey',
  'isCanonicalSplitDoorsBottomMapKey',
  'readCanonicalMirrorLayoutMap',
];

function readSource(relPath) {
  const absPath = path.join(PROJECT_ROOT, relPath);
  assert.equal(fs.existsSync(absPath), true, `${relPath} must exist for the canonical-only source guard`);
  return fs.readFileSync(absPath, 'utf8');
}

function stripComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

function tokenRe(token) {
  return new RegExp(`(?<![A-Za-z0-9_$])${token}(?![A-Za-z0-9_$])`);
}

function readAllProtectedSources() {
  return PROTECTED_STORAGE_PROJECT_FILES.map(file => [file, stripComments(readSource(file))]);
}

test('storage/project visual-map boundaries do not import or call alias-to-canonical conversion helpers', () => {
  const violations = [];
  for (const [file, source] of readAllProtectedSources()) {
    for (const helper of FORBIDDEN_ALIAS_CONVERSION_HELPERS) {
      if (tokenRe(helper).test(source)) violations.push(`${file}: ${helper}`);
    }
  }

  assert.deepEqual(
    violations,
    [],
    `Storage/project visual-map normalization must stay canonical-only. Forbidden helper usage found:\n${violations.join('\n')}`
  );
});

test('storage/project visual-map boundaries keep using explicit canonical-only readers and predicates', () => {
  const projectMapReaders = readSource('esm/native/features/project_config/project_config_map_readers.ts');
  const runtimeShared = readSource('esm/native/runtime/maps_access_normalizers_shared.ts');
  const runtimeVisuals = readSource('esm/native/runtime/maps_access_normalizers_visuals.ts');
  const cfgShared = readSource('esm/native/runtime/cfg_access_shared.ts');

  for (const helper of ALLOWED_CANONICAL_ONLY_HELPERS) {
    const source = [projectMapReaders, runtimeShared, runtimeVisuals, cfgShared].join('\n');
    assert.match(source, tokenRe(helper), `${helper} should remain an allowed canonical-only storage helper`);
  }

  assert.doesNotMatch(projectMapReaders, /features\/door_authoring\/api\.js/);
  assert.doesNotMatch(projectMapReaders, /\.\.\/door_authoring\/api\.js/);
});

test('storage/project visual-map boundaries may use value-only trim normalization but not random trim ids', () => {
  const projectMapReaders = readSource('esm/native/features/project_config/project_config_map_readers.ts');
  const runtimeVisuals = readSource('esm/native/runtime/maps_access_normalizers_visuals.ts');
  const trimValueContracts = readSource('esm/shared/door_trim_value_contracts_shared.ts');
  const storageSources = [projectMapReaders, runtimeVisuals, trimValueContracts].join('\n');

  assert.match(projectMapReaders, tokenRe('normalizeDoorTrimEntryValueList'));
  assert.match(runtimeVisuals, tokenRe('normalizeDoorTrimEntryValueList'));
  assert.match(trimValueContracts, tokenRe('normalizeDoorTrimEntryValue'));

  assert.doesNotMatch(storageSources, /Math\.random\s*\(/);
  assert.doesNotMatch(trimValueContracts, tokenRe('toCanonicalDoorTrimTargetKey'));
  assert.doesNotMatch(trimValueContracts, tokenRe('listDoorTrimTargetLookupKeys'));
});

test('project config doorTrimMap keeps only direct canonical keys', () => {
  const doorTrimMap = readDoorTrimConfigMap({
    d1_full: [{ id: 'trim_direct', axis: 'vertical', color: 'gold', span: 'custom', sizeCm: '12' }],
    d1: [{ id: 'trim_base', axis: 'horizontal', color: 'black', span: 'half' }],
    d1_mid2_accent_top: [{ id: 'trim_decorated', axis: 'horizontal', color: 'silver', span: 'third' }],
    d2_top_trim_preview_hover: [{ id: 'trim_preview', axis: 'horizontal', color: 'silver', span: 'third' }],
  });

  assert.equal(doorTrimMap.d1_full?.length, 1);
  assert.equal(doorTrimMap.d1_full?.[0]?.id, 'trim_direct');
  assert.equal(doorTrimMap.d1_full?.[0]?.axis, 'vertical');
  assert.equal('d1' in doorTrimMap, false);
  assert.equal('d1_mid2_accent_top' in doorTrimMap, false);
  assert.equal('d2_top_trim_preview_hover' in doorTrimMap, false);
});

test('project config split maps keep only direct canonical split keys', () => {
  const splitDoorsMap = readSplitDoorsMapValue({
    split_d1: true,
    splitpos_d1: [0.25, 'bad', 0.75],
    splitpos_main: [0.2, 0.8, NaN],
    split_d1_mid2_accent_top: true,
    split_d1_mid2_groove_left: true,
    splitpos_d1_mid2_accent_top: [0.4],
    splitpos_d1_mid2_groove_left: [0.5],
    split_d2: 'true',
    splitpos_d3: '0.4',
  });
  assert.deepEqual(
    { ...splitDoorsMap },
    { split_d1: true, splitpos_d1: [0.25, 0.75], splitpos_main: [0.2, 0.8] }
  );

  const splitDoorsBottomMap = readSplitDoorsBottomMapValue({
    splitb_d1: true,
    splitb_lower_d2: null,
    splitb_d1_mid2_accent_top: true,
    splitb_d1_mid2_groove_left: true,
    splitb_d3: 'true',
  });
  assert.deepEqual({ ...splitDoorsBottomMap }, { splitb_d1: true, splitb_lower_d2: null });
});

test('runtime storage normalizers keep visual maps canonical-only without alias repair', () => {
  const doorStyleMap = normalizeKnownMapSnapshot('doorStyleMap', {
    d1_full: 'PROFILE',
    d1: 'flat',
    d1_mid2_accent_top: 'double_profile',
  });
  assert.deepEqual({ ...doorStyleMap }, { d1_full: 'profile' });

  const mirrorLayoutMap = normalizeKnownMapSnapshot('mirrorLayoutMap', {
    d1_full: [{ widthCm: '55', heightCm: '88', faceSign: -1 }],
    d1: [{ widthCm: 66, heightCm: 99 }],
    d1_mid2_accent_top: [{ widthCm: 77, heightCm: 44 }],
  });
  assert.deepEqual(
    Object.fromEntries(
      Object.entries(mirrorLayoutMap).map(([key, list]) => [
        key,
        Array.isArray(list) ? list.map(entry => ({ ...entry })) : list,
      ])
    ),
    { d1_full: [{ widthCm: 55, heightCm: 88, faceSign: -1 }] }
  );

  const doorTrimMap = normalizeKnownMapSnapshot('doorTrimMap', {
    d1_full: [{ axis: 'vertical', color: 'gold', span: 'custom', sizeCm: '12' }],
    d1: [{ axis: 'horizontal', color: 'black', span: 'half' }],
    d1_mid2_trim_preview_hover: [{ axis: 'horizontal', color: 'silver', span: 'third' }],
  });
  assert.equal(doorTrimMap.d1_full?.length, 1);
  assert.equal(doorTrimMap.d1_full?.[0]?.axis, 'vertical');
  assert.equal(doorTrimMap.d1_full?.[0]?.color, 'gold');
  assert.equal(doorTrimMap.d1_full?.[0]?.span, 'custom');
  assert.equal(doorTrimMap.d1_full?.[0]?.sizeCm, 12);
  assert.equal('d1' in doorTrimMap, false);
  assert.equal('d1_mid2_trim_preview_hover' in doorTrimMap, false);

  const groovesMap = normalizeKnownMapSnapshot('groovesMap', {
    groove_d1_full: true,
    d1_full: true,
    groove_d1_mid2_accent_top: true,
    groove_d2_mid2_groove_left: true,
  });
  assert.deepEqual({ ...groovesMap }, { groove_d1_full: true });

  const grooveLinesCountMap = normalizeKnownMapSnapshot('grooveLinesCountMap', {
    d1_full: 3.8,
    groove_d1_full: 4,
    d1_mid2_accent_top: 5,
    d2_mid2_groove_left: 6,
  });
  assert.deepEqual({ ...grooveLinesCountMap }, { d1_full: 3 });

  const removedDoorsMap = normalizeKnownMapSnapshot('removedDoorsMap', {
    removed_d1_full: true,
    d1_full: true,
    removed_d1: true,
    removed_d1_mid2_accent_top: true,
  });
  assert.deepEqual({ ...removedDoorsMap }, { removed_d1_full: true });
});
