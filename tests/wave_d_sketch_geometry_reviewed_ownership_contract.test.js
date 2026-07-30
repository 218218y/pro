import test from 'node:test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { assertReviewedOwnershipFamily } from './helpers/dimension_reviewed_ownership_contract_helper.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const entryNumbers = Object.freeze([38, 39, 51, 52, 63, 64, 65, 66, 67, 68]);

test('Wave D sketch-box geometry and preview imports are canonical reviewed ownership', () => {
  assertReviewedOwnershipFamily({
    root,
    label: 'Wave D sketch-box geometry/preview',
    entryNumbers,
  });
});
