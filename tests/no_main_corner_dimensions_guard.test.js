import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = rel => fs.readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');

test('[no-main corner] standalone corner dimensions stay enabled and wing dimensions honor corner door count', () => {
  const postBuild = read('esm/native/builder/post_build_extras_pipeline.ts');
  const dimensionsOwner = read('esm/native/builder/post_build_dimensions.ts');
  const dimensionsCorner = read('esm/native/builder/post_build_dimensions_corner.ts');
  assert.match(
    postBuild,
    /const\s+shouldRenderDimensions\s*=\s*!!\(cfg && cfg\.showDimensions && \(!noMainWardrobe \|\| isCornerMode\)\);/
  );
  assert.match(dimensionsOwner, /cornerDoorCount: corner\.cornerDoorCount,/);
  assert.match(dimensionsOwner, /cornerWingLenM: corner\.cornerWingLenM,/);
  assert.match(dimensionsOwner, /noMainWardrobe,/);
  assert.match(dimensionsOwner, /cornerSide: corner\.cornerSide,/);
  assert.match(dimensionsCorner, /let cornerDoorCount: number = WARDROBE_DEFAULTS\.corner\.doorsCount;/);
  assert.match(
    dimensionsCorner,
    /let cornerWingLenM = CORNER_WING_DIMENSIONS\.wing\.defaultWidthCm \/ CM_PER_METER;/
  );
  assert.match(
    dimensionsCorner,
    /const cornerDoorsRaw = pick\('ui', 'cornerDoors', \['cornerDoorCount', 'cornerDoorsCount'\]\);/
  );

  const renderDims = read('esm/native/builder/render_dimension_ops.ts');
  const renderDimsShared = read('esm/native/builder/render_dimension_ops_shared.ts');
  const renderDimsCorner = read('esm/native/builder/render_dimension_ops_corner.ts');
  assert.match(renderDims, /render_dimension_ops_shared\.js/);
  assert.match(renderDims, /render_dimension_ops_corner\.js/);
  assert.match(renderDimsShared, /const\s+noMainWardrobe\s*=\s*!!args\.noMainWardrobe;/);
  assert.match(
    renderDimsShared,
    /const\s+cornerDoorCount\s*=\s*Number\.isFinite\(cornerDoorCountRaw\)\s*\?\s*Math\.max\(0, Math\.round\(cornerDoorCountRaw\)\)\s*:\s*WARDROBE_DEFAULTS\.corner\.doorsCount;/
  );
  assert.match(renderDimsShared, /const\s+cornerWingVisible\s*=\s*isCornerMode && cornerDoorCount > 0;/);
  assert.match(renderDimsCorner, /WARDROBE_DIMENSION_GUIDE_DIMENSIONS/);
  assert.match(
    renderDimsCorner,
    /if \(\s*noMainWardrobe &&\s*isCornerMode &&\s*cornerConnectorEnabled &&\s*cornerWallLenM > guide\.connectorWallMinLengthM\s*\) \{/
  );
  assert.match(
    renderDimsCorner,
    /if \(cornerWingVisible && Number\.isFinite\(cornerWingLenM\) && cornerWingLenM > guide\.wingMinLengthM\) \{/
  );
});
