const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = process.cwd();

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

test('ui lean typecheck config stays scoped to no-deps UI .ts surfaces', () => {
  const raw = read('tsconfig.checkjs.ui-lean.json');
  const cfg = JSON.parse(raw);
  assert.deepEqual(cfg.include, [
    'esm/native/ui/**/*.ts',
    'types/**/*.d.ts',
    'types/**/*.ts',
    'lean_types/**/*.d.ts',
  ]);
  assert.ok(JSON.stringify(cfg.exclude).includes('ui/**/*.tsx'));
  assert.ok(!JSON.stringify(cfg.include).includes('ui/**/*.tsx'));
  assert.equal(cfg.compilerOptions.skipLibCheck, true);
});

test('ui lean react shim exports jsx runtime and react-dom client seams', () => {
  const raw = read('lean_types/react_lean_shim.d.ts');
  assert.match(raw, /declare module 'react\/jsx-runtime'/);
  assert.match(raw, /declare module 'react-dom\/client'/);
  assert.match(raw, /declare module 'react-dom'/);
  assert.match(raw, /declare global \{[\s\S]*namespace JSX/);
});

test('notes overlay workflow uses DOM PointerEvent for window listener capture', () => {
  const raw = read('esm/native/ui/react/notes/notes_overlay_editor_workflow_events.ts');
  assert.match(raw, /globalThis\.PointerEvent/);
  assert.doesNotMatch(raw, /import type \{[^}]*PointerEvent[^}]*\} from 'react'/);
});

test('ui lean shim stays isolated outside shared types and carries pdf/runtime support', () => {
  const raw = read('lean_types/react_lean_shim.d.ts');
  assert.match(raw, /inputMode\?: string/);
  assert.match(raw, /stopImmediatePropagation\?\(\): void/);
  assert.match(raw, /setDragImage\?/);
  const pdfShim = read('lean_types/pdf_lib_shim.d.ts');
  assert.match(pdfShim, /declare module 'pdf-lib'/);
  assert.equal(fs.existsSync(path.join(ROOT, 'types', 'react_lean_shim.d.ts')), false);
});
