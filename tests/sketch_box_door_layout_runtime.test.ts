import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveSketchBoxDoorLayout } from '../esm/native/builder/render_interior_sketch_boxes_fronts_door_layout.ts';

function createRenderArgs(doorMountMode: 'overlay' | 'inset') {
  const woodThick = doorMountMode === 'inset' ? 0.036 : 0.018;
  const height = 0.8;
  const outerW = 0.6;
  const outerD = 0.5;
  return {
    frontsArgs: {
      shell: {
        box: {},
        boxId: 'freeInsetBox',
        boxPid: 'sketch_box_free_0_freeInsetBox',
        isFreePlacement: true,
        height,
        centerY: 1.1,
        sideH: height - 2 * woodThick,
        geometry: {
          centerX: 0,
          innerW: outerW - 2 * woodThick,
          outerW,
          centerZ: 0,
          outerD,
        },
      },
      boxDividers: [],
      boxHorizontalDividers: [],
      args: {
        input: { cfg: { doorMountMode } },
        woodThick,
        moduleKeyStr: '0',
      },
    },
    doorStyle: 'flat',
    doorStyleMap: {},
    resolvePartMaterial: (_partId: string, defaultMaterial: unknown) => defaultMaterial,
  } as any;
}

function createHexRenderArgs() {
  const args = createRenderArgs('overlay');
  args.frontsArgs.shell.hexGeometry = {
    enabled: true,
    moduleWidthM: 0.6,
    doorWidthM: 0.4,
    doorDepthM: 0.62,
    sideDepthM: 0.48,
    protrusionM: 0.1,
    diagonalDepthM: 0.14,
  };
  return args;
}

const placement = {
  door: { id: 'doorA', enabled: true, hinge: 'left' },
  index: 0,
  segment: null,
  verticalSegment: null,
} as any;

test('free-placement sketch-box doors use the inner frame opening in inset door mount mode', () => {
  const layout = resolveSketchBoxDoorLayout({
    renderArgs: createRenderArgs('inset'),
    placement,
    placementsBySegment: new Map(),
  });

  assert.ok(layout);
  assert.equal(layout.doorPid, 'sketch_box_free_0_freeInsetBox_door_doorA');
  assert.ok(Math.abs(layout.pivotX - -0.261) < 1e-9);
  assert.ok(Math.abs(layout.doorW - 0.522) < 1e-9);
  assert.ok(Math.abs(layout.doorH - 0.722) < 1e-9);
  assert.ok(Math.abs(layout.doorZ - 0.238) < 1e-9);
});

test('free-placement sketch-box doors keep the existing outside overlay geometry by default', () => {
  const layout = resolveSketchBoxDoorLayout({
    renderArgs: createRenderArgs('overlay'),
    placement,
    placementsBySegment: new Map(),
  });

  assert.ok(layout);
  assert.ok(Math.abs(layout.pivotX - -0.294) < 1e-9);
  assert.ok(Math.abs(layout.doorW - 0.588) < 1e-9);
  assert.ok(Math.abs(layout.doorH - 0.788) < 1e-9);
  assert.ok(Math.abs(layout.doorZ - 0.2605) < 1e-9);
});

test('free-placement sketch-box doors in a hex cell are clipped to the hex door opening', () => {
  const layout = resolveSketchBoxDoorLayout({
    renderArgs: createHexRenderArgs(),
    placement,
    placementsBySegment: new Map(),
  });

  assert.ok(layout);
  assert.ok(layout.doorW < 0.4, `hex-cell door should be smaller than the hex opening, got ${layout.doorW}`);
  assert.ok(Math.abs(layout.doorW - 0.388) < 1e-9);
  assert.ok(Math.abs(layout.pivotX - -0.194) < 1e-9);
});
