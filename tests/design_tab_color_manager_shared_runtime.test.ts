import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildOrderedSwatches,
  normalizeColorSwatchesOrder,
} from '../esm/native/ui/react/tabs/design_tab_color_manager_shared.js';
import { normalizeSavedColors } from '../esm/native/ui/react/tabs/design_tab_multicolor_shared.js';

test('design tab color manager shared canonicalizes duplicate saved colors and swatch order ids', () => {
  const savedColors = normalizeSavedColors([
    { id: ' saved_a ', name: ' Walnut ', value: ' #111111 ' },
    { id: 'saved_a', name: 'Duplicate', value: '#222222', locked: true },
    {
      id: 'saved_b',
      name: '  ',
      value: '#333333',
      type: 'texture',
      textureData: 'data:text/plain;base64,QQ==',
    },
    { id: '', name: 'bad', value: '#444444' },
  ]);

  assert.deepEqual(savedColors, [
    { id: 'saved_a', name: 'Walnut', type: 'color', value: '#111111', textureData: null, locked: false },
    {
      id: 'saved_b',
      name: 'ללא שם',
      type: 'texture',
      value: '#333333',
      textureData: 'data:text/plain;base64,QQ==',
      locked: false,
    },
  ]);

  assert.deepEqual(normalizeColorSwatchesOrder([' saved_b ', 'saved_a', 'saved_b', null, '', 'saved_a']), [
    'saved_b',
    'saved_a',
  ]);
});

test('design tab color manager shared builds ordered swatches without duplicate ids from raw order', () => {
  const savedColors = normalizeSavedColors([
    { id: 'saved_a', name: 'Walnut', value: '#111111' },
    { id: 'saved_b', name: 'Graphite', value: '#222222' },
  ]);

  const ordered = buildOrderedSwatches(savedColors, [
    'saved_b',
    'saved_b',
    'default_#ffffff',
    'missing',
    'saved_a',
    'default_#ffffff',
  ]);

  const ids = ordered.map(color => color.id);
  assert.equal(ids.length, new Set(ids).size);
  assert.deepEqual(ids.slice(0, 3), ['saved_b', 'default_#ffffff', 'saved_a']);
  assert.ok(ids.includes('default_#f2f0eb'));
});
