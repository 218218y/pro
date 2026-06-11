import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const file = path.resolve(process.cwd(), 'esm/native/services/canvas_picking_door_action_hover_state.ts');

test('sketch segmented door hover treats sketch door leaves as their own local bounds source', () => {
  const src = fs.readFileSync(file, 'utf8');
  assert.match(src, /userData\.__wpSketchDoorLeaf === true/);
});
