import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createTsRuntimeModuleLoader } from './_ts_runtime_module_loader.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TARGET = path.join(ROOT, 'esm/native/builder/render_interior_sketch_boxes_shell_apply.ts');

function assertNearlyEqual(actual, expected, epsilon = 1e-12) {
  assert.equal(typeof actual, 'number');
  assert.ok(
    Math.abs(actual - expected) <= epsilon,
    `expected ${String(actual)} to be within ${String(epsilon)} of ${String(expected)}`
  );
}

function createHarness({
  height = 0.8,
  geometryResolved = {
    centerY: 1.2,
    geometry: {
      outerW: 1,
      innerW: 0.964,
      centerX: 0.25,
      outerD: 0.5,
      centerZ: 0.3,
      innerBackZ: 0.068,
      innerD: 0.4,
    },
    absEntry: {
      y: 1.2,
      halfH: 0.4,
      innerW: 0.964,
      centerX: 0.25,
      innerD: 0.4,
      innerBackZ: 0.068,
    },
  },
  hexGeometry = null,
  material = { id: 'resolved-material' },
} = {}) {
  const calls = {
    height: [],
    geometry: [],
    material: [],
    hex: [],
    frame: [],
  };

  const loader = createTsRuntimeModuleLoader({
    mocks: {
      '../features/hex_cell/index.js': {
        resolveHexCellGeometry(args) {
          calls.hex.push(args);
          return hexGeometry;
        },
      },
      './render_interior_sketch_boxes_shell_height.js': {
        resolveSketchBoxHeight(args) {
          calls.height.push(args);
          return height;
        },
      },
      './render_interior_sketch_boxes_shell_geometry.js': {
        resolveSketchBoxShellGeometry(args) {
          calls.geometry.push(args);
          return geometryResolved;
        },
      },
      './render_interior_sketch_boxes_shell_materials.js': {
        resolveSketchBoxShellMaterial(args) {
          calls.material.push(args);
          return material;
        },
      },
      './render_interior_sketch_boxes_shell_frame.js': {
        renderSketchBoxShellFrame(args) {
          calls.frame.push(args);
        },
      },
    },
  });

  const { renderSketchBoxShell } = loader.load(TARGET);
  const { INTERIOR_SHELF_GEOMETRY_POLICY } = loader.load(
    path.join(ROOT, 'esm/shared/dimensions/interior_fittings_policy.ts')
  );
  const { SKETCH_BOX_SHELL_GEOMETRY_POLICY } = loader.load(
    path.join(ROOT, 'esm/shared/dimensions/sketch_box_geometry_policy.ts')
  );

  return {
    calls,
    renderSketchBoxShell,
    INTERIOR_SHELF_GEOMETRY_POLICY,
    SKETCH_BOX_SHELL_GEOMETRY_POLICY,
  };
}

function createRenderArgs(overrides = {}) {
  return {
    woodThick: 0.018,
    spanH: 2.4,
    moduleKeyStr: 'module-a',
    bodyMat: { id: 'body-material' },
    getPartMaterial: null,
    isFn: value => typeof value === 'function',
    ...overrides,
  };
}

test('renderSketchBoxShell preserves null guards before material and frame work', () => {
  const missingBox = createHarness();
  assert.equal(
    missingBox.renderSketchBoxShell({
      box: null,
      boxIndex: 0,
      renderArgs: createRenderArgs(),
      freeWardrobeBox: null,
    }),
    null
  );
  assert.equal(missingBox.calls.height.length, 0);

  const missingHeight = createHarness({ height: null });
  assert.equal(
    missingHeight.renderSketchBoxShell({
      box: { id: 'height-null' },
      boxIndex: 0,
      renderArgs: createRenderArgs(),
      freeWardrobeBox: null,
    }),
    null
  );
  assert.equal(missingHeight.calls.geometry.length, 0);

  const missingGeometry = createHarness({ geometryResolved: null });
  assert.equal(
    missingGeometry.renderSketchBoxShell({
      box: { id: 'geometry-null' },
      boxIndex: 0,
      renderArgs: createRenderArgs(),
      freeWardrobeBox: null,
    }),
    null
  );
  assert.equal(missingGeometry.calls.material.length, 0);

  const invalidCenter = createHarness({
    geometryResolved: {
      centerY: Number.NaN,
      geometry: {
        outerW: 1,
        innerW: 0.964,
        centerX: 0,
        outerD: 0.5,
        centerZ: 0.3,
        innerBackZ: 0.068,
        innerD: 0.4,
      },
      absEntry: null,
    },
  });
  assert.equal(
    invalidCenter.renderSketchBoxShell({
      box: { id: 'center-nan' },
      boxIndex: 0,
      renderArgs: createRenderArgs(),
      freeWardrobeBox: null,
    }),
    null
  );
  assert.equal(invalidCenter.calls.material.length, 0);
  assert.equal(invalidCenter.calls.frame.length, 0);
});

test('renderSketchBoxShell keeps material, regular-depth, state, and frame parity', () => {
  const geometryResolved = {
    centerY: 1.2,
    geometry: {
      outerW: 1,
      innerW: 0.964,
      centerX: 0.25,
      outerD: 0.5,
      centerZ: 0.3,
      innerBackZ: 0.068,
      innerD: 0.8,
    },
    absEntry: { marker: 'abs-entry' },
  };
  const harness = createHarness({ geometryResolved });
  const box = { id: 'regular-box', heightM: 0.8, hM: 0.4 };
  const renderArgs = createRenderArgs();
  const freeWardrobeBox = { marker: 'forwarded-free-box' };

  const result = harness.renderSketchBoxShell({
    box,
    boxIndex: 7,
    renderArgs,
    freeWardrobeBox,
  });

  assert.ok(result);
  assert.equal(harness.calls.height.length, 1);
  assert.equal(harness.calls.geometry.length, 1);
  assert.equal(harness.calls.geometry[0].freeWardrobeBox, freeWardrobeBox);
  assert.equal(harness.calls.material.length, 1);
  assert.equal(harness.calls.material[0].boxPid, 'sketch_box_module-a_regular-box');
  assert.equal(harness.calls.material[0].defaultMaterial, renderArgs.bodyMat);
  assert.equal(harness.calls.frame.length, 1);
  assert.equal(harness.calls.frame[0].state, result.state);
  assert.equal(harness.calls.frame[0].renderArgs, renderArgs);
  assert.equal(result.absEntry, geometryResolved.absEntry);

  assert.equal(result.state.box, box);
  assert.equal(result.state.boxId, 'regular-box');
  assert.equal(result.state.boxPid, 'sketch_box_module-a_regular-box');
  assert.equal(result.state.isFreePlacement, false);
  assert.equal(result.state.boxMat.id, 'resolved-material');
  assert.equal(result.state.geometry, geometryResolved.geometry);
  assert.equal(result.state.hexGeometry, null);
  assert.equal(result.state.regularDepth, harness.INTERIOR_SHELF_GEOMETRY_POLICY.regularDepthM);
  assertNearlyEqual(result.state.sideH, 0.764);
  assertNearlyEqual(result.state.backZ, 0.05);
  assertNearlyEqual(result.state.innerBottomY, 0.818);
  assertNearlyEqual(result.state.innerTopY, 1.582);
  assertNearlyEqual(result.state.frontZ, 0.868);
  assertNearlyEqual(result.state.fullDepth, 0.818);
});

test('renderSketchBoxShell preserves regular-depth positive, zero, and negative branches', () => {
  const cases = [
    { innerD: 0.2, expected: 0.2 },
    { innerD: 0, expected: 0 },
    { innerD: -0.1, expected: -0.1 },
  ];

  for (const { innerD, expected } of cases) {
    const harness = createHarness({
      geometryResolved: {
        centerY: 1,
        geometry: {
          outerW: 1,
          innerW: 0.964,
          centerX: 0,
          outerD: 0.5,
          centerZ: 0.25,
          innerBackZ: 0.018,
          innerD,
        },
        absEntry: null,
      },
    });
    const result = harness.renderSketchBoxShell({
      box: { id: `depth-${String(innerD)}` },
      boxIndex: 0,
      renderArgs: createRenderArgs(),
      freeWardrobeBox: null,
    });
    assert.ok(result);
    assert.equal(result.state.regularDepth, expected);
  }
});

test('renderSketchBoxShell preserves Hex depth geometry, minimum inner depth, IDs, and forwarded state', () => {
  const geometryResolved = {
    centerY: 1.1,
    geometry: {
      outerW: 0.9,
      innerW: 0.864,
      centerX: -0.2,
      outerD: 0.5,
      centerZ: 0.3,
      innerBackZ: 0.068,
      innerD: 0.464,
    },
    absEntry: { marker: 'hex-abs' },
  };
  const hexGeometry = {
    enabled: true,
    moduleWidthM: 0.9,
    doorWidthM: 0.45,
    doorDepthM: 0.65,
    sideDepthM: 0.4,
    protrusionM: 0.1,
    diagonalDepthM: 0.2,
  };
  const harness = createHarness({ geometryResolved, hexGeometry });
  const box = { id: 'hex-box', freePlacement: true };
  const renderArgs = createRenderArgs();
  const freeWardrobeBox = { id: 'wardrobe-local-box' };

  const result = harness.renderSketchBoxShell({
    box,
    boxIndex: 2,
    renderArgs,
    freeWardrobeBox,
  });

  assert.ok(result);
  assert.equal(harness.calls.hex.length, 1);
  assert.equal(harness.calls.hex[0].cfgMod, box);
  assert.equal(harness.calls.hex[0].moduleWidthM, geometryResolved.geometry.outerW);
  assert.equal(harness.calls.hex[0].defaultDepthM, geometryResolved.geometry.outerD);
  assert.equal(harness.calls.hex[0].woodThickM, renderArgs.woodThick);
  assert.equal(result.state.boxPid, 'sketch_box_free_module-a_hex-box');
  assert.equal(result.state.isFreePlacement, true);
  assert.equal(result.state.hexGeometry, hexGeometry);
  assert.equal(result.state.geometry.outerD, 0.4);
  assertNearlyEqual(result.state.geometry.centerZ, 0.25);
  assertNearlyEqual(result.state.geometry.innerBackZ, 0.068);
  assertNearlyEqual(result.state.geometry.innerD, 0.382);
  assertNearlyEqual(result.state.frontZ, 0.7);
  assertNearlyEqual(result.state.fullDepth, 0.65);

  const minimumHarness = createHarness({
    geometryResolved,
    hexGeometry: { ...hexGeometry, sideDepthM: 0.01, doorDepthM: 0.03 },
  });
  const minimum = minimumHarness.renderSketchBoxShell({
    box,
    boxIndex: 2,
    renderArgs,
    freeWardrobeBox,
  });
  assert.ok(minimum);
  assert.equal(
    minimum.state.geometry.innerD,
    minimumHarness.SKETCH_BOX_SHELL_GEOMETRY_POLICY.minInnerDimensionM
  );
  assertNearlyEqual(minimum.state.geometry.innerBackZ, 0.06);
  assertNearlyEqual(minimum.state.frontZ, 0.08);
  assertNearlyEqual(minimum.state.fullDepth, 0.03);
});
