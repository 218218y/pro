import test from 'node:test';
import assert from 'node:assert/strict';

import {
  resolveGlobalFrontMaterialInput,
  resolveSelectionFrontMaterial,
} from '../esm/native/builder/material_selection.ts';

test('material selection resolves global custom and saved texture inputs from cfg only', () => {
  assert.deepEqual(
    resolveGlobalFrontMaterialInput({
      colorChoice: 'custom',
      customColor: '#123456',
      cfg: { customUploadedDataURL: 'data:cfg' },
    }),
    { colorKey: 'custom', useTexture: true, textureDataURL: 'data:cfg' }
  );

  assert.deepEqual(
    resolveGlobalFrontMaterialInput({
      colorChoice: 'custom',
      customColor: '#123456',
      cfg: { customUploadedDataURL: '' },
    }),
    { colorKey: '#123456', useTexture: false, textureDataURL: null }
  );

  assert.deepEqual(
    resolveGlobalFrontMaterialInput({
      colorChoice: 'saved_tex',
      customColor: '#ffffff',
      cfg: {
        savedColors: [{ id: 'saved_tex', type: 'texture', value: 'oak', textureData: 'data:saved' }],
      },
    }),
    { colorKey: 'saved_tex', useTexture: true, textureDataURL: 'data:saved' }
  );

  assert.deepEqual(
    resolveGlobalFrontMaterialInput({
      colorChoice: 'saved_flat',
      customColor: '#ffffff',
      cfg: { savedColors: [{ id: 'saved_flat', type: 'color', value: '#abcdef' }] },
    }),
    { colorKey: '#abcdef', useTexture: false, textureDataURL: null }
  );
});

test('material selection resolves per-part saved and custom materials with explicit texture data', () => {
  const calls: unknown[][] = [];
  const getMaterial = (
    color: string | null,
    part: string,
    useTexture?: boolean,
    textureDataURL?: string | null
  ) => {
    const args = [color, part, !!useTexture, textureDataURL ?? null];
    calls.push(args);
    return { args };
  };
  const cfg = {
    savedColors: [
      { id: 'saved_tex', type: 'texture', value: 'oak', textureData: 'data:saved' },
      { id: 'saved_flat', type: 'color', value: '#334455' },
    ],
  };

  assert.deepEqual(resolveSelectionFrontMaterial({ selection: 'saved_tex', cfg, getMaterial }), {
    args: ['saved_tex', 'front', true, 'data:saved'],
  });
  assert.deepEqual(resolveSelectionFrontMaterial({ selection: 'saved_flat', cfg, getMaterial }), {
    args: ['#334455', 'front', false, null],
  });
  assert.deepEqual(
    resolveSelectionFrontMaterial({ selection: 'custom', cfg, getMaterial, customColor: '#112233' }),
    { args: ['#112233', 'front', false, null] }
  );
  assert.deepEqual(resolveSelectionFrontMaterial({ selection: 'custom', cfg, getMaterial }), {
    args: ['custom', 'front', false, null],
  });
  assert.deepEqual(calls, [
    ['saved_tex', 'front', true, 'data:saved'],
    ['#334455', 'front', false, null],
    ['#112233', 'front', false, null],
    ['custom', 'front', false, null],
  ]);
});
