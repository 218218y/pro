import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const hoverPreview = [
  readFileSync('esm/native/services/canvas_picking_door_action_hover_preview_shared.ts', 'utf8'),
  readFileSync('esm/native/services/canvas_picking_door_action_hover_preview_state.ts', 'utf8'),
  readFileSync('esm/native/services/canvas_picking_door_action_hover_preview_paint.ts', 'utf8'),
].join('\n');

test('[mirror-hover] sized drafts keep sized preview and center highlights stay on measurements', () => {
  assert.match(hoverPreview, /widthCm:\s*ui\?\.currentMirrorDraftWidthCm/);
  assert.match(hoverPreview, /heightCm:\s*ui\?\.currentMirrorDraftHeightCm/);
  assert.match(
    hoverPreview,
    /export function __hasMirrorSizedDraft\(readUi: ReadUiFn, App: AppContainer\): boolean \{/
  );
  assert.match(
    hoverPreview,
    /return __readPositiveDraftCm\(draft\.widthCm\) != null \|\| __readPositiveDraftCm\(draft\.heightCm\) != null;/
  );
  assert.match(hoverPreview, /buildRectClearanceMeasurementEntries/);
  assert.match(hoverPreview, /markCenteredRectClearanceMeasurements/);
  assert.match(
    hoverPreview,
    /const showCenteredMeasurements = !removeMatch && hasSizedDraft;/
  );
  assert.match(hoverPreview, /centerX: showCenteredMeasurements && !!center\.snappedX/);
  assert.match(hoverPreview, /centerY: showCenteredMeasurements && !!center\.snappedY/);
  assert.match(hoverPreview, /showCenterXGuide: false/);
  assert.match(hoverPreview, /showCenterYGuide: false/);
  assert.match(hoverPreview, /: hasSizedDraft && center\.isCentered/);
});
