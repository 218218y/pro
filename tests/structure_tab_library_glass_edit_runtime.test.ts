import test from 'node:test';
import assert from 'node:assert/strict';

import { STRUCTURE_LIBRARY_GLASS_OPTIONS } from '../esm/native/ui/react/tabs/structure_tab_dimensions_section_contracts.ts';
import {
  STRUCTURE_LIBRARY_GLASS_EDIT_SOURCE,
  STRUCTURE_LIBRARY_GLASS_EDIT_TOAST,
  enterStructureLibraryGlassEditMode,
  resolveStructureLibraryPaintModeId,
} from '../esm/native/ui/react/tabs/structure_tab_library_glass_edit.ts';

test('structure library glass options expose the three existing glass paint selections in requested order', () => {
  assert.deepEqual(
    STRUCTURE_LIBRARY_GLASS_OPTIONS.map(option => option.label),
    ['זכוכית', 'זכוכית מלאה', 'זכוכית פרופיל תום']
  );
  assert.deepEqual(
    STRUCTURE_LIBRARY_GLASS_OPTIONS.map(option => option.paintId),
    ['glass', '__wp_glass_style__:flat', '__wp_glass_style__:tom']
  );
});

test('structure library glass edit mode enters paint mode with no curtain and selected glass token', () => {
  const calls: unknown[][] = [];
  const app = {} as never;
  const selected = STRUCTURE_LIBRARY_GLASS_OPTIONS[2]?.paintId || '';

  const ok = enterStructureLibraryGlassEditMode({
    app,
    paintId: selected,
    fb: {
      toast: (message, type) => calls.push(['toast', message, type]),
    },
    deps: {
      modes: { PAINT: 'custom-paint' },
      setMultiEnabled: (_app, next, meta) => calls.push(['setMultiEnabled', next, meta]),
      setCurtainChoice: (_app, id) => calls.push(['setCurtainChoice', id]),
      enterPrimaryMode: (_app, modeId, opts) => calls.push(['enterPrimaryMode', modeId, opts]),
      getTools: () => ({
        setPaintColor: (paintId, meta) => calls.push(['setPaintColor', paintId, meta]),
      }),
    },
  });

  assert.equal(ok, true);
  assert.equal(resolveStructureLibraryPaintModeId({ PAINT: 'custom-paint' }), 'custom-paint');
  assert.deepEqual(calls[0], [
    'setMultiEnabled',
    true,
    { source: STRUCTURE_LIBRARY_GLASS_EDIT_SOURCE, immediate: true },
  ]);
  assert.deepEqual(calls[1], ['setCurtainChoice', 'none']);
  assert.equal(calls[2]?.[0], 'enterPrimaryMode');
  assert.equal(calls[2]?.[1], 'custom-paint');
  assert.deepEqual(calls[2]?.[2], {
    cursor: 'crosshair',
    toast: STRUCTURE_LIBRARY_GLASS_EDIT_TOAST,
  });
  assert.deepEqual(calls[3], [
    'setPaintColor',
    '__wp_glass_style__:tom',
    { source: STRUCTURE_LIBRARY_GLASS_EDIT_SOURCE, immediate: true },
  ]);
  assert.deepEqual(calls[4], ['toast', STRUCTURE_LIBRARY_GLASS_EDIT_TOAST, 'info']);
});
