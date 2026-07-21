import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveSketchBoxDoorLayout } from '../esm/native/builder/render_interior_sketch_boxes_fronts_door_layout.ts';
import {
  resolveSketchBoxClosedInsetDoorBackZ,
  resolveSketchBoxDoorMountMode,
  resolveSketchBoxDoorThickness,
  resolveSketchBoxInsetReveal,
} from '../esm/native/builder/render_interior_sketch_boxes_door_geometry.ts';
import { HINGED_DOOR_MOUNT_POLICY } from '../esm/shared/dimensions/door_system_policy.ts';
import { SKETCH_BOX_DOOR_PREVIEW_POLICY } from '../esm/shared/dimensions/sketch_box_preview_policy.ts';

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
        input: { cfgSnapshot: { doorMountMode } },
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

test('Sketch Box door geometry preserves mount-mode parsing', () => {
  assert.equal(resolveSketchBoxDoorMountMode(undefined), 'overlay');
  assert.equal(resolveSketchBoxDoorMountMode('invalid'), 'overlay');
  assert.equal(resolveSketchBoxDoorMountMode({}), 'overlay');
  assert.equal(resolveSketchBoxDoorMountMode({ cfgSnapshot: null }), 'overlay');
  assert.equal(resolveSketchBoxDoorMountMode({ cfgSnapshot: 'invalid' }), 'overlay');
  assert.equal(resolveSketchBoxDoorMountMode({ cfgSnapshot: { doorMountMode: 'overlay' } }), 'overlay');
  assert.equal(resolveSketchBoxDoorMountMode({ cfgSnapshot: { doorMountMode: 'inset' } }), 'inset');
  assert.equal(resolveSketchBoxDoorMountMode({ cfgSnapshot: { doorMountMode: 'other' } }), 'overlay');
});

test('Sketch Box inset reveal preserves third-thickness clamping and non-finite behavior', () => {
  const revealCap: number = HINGED_DOOR_MOUNT_POLICY.insetRevealM;
  const capThickness = revealCap * 3;

  assert.equal(resolveSketchBoxInsetReveal(-0.03), 0);
  assert.equal(resolveSketchBoxInsetReveal(0), 0);
  assert.ok(Math.abs(resolveSketchBoxInsetReveal(capThickness / 2) - revealCap / 2) < 1e-12);
  assert.equal(resolveSketchBoxInsetReveal(capThickness), revealCap);
  assert.equal(resolveSketchBoxInsetReveal(capThickness * 2), revealCap);
  assert.equal(Number.isNaN(resolveSketchBoxInsetReveal(Number.NaN)), true);
  assert.equal(resolveSketchBoxInsetReveal(Number.POSITIVE_INFINITY), revealCap);
  assert.equal(resolveSketchBoxInsetReveal(Number.NEGATIVE_INFINITY), 0);
});

test('Sketch Box door thickness preserves nested min/max clamping and non-finite behavior', () => {
  const minThickness: number = SKETCH_BOX_DOOR_PREVIEW_POLICY.doorThicknessMinM;
  const maxThickness: number = SKETCH_BOX_DOOR_PREVIEW_POLICY.doorThicknessMaxM;
  const middleThickness = (minThickness + maxThickness) / 2;

  assert.equal(resolveSketchBoxDoorThickness(minThickness / 2), minThickness);
  assert.equal(resolveSketchBoxDoorThickness(minThickness), minThickness);
  assert.equal(resolveSketchBoxDoorThickness(middleThickness), middleThickness);
  assert.equal(resolveSketchBoxDoorThickness(maxThickness), maxThickness);
  assert.equal(resolveSketchBoxDoorThickness(maxThickness * 2), maxThickness);
  assert.equal(Number.isNaN(resolveSketchBoxDoorThickness(Number.NaN)), true);
  assert.equal(resolveSketchBoxDoorThickness(Number.POSITIVE_INFINITY), maxThickness);
  assert.equal(resolveSketchBoxDoorThickness(Number.NEGATIVE_INFINITY), minThickness);
});

test('closed inset Door back-Z preserves finite front priority and geometry fallback', () => {
  const minThickness: number = SKETCH_BOX_DOOR_PREVIEW_POLICY.doorThicknessMinM;
  const maxThickness: number = SKETCH_BOX_DOOR_PREVIEW_POLICY.doorThicknessMaxM;
  const revealCap: number = HINGED_DOOR_MOUNT_POLICY.insetRevealM;
  const geometry = { centerZ: -0.2, outerD: 0.6 };
  const fallbackFrontZ = geometry.centerZ + geometry.outerD / 2;
  const shell = {
    frontZ: 0.45,
    geometry,
  } as any;

  assert.equal(
    resolveSketchBoxClosedInsetDoorBackZ({ shell, woodThick: minThickness / 2 }),
    shell.frontZ - minThickness - Math.min(revealCap, minThickness / 6)
  );
  assert.equal(
    resolveSketchBoxClosedInsetDoorBackZ({ shell, woodThick: maxThickness }),
    shell.frontZ - maxThickness - revealCap
  );
  assert.equal(
    resolveSketchBoxClosedInsetDoorBackZ({ shell, woodThick: maxThickness * 2 }),
    shell.frontZ - maxThickness - revealCap
  );

  for (const frontZ of [undefined, Number.NaN, Number.POSITIVE_INFINITY]) {
    const fallbackShell = { frontZ, geometry } as any;
    assert.equal(
      resolveSketchBoxClosedInsetDoorBackZ({ shell: fallbackShell, woodThick: minThickness }),
      fallbackFrontZ - minThickness - revealCap
    );
  }

  assert.equal(Number.isNaN(resolveSketchBoxClosedInsetDoorBackZ({ shell, woodThick: Number.NaN })), true);
});
