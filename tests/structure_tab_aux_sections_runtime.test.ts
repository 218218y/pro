import test from 'node:test';
import assert from 'node:assert/strict';

import {
  STRUCTURE_CORNER_MODE_TOGGLE_TEST_ID,
  STRUCTURE_CORNER_SECTION_TEST_ID,
  STRUCTURE_CORNER_SIDE_BUTTON_TEST_ID,
  STRUCTURE_CHEST_MODE_TOGGLE_TEST_ID,
  STRUCTURE_CHEST_COMMODE_BUTTON_TEST_ID,
  STRUCTURE_CHEST_COMMODE_WIDTH_MODE_BUTTON_TEST_ID,
  STRUCTURE_CHEST_SECTION_TEST_ID,
  STRUCTURE_CORNER_DIMENSION_FIELDS,
  STRUCTURE_CHEST_DIMENSION_FIELDS,
  STRUCTURE_LIBRARY_MODE_BUTTON_TEST_ID,
  STRUCTURE_LIBRARY_NOTICE_ACTIVE,
  STRUCTURE_LIBRARY_NOTICE_INACTIVE,
  STRUCTURE_LIBRARY_SECTION_TEST_ID,
} from '../esm/native/ui/react/tabs/structure_tab_aux_sections_contracts.ts';

test('structure aux contracts expose canonical corner/chest dims and library notices', () => {
  assert.deepEqual(
    STRUCTURE_CORNER_DIMENSION_FIELDS.map(field => field.activeId),
    ['cornerWidth', 'cornerHeight', 'cornerDepth']
  );
  assert.deepEqual(
    STRUCTURE_CHEST_DIMENSION_FIELDS.map(field => field.activeId),
    ['height', 'width', 'depth']
  );
  assert.match(STRUCTURE_LIBRARY_NOTICE_ACTIVE, /מצב ספריות פעיל/);
  assert.match(STRUCTURE_LIBRARY_NOTICE_INACTIVE, /מצב ספריות יוצר ספריה כברירת מחדל/);
});

test('structure aux contracts expose stable structure-mode test ids', () => {
  assert.deepEqual(
    [
      STRUCTURE_CORNER_SECTION_TEST_ID,
      STRUCTURE_CORNER_MODE_TOGGLE_TEST_ID,
      STRUCTURE_CORNER_SIDE_BUTTON_TEST_ID,
      STRUCTURE_CHEST_SECTION_TEST_ID,
      STRUCTURE_CHEST_MODE_TOGGLE_TEST_ID,
      STRUCTURE_CHEST_COMMODE_BUTTON_TEST_ID,
      STRUCTURE_CHEST_COMMODE_WIDTH_MODE_BUTTON_TEST_ID,
      STRUCTURE_LIBRARY_SECTION_TEST_ID,
      STRUCTURE_LIBRARY_MODE_BUTTON_TEST_ID,
    ],
    [
      'structure-corner-section',
      'structure-corner-mode-toggle',
      'structure-corner-side-button',
      'structure-chest-section',
      'structure-chest-mode-toggle',
      'structure-chest-commode-button',
      'structure-chest-commode-width-mode-button',
      'structure-library-section',
      'structure-library-mode-button',
    ]
  );
});
