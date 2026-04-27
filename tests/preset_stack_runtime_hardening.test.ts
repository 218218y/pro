import test from 'node:test';
import assert from 'node:assert/strict';

import {
  normalizeLowerModuleConfig,
  normalizeTopModuleConfig,
  modulesConfigurationKeyForStack,
} from '../esm/native/features/stack_split/module_config.ts';
import { normalizeModelList, normalizeModelRecord } from '../esm/native/data/preset_models.ts';

function asPlainRecord<T extends Record<string, unknown> | null | undefined>(
  value: T
): Record<string, unknown> {
  return value ? { ...value } : {};
}

test('preset + stack runtime hardening: normalization stays useful without loose record casts', () => {
  assert.equal(modulesConfigurationKeyForStack('top'), 'modulesConfiguration');
  assert.equal(modulesConfigurationKeyForStack('bottom'), 'stackSplitLowerModulesConfiguration');

  const topInput = {
    layout: '',
    extDrawersCount: '4',
    intDrawersSlot: '2',
    intDrawersList: [1, 2],
    customData: { shelves: [true], rods: [false], storage: 1 },
    doors: '3',
  };
  const top = normalizeTopModuleConfig(topInput, 1);
  assert.equal(top.layout, 'shelves');
  assert.equal(top.extDrawersCount, 4);
  assert.equal(top.intDrawersSlot, 2);
  assert.deepEqual(top.intDrawersList, [1, 2]);
  assert.equal(top.doors, 3);
  assert.notEqual(top.customData.shelves, topInput.customData.shelves);

  const lower = normalizeLowerModuleConfig(
    {
      layout: '',
      gridDivisions: '0',
      savedDims: { a: 1 },
      customData: { shelves: [true], rods: [false], storage: true },
    },
    0
  ) as { layout: string; gridDivisions?: number; savedDims?: unknown; customData: { shelves: boolean[] } };
  assert.equal(lower.layout, 'shelves');
  assert.equal(lower.gridDivisions, 1);
  assert.equal('savedDims' in lower, false);
  assert.deepEqual(lower.customData.shelves, [true]);

  const model = normalizeModelRecord({
    groovesMap: { g1: true },
    handlesMap: { h1: 'edge' },
    settings: { width: '180' },
    savedNotes: [1],
  }) as {
    groovesMap: Record<string, unknown>;
    handlesMap: Record<string, unknown>;
    settings: Record<string, unknown>;
    savedNotes: unknown[];
  };
  assert.deepEqual(asPlainRecord(model.groovesMap), { g1: true });
  assert.deepEqual(asPlainRecord(model.handlesMap), { h1: 'edge' });
  assert.equal(model.settings.width, '180');
  assert.deepEqual(model.savedNotes, [1]);

  const canonicalModel = normalizeModelRecord({
    id: ' model-1 ',
    name: ' Demo ',
    settings: { doors: 5, structureSelection: '[2,2,1]', wardrobeType: 'hinged' },
    modulesConfiguration: [{ doors: '2' }, { doors: '2' }, { doors: '2', extDrawersCount: '4' }],
    stackSplitLowerModulesConfiguration: [{ extDrawersCount: '3' }],
    cornerConfiguration: { modulesConfiguration: [{ doors: '5' }] },
  }) as {
    id: string;
    name: string;
    modulesConfiguration: Array<{ doors: number; extDrawersCount?: number }>;
    stackSplitLowerModulesConfiguration: Array<{ extDrawersCount: number }>;
    cornerConfiguration: { layout: string; modulesConfiguration: unknown[] };
  };
  assert.equal(canonicalModel.id, 'model-1');
  assert.equal(canonicalModel.name, 'Demo');
  assert.equal(canonicalModel.modulesConfiguration[2]?.doors, 1);
  assert.equal(canonicalModel.modulesConfiguration[2]?.extDrawersCount, 4);
  assert.equal(canonicalModel.stackSplitLowerModulesConfiguration[0]?.extDrawersCount, 3);
  assert.equal(canonicalModel.cornerConfiguration.layout, 'shelves');
  assert.ok(Array.isArray(canonicalModel.cornerConfiguration.modulesConfiguration));

  const legacy = normalizeModelRecord({
    'App.data.groovesMap': { g1: true },
    data: { 'App.data.handlesMap': { h1: 'edge' } },
    settings: { 'App.data.width': '180' },
  }) as {
    groovesMap: Record<string, unknown>;
    handlesMap: Record<string, unknown>;
    settings: Record<string, unknown>;
  };
  assert.deepEqual(asPlainRecord(legacy.groovesMap), {});
  assert.deepEqual(asPlainRecord(legacy.handlesMap), {});
  assert.equal(Object.prototype.hasOwnProperty.call(legacy.settings, 'width'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(legacy.settings, 'App.data.width'), true);

  const normalizedList = normalizeModelList([model, null, 5, { curtainMap: { x: true } }]) as Array<{
    curtainMap?: Record<string, unknown>;
  }>;
  assert.equal(normalizedList.length, 2);
  assert.deepEqual(asPlainRecord(normalizedList[1].curtainMap || {}), {});
});
