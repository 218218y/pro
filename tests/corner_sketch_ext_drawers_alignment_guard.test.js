import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { bundleSources, normalizeWhitespace } from './_source_bundle.js';

const cornerSrc = bundleSources(
  [
    '../esm/native/builder/corner_wing_cell_emit.ts',
    '../esm/native/builder/corner_wing_cell_interiors.ts',
    '../esm/native/builder/corner_wing_cell_sketch_extras.ts',
  ],
  import.meta.url
);

test('corner sketch external drawers carry scoped module metadata and reuse real corner door face spans', async () => {
  assert.match(cornerSrc, /cfg: runtime\.__cfg,/);
  assert.match(cornerSrc, /cfg,/);
  assert.match(cornerSrc, /config: cfgCell,/);
  assert.match(cornerSrc, /moduleIndex: cellIdx,/);
  assert.match(cornerSrc, /moduleKey: cellKey,/);
  assert.match(cornerSrc, /stackKey,|stackKey: __stackKey,/);
  assert.match(cornerSrc, /createDoorVisual: runtime\.createDoorVisual,/);
  assert.match(cornerSrc, /createDoorVisual,/);
  assert.match(cornerSrc, /getPartColorValue: \(partId: string\) =>/);
  assert.match(cornerSrc, /getPartColorValue,/);

  const sketchGeometrySrc = await readFile(
    new URL('../esm/native/builder/render_interior_sketch_module_geometry.ts', import.meta.url),
    'utf8'
  );
  const sketchDrawersSrc = bundleSources(
    [
      '../esm/native/builder/render_interior_sketch_drawers.ts',
      '../esm/native/builder/render_interior_sketch_drawers_shared.ts',
      '../esm/native/builder/render_interior_sketch_drawers_external.ts',
      '../esm/native/builder/render_interior_sketch_drawers_external_apply.ts',
      '../esm/native/builder/render_interior_sketch_drawers_external_context.ts',
      '../esm/native/builder/render_interior_sketch_drawers_external_plan.ts',
      '../esm/native/builder/render_interior_sketch_drawers_external_group.ts',
      '../esm/native/builder/render_interior_sketch_drawers_external_visual.ts',
      '../esm/native/builder/render_interior_sketch_drawers_external_box.ts',
      '../esm/native/builder/render_interior_sketch_drawers_external_motion.ts',
      '../esm/native/builder/render_interior_sketch_drawers_internal.ts',
    ],
    import.meta.url
  );
  const sketchPickMeta = await readFile(
    new URL('../esm/native/builder/render_interior_sketch_pick_meta.ts', import.meta.url),
    'utf8'
  );
  assert.match(sketchPickMeta, /export function applySketchModulePickMeta\(/);
  assert.match(sketchPickMeta, /export function applySketchModulePickMetaDeep\(/);
  assert.match(sketchPickMeta, /if \(moduleKey\) userData\.moduleIndex = moduleKey;/);
  assert.match(sketchGeometrySrc, /const wantModuleKey = moduleKeyStr \? String\(moduleKeyStr\) : '';/);
  assert.match(
    sketchGeometrySrc,
    /const matchesScopedModuleKey = !!wantModuleKey && childModuleKey === wantModuleKey;/
  );
  assert.match(sketchDrawersSrc, /groupUd\.moduleIndex = resolvedModuleIndex \|\| context\.moduleIndex;/);
  assert.match(sketchDrawersSrc, /groupUd\.__wpStack = resolvedStackKey;/);
  assert.match(sketchDrawersSrc, /const doorStyle = resolveSketchDoorStyle\(App, input\);/);
  const normalizedSketchDrawersSrc = normalizeWhitespace(sketchDrawersSrc);
  assert.match(
    normalizedSketchDrawersSrc,
    /resolveSketchFrontVisualState\(context\.input, opPlan\.partId\)[\s\S]*const effectiveFrameStyle = resolveEffectiveDoorStyle\(context\.doorStyle, context\.doorStyleMap, opPlan\.partId\);[\s\S]*context\.input\.createDoorVisual\([\s\S]*materialSet\.frontFaceMat,[\s\S]*frontVisualState\.isGlass \? 'glass' : effectiveFrameStyle,[\s\S]*frontVisualState\.mirrorLayout,[\s\S]*opPlan\.partId,[\s\S]*frontVisualState\.isGlass \? \{ glassFrameStyle: effectiveFrameStyle \} : null/
  );
  assert.match(
    sketchDrawersSrc,
    /applySketchModulePickMetaDeep\(visualObj, opPlan\.partId, context\.moduleKeyStr, \{/
  );
  assert.match(
    sketchDrawersSrc,
    /applySketchModulePickMetaDeep\(groupNode, opPlan\.partId, context\.moduleKeyStr, \{/
  );
  assert.doesNotMatch(
    sketchDrawersSrc,
    /applySketchBoxPickMetaDeep\(groupNode, partId, moduleKeyStr, drawerId/
  );
});
