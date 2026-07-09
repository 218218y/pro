import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';

import { loadTsRuntimeModule } from './_ts_runtime_module_loader.mjs';

const palettePath = path.resolve('esm/native/features/metal_finish_palette.ts');
const paletteModule = loadTsRuntimeModule(palettePath);

const handlePath = path.resolve('esm/native/features/handle_finish_shared.ts');
const handleModule = loadTsRuntimeModule(handlePath, {
  mocks: {
    './metal_finish_palette.js': paletteModule,
  },
});

const srcPath = path.resolve('esm/native/features/finish_palette/api.ts');
const {
  HANDLE_FINISH_COLORS,
  normalizeHandleFinishColor,
  resolveHandleFinishPalette,
  isHandleFinishCustomColor,
} = loadTsRuntimeModule(srcPath, {
  mocks: {
    '../metal_finish_palette.js': paletteModule,
    '../handle_finish_shared.js': handleModule,
  },
});

test('finish palette API supports pink and custom hex handle colors canonically', () => {
  assert.deepEqual(Array.from(HANDLE_FINISH_COLORS), ['nickel', 'silver', 'gold', 'black', 'pink']);
  assert.equal(normalizeHandleFinishColor('pink'), 'pink');
  assert.equal(normalizeHandleFinishColor('#F3B6CB'), '#f3b6cb');
  assert.equal(normalizeHandleFinishColor('oops'), 'nickel');
  assert.equal(isHandleFinishCustomColor('#abcdef'), true);
  assert.equal(isHandleFinishCustomColor('gold'), false);
});

test('finish palette API brightens gold, keeps nickel visible, and preserves custom palette hex', () => {
  const gold = resolveHandleFinishPalette('gold');
  const nickel = resolveHandleFinishPalette('nickel');
  const custom = resolveHandleFinishPalette('#abcdef');
  assert.equal(gold.hex, 0xe5c66b);
  assert.equal(nickel.hex, 0xe5e9ef);
  assert.notEqual(nickel.hex, resolveHandleFinishPalette('silver').hex);
  assert.ok(nickel.roughness < resolveHandleFinishPalette('silver').roughness);
  assert.equal(custom.hex, 0xabcdef);
});
