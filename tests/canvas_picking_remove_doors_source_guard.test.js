import test from 'node:test';
import assert from 'node:assert/strict';
import { readFirstExisting } from './_read_src.js';

const clickFlowSrc = [
  readFirstExisting(['../esm/native/services/canvas_picking_click_flow.ts'], import.meta.url),
  readFirstExisting(['../esm/native/services/canvas_picking_click_route.ts'], import.meta.url),
  readFirstExisting(['../esm/native/services/canvas_picking_click_route_actions.ts'], import.meta.url),
].join('\n');
const doorEditSrc = readFirstExisting(
  [
    '../esm/native/services/canvas_picking_door_remove_click.ts',
    '../esm/native/services/canvas_picking_door_edit_flow.ts',
    '../esm/native/services/canvas_picking_click_route_actions.ts',
    '../esm/native/services/canvas_picking_click_flow.ts',
  ],
  import.meta.url
);
const hoverModesSrc = [
  readFirstExisting(['../esm/native/services/canvas_picking_door_action_hover_flow.ts'], import.meta.url),
  readFirstExisting(['../esm/native/services/canvas_picking_door_action_hover_remove.ts'], import.meta.url),
].join('\n');

test('remove-door segmented family logic stays in the canonical door-edit flow and is driven by actual door-part ids', () => {
  assert.match(clickFlowSrc, /tryHandleCanvasDoorEditClick\(\{/);
  assert.match(doorEditSrc, /const familyPartIds = \(\(\) => \{/);
  assert.match(doorEditSrc, /pid\.startsWith\(base \+ '_'/);
  assert.doesNotMatch(
    doorEditSrc,
    /const hasMid = base\.startsWith\('corner_pent_door_'\) \|\| base\.startsWith\('lower_corner_pent_door_'\);/
  );
});

test('remove-door hover preview uses the same family-part detection strategy', () => {
  assert.match(hoverModesSrc, /const familyPartIds = readDoorActionHoverFamilyPartIds\(/);
  assert.match(hoverModesSrc, /getDoorsArray\(hoverArgs\.App\)/);
  assert.doesNotMatch(
    hoverModesSrc,
    /const hasMid =\s*base\.startsWith\('corner_pent_door_'\) \|\| base\.startsWith\('lower_corner_pent_door_'\);/
  );
});
