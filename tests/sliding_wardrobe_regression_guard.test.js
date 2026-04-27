import test from 'node:test';
import assert from 'node:assert/strict';
import { readFirstExisting } from './_read_src.js';
import { normalizeWhitespace } from './_source_bundle.js';

const interiorTab = [
  readFirstExisting(['../esm/native/ui/react/tabs/InteriorTab.view.tsx'], import.meta.url),
  readFirstExisting(['../esm/native/ui/react/tabs/use_interior_tab_view_state.ts'], import.meta.url),
  readFirstExisting(['../esm/native/ui/react/tabs/use_interior_tab_view_state_state.ts'], import.meta.url),
  readFirstExisting(['../esm/native/ui/react/tabs/use_interior_tab_view_state_sync.ts'], import.meta.url),
].join('\n');
const interiorSections = [
  readFirstExisting(['../esm/native/ui/react/tabs/interior_tab_sections.tsx'], import.meta.url),
  readFirstExisting(['../esm/native/ui/react/tabs/interior_tab_sections_drawers.tsx'], import.meta.url),
].join('\n');
const handlesSrc = [
  readFirstExisting(['../esm/native/builder/handles.ts'], import.meta.url),
  readFirstExisting(['../esm/native/builder/handles_apply.ts'], import.meta.url),
  readFirstExisting(['../esm/native/builder/handles_apply_shared.ts'], import.meta.url),
  readFirstExisting(['../esm/native/builder/handles_apply_doors.ts'], import.meta.url),
  readFirstExisting(['../esm/native/builder/handles_apply_drawers.ts'], import.meta.url),
].join('\n');
const renderDoorOpsSrc = [
  readFirstExisting(['../esm/native/builder/render_door_ops.ts'], import.meta.url),
  readFirstExisting(['../esm/native/builder/render_door_ops_sliding.ts'], import.meta.url),
].join('\n');
const doorHoverModesSrc = [
  readFirstExisting(['../esm/native/services/canvas_picking_door_hover_targets_shared.ts'], import.meta.url),
  readFirstExisting(['../esm/native/services/canvas_picking_door_hover_targets_policy.ts'], import.meta.url),
].join('\n');
const doorActionHoverSrc = [
  readFirstExisting(['../esm/native/services/canvas_picking_door_action_hover_flow.ts'], import.meta.url),
  readFirstExisting(['../esm/native/services/canvas_picking_door_action_hover_marker.ts'], import.meta.url),
].join('\n');

const interiorTabNorm = normalizeWhitespace(interiorTab);
const interiorSectionsNorm = normalizeWhitespace(interiorSections);

test('sliding wardrobe hides external drawers controls in Interior tab', () => {
  assert.match(
    interiorTabNorm,
    /const wardrobeType = useCfgSelector\(cfg => String\(cfg\.wardrobeType \|\| 'hinged'\) === 'sliding' \? 'sliding' : 'hinged'\)/
  );
  assert.match(
    interiorTabNorm,
    /syncFromViewState\(syncInput\)|syncInput = React\.useMemo[\s\S]*?wardrobeType,[\s\S]*?isExtDrawerMode:[\s\S]*?modeExtDrawer: modeConsts\.modeExtDrawer/
  );
  assert.match(interiorTab, /<InteriorExternalDrawersSection[\s\S]*?wardrobeType=\{state\.wardrobeType\}/);
  assert.match(
    interiorSectionsNorm,
    /export function InteriorExternalDrawersSection\([\s\S]*InteriorExternalDrawersSectionProps/
  );
  assert.match(interiorSectionsNorm, /if \(props\.wardrobeType === 'sliding'\) return null;/);
});

test('sliding wardrobe door handles are skipped by the shared handles pass', () => {
  assert.match(handlesSrc, /if \(d && d\.type === 'sliding'\) continue;/);
});

test('sliding wardrobe doors expose centered-pivot metadata for hover overlays', () => {
  assert.match(renderDoorOpsSrc, /group\.userData\.__doorWidth = doorOp\.width;/);
  assert.match(renderDoorOpsSrc, /group\.userData\.__doorHeight = doorOp\.height;/);
  assert.match(renderDoorOpsSrc, /group\.userData\.__doorType = 'sliding';/);
  assert.match(renderDoorOpsSrc, /group\.userData\.__doorPivotCentered = true;/);
});

test('sliding wardrobe hover overlay anchors from the door center instead of a hinge edge', () => {
  assert.match(doorHoverModesSrc, /export function __getDoorHoverAnchorX\(/);
  assert.match(doorHoverModesSrc, /if \(__isSlidingDoorHoverGroup\(group, userData\)\) return 0;/);
  assert.match(doorActionHoverSrc, /local\.set\(anchorX, 0, zOff\);/);
});
