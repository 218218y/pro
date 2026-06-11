import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ts = require('typescript');

const srcPath = path.resolve('esm/native/ui/react/tabs/interior_tab_local_state_shared.ts');
const src = fs.readFileSync(srcPath, 'utf8');
const transpiled = ts.transpileModule(src, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
  },
  fileName: srcPath,
}).outputText;

const sandbox = {
  module: { exports: {} },
  exports: {},
  require: spec => {
    if (spec === '../../../features/sketch_drawer_sizing.js') {
      return {
        DEFAULT_SKETCH_EXTERNAL_DRAWER_HEIGHT_CM: 22,
        DEFAULT_SKETCH_INTERNAL_DRAWER_HEIGHT_CM: 16.5,
      };
    }
    return require(spec);
  },
};
sandbox.exports = sandbox.module.exports;
vm.runInNewContext(transpiled, sandbox, { filename: srcPath });

const {
  createInteriorTabLocalStateDefaults,
  INTERIOR_EXT_COUNTS,
  INTERIOR_GRID_DIVS,
  INTERIOR_HANDLE_TYPES,
  INTERIOR_LAYOUT_TYPES,
  INTERIOR_MANUAL_TOOLS,
} = sandbox.module.exports;

test('[interior-local-state-runtime] defaults stay canonical for drafts/options', () => {
  const defaults = createInteriorTabLocalStateDefaults();

  assert.equal(defaults.sketchBoxHeightCm, 40);
  assert.equal(defaults.sketchStorageHeightCm, 50);
  assert.equal(defaults.sketchBoxCorniceType, 'classic');
  assert.equal(defaults.sketchBoxBaseType, 'plinth');
  assert.equal(defaults.sketchBoxLegWidthCm, 4);
  assert.equal(defaults.sketchBoxLegWidthDraft, '4');
  assert.equal(defaults.sketchExtDrawerCount, 1);
  assert.equal(defaults.sketchExtDrawerHeightCm, 22);
  assert.equal(defaults.sketchExtDrawerHeightDraft, '22');
  assert.equal(defaults.sketchIntDrawerHeightCm, 16.5);
  assert.equal(defaults.sketchIntDrawerHeightDraft, '16.5');
  assert.equal(defaults.doorTrimColor, 'nickel');
  assert.equal(defaults.doorTrimHorizontalSpan, 'full');
  assert.equal(defaults.doorTrimVerticalSpan, 'full');
  assert.equal(defaults.manualUiTool, 'shelf');
  assert.deepEqual(JSON.parse(JSON.stringify(defaults.sketchShelfDepthByVariant)), {
    regular: '',
    double: '',
    glass: '',
    brace: '',
  });
  assert.deepEqual(JSON.parse(JSON.stringify(defaults.sketchShelfDepthDraftByVariant)), {
    regular: '',
    double: '',
    glass: '',
    brace: '',
  });

  assert.equal(INTERIOR_LAYOUT_TYPES.length, 6);
  assert.deepEqual(
    Array.from(INTERIOR_LAYOUT_TYPES, item => item.id),
    ['shelves', 'hanging', 'hanging_split', 'mixed', 'storage', 'brace_shelves']
  );
  assert.deepEqual(
    Array.from(INTERIOR_MANUAL_TOOLS, item => item.id),
    ['shelf', 'rod', 'storage']
  );
  assert.deepEqual(Array.from(INTERIOR_GRID_DIVS), [8, 7, 6, 5, 4, 3, 2]);
  assert.deepEqual(Array.from(INTERIOR_EXT_COUNTS), [1, 2, 3, 4, 5]);
  assert.deepEqual(
    Array.from(INTERIOR_HANDLE_TYPES, item => item.id),
    ['standard', 'edge', 'none']
  );
});
