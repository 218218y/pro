import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

function read(rel) {
  return fs.readFileSync(new URL('../' + rel, import.meta.url), 'utf8');
}

test('door-style override mode is wired through design tab, paint apply, and hover preview canonical seams', () => {
  const panel = [
    read('esm/native/ui/react/tabs/design_tab_multicolor_panel.tsx'),
    read('esm/native/ui/react/tabs/design_tab_multicolor_panel_view.tsx'),
    read('esm/native/ui/react/tabs/design_tab_multicolor_panel_contracts.ts'),
  ].join('\n');
  const controller = read('esm/native/ui/react/tabs/design_tab_multicolor_controller_runtime.ts');
  const paintApply = read('esm/native/services/canvas_picking_paint_flow_apply.ts');
  const paintDoorStyle = read('esm/native/services/canvas_picking_paint_flow_apply_door_style.ts');
  const grooveSegments = read('esm/native/services/canvas_picking_door_groove_segments.ts');
  const materialization = read('esm/native/services/canvas_picking_door_segment_materialization.ts');
  const ownerMap = read('esm/native/services/canvas_picking_door_visual_owner_map.ts');
  const hover = read('esm/native/services/canvas_picking_door_action_hover_preview_paint.ts');
  const hinged = read('esm/native/builder/render_door_ops_hinged.ts');
  const drawers = [
    read('esm/native/builder/render_drawer_ops.ts'),
    read('esm/native/builder/render_drawer_ops_external.ts'),
  ].join('\n');

  assert.match(panel, /סגנון חזית לדלתות ומגירות/);
  assert.match(panel, /enterDoorStyleMode/);
  assert.match(panel, /פרופיל כפול/);
  assert.match(controller, /enterDoorStyleMode\(style: DoorStyleOverrideValue\)/);
  assert.match(controller, /encodeDoorStyleOverridePaintToken\(style\)/);
  assert.match(paintApply, /tryHandleDoorStyleOverridePaintClick\(/);
  assert.match(paintDoorStyle, /parseDoorStyleOverridePaintToken\(args\.paintSelection\)/);
  assert.match(paintDoorStyle, /setCfgDoorStyleMap\(args\.App, doorStyleMap, baseMeta\)/);
  assert.doesNotMatch(paintDoorStyle, /cfgSetMap\(args\.App, 'doorStyleMap'/);
  assert.match(paintDoorStyle, /resolveDoorAuthoringStylePaintTargetKey\(\{/);
  assert.match(paintDoorStyle, /isDoorOrDrawerLikePartId: __wp_isDoorOrDrawerLikePartId/);
  assert.match(paintDoorStyle, /scopePartKeyForStack: __wp_scopeCornerPartKeyForStack/);
  assert.doesNotMatch(paintDoorStyle, /toDoorStyleOverrideMapKey/);
  assert.match(hover, /resolveDoorStylePaintSelectionState\(\{/);
  assert.match(hover, /doorStylePaintState\.willRemove/);
  assert.match(grooveSegments, /shared\/door_groove_key_contracts_shared\.js/);
  assert.match(grooveSegments, /shared\/door_visual_key_contracts_shared\.js/);
  assert.doesNotMatch(grooveSegments, /features\/door_authoring\/api\.js/);
  assert.match(materialization, /shared\/door_visual_key_contracts_shared\.js/);
  assert.doesNotMatch(materialization, /features\/door_authoring\/api\.js/);
  assert.match(ownerMap, /features\/door_authoring\/api\.js/);
  for (const source of [grooveSegments, materialization, ownerMap]) {
    assert.doesNotMatch(source, /SEGMENTED_DOOR_/);
    assert.doesNotMatch(source, /DOOR_VISUAL_SURFACE_SUFFIX_RE/);
  }
  assert.match(grooveSegments, /resolveDoorVisualSegmentIdentity/);
  assert.match(materialization, /resolveDoorVisualSegmentIdentity/);
  assert.match(ownerMap, /buildDoorVisualOwnerAliasKeys/);
  assert.match(hinged, /resolveDoorVisualStyle\(/);
  assert.match(drawers, /resolveDoorVisualStyle\(/);
});
