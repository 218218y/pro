import test from 'node:test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { assertReviewedOwnershipFamily } from './helpers/dimension_reviewed_ownership_contract_helper.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const entryNumbers = Object.freeze([18, 19, 121, 122]);

test('Wave D drawer and handle imports are canonical reviewed ownership', () => {
  assertReviewedOwnershipFamily({
    root,
    label: 'Wave D drawer/handle',
    entryNumbers,
  });
});
