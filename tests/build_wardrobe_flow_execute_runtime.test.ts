import test from 'node:test';
import assert from 'node:assert/strict';

import { runPreparedBuildWardrobePlan } from '../esm/native/builder/build_wardrobe_flow_execute_runtime.ts';

test('prepared no-main execution delegates rendering through the orchestration port', () => {
  const calls: unknown[] = [];
  const cfg = { modulesConfiguration: [] };
  const ui = { doorStyle: 'flat' };
  const createDoorVisual = () => ({ kind: 'door' });
  const addOutlines = () => undefined;
  const prepared: any = {
    orchestration: {
      renderNoMainSketchHost(input: unknown) {
        calls.push(input);
        return true;
      },
    },
    deps: {
      THREE: { kind: 'three' },
      createInternalDrawerBox: () => undefined,
      addHangingClothes: () => undefined,
      addFoldedClothes: () => undefined,
      addRealisticHanger: () => undefined,
    },
    buildState: { cfgSnapshot: cfg, ui },
    createDoorVisual,
    renderPolicy: { addOutlines },
  };
  const plan: any = {
    noMainWardrobe: true,
    totalW: 1.8,
    carcassH: 2.4,
    carcassD: 0.6,
    woodThick: 0.018,
    shelfThick: 0.018,
    depthReduction: 0,
    internalDepth: 0.56,
    internalZ: 0,
    bodyMat: { kind: 'body' },
    legMat: { kind: 'leg' },
    createBoard: () => undefined,
    getPartMaterial: () => undefined,
    getPartColorValue: () => undefined,
    isInternalDrawersEnabled: false,
    showHangerEnabled: true,
    showContentsEnabled: true,
  };

  runPreparedBuildWardrobePlan(prepared, { buildCtx: {}, plan } as any);

  assert.equal(calls.length, 1);
  const input = calls[0] as Record<string, unknown>;
  assert.equal(input.cfg, cfg);
  assert.equal(input.ui, ui);
  assert.equal(input.createDoorVisual, createDoorVisual);
  assert.equal(input.addOutlines, addOutlines);
  assert.equal(Object.prototype.hasOwnProperty.call(input, 'App'), false);
});
