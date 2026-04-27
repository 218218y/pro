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
      config: {
        isCustom: true,
        customData: { shelves: [true, false], rods: [false, true], storage: false },
        intDrawersSlot: 3,
        braceShelves: [2],
        sketchExtras: [{ kind: 'shelf' }],
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
  assert.deepEqual(customCalls[0].intDrawersList, [3]);

  assert.equal(sketchExtraCalls.length, 1);
  assert.equal(sketchExtraCalls[0].moduleKey, 'm-4');
  assert.equal(sketchExtraCalls[0].moduleIndex, 4);
  assert.equal(sketchExtraCalls[0].startDoorId, 12);
  assert.deepEqual(sketchExtraCalls[0].sketchExtras, [{ kind: 'shelf' }]);
});

test('interior pipeline routes preset layouts through the canonical preset owner and computes drawer slots before render apply', () => {
  const presetCalls: any[] = [];
  const drawerSlots: Array<{ slot: number; metrics: unknown }> = [];
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
        intDrawersSlot: 2,
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
      checkAndCreateInternalDrawer(slot: number, metrics: unknown) {
        drawerSlots.push({ slot, metrics });
      },
    }),
    true
  );

  assert.equal(presetCalls.length, 1);
  assert.deepEqual(presetCalls[0].presetOps.shelves, [5, 1]);
  assert.equal(presetCalls[0].intDrawersSlot, 2);
  assert.deepEqual(presetCalls[0].braceShelves, [5]);

  assert.equal(drawerSlots.length, 6);
  assert.deepEqual(drawerSlots[0], {
    slot: 1,
    metrics: {
      slotBottomY: 0,
      slotTopY: 20,
      slotAvailableHeight: 20,
    },
  });
  assert.deepEqual(drawerSlots[1], {
    slot: 2,
    metrics: {
      slotBottomY: 20,
      slotTopY: 100,
      slotAvailableHeight: 80,
    },
  });
});
