import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import {
  buildSavedModelsListRowModel,
  StructureTabSavedModelsListRow,
} from '../esm/native/ui/react/tabs/structure_tab_saved_models_list_row.tsx';

test('saved-model row model keeps preset and locked drag/overwrite semantics stable', () => {
  const presetRow = buildSavedModelsListRowModel(
    { id: 'preset:1', name: 'מובנה', isPreset: true, locked: false } as any,
    { listType: 'preset', draggingModelId: '', dragOverModelId: '' }
  );
  const lockedRow = buildSavedModelsListRowModel(
    { id: 'user:1', name: 'נעול', isPreset: false, locked: true } as any,
    { listType: 'saved', draggingModelId: 'user:1', dragOverModelId: 'user:1' }
  );
  const unlockedRow = buildSavedModelsListRowModel(
    { id: 'user:2', name: 'פתוח', isPreset: false, locked: false } as any,
    { listType: 'saved', draggingModelId: '', dragOverModelId: '' }
  );

  assert.deepEqual(presetRow, {
    id: 'preset:1',
    name: 'מובנה',
    preset: true,
    locked: false,
    canDrag: true,
    canOverwrite: true,
    isDragging: false,
    isOver: false,
  });

  assert.equal(lockedRow.canDrag, false);
  assert.equal(lockedRow.canOverwrite, false);
  assert.equal(lockedRow.isDragging, true);
  assert.equal(lockedRow.isOver, true);

  assert.equal(unlockedRow.canDrag, true);
  assert.equal(unlockedRow.canOverwrite, true);
});

test('saved-model preset row keeps RTL text pinned to the right after button cascade cleanup', () => {
  const row = buildSavedModelsListRowModel(
    { id: 'preset:1', name: '׳׳•׳‘׳ ׳”', isPreset: true, locked: false } as any,
    { listType: 'preset', draggingModelId: '', dragOverModelId: '' }
  );

  const html = renderToStaticMarkup(
    React.createElement(StructureTabSavedModelsListRow, {
      row,
      listType: 'preset',
      selectedId: '',
      dragOverPos: '',
      onSetSelected: () => undefined,
      onApplySelected: () => undefined,
      onToggleLock: () => undefined,
      onOverwriteById: () => undefined,
      onDeleteById: () => undefined,
      onRowDragStart: () => undefined,
      onRowDragEnd: () => undefined,
      onRowDragOver: () => undefined,
      onRowDrop: () => undefined,
    })
  );

  assert.match(html, /direction:rtl/);
  assert.match(html, /text-align:right/);
  assert.match(html, /justify-content:flex-start/);
  assert.doesNotMatch(html, /justify-content:flex-end/);
});
