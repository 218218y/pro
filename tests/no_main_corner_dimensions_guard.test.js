import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = rel => fs.readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');

test('[no-main corner] standalone corner dimensions stay enabled and wing dimensions honor corner wing door count', () => {
  const postBuild = read('esm/native/builder/post_build_extras_pipeline.ts');
  const dimensionsOwner = read('esm/native/builder/post_build_dimensions.ts');
  const dimensionsCorner = read('esm/native/builder/post_build_dimensions_corner.ts');
  assert.match(
    postBuild,
    /const\s+shouldRenderDimensions\s*=\s*!!\(cfg && cfg\.showDimensions && \(!noMainWardrobe \|\| isCornerMode\)\);/
  );
  assert.match(dimensionsOwner, /cornerWingDoorCount: corner\.cornerWingDoorCount,/);
  assert.match(dimensionsOwner, /cornerWingLenM: corner\.cornerWingLenM,/);
  assert.match(dimensionsOwner, /noMainWardrobe,/);
  assert.match(dimensionsOwner, /cornerSide: corner\.cornerSide,/);
  assert.match(dimensionsOwner, /uiSnapshot: ctx\.ui,/);
  assert.match(dimensionsCorner, /uiSnapshot: unknown;/);
  assert.doesNotMatch(
    dimensionsCorner,
    /getBuildUIFromPlatform|reportPostBuildSoft|dimensions\.cornerUiRead/
  );
  assert.match(
    dimensionsCorner,
    /import\s*\{[\s\S]*CORNER_CONNECTOR_LAYOUT_POLICY,[\s\S]*CORNER_WING_BODY_POLICY,[\s\S]*\}\s*from\s*'\.\.\/\.\.\/shared\/dimensions\/corner_system_policy\.js';/
  );
  assert.match(
    dimensionsCorner,
    /import \{ CM_PER_METER \} from '\.\.\/\.\.\/shared\/dimensions\/units\.js';/
  );
  assert.match(
    dimensionsCorner,
    /import \{ WARDROBE_DEFAULTS \} from '\.\.\/\.\.\/shared\/dimensions\/wardrobe_defaults\.js';/
  );
  assert.doesNotMatch(
    dimensionsCorner,
    /wardrobe_dimension_tokens_shared|CORNER_WING_DIMENSIONS|CORNER_SYSTEM_POLICY/
  );
  assert.match(dimensionsCorner, /let cornerWingDoorCount: number = WARDROBE_DEFAULTS\.corner\.doorsCount;/);
  assert.match(
    dimensionsCorner,
    /let cornerWallLenM: number = CORNER_CONNECTOR_LAYOUT_POLICY\.defaultWallLengthM;/
  );
  assert.match(
    dimensionsCorner,
    /let cornerWingLenM = CORNER_WING_BODY_POLICY\.defaultWidthCm \/ CM_PER_METER;/
  );
  assert.match(
    dimensionsCorner,
    /wallLenCm > CORNER_CONNECTOR_LAYOUT_POLICY\.minWallLengthM \* CM_PER_METER/
  );
  assert.match(dimensionsCorner, /const cornerDoorsRaw = readKey\(ui, 'cornerDoors'\);/);

  const renderDims = read('esm/native/builder/render_dimension_ops.ts');
  const renderDimsShared = read('esm/native/builder/render_dimension_ops_shared.ts');
  const renderDimsMain = read('esm/native/builder/render_dimension_ops_main.ts');
  const renderDimsCorner = read('esm/native/builder/render_dimension_ops_corner.ts');
  assert.match(renderDims, /render_dimension_ops_shared\.js/);
  assert.match(renderDims, /render_dimension_ops_corner\.js/);
  assert.match(renderDimsShared, /const\s+noMainWardrobe\s*=\s*!!args\.noMainWardrobe;/);
  assert.match(
    renderDimsShared,
    /const\s+cornerWingDoorCountRaw\s*=\s*isCornerMode\s*\?\s*requireCornerModeNumber\(args, 'cornerWingDoorCount'\)\s*:\s*WARDROBE_DEFAULTS\.corner\.doorsCount;/
  );
  assert.match(renderDimsShared, /function\s+requireCornerModeBoolean\(/);
  assert.match(renderDimsShared, /const\s+cornerWingVisible\s*=\s*isCornerMode && cornerWingDoorCount > 0;/);
  assert.match(renderDimsMain, /const\s+hasActiveCornerConnector\s*=/);
  assert.match(renderDimsMain, /const\s+showMainHeight\s*=\s*!noMainWardrobe;/);
  assert.match(renderDimsMain, /const\s+showMainDepth\s*=\s*!noMainWardrobe \|\| hasActiveCornerConnector;/);
  assert.match(renderDimsMain, /if \(showMainHeight\) \{/);
  assert.match(renderDimsMain, /if \(showMainDepth\) \{/);
  assert.match(renderDimsCorner, /WARDROBE_DIMENSION_GUIDE_DIMENSIONS/);
  assert.match(renderDimsCorner, /function\s+resolveCornerWingDimensionGeometry\(/);
  assert.match(
    renderDimsCorner,
    /const\s+showCornerWingCabinetWidth\s*=\s*cornerWingVisible && !!wingGeometry && wingGeometry\.wingW > guide\.wingMinLengthM;/
  );
  assert.match(renderDimsCorner, /if \(showCornerWingCabinetWidth\) \{/);
  assert.match(renderDimsCorner, /if \(wingGeometry\) \{/);
});
