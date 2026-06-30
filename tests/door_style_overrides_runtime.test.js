import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import {
  buildDoorVisualOwnerAliasKeys,
  resolveDoorStylePaintTargetKey,
  resolveDoorVisualSegmentIdentity,
  toDoorStyleOverrideMapKey,
} from '../esm/native/features/door_authoring/api.ts';

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

test('[door-style-overrides] tokens, map normalization, and effective style resolution stay canonical', () => {
  const mod = loadDoorStyleOverridesModule();

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

  assert.equal(toDoorStyleOverrideMapKey('d7'), 'd7_full');
  assert.equal(toDoorStyleOverrideMapKey('drawer_9'), 'drawer_9');
  assert.deepEqual(resolveDoorVisualSegmentIdentity('d7_mid2_accent_top'), {
    partId: 'd7_mid2',
    basePartId: 'd7',
    fullPartId: 'd7_full',
    isSegment: true,
    lookupKeys: ['d7_mid2', 'd7_full', 'd7'],
  });
  assert.deepEqual(buildDoorVisualOwnerAliasKeys('d7_full'), ['d7_full', 'd7']);
  assert.deepEqual(buildDoorVisualOwnerAliasKeys('sketch_box_free_0_boxStyle_door_main'), [
    'sketch_box_free_0_boxStyle_door_main',
    'sketch_box_free_0_boxStyle_door_main_full',
  ]);
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
