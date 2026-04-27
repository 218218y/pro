import test from 'node:test';
import assert from 'node:assert/strict';

import {
  STRUCTURE_CELL_DIMS_MODE_BUTTON_TEST_ID,
  STRUCTURE_CELL_DIMS_RESET_BUTTON_TEST_ID,
  STRUCTURE_CELL_DIMS_SECTION_TEST_ID,
  STRUCTURE_STACK_SPLIT_MODE_BUTTON_TEST_ID,
  STRUCTURE_STACK_SPLIT_SECTION_TEST_ID,
} from '../esm/native/ui/react/tabs/structure_tab_dimensions_section_contracts.ts';

test('structure dimensions contracts expose stable stack-split and cell-dims test ids', () => {
  assert.deepEqual(
    [
      STRUCTURE_STACK_SPLIT_SECTION_TEST_ID,
      STRUCTURE_STACK_SPLIT_MODE_BUTTON_TEST_ID,
      STRUCTURE_CELL_DIMS_SECTION_TEST_ID,
      STRUCTURE_CELL_DIMS_MODE_BUTTON_TEST_ID,
      STRUCTURE_CELL_DIMS_RESET_BUTTON_TEST_ID,
    ],
    [
      'structure-stack-split-section',
      'structure-stack-split-mode-button',
      'structure-cell-dims-section',
      'structure-cell-dims-mode-button',
      'structure-cell-dims-reset-button',
    ]
  );
});
