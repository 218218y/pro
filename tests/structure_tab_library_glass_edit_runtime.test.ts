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
  assert.equal(calls.length, 4);
  assert.equal(
    calls.some(call => call[0] === 'toast'),
    false,
    'library glass edit should rely on the persistent mode banner and not emit a duplicate temporary toast'
  );
});

test('structure library glass edit mode reports side-effect failures through the structure tab reporter', () => {
  const reports: unknown[][] = [];
  const app = {} as never;

  const ok = enterStructureLibraryGlassEditMode({
    app,
    paintId: 'glass',
    fb: {
      toast: () => {
        throw new Error('temporary toast should not be called');
      },
    },
    deps: {
      setMultiEnabled: () => {
        throw new Error('multi failed');
      },
      setCurtainChoice: () => {
        throw new Error('curtain failed');
      },
      enterPrimaryMode: () => {
        throw new Error('mode failed');
      },
      getTools: () => ({}),
      reportNonFatal: (op, err) => reports.push([op, err instanceof Error ? err.message : String(err)]),
    },
  });

  assert.equal(ok, true);
  assert.deepEqual(reports, [
    ['structureLibraryGlassEdit.setMultiEnabled', 'multi failed'],
    ['structureLibraryGlassEdit.setCurtainChoice', 'curtain failed'],
    ['structureLibraryGlassEdit.enterPrimaryMode', 'mode failed'],
    ['structureLibraryGlassEdit.setPaintColor', 'tools.setPaintColor is not available'],
  ]);
});
