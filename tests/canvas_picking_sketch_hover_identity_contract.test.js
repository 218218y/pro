import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { normalizeWhitespace } from './_source_bundle.js';

const readRaw = rel => fs.readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');
const read = rel => normalizeWhitespace(readRaw(rel));

const identityOwner = read('esm/native/services/canvas_picking_sketch_hover_identity.ts');
const runtimeWriter = read('esm/native/services/canvas_picking_projection_runtime_shared.ts');
const matchingOwner = read('esm/native/services/canvas_picking_sketch_hover_matching.ts');
const intentOwner = read('esm/native/services/canvas_picking_manual_layout_sketch_hover_intent_snapshot.ts');
const drawerOwner = read('esm/native/services/canvas_picking_drawer_cross_family.ts');
const regularDrawerOwner = read('esm/native/services/canvas_picking_regular_ext_drawers_free_box.ts');
const extDrawerHoverOwner = read('esm/native/services/canvas_picking_ext_drawer_mode_hover.ts');
const audit = read('docs/layering_completion_audit.md');
const guardrails = read('docs/QUALITY_GUARDRAILS.md');

const producerFiles = [
  'esm/native/services/canvas_picking_manual_layout_sketch_hover_state.ts',
  'esm/native/services/canvas_picking_sketch_module_surface_preview_hover_records.ts',
  'esm/native/services/canvas_picking_manual_layout_free_box_hover_protocol.ts',
  'esm/native/services/canvas_picking_sketch_free_commit.ts',
  'esm/native/services/canvas_picking_brace_shelves_sketch_extras.ts',
  'esm/native/services/canvas_picking_ext_drawer_mode_hover.ts',
  'esm/native/services/canvas_picking_sketch_free_surface_preview_adornment_preview.ts',
  'esm/native/services/canvas_picking_sketch_free_surface_preview_divider.ts',
];
const producers = producerFiles.map(read).join('\n');
const consumers = [matchingOwner, intentOwner, drawerOwner, regularDrawerOwner, extDrawerHoverOwner].join(
  '\n'
);

test('sketch hover host identity has one canonical owner and one atomic read/write contract', () => {
  assert.match(identityOwner, /export function createSketchHoverHostIdentity/);
  assert.match(identityOwner, /export function readSketchHoverHostIdentity/);
  assert.match(identityOwner, /export function assertCanonicalSketchHoverRecord/);
  assert.match(identityOwner, /hasRetiredSketchHoverHostIdentity\(record\)/);
  assert.match(identityOwner, /moduleKey\/isBottom are retired/);

  assert.match(runtimeWriter, /assertCanonicalSketchHoverRecord\(snap\)/);
  assert.doesNotMatch(matchingOwner, /readSketchHoverHostModuleKey/);
  assert.doesNotMatch(matchingOwner, /readSketchHoverHostIsBottom/);
  assert.doesNotMatch(consumers, /hostModuleKey\s*\?\?/);
  assert.doesNotMatch(consumers, /hover(?:Rec|Record)?\??\.moduleKey/);
  assert.doesNotMatch(consumers, /hover(?:Rec|Record)?\??\.isBottom/);
});

test('all sketch-hover producers emit host identity through the canonical constructor', () => {
  for (const file of producerFiles) {
    const source = read(file);
    assert.match(source, /createSketchHoverHostIdentity/);
  }

  assert.doesNotMatch(producers, /moduleKey:\s*[^,\n]+,\s*isBottom:\s*[^,\n]+,\s*hostModuleKey:/);
  assert.doesNotMatch(producers, /hostModuleKey:\s*[^,\n]+,\s*hostIsBottom:\s*[^,\n]+,\s*moduleKey:/);
});

test('architecture documentation records legacy sketch-hover identity as rejected rather than preferred', () => {
  const expected =
    'Sketch hover host identity is owned by `services/canvas_picking_sketch_hover_identity.ts`; transient records emit and read only canonical `hostModuleKey`/`hostIsBottom`, retired `moduleKey`/`isBottom` fields are rejected at both read and write boundaries, and incomplete identity never defaults to the top stack.';
  assert.ok(audit.includes(expected));
  assert.ok(guardrails.includes(expected));
});
