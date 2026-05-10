import test from 'node:test';
import assert from 'node:assert/strict';

import { computePresetModuleInnerFaces } from '../esm/native/builder/render_interior_preset_ops_wall_faces.ts';

function createWall(partId: string, x: number, width = 0.02) {
  return {
    isMesh: true,
    geometry: { parameters: { width, height: 2, depth: 0.6 } },
    position: { x },
    userData: { partId },
  };
}

function createGroup(children: unknown[]) {
  return { children };
}

function createReporter(calls: Array<{ op: string; err: unknown }>) {
  return (_App: unknown, op: string, err: unknown) => {
    calls.push({ op, err });
  };
}

test('preset brace wall faces prefer named walls when they are available', () => {
  const reports: Array<{ op: string; err: unknown }> = [];
  const result = computePresetModuleInnerFaces({
    App: {} as any,
    group: createGroup([createWall('body_left', -0.51), createWall('body_right', 0.51)]) as any,
    threeSurface: null,
    woodThick: 0.02,
    moduleIndex: 0,
    modulesLength: 1,
    innerW: 1,
    internalCenterX: 0,
    renderOpsHandleCatch: createReporter(reports) as any,
  });

  assert.deepEqual(result, { leftX: -0.5 + 0.00005, rightX: 0.5 - 0.00005 });
  assert.deepEqual(reports, []);
});

test('preset brace wall-face approximation is rejected when nearest generic walls are too far from expected faces', () => {
  const reports: Array<{ op: string; err: unknown }> = [];
  const result = computePresetModuleInnerFaces({
    App: {} as any,
    group: createGroup([createWall('unnamed_left', -0.56), createWall('unnamed_right', 0.56)]) as any,
    threeSurface: null,
    woodThick: 0.02,
    moduleIndex: 0,
    modulesLength: 1,
    innerW: 1,
    internalCenterX: 0,
    renderOpsHandleCatch: createReporter(reports) as any,
  });

  assert.equal(result, null);
  assert.equal(reports.length, 1);
  assert.equal(reports[0].op, 'applyInteriorPresetOps.wallFaceApproximationRejected');
});

test('preset brace wall-face approximation is allowed when unnamed walls still match the expected faces', () => {
  const reports: Array<{ op: string; err: unknown }> = [];
  const result = computePresetModuleInnerFaces({
    App: {} as any,
    group: createGroup([createWall('unnamed_left', -0.511), createWall('unnamed_right', 0.511)]) as any,
    threeSurface: null,
    woodThick: 0.02,
    moduleIndex: 0,
    modulesLength: 1,
    innerW: 1,
    internalCenterX: 0,
    renderOpsHandleCatch: createReporter(reports) as any,
  });

  assert.deepEqual(result, { leftX: -0.501, rightX: 0.501 });
  assert.deepEqual(reports, []);
});
