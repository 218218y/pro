import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ts = require('typescript');

const srcPath = path.resolve('esm/native/features/handle_finish_shared.ts');
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
    throw new Error(`Unexpected import: ${spec}`);
  },
};
sandbox.exports = sandbox.module.exports;
vm.runInNewContext(transpiled, sandbox, { filename: srcPath });

const {
  HANDLE_FINISH_COLORS,
  normalizeHandleFinishColor,
  resolveHandleFinishPalette,
  isHandleFinishCustomColor,
} = sandbox.module.exports;

test('handle finish shared supports pink and custom hex colors canonically', () => {
  assert.deepEqual(Array.from(HANDLE_FINISH_COLORS), ['nickel', 'silver', 'gold', 'black', 'pink']);
  assert.equal(normalizeHandleFinishColor('pink'), 'pink');
  assert.equal(normalizeHandleFinishColor('#F3B6CB'), '#f3b6cb');
  assert.equal(normalizeHandleFinishColor('oops'), 'nickel');
  assert.equal(isHandleFinishCustomColor('#abcdef'), true);
  assert.equal(isHandleFinishCustomColor('gold'), false);
});

test('handle finish shared brightens gold and preserves custom palette hex', () => {
  const gold = resolveHandleFinishPalette('gold');
  const custom = resolveHandleFinishPalette('#abcdef');
  assert.equal(gold.hex, 0xe5c66b);
  assert.equal(custom.hex, 0xabcdef);
});
