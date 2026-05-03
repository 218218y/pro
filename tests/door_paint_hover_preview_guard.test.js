import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const HOVER_FLOW = path.resolve(
  process.cwd(),
  'esm/native/services/canvas_picking_hover_flow_nonsplit_preview_door.ts'
);
const DOOR_HOVER = path.resolve(
  process.cwd(),
  'esm/native/services/canvas_picking_door_action_hover_marker.ts'
);
const DOOR_ACTION_PREVIEW_PAINT = path.resolve(
  process.cwd(),
  'esm/native/services/canvas_picking_door_action_hover_preview_paint.ts'
);
const DOOR_ACTION_PREVIEW_SHARED = path.resolve(
  process.cwd(),
  'esm/native/services/canvas_picking_door_action_hover_preview_shared.ts'
);
const DOOR_ACTION_PREVIEW_STATE = path.resolve(
  process.cwd(),
  'esm/native/services/canvas_picking_door_action_hover_preview_state.ts'
);
const PREVIEW_MARKERS = path.resolve(
  process.cwd(),
  'esm/native/builder/render_preview_marker_ops_door_action.ts'
);

test('[door-paint-hover] paint hover passes the live UI state into door hover resolution', () => {
  const hoverFlow = fs.readFileSync(HOVER_FLOW, 'utf8');
  assert.match(hoverFlow, /paintSelection,/);
  assert.match(hoverFlow, /readUi: __wp_ui,/);
  assert.match(hoverFlow, /isDoorOrDrawerLikePartId: __wp_isDoorOrDrawerLikePartId,/);
});

test('[door-paint-hover] mirror hover reads canonical draft fields and special paint hover supports add\/remove', () => {
  const doorHover = fs.readFileSync(DOOR_HOVER, 'utf8');
  const actionPreview = fs.readFileSync(DOOR_ACTION_PREVIEW_PAINT, 'utf8');
  const sharedPreview = [
    fs.readFileSync(DOOR_ACTION_PREVIEW_SHARED, 'utf8'),
    fs.readFileSync(DOOR_ACTION_PREVIEW_STATE, 'utf8'),
  ].join('\n');
  const previewMarkers = fs.readFileSync(PREVIEW_MARKERS, 'utf8');

  assert.match(doorHover, /tryHandleDoorPaintHoverPreview/);
  assert.match(sharedPreview, /widthCm:\s*ui\?\.currentMirrorDraftWidthCm/);
  assert.match(sharedPreview, /heightCm:\s*ui\?\.currentMirrorDraftHeightCm/);
  assert.match(sharedPreview, /partId\.startsWith\('sketch_ext_drawers_'\)/);
  assert.match(sharedPreview, /\^sketch_box\(\?:_free\)\?_.+_ext_drawers_/);
  assert.match(actionPreview, /const mirrorDraft = __readMirrorDraft\(readUi, App\);/);
  assert.match(actionPreview, /draft:\s*mirrorDraft/);
  assert.match(actionPreview, /const hasSizedDraft = __hasMirrorSizedDraft\(readUi, App\);/);
  assert.match(actionPreview, /readMirrorLayoutList\(mirrorLayoutMap\[partKey\]\)/);
  assert.match(actionPreview, /findMirrorLayoutMatchInRect/);
  assert.match(actionPreview, /markerUd\.__matAdd/);
  assert.match(actionPreview, /markerUd\.__matRemove/);
  assert.match(previewMarkers, /mesh\.userData\.__matAdd\s*=\s*addMat;/);
});
