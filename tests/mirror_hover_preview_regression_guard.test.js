import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const hoverPreview = [
  readFileSync('esm/native/services/canvas_picking_door_action_hover_preview_shared.ts', 'utf8'),
  readFileSync('esm/native/services/canvas_picking_door_action_hover_preview_state.ts', 'utf8'),
  readFileSync('esm/native/services/canvas_picking_door_action_hover_preview_paint.ts', 'utf8'),
].join('\n');

test('[mirror-hover] sized drafts keep sized preview and full mirrors skip center guides', () => {
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
  assert.match(
    hoverPreview,
    /const showGuidePreview = !removeMatch && hasSizedDraft && \(center\.snappedX \|\| center\.snappedY\);/
  );
  assert.match(hoverPreview, /: hasSizedDraft && center\.isCentered/);
});
