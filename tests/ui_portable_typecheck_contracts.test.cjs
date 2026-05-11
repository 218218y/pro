const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..');

function read(relPath) {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

test('ui full typecheck keeps portable fallback shims in shared types', () => {
  const reactShim = read('types/react_fallback_shim.d.ts');
  const pdfShim = read('types/pdf_lib_fallback_shim.d.ts');

  assert.match(reactShim, /declare module 'react'/);
  assert.match(reactShim, /declare module 'react\/jsx-runtime'/);
  assert.match(reactShim, /declare module 'react-dom'/);
  assert.match(reactShim, /declare module 'react-dom\/client'/);
  assert.match(pdfShim, /declare module 'pdf-lib'/);
  assert.match(reactShim, /declare module 'react\/jsx-runtime'/);
  assert.match(reactShim, /export namespace JSX/);
});

test('ui full typecheck stays wired to shared types without importing lean_types directly', () => {
  const config = JSON.parse(read('tsconfig.checkjs.ui.json'));
  const include = Array.isArray(config.include) ? config.include : [];

  assert.ok(include.includes('esm/native/ui/**/*.ts'));
  assert.ok(include.includes('esm/native/ui/**/*.tsx'));
  assert.ok(include.includes('types/**/*.d.ts'));
  assert.ok(!include.includes('lean_types/**/*.d.ts'));

  const strictConfig = JSON.parse(read('tsconfig.checkjs.strict-ui.json'));
  const strictInclude = Array.isArray(strictConfig.include) ? strictConfig.include : [];
  assert.ok(strictInclude.includes('esm/native/ui/**/*.ts'));
  assert.ok(strictInclude.includes('esm/native/ui/**/*.tsx'));

  const distConfig = JSON.parse(read('tsconfig.dist.json'));
  const distInclude = Array.isArray(distConfig.include) ? distConfig.include : [];
  assert.ok(distInclude.includes('types/**/*.d.ts'));
});

test('lean shim remains isolated in lean_types for the lean lane', () => {
  const leanShimPath = path.join(repoRoot, 'lean_types', 'react_lean_shim.d.ts');
  assert.ok(fs.existsSync(leanShimPath));
});
