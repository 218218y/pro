import test from 'node:test';
import assert from 'node:assert/strict';

import {
  isStructureSameNumericValue,
  readStructureOptionalCommit,
  readStructureRequiredCommit,
  resolveStructurePlaceholderArrowStep,
  resolveStructureSpinnerPointerStep,
} from '../esm/native/ui/react/tabs/structure_tab_dimension_field_shared.js';

test('[structure-dim-shared] required commit parsing distinguishes pending, invalid, and numeric values', () => {
  assert.deepEqual(readStructureRequiredCommit(''), { kind: 'pending' });
  assert.deepEqual(readStructureRequiredCommit('-.'), { kind: 'pending' });
  assert.deepEqual(readStructureRequiredCommit('abc'), { kind: 'invalid' });
  assert.deepEqual(readStructureRequiredCommit('125'), { kind: 'value', value: 125 });
});

test('[structure-dim-shared] optional commit parsing preserves empty semantics', () => {
  assert.deepEqual(readStructureOptionalCommit(''), { kind: 'empty' });
  assert.deepEqual(readStructureOptionalCommit('.'), { kind: 'pending' });
  assert.deepEqual(readStructureOptionalCommit('-2'), { kind: 'invalid' });
  assert.deepEqual(readStructureOptionalCommit('55'), { kind: 'value', value: 55 });
});

test('[structure-dim-shared] numeric equality keeps blur commits from re-firing on same values', () => {
  assert.equal(isStructureSameNumericValue('', 10), false);
  assert.equal(isStructureSameNumericValue(100, 100.00001), true);
  assert.equal(isStructureSameNumericValue(100, 101), false);
});

test('[structure-dim-shared] placeholder arrow stepping starts from the placeholder value instead of zero', () => {
  assert.equal(
    resolveStructurePlaceholderArrowStep({ key: 'ArrowUp', draft: '', placeholder: 80, step: 5 }),
    85
  );
  assert.equal(
    resolveStructurePlaceholderArrowStep({ key: 'ArrowDown', draft: '', placeholder: 80, step: 5 }),
    75
  );
  assert.equal(
    resolveStructurePlaceholderArrowStep({ key: 'ArrowUp', draft: '10', placeholder: 80, step: 5 }),
    null
  );
});

test('[structure-dim-shared] spinner pointer stepping respects the spinner hit-zone and placeholder base', () => {
  const fakeEvent = {
    currentTarget: {
      getBoundingClientRect() {
        return { left: 0, top: 0, width: 120, height: 30 };
      },
    },
    clientX: 6,
    clientY: 6,
  } as any;

  assert.equal(
    resolveStructureSpinnerPointerStep({ event: fakeEvent, draft: '', placeholder: 80, step: 5 }),
    85
  );
  assert.equal(
    resolveStructureSpinnerPointerStep({
      event: { ...fakeEvent, clientY: 24 },
      draft: '',
      placeholder: 80,
      step: 5,
    }),
    75
  );
  assert.equal(
    resolveStructureSpinnerPointerStep({
      event: { ...fakeEvent, clientX: 60 },
      draft: '',
      placeholder: 80,
      step: 5,
    }),
    null
  );
});
