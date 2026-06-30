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
  const interiorTab = read('esm/native/ui/react/tabs/InteriorTab.view.tsx');
  const sketchTab = read('esm/native/ui/react/tabs/SketchTab.view.tsx');
  const sketchShelves = read('esm/native/ui/react/tabs/interior_layout_sketch_shelves_section.tsx');
  const sketchBox = read('esm/native/ui/react/tabs/interior_layout_sketch_box_controls_section.tsx');

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

  assert.match(sketchShelves, /useReactDomId\('wp-r-sketch-shelf-depth'\)/);
  assert.match(sketchShelves, /useReactDomId\('wp-r-sketch-storage-height'\)/);
  assert.match(sketchBox, /useReactDomId\('wp-r-sketch-box-plinth-height'\)/);

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
