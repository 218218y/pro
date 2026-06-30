import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const PROJECT_ROOT = path.resolve(new URL('..', import.meta.url).pathname);

function read(relPath) {
  return fs.readFileSync(path.join(PROJECT_ROOT, relPath), 'utf8');
}

function assertNoLiteralFieldId(source, id, label) {
  const escaped = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  assert.doesNotMatch(
    source,
    new RegExp(`\\bhtmlFor=["']${escaped}["']`),
    `${label} must not hard-code label htmlFor=${id}`
  );
  assert.doesNotMatch(
    source,
    new RegExp(`\\bid=["']${escaped}["']`),
    `${label} must not hard-code field id=${id}`
  );
}

test('dual-mounted sketch tool fields use instance-scoped DOM ids', () => {
  const sketchControls = read('esm/native/ui/react/tabs/interior_layout_sketch_controls.tsx');
  const manualControls = read('esm/native/ui/react/tabs/interior_layout_manual_controls.tsx');
  const interiorTab = read('esm/native/ui/react/tabs/InteriorTab.view.tsx');
  const sketchTab = read('esm/native/ui/react/tabs/SketchTab.view.tsx');
  const sketchShelves = read('esm/native/ui/react/tabs/interior_layout_sketch_shelves_section.tsx');
  const sketchBox = read('esm/native/ui/react/tabs/interior_layout_sketch_box_controls_section.tsx');
  const fieldIdHelper = read('esm/native/ui/react/components/form_field_id.ts');

  assert.match(
    interiorTab,
    /<InteriorLayoutSection\b/,
    'Interior tab owns the normal sketch tools entry point'
  );
  assert.match(
    sketchControls,
    /<InteriorLayoutSketchToolsPanel\b/,
    'Interior sketch controls render the shared tool panel'
  );
  assert.match(
    sketchTab,
    /<InteriorLayoutSketchToolsPanel\b/,
    'Sketch tab renders the same shared tool panel'
  );

  assert.match(
    fieldIdHelper,
    /export function buildScopedFormFieldId\(prefix: string, scope\?: string\): string/
  );
  assert.doesNotMatch(
    fieldIdHelper,
    /useId|useMemo|from ['"]react['"]/,
    'field id helper must stay pure because several runtime tests call exported leaf components directly'
  );

  assert.match(sketchShelves, /buildScopedFormFieldId\('wp-r-sketch-shelf-depth', props\.formFieldIdScope\)/);
  assert.match(
    sketchShelves,
    /buildScopedFormFieldId\('wp-r-sketch-storage-height', props\.formFieldIdScope\)/
  );
  assert.match(
    sketchBox,
    /buildScopedFormFieldId\('wp-r-sketch-box-plinth-height', props\.formFieldIdScope\)/
  );

  assert.match(manualControls, /formFieldIdScope="interior-layout-manual-controls"/);
  assert.match(sketchControls, /formFieldIdScope="interior-layout-sketch-tools"/);
  assert.match(sketchTab, /formFieldIdScope="sketch-tab-sketch-tools"/);

  assertNoLiteralFieldId(sketchShelves, 'wp-r-sketch-shelf-depth', 'sketch shelf depth field');
  assertNoLiteralFieldId(sketchShelves, 'wp-r-sketch-storage-height', 'sketch storage height field');
  assertNoLiteralFieldId(sketchBox, 'wp-r-sketch-box-plinth-height', 'sketch box plinth height field');
});

test('React roots use distinct identifier prefixes for useId fields', () => {
  const bootReactUi = read('esm/native/ui/react/boot_react_ui.tsx');

  assert.match(bootReactUi, /createRoot\(el, \{ identifierPrefix: `\$\{id\}-` \}\)/);
  assert.match(bootReactUi, /mount\(mountHosts\.sidebar, REACT_SIDEBAR_ROOT_ID, 'Sidebar'/);
  assert.match(bootReactUi, /mount\(mountHosts\.overlay, REACT_OVERLAY_ROOT_ID, 'Overlay'/);
});
