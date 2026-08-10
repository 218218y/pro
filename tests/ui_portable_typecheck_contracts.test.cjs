const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..');

function read(relPath) {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

test('canonical project typecheck keeps portable fallback shims in shared types', () => {
  const reactShim = read('types/react_fallback_shim.d.ts');
  const pdfShim = read('types/pdf_lib_fallback_shim.d.ts');

  assert.match(reactShim, /declare module 'react'/);
  assert.match(reactShim, /declare module 'react\/jsx-runtime'/);
  assert.match(reactShim, /declare module 'react-dom'/);
  assert.match(reactShim, /declare module 'react-dom\/client'/);
  assert.match(pdfShim, /declare module 'pdf-lib'/);
  assert.match(reactShim, /export namespace JSX/);
});

test('whole-project strict config owns full UI while lean_types stay isolated to the portability lane', () => {
  const projectConfig = JSON.parse(read('tsconfig.json'));
  const include = Array.isArray(projectConfig.include) ? projectConfig.include : [];

  assert.equal(projectConfig.compilerOptions.strict, true);
  assert.ok(include.includes('esm/**/*.ts'));
  assert.ok(include.includes('esm/**/*.tsx'));
  assert.ok(include.includes('types/**/*.d.ts'));
  assert.ok(!include.includes('lean_types/**/*.d.ts'));

  const leanConfig = JSON.parse(read('tsconfig.ui-lean.json'));
  const leanInclude = Array.isArray(leanConfig.include) ? leanConfig.include : [];
  assert.ok(leanInclude.includes('esm/native/ui/**/*.ts'));
  assert.ok(!leanInclude.includes('esm/native/ui/**/*.tsx'));
  assert.ok(leanInclude.includes('lean_types/**/*.d.ts'));
  assert.equal(leanConfig.compilerOptions.strict, true);

  const distConfig = JSON.parse(read('tsconfig.dist.json'));
  const distInclude = Array.isArray(distConfig.include) ? distConfig.include : [];
  assert.ok(distInclude.includes('types/**/*.d.ts'));
});

test('lean shim remains isolated in lean_types for the lean lane', () => {
  const leanShimPath = path.join(repoRoot, 'lean_types', 'react_lean_shim.d.ts');
  assert.ok(fs.existsSync(leanShimPath));
});
