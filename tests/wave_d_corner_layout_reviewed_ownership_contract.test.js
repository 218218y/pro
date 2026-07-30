import test from 'node:test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { assertReviewedOwnershipFamily } from './helpers/dimension_reviewed_ownership_contract_helper.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const entryNumbers = Object.freeze([3, 4, 6, 7, 9, 10, 15, 16, 130, 131, 133, 134, 150, 151, 155, 156]);

test('Wave D corner and layout direct focused imports are canonical reviewed ownership', () => {
  assertReviewedOwnershipFamily({
    root,
    label: 'Wave D corner/layout',
    entryNumbers,
  });
});
