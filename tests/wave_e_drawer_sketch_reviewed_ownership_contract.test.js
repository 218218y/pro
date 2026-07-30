import test from 'node:test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { assertReviewedOwnershipFamily } from './helpers/dimension_reviewed_ownership_contract_helper.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const entryNumbers = Object.freeze([
  14, 17, 20, 21, 22, 30, 55, 56, 77, 79, 80, 81, 82, 83, 84, 85, 116, 117, 123, 124,
]);

test('Wave E drawer, sketch, handle, door, and chest imports retain canonical ownership', () => {
  assertReviewedOwnershipFamily({
    root,
    label: 'Wave E drawer/sketch/handle',
    entryNumbers,
  });
});
