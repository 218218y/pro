import test from 'node:test';
import assert from 'node:assert/strict';

import { applyInteriorLayout } from '../esm/native/builder/interior_pipeline.ts';

test('interior pipeline routes custom layouts through the canonical custom owner and shared sketch-extra seam', () => {
  const customCalls: any[] = [];
  const sketchExtraCalls: any[] = [];
  const App = {
    services: {
      builder: {
        renderOps: {
          applyInteriorCustomOps(args: unknown) {
            customCalls.push(args);
            return true;
          },
          applyInteriorSketchExtras(args: unknown) {
            sketchExtraCalls.push(args);
          },
        },
      },
    },
  } as any;

  assert.equal(
    applyInteriorLayout({
      App,
      cfg: {},
      doorStyle: 'flat',
      isGroovesEnabled: false,
      isInternalDrawersEnabled: false,
      config: {
        isCustom: true,
        customData: { shelves: [true, false], rods: [false, true], storage: false },
        braceShelves: [2],
        sketchExtras: { shelves: [{ id: 'shelf-1', yNorm: 0.5 }] },
      },
      gridDivisions: 3,
      effectiveBottomY: 10,
      effectiveTopY: 40,
      localGridStep: 10,
      innerW: 80,
      woodThick: 2,
      internalDepth: 55,
      internalCenterX: 15,
      internalZ: 20,
      D: 60,
      moduleIndex: 4,
      modulesLength: 7,
      moduleKey: 'm-4',
      startDoorId: 12,
      moduleDoors: 2,
      externalW: 90,
      externalCenterX: 18,
    }),
    true
  );

  assert.equal(customCalls.length, 1);
  assert.deepEqual(customCalls[0].customOps.shelves, [1]);
  assert.equal(customCalls[0].gridDivisions, 3);
  assert.deepEqual(customCalls[0].braceShelves, [2]);

  assert.equal(sketchExtraCalls.length, 1);
  assert.equal(sketchExtraCalls[0].moduleKey, 'm-4');
  assert.equal(sketchExtraCalls[0].moduleIndex, 4);
  assert.equal(sketchExtraCalls[0].startDoorId, 12);
  assert.deepEqual(sketchExtraCalls[0].sketchExtras, {
    shelves: [{ id: 'shelf-1', yNorm: 0.5 }],
  });
  assert.deepEqual(sketchExtraCalls[0].cfgSnapshot, {});
  assert.equal('cfg' in sketchExtraCalls[0], false);
  assert.equal('config' in sketchExtraCalls[0], false);
});

test('interior pipeline routes preset layouts through the canonical preset owner through sketch drawer extras only', () => {
  const presetCalls: any[] = [];
  const App = {
    services: {
      builder: {
        renderOps: {
          applyInteriorPresetOps(args: unknown) {
            presetCalls.push(args);
            return true;
          },
        },
      },
    },
  } as any;

  assert.equal(
    applyInteriorLayout({
      App,
      config: {
        isCustom: false,
        layout: 'hanging_split',
        braceShelves: [5],
      },
      gridDivisions: 6,
      effectiveBottomY: 0,
      effectiveTopY: 120,
      localGridStep: 20,
      innerW: 80,
      woodThick: 2,
      internalDepth: 55,
      internalCenterX: 15,
      internalZ: 20,
      D: 60,
      moduleIndex: 1,
      modulesLength: 3,
      moduleKey: 'preset-1',
    }),
    true
  );

  assert.equal(presetCalls.length, 1);
  assert.deepEqual(presetCalls[0].presetOps.shelves, [5, 1]);
  assert.deepEqual(presetCalls[0].braceShelves, [5]);
});
