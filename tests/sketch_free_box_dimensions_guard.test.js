import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import { normalizeWhitespace } from './_source_bundle.js';

const read = rel => fs.readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');

test('[sketch free box] dimension overlay is rendered from sketch box geometry and keeps height right / depth left', () => {
  const src = read('esm/native/builder/render_interior_sketch_ops.ts');
  const boxes = [
    read('esm/native/builder/render_interior_sketch_boxes.ts'),
    read('esm/native/builder/render_interior_sketch_boxes_shell.ts'),
  ].join('\n');
  const layout = [
    read('esm/native/builder/render_interior_sketch_layout.ts'),
    read('esm/native/builder/render_interior_sketch_layout_dimensions.ts'),
    read('esm/native/builder/render_interior_sketch_layout_dimensions_shared.ts'),
    read('esm/native/builder/render_interior_sketch_layout_dimensions_grouping.ts'),
    read('esm/native/builder/render_interior_sketch_layout_dimensions_render.ts'),
  ].join('\n');
  const srcNorm = normalizeWhitespace(src);
  const boxesNorm = normalizeWhitespace(boxes);
  const layoutNorm = normalizeWhitespace(layout);
  assert.match(srcNorm, /const renderOps = (?:asRecord|asValueRecord)\(__ops\(App\)\);/);
  assert.match(srcNorm, /const addDimensionLine = asDimensionLineFn\(renderOps\?\.addDimensionLine\);/);
  assert.match(
    srcNorm,
    /const showDimensions = !!(?:asRecord|asValueRecord)\(input\.cfg\)\?\.showDimensions;/
  );
  assert.match(
    srcNorm,
    /const freeBoxDimensionOverlayContext = showDimensions && THREE && addDimensionLine \? \{ THREE, addDimensionLine \} : null;/
  );
  assert.match(srcNorm, /const renderFreeBoxDimensionsEnabled = !!freeBoxDimensionOverlayContext;/);
  assert.match(layoutNorm, /export const renderSketchFreeBoxDimensions = \(args:/);
  assert.match(layoutNorm, /const heightLineX = centerX \+ halfW \+ heightLineGap;/);
  assert.match(layoutNorm, /const depthLineX = centerX - halfW - depthLineGap;/);
  assert.match(
    layoutNorm,
    /const depthTextOffset = new THREE\.Vector3\(-Math\.max\(0\.12, Math\.min\(0\.18, width \* 0\.24\)\), 0, 0\);/
  );
  assert.match(layoutNorm, /export const renderSketchFreeBoxDimensionOverlays = \(args:/);
  assert.match(layoutNorm, /function areSketchFreeBoxDimensionSegmentsAdjacent\(/);
  assert.match(layoutNorm, /function mergeSketchFreeBoxDimensionSpans\(/);
  assert.match(srcNorm, /const freeBoxDimensionEntries = renderFreeBoxDimensionsEnabled \? \[\] : null;/);
  assert.match(
    srcNorm,
    /renderSketchFreeBoxDimensionOverlays\(\{[\s\S]*THREE: freeBoxDimensionOverlayContext\.THREE,[\s\S]*addDimensionLine: freeBoxDimensionOverlayContext\.addDimensionLine,[\s\S]*entries: freeBoxDimensionEntries,[\s\S]*\}\);/
  );
  assert.match(
    boxesNorm,
    /if \(isFreePlacement && renderFreeBoxDimensionsEnabled && THREE && addDimensionLine\) \{/
  );
  assert.match(boxesNorm, /if \(Array\.isArray\(freeBoxDimensionEntries\)\) \{/);
  assert.match(boxesNorm, /freeBoxDimensionEntries\.push\(\{/);
  assert.match(boxesNorm, /depth: geometry\.outerD,/);
});
