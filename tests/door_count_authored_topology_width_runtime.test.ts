import test from 'node:test';
import assert from 'node:assert/strict';

import { resizeAuthoredModuleDoorSignature } from '../esm/native/ui/react/tabs/structure_tab_door_signature_policy.ts';
import { readModuleStructureSelectSignature } from '../esm/native/features/modules_configuration/calc_module_structure.ts';
import {
  readModulesWithoutWidthOverrides,
  stripModuleWidthOverrides,
} from '../esm/native/kernel/domain_api_module_width_overrides.ts';
import { buildRecomputedModules } from '../esm/native/kernel/domain_api_modules_corner_recompute_template.ts';
import { computeModuleLayout } from '../esm/native/builder/core_layout_compute.ts';
import { createDefaultTopModuleConfig } from '../esm/native/features/modules_configuration/module_defaults.ts';

function mockModules(doorSignature: number[], widthsCm: number[], baseWidthCm: number) {
  return doorSignature.map((doors, i) => ({
    ...createDefaultTopModuleConfig(i, doors),
    specialDims: {
      widthCm: widthsCm[i],
      baseWidthCm,
      heightCm: 212,
      baseHeightCm: 200,
    },
  }));
}

function recompute(args: {
  oldSignature: number[];
  newSignature: number[];
  previousWidths: number[];
  source?: string;
}) {
  const previous = mockModules(
    args.oldSignature,
    args.previousWidths,
    (200 / args.oldSignature.reduce((a, b) => a + b, 0)) * 2
  );
  const runtime = {
    currentModules: previous,
    currentModulesStructure: args.oldSignature,
    modulesStructure: args.newSignature.map(doors => ({ doors })),
    isLibraryMode: false,
    options: { preserveTemplate: true, anchorSide: 'left' },
    meta: { source: args.source ?? 'react:structure:doors' },
  };
  const next = buildRecomputedModules(runtime as any);
  const result = computeModuleLayout({
    totalW: 2,
    woodThick: 0.018,
    modulesStructure: runtime.modulesStructure,
    modulesConfiguration: next,
  });
  return { next, result };
}

test('global 6→7 after 5→6 cell edit retains authored left pair instead of resetting to a single', () => {
  assert.deepEqual(resizeAuthoredModuleDoorSignature('[2,2,2]', 6, 7), [2, 2, 2, 1]);
  assert.deepEqual(resizeAuthoredModuleDoorSignature('[2,2,2,1]', 7, 6), [2, 2, 2]);
  assert.deepEqual(resizeAuthoredModuleDoorSignature('[1,2,2]', 5, 6), [1, 2, 2, 1]);
  assert.deepEqual(resizeAuthoredModuleDoorSignature('[2,1,2]', 5, 6), [2, 1, 2, 1]);
  assert.deepEqual(resizeAuthoredModuleDoorSignature('[2,2,1]', 5, 6), [2, 2, 2]);
  assert.equal(resizeAuthoredModuleDoorSignature('[2,2,2]', 5, 7), null, 'stale signature');
  assert.equal(resizeAuthoredModuleDoorSignature('[3,2]', 5, 6), null, 'unsupported >2-leaf module');
});

test('6→7 new opening gets meaningful width; stale overrides cannot create a 1 cm ghost door', () => {
  const { next, result } = recompute({
    oldSignature: [2, 2, 2],
    newSignature: [2, 2, 2, 1],
    previousWidths: [40, 80, 80],
  });
  assert.deepEqual(
    next.map(module => module.doors),
    [2, 2, 2, 1]
  );
  assert.ok(
    result.moduleInternalWidths.every(width => width > 0.2),
    JSON.stringify(result.moduleInternalWidths)
  );
  assert.ok(
    next.every(module => !(module.specialDims as any)?.widthCm),
    'obsolete widths cleared'
  );
  assert.ok(
    next.slice(0, 3).every(module => (module.specialDims as any)?.heightCm === 212),
    'other authoring preserved'
  );
});

test('6→7 default left-single also allocates every opening, independent of authored pattern', () => {
  const { result } = recompute({
    oldSignature: [2, 2, 2],
    newSignature: [1, 2, 2, 2],
    previousWidths: [40, 80, 80],
  });
  assert.ok(
    result.moduleInternalWidths.every(width => width > 0.2),
    JSON.stringify(result.moduleInternalWidths)
  );
});

test('changed leaf count without changed physical opening count preserves manual widths', () => {
  const { next } = recompute({
    oldSignature: [1, 2, 2],
    newSignature: [2, 2, 2],
    previousWidths: [40, 80, 80],
  });
  assert.equal((next[0].specialDims as any)?.widthCm, 40);
  assert.equal((next[1].specialDims as any)?.widthCm, 80);
});

test('non-door-count structural recompute leaves manually authored widths intact', () => {
  const { next } = recompute({
    oldSignature: [2, 2, 2],
    newSignature: [2, 2, 2, 1],
    previousWidths: [40, 80, 80],
    source: 'react:structure:pattern',
  });
  assert.equal((next[0].specialDims as any)?.widthCm, 40);
});

test('authored door resizing uses the same accepted signature inputs as the feature calculator', () => {
  for (const serialized of [
    '[2,2,2]',
    '["2",2,2]',
    '[1.9,2,2]',
    ' [1, 2, 2] ',
    '[]',
    'null',
    '[true,2]',
    '[0,2]',
    '["1.2",2]',
    'invalid',
  ]) {
    const signature = readModuleStructureSelectSignature(serialized);
    const accepted = signature !== null && signature.every(doors => doors === 1 || doors === 2);
    const count = signature?.reduce((sum, doors) => sum + doors, 0) ?? 0;
    assert.equal(
      resizeAuthoredModuleDoorSignature(serialized, count, count + 1) !== null,
      accepted,
      serialized
    );
  }
});

test('kernel width-override policy keeps topology cleanup and manual-width reset equivalent', () => {
  const source = [
    {
      doors: 2,
      layout: 'shelves',
      specialDims: { widthCm: 80, baseWidthCm: 72, heightCm: 212, baseHeightCm: 200, depthCm: 60 },
    },
    { doors: 1, layout: 'hanging_top2', specialDims: { widthCm: 40, baseWidthCm: 36 } },
    { doors: 2, layout: 'shelves', isCustom: true },
  ];
  const before = structuredClone(source);
  const fromRecompute = stripModuleWidthOverrides(source);
  const fromManualWidth = readModulesWithoutWidthOverrides({ modulesConfiguration: source });
  assert.deepEqual(fromManualWidth, fromRecompute);
  assert.deepEqual(source, before, 'caller state is never mutated');
  assert.equal(fromRecompute[0]?.specialDims?.heightCm, 212);
  assert.equal(fromRecompute[0]?.specialDims?.depthCm, 60);
  assert.equal(fromRecompute[0]?.specialDims?.widthCm, undefined);
  assert.equal(fromRecompute[1]?.specialDims, undefined);
  assert.equal(fromRecompute[2]?.isCustom, true);
});
