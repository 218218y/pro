import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

function readSource(file) {
  return fs.readFileSync(file, 'utf8');
}

function interfaceBody(source, name) {
  const marker = `export interface ${name}`;
  const start = source.indexOf(marker);
  assert.notEqual(start, -1, `${name} is missing`);
  const bodyStart = source.indexOf('{', start);
  assert.notEqual(bodyStart, -1, `${name} body is missing`);
  let depth = 0;
  for (let index = bodyStart; index < source.length; index += 1) {
    const char = source[index];
    if (char === '{') depth += 1;
    if (char === '}') depth -= 1;
    if (depth === 0) return source.slice(bodyStart, index + 1);
  }
  assert.fail(`${name} body did not close`);
}

function assertClosedInterface(file, name) {
  const source = readSource(file);
  const declaration = source.slice(
    source.indexOf(`export interface ${name}`),
    source.indexOf('{', source.indexOf(`export interface ${name}`))
  );
  const body = interfaceBody(source, name);
  assert.doesNotMatch(declaration, /extends\s+UnknownRecord/, `${name} must not inherit an open record`);
  assert.doesNotMatch(
    body,
    /\[\s*(?:k|key)\s*:\s*string\s*\]/,
    `${name} must not expose a string index signature`
  );
}

test('canonical store state closes UI, config, runtime, root, and ui.raw key surfaces', () => {
  assertClosedInterface('types/ui_state.ts', 'UiState');
  assertClosedInterface('types/build_state.ts', 'ConfigStateLike');
  assertClosedInterface('types/build_state.ts', 'RuntimeStateLike');
  assertClosedInterface('types/store_state.ts', 'RootStateLike');
  assertClosedInterface('types/ui_raw.ts', 'UiRawInputsLike');

  const buildState = readSource('types/build_state.ts');
  assert.match(buildState, /export type UiStateLike = UiState;/);

  const rootBody = interfaceBody(readSource('types/store_state.ts'), 'RootStateLike');
  const rootKeys = [...rootBody.matchAll(/^\s{2}([A-Za-z][A-Za-z0-9_]*)\s*:/gm)].map(match => match[1]);
  assert.deepEqual(rootKeys, ['ui', 'config', 'runtime', 'mode', 'meta']);
  assert.doesNotMatch(rootBody, /\bbuild\s*:/);
});

test('canonical ui.raw runtime parser admits only declared scalar keys and valid scalar values', () => {
  const typedOwner = readSource('types/ui_raw.ts');
  const runtimeOwner = readSource('types/ui_raw.js');

  for (const source of [typedOwner, runtimeOwner]) {
    assert.match(source, /for \(const key of UI_RAW_SCALAR_KEYS\)/);
    assert.match(source, /typeof value === 'boolean'/);
    assert.match(source, /typeof value === 'number' && Number\.isFinite\(value\)/);
    assert.doesNotMatch(source, /return isObjectRecord\(raw\) \? \{ \.\.\.raw \} : \{\}/);
  }
});

test('retired state compatibility paths cannot re-enter runtime ownership', () => {
  assert.equal(fs.existsSync('esm/native/runtime/ui_raw_selectors_snapshot.ts'), false);

  const runtimeFacade = readSource('esm/native/runtime/ui_raw_selectors.ts');
  const structureSync = readSource('esm/native/ui/react/tabs/structure_tab_structural_controller_sync.ts');
  const projectLoad = readSource('esm/native/io/project_io_load_helpers.ts');
  const orderPdfCache = readSource('esm/native/ui/export/export_order_pdf_capture_cache.ts');

  assert.doesNotMatch(
    runtimeFacade,
    /readUiRawScalarFromSnapshot|ensureUiRawDimsFromSnapshot|hasEssentialUiDimsFromSnapshot/
  );
  assert.doesNotMatch(structureSync, /createStructuralRawMirrorPatch/);
  const rawTypes = readSource('types/ui_raw.ts');
  assert.match(rawTypes, /structureSelect\?: string;/);
  assert.match(rawTypes, /singleDoorPos\?: string;/);
  assert.match(projectLoad, /structureSelect: settings\.structureSelection/);
  assert.match(projectLoad, /singleDoorPos: settings\.singleDoorPos \|\| 'left'/);
  assert.doesNotMatch(orderPdfCache, /state\.build|captureState\.build/);
});
