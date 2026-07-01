import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import {
  buildDoorVisualOwnerAliasKeys,
  resolveDoorStylePaintTargetKey,
} from '../esm/native/features/door_authoring/api.ts';
import {
  resolveDoorSplitAuthoringBaseKey,
  resolveDoorVisualSegmentIdentity,
} from '../esm/shared/door_visual_key_contracts_shared.ts';

const require = createRequire(import.meta.url);
const ts = require('typescript');

function createDoorVisualMapLookupMock() {
  const anySuffixRe = /_(?:full|top|bot|mid\d*)$/i;

  function isSegmentedDoorBaseId(partId) {
    if (/^(?:lower_)?d\d+$/.test(partId)) return true;
    if (/^(?:lower_)?corner_door_\d+$/.test(partId)) return true;
    if (/^(?:lower_)?corner_pent_door_\d+$/.test(partId)) return true;
    return /^sketch_box(?:_free)?_.+_door(?:_|$)/i.test(partId) && !anySuffixRe.test(partId);
  }

  function buildDoorVisualLookupKeys(partId) {
    if (typeof partId !== 'string' || !partId) return [];
    const out = [partId];
    const push = value => {
      if (value && !out.includes(value)) out.push(value);
    };
    if (/(?:_(?:top|bot|mid\d*))$/i.test(partId)) {
      const base = partId.replace(/_(top|bot|mid\d*)$/i, '');
      push(`${base}_full`);
      push(base);
    }
    if (partId.endsWith('_full')) push(partId.slice(0, -5));
    if (isSegmentedDoorBaseId(partId)) push(`${partId}_full`);
    return out;
  }

  function isDoorStyleSegmentedBaseId(partId) {
    return (
      /^(?:lower_)?d\d+$/.test(partId) ||
      /^(?:lower_)?corner_door_\d+$/.test(partId) ||
      /^(?:lower_)?corner_pent_door_\d+$/.test(partId)
    );
  }

  function toDoorStyleOverrideMapKeyMock(partId) {
    const pid = typeof partId === 'string' ? partId.trim() : String(partId ?? '').trim();
    if (!pid) return '';
    if (anySuffixRe.test(pid)) return pid;
    if (isDoorStyleSegmentedBaseId(pid)) return `${pid}_full`;
    return pid;
  }

  return {
    toDoorStyleOverrideMapKey: toDoorStyleOverrideMapKeyMock,
    readDoorVisualMapEntry(map, partId) {
      for (const key of buildDoorVisualLookupKeys(partId)) {
        if (map && Object.prototype.hasOwnProperty.call(map, key)) return { key, value: map[key] };
      }
      return null;
    },
  };
}

function loadDoorStyleOverridesModule() {
  const file = path.join(process.cwd(), 'esm/native/features/door_authoring/internal/style.ts');
  const source = fs.readFileSync(file, 'utf8');
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
    fileName: file,
  }).outputText;
  const mod = { exports: {} };
  const localRequire = spec => {
    if (spec === './visual_keys.js') return createDoorVisualMapLookupMock();
    return require(spec);
  };
  const sandbox = {
    module: mod,
    exports: mod.exports,
    require: localRequire,
    __dirname: path.dirname(file),
    __filename: file,
    console,
    process,
    setTimeout,
    clearTimeout,
  };
  vm.runInNewContext(transpiled, sandbox, { filename: file });
  return mod.exports;
}

test('[door-visual-keys] split authoring base keys use the canonical visual base', () => {
  for (const [partId, expectedBase] of [
    ['d4', 'd4'],
    ['d4_full', 'd4'],
    ['d4_top', 'd4'],
    ['d4_mid2', 'd4'],
    ['d4_any_custom_suffix', 'd4_any_custom_suffix'],
    ['d4_mid2_accent_top', 'd4'],
    ['d4_mid2_groove_left', 'd4'],
    ['lower_d4_bot', 'lower_d4'],
    ['corner_door_2_mid', 'corner_door_2'],
    ['lower_corner_door_2_top', 'lower_corner_door_2'],
    ['corner_pent_door_3_bot', 'corner_pent_door_3'],
    ['lower_corner_pent_door_3_bot', 'lower_corner_pent_door_3'],
    ['sketch_box_0_boxA_door_left', 'sketch_box_0_boxA_door_left'],
    ['sketch_box_0_boxA_door_left_full', 'sketch_box_0_boxA_door_left'],
    ['sketch_box_0_boxA_door_left_top', 'sketch_box_0_boxA_door_left'],
    ['sketch_box_0_boxA_door_left_bot', 'sketch_box_0_boxA_door_left'],
    ['sketch_box_0_boxA_door_left_mid2', 'sketch_box_0_boxA_door_left'],
    ['sketch_box_0_boxA_door_left_mid2_accent_top', 'sketch_box_0_boxA_door_left'],
    ['sketch_box_0_boxA_door_left_mid2_groove_left', 'sketch_box_0_boxA_door_left'],
    ['sketch_box_free_0_boxA_door_sbdr_1', 'sketch_box_free_0_boxA_door_sbdr_1'],
    ['sketch_box_free_0_boxA_door_sbdr_1_full', 'sketch_box_free_0_boxA_door_sbdr_1'],
    ['sketch_box_free_0_boxA_door_sbdr_1_top', 'sketch_box_free_0_boxA_door_sbdr_1'],
    ['sketch_box_free_0_boxA_door_sbdr_1_bot', 'sketch_box_free_0_boxA_door_sbdr_1'],
    ['sketch_box_free_0_boxA_door_sbdr_1_mid2', 'sketch_box_free_0_boxA_door_sbdr_1'],
    ['sketch_box_free_0_boxA_door_sbdr_1_mid2_accent_top', 'sketch_box_free_0_boxA_door_sbdr_1'],
    ['sketch_box_free_0_boxA_door_sbdr_1_mid2_groove_left', 'sketch_box_free_0_boxA_door_sbdr_1'],
  ]) {
    assert.equal(resolveDoorSplitAuthoringBaseKey(partId), expectedBase);
    assert.equal(resolveDoorVisualSegmentIdentity(partId).basePartId, expectedBase);
  }
});

test('[door-style-overrides] tokens, map normalization, and effective style resolution stay canonical', () => {
  const mod = loadDoorStyleOverridesModule();
  const resolvePaintTarget = (partId, activeStack = 'top') =>
    resolveDoorStylePaintTargetKey({
      foundPartId: partId,
      effectiveDoorId: partId,
      foundDrawerId: null,
      activeStack,
      isDoorOrDrawerLikePartId: value => /(?:door|drawer|draw|^d\d+)/.test(String(value || '')),
      scopePartKeyForStack: (value, stack) =>
        stack === 'bottom' && !value.startsWith('lower_') ? `lower_${value}` : value,
    });

  assert.equal(mod.encodeDoorStyleOverridePaintToken('profile'), '__wp_door_style__:profile');
  assert.equal(mod.parseDoorStyleOverridePaintToken('__wp_door_style__:double_profile'), 'double_profile');
  assert.equal(mod.parseDoorStyleOverridePaintToken('mirror'), null);

  const map = mod.readDoorStyleMap({
    d1: 'double_profile',
    d1_full: 'profile',
    drawer_1: 'double_profile',
    bad: 'glass',
    nil: null,
  });
  assert.deepEqual(Object.keys(map).sort(), ['d1_full', 'drawer_1']);
  assert.equal(map.d1_full, 'profile');
  assert.equal(map.drawer_1, 'double_profile');

  assert.equal(resolvePaintTarget('d7'), 'd7_full');
  assert.equal(resolvePaintTarget('d7_full'), 'd7_full');
  assert.equal(resolvePaintTarget('d7_top'), 'd7_top');
  assert.equal(resolvePaintTarget('drawer_9'), 'drawer_9');
  for (const [partId, expected] of [
    [
      'd7',
      {
        partId: 'd7',
        basePartId: 'd7',
        fullPartId: 'd7_full',
        isSegment: false,
        lookupKeys: ['d7', 'd7_full'],
      },
    ],
    [
      'd7_full',
      {
        partId: 'd7_full',
        basePartId: 'd7',
        fullPartId: 'd7_full',
        isSegment: false,
        lookupKeys: ['d7_full', 'd7'],
      },
    ],
    [
      'd7_top',
      {
        partId: 'd7_top',
        basePartId: 'd7',
        fullPartId: 'd7_full',
        isSegment: true,
        lookupKeys: ['d7_top', 'd7_full', 'd7'],
      },
    ],
    [
      'd7_bot',
      {
        partId: 'd7_bot',
        basePartId: 'd7',
        fullPartId: 'd7_full',
        isSegment: true,
        lookupKeys: ['d7_bot', 'd7_full', 'd7'],
      },
    ],
    [
      'd7_mid2',
      {
        partId: 'd7_mid2',
        basePartId: 'd7',
        fullPartId: 'd7_full',
        isSegment: true,
        lookupKeys: ['d7_mid2', 'd7_full', 'd7'],
      },
    ],
    [
      'd7_mid2_accent_top',
      {
        partId: 'd7_mid2',
        basePartId: 'd7',
        fullPartId: 'd7_full',
        isSegment: true,
        lookupKeys: ['d7_mid2', 'd7_full', 'd7'],
      },
    ],
    [
      'd7_mid2_groove_left',
      {
        partId: 'd7_mid2',
        basePartId: 'd7',
        fullPartId: 'd7_full',
        isSegment: true,
        lookupKeys: ['d7_mid2', 'd7_full', 'd7'],
      },
    ],
    [
      'lower_d7_top',
      {
        partId: 'lower_d7_top',
        basePartId: 'lower_d7',
        fullPartId: 'lower_d7_full',
        isSegment: true,
        lookupKeys: ['lower_d7_top', 'lower_d7_full', 'lower_d7'],
      },
    ],
    [
      'corner_door_7_top',
      {
        partId: 'corner_door_7_top',
        basePartId: 'corner_door_7',
        fullPartId: 'corner_door_7_full',
        isSegment: true,
        lookupKeys: ['corner_door_7_top', 'corner_door_7_full', 'corner_door_7'],
      },
    ],
    [
      'lower_corner_door_7_top',
      {
        partId: 'lower_corner_door_7_top',
        basePartId: 'lower_corner_door_7',
        fullPartId: 'lower_corner_door_7_full',
        isSegment: true,
        lookupKeys: ['lower_corner_door_7_top', 'lower_corner_door_7_full', 'lower_corner_door_7'],
      },
    ],
    [
      'corner_pent_door_7_top',
      {
        partId: 'corner_pent_door_7_top',
        basePartId: 'corner_pent_door_7',
        fullPartId: 'corner_pent_door_7_full',
        isSegment: true,
        lookupKeys: ['corner_pent_door_7_top', 'corner_pent_door_7_full', 'corner_pent_door_7'],
      },
    ],
    [
      'sketch_box_0_boxA_door_left_top',
      {
        partId: 'sketch_box_0_boxA_door_left_top',
        basePartId: 'sketch_box_0_boxA_door_left',
        fullPartId: 'sketch_box_0_boxA_door_left_full',
        isSegment: true,
        lookupKeys: [
          'sketch_box_0_boxA_door_left_top',
          'sketch_box_0_boxA_door_left_full',
          'sketch_box_0_boxA_door_left',
        ],
      },
    ],
    [
      'sketch_box_free_0_boxA_door_sbdr_1_bot',
      {
        partId: 'sketch_box_free_0_boxA_door_sbdr_1_bot',
        basePartId: 'sketch_box_free_0_boxA_door_sbdr_1',
        fullPartId: 'sketch_box_free_0_boxA_door_sbdr_1_full',
        isSegment: true,
        lookupKeys: [
          'sketch_box_free_0_boxA_door_sbdr_1_bot',
          'sketch_box_free_0_boxA_door_sbdr_1_full',
          'sketch_box_free_0_boxA_door_sbdr_1',
        ],
      },
    ],
  ]) {
    assert.deepEqual(resolveDoorVisualSegmentIdentity(partId), expected);
  }
  assert.deepEqual(buildDoorVisualOwnerAliasKeys('d7_full'), ['d7_full', 'd7']);
  assert.deepEqual(buildDoorVisualOwnerAliasKeys('d7'), ['d7', 'd7_full']);
  assert.deepEqual(buildDoorVisualOwnerAliasKeys('d7_top'), ['d7_top']);
  assert.deepEqual(buildDoorVisualOwnerAliasKeys('sketch_box_free_0_boxStyle_door_main'), [
    'sketch_box_free_0_boxStyle_door_main',
    'sketch_box_free_0_boxStyle_door_main_full',
  ]);
  assert.equal(resolvePaintTarget('corner_door_7', 'bottom'), 'lower_corner_door_7_full');
  assert.equal(resolvePaintTarget('corner_door_7_top', 'bottom'), 'lower_corner_door_7_top');
  assert.equal(
    resolveDoorStylePaintTargetKey({
      foundPartId: 'corner_door_7',
      effectiveDoorId: 'corner_door_7',
      foundDrawerId: null,
      activeStack: 'bottom',
      isDoorOrDrawerLikePartId: partId => String(partId || '').includes('door'),
      scopePartKeyForStack: (partId, stack) =>
        stack === 'bottom' && !partId.startsWith('lower_') ? `lower_${partId}` : partId,
    }),
    'lower_corner_door_7_full'
  );
  assert.equal(mod.resolveDoorStyleOverrideValue({ d7_full: 'double_profile' }, 'd7'), 'double_profile');
  assert.equal(mod.resolveDoorStyleOverrideValue({ d7: 'profile' }, 'd7_top'), 'profile');
  assert.equal(
    mod.resolveDoorStyleOverrideValue(mod.readDoorStyleMap({ d7: 'profile' }), 'd7_top'),
    'profile'
  );
  assert.equal(mod.resolveDoorStyleOverrideValue({ d7_full: 'profile' }, 'd7_top'), 'profile');
  assert.equal(mod.resolveDoorStyleOverrideValue({ d7_full: 'double_profile' }, 'd7_mid1'), 'double_profile');
  assert.equal(mod.resolveEffectiveDoorStyle('flat', { d7_full: 'profile' }, 'd7_bot'), 'profile');
  assert.equal(mod.resolveGlassFrameStyleValue(null, 'flat'), 'flat');
  assert.equal(mod.resolveGlassFrameStyleValue('bad', 'bad'), 'profile');
  const paintSelectionState = mod.resolveDoorStylePaintSelectionState({
    paintSelection: '__wp_door_style__:profile',
    doorStyleMap: { d7_full: 'profile' },
    partId: 'd7_top',
  });
  assert.equal(paintSelectionState.selection, 'profile');
  assert.equal(paintSelectionState.existingStyle, 'profile');
  assert.equal(paintSelectionState.willRemove, true);
  assert.equal(
    mod.resolveEffectiveDoorStyle(
      'flat',
      { sketch_box_free_0_boxStyle_door_main: 'double_profile' },
      'sketch_box_free_0_boxStyle_door_main_bot'
    ),
    'double_profile'
  );
  assert.equal(
    mod.resolveEffectiveDoorStyle(
      'flat',
      { sketch_box_0_boxStyle_door_main_full: 'profile' },
      'sketch_box_0_boxStyle_door_main_top'
    ),
    'profile'
  );
  assert.equal(mod.resolveEffectiveDoorStyle('flat', { drawer_4: 'profile' }, 'drawer_4'), 'profile');
  assert.equal(mod.resolveEffectiveDoorStyle('double_profile', {}, 'drawer_4'), 'double_profile');
});
