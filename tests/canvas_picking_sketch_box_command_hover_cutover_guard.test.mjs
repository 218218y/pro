import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const STRICT_PRODUCERS = [
  'esm/native/services/canvas_picking_sketch_box_door_preview.ts',
  'esm/native/services/canvas_picking_sketch_box_stack_preview_drawers.ts',
  'esm/native/services/canvas_picking_sketch_box_stack_preview_ext_drawers.ts',
  'esm/native/services/canvas_picking_regular_ext_drawers_free_box.ts',
];

const RETIRED_GENERIC_FIELDS = [
  'boxBaseYNorm',
  'snapToCenter',
  'yCenter',
  'baseY',
  'stackH',
  'drawerH',
  'drawerGap',
  'drawerHeightM',
  'drawerCount',
  'hasShoeDrawer',
  'hinge',
  'doorId',
  'doorLeftId',
  'doorRightId',
];

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

function readTypeBlock(source, typeName) {
  const start = source.indexOf(`type ${typeName} = {`);
  assert.notEqual(start, -1, `${typeName} must remain declared`);
  const end = source.indexOf('\n};', start);
  assert.notEqual(end, -1, `${typeName} declaration must remain closed`);
  return source.slice(start, end + 3);
}

test('strict sketch-box producers emit only the canonical command hover record', () => {
  for (const relativePath of STRICT_PRODUCERS) {
    const source = read(relativePath);
    assert.match(
      source,
      /createManualLayoutSketchBoxCommandHoverRecord/,
      `${relativePath} must emit the versioned command hover`
    );
    assert.doesNotMatch(
      source,
      /createManualLayoutSketchBoxContentHoverRecord/,
      `${relativePath} must not fall back to the flat box_content record`
    );
  }
});

test('generic box-content hover contract cannot reintroduce retired drawer or door fields', () => {
  const source = read('esm/native/services/canvas_picking_manual_layout_sketch_hover_state.ts');
  const argsBlock = readTypeBlock(source, 'ManualLayoutSketchBoxContentHoverArgs');
  for (const field of RETIRED_GENERIC_FIELDS) {
    assert.doesNotMatch(argsBlock, new RegExp(`\\b${field}\\??\\s*:`), `${field} is command-owned`);
  }
});

test('canonical command hover decoder rejects top-level compatibility fields', () => {
  const source = read('esm/native/services/canvas_picking_sketch_box_content_command.ts');
  assert.match(source, /noncanonical-hover-shape/);
  assert.match(source, /Object\.keys\(record\)\.some\(key => !COMMAND_HOVER_FIELDS\.has\(key\)\)/);
});
