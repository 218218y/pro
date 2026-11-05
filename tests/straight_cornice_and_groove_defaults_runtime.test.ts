import test from 'node:test';
import assert from 'node:assert/strict';

import { computeCarcassOps } from '../esm/native/builder/core_pure_compute.ts';
import { buildStraightCorniceProfile } from '../esm/native/builder/cornice_straight_profile.ts';
import { buildDefaultProjectDataSnapshot } from '../esm/native/io/project_io_save_helpers.ts';
import { buildProjectUiSnapshot } from '../esm/native/io/project_io_load_helpers.ts';
import { buildKernelProjectCaptureData } from '../esm/native/kernel/kernel_project_capture_payload.ts';
import { resolveDesignTabGrooveLinesAutoBaseline } from '../esm/shared/dimensions/react_config_selectors_dimension_policy.ts';
import { SKETCH_BOX_CORNICE_OPTIONS } from '../esm/native/ui/react/tabs/interior_layout_sketch_box_controls_options.ts';
import {
  mkSketchBoxCorniceTool,
  readSketchBoxCorniceType,
} from '../esm/native/ui/react/tabs/interior_tab_helpers_sketch_tools.ts';
import { normalizeSketchBoxCorniceType } from '../esm/native/services/canvas_picking_sketch_box_dividers_shared.ts';
import { normalizeSketchBoxAdornmentCorniceType } from '../esm/native/builder/render_interior_sketch_visuals_adornments_normalize.ts';

test('straight cornice is 3 cm high, 10 cm deep with 2 cm outward and 8 cm on the roof', () => {
  const profile = buildStraightCorniceProfile();
  assert.deepEqual(profile, [
    { x: -0.08, y: 0 },
    { x: 0.02, y: 0 },
    { x: 0.02, y: 0.03 },
    { x: -0.08, y: 0.03 },
  ]);

  const cornice = computeCarcassOps({
    totalW: 1.6,
    D: 0.55,
    H: 2.4,
    woodThick: 0.018,
    doorsCount: 4,
    hasCornice: true,
    corniceType: 'straight',
  }).cornice;
  assert.ok(cornice);
  assert.equal(cornice.mode, 'straight_open_back');
  assert.equal(cornice.segments.length, 3, 'one front piece and two exterior side returns');
  for (const segment of cornice.segments) {
    assert.equal(segment.kind, 'cornice_profile_seg');
    if (segment.kind === 'cornice_profile_seg') assert.deepEqual(segment.profile, profile);
  }
  const front = cornice.segments.find(
    segment => segment.kind === 'cornice_profile_seg' && Math.abs(segment.rotationY + Math.PI / 2) < 1e-9
  );
  assert.ok(front && front.kind === 'cornice_profile_seg');
  assert.ok(Math.abs(front.length - 1.64) < 1e-9, 'front extends 2 cm past both cabinet sides');
  const sides = cornice.segments.filter(
    segment => segment.kind === 'cornice_profile_seg' && Math.abs(segment.rotationY) < 1e-9
  );
  assert.equal(sides.length, 2);
  assert.ok(sides.some(segment => segment.flipX === true));
  assert.ok(sides.some(segment => segment.flipX === false));
});

test('straight cornice type survives local capture, project save and reload', () => {
  const raw = { doors: 4, width: 160, height: 240, depth: 55 };
  const ui = { raw, corniceType: 'straight', hasCornice: true };
  const saved = buildDefaultProjectDataSnapshot({ ui, config: {} });
  assert.equal(saved.settings.corniceType, 'straight');
  const loaded = buildProjectUiSnapshot(saved, 'Wardrobe');
  assert.equal(loaded.uiState.corniceType, 'straight');

  const captured = buildKernelProjectCaptureData({
    uiRec: ui,
    rawAny: raw,
    cfgRec: {},
    savedNotes: [],
  });
  assert.equal((captured.settings as Record<string, unknown>).corniceType, 'straight');
});

test('straight cornice remains selectable and authorable on sketch boxes', () => {
  assert.deepEqual(
    SKETCH_BOX_CORNICE_OPTIONS.map(option => option.id),
    ['classic', 'wave', 'straight']
  );
  const tool = mkSketchBoxCorniceTool('straight');
  assert.equal(tool, 'sketch_box_cornice:straight');
  assert.equal(readSketchBoxCorniceType(tool), 'straight');
  assert.equal(normalizeSketchBoxCorniceType('STRAIGHT'), 'straight');
  assert.equal(normalizeSketchBoxAdornmentCorniceType('straight'), 'straight');
});

test('automatic groove default uses 14 per standard door and honors manual widths and direction', () => {
  assert.equal(resolveDesignTabGrooveLinesAutoBaseline({}), 14);
  assert.equal(resolveDesignTabGrooveLinesAutoBaseline({ grooveDraftWidthCm: 80 }), 28);
  assert.equal(
    resolveDesignTabGrooveLinesAutoBaseline({
      grooveOrientation: 'horizontal',
      grooveDraftHeightCm: 40,
    }),
    14
  );
});
