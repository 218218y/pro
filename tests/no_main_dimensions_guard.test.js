import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import { normalizeWhitespace } from './_source_bundle.js';

const read = rel => fs.readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');

test('[no-main] dimension overlay is suppressed when the main wardrobe has 0 doors', () => {
  const src = read('esm/native/builder/post_build_extras_pipeline.ts');
  const srcNorm = normalizeWhitespace(src);
  assert.match(
    srcNorm,
    /const\s+doorsCountNow\s*=\s*ctx && ctx\.dims && typeof ctx\.dims\.doorsCount === 'number' \? Number\(ctx\.dims\.doorsCount\) : NaN;/
  );
  assert.match(
    srcNorm,
    /const\s+noMainWardrobe\s*=\s*!!\(\s*cfg && cfg\.wardrobeType !== 'sliding' && Number\.isFinite\(doorsCountNow\) && Math\.round\(doorsCountNow\) === 0\s*\);/
  );
  assert.match(
    srcNorm,
    /const\s+shouldRenderDimensions\s*=\s*!!\(cfg && cfg\.showDimensions && \(!noMainWardrobe \|\| isCornerMode\)\);/
  );
  assert.match(src, /if \(shouldRenderDimensions && THREE\) \{/);
});
