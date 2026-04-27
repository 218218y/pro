import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { bundleSources } from './_source_bundle.js';

const cornerSrc = bundleSources(
  [
    '../esm/native/builder/corner_wing_cell_emit.ts',
    '../esm/native/builder/corner_wing_cell_interiors.ts',
    '../esm/native/builder/corner_wing_cell_sketch_extras.ts',
  ],
  import.meta.url
);

test('corner sketch external drawers carry scoped module metadata and reuse real corner door face spans', async () => {
  assert.match(cornerSrc, /moduleIndex: cellIdx,/);
  assert.match(cornerSrc, /moduleKey: cellKey,/);
  assert.match(cornerSrc, /stackKey,|stackKey: __stackKey,/);

  const sketchGeometrySrc = await readFile(
    new URL('../esm/native/builder/render_interior_sketch_module_geometry.ts', import.meta.url),
    'utf8'
  );
  const sketchDrawersSrc = bundleSources(
    [
      '../esm/native/builder/render_interior_sketch_drawers.ts',
      '../esm/native/builder/render_interior_sketch_drawers_shared.ts',
      '../esm/native/builder/render_interior_sketch_drawers_external.ts',
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
  assert.match(sketchDrawersSrc, /groupUd\.moduleIndex = resolvedModuleIndex \|\| moduleIndex;/);
  assert.match(sketchDrawersSrc, /groupUd\.__wpStack = resolvedStackKey;/);
  assert.match(sketchDrawersSrc, /const doorStyle = resolveSketchDoorStyle\(App, input\);/);
  assert.match(
    sketchDrawersSrc,
    /resolveSketchFrontVisualState\(input, partId\)[\s\S]*visual = input\.createDoorVisual\([\s\S]*frontFaceMat,[\s\S]*frontVisualState\.isGlass \? 'glass' : resolveEffectiveDoorStyle\(doorStyle, doorStyleMap, partId\),[\s\S]*frontVisualState\.mirrorLayout,[\s\S]*partId/
  );
  assert.match(sketchDrawersSrc, /applySketchModulePickMetaDeep\(visualObj, partId, moduleKeyStr, \{/);
  assert.match(sketchDrawersSrc, /applySketchModulePickMetaDeep\(groupNode, partId, moduleKeyStr, \{/);
  assert.doesNotMatch(
    sketchDrawersSrc,
    /applySketchBoxPickMetaDeep\(groupNode, partId, moduleKeyStr, drawerId/
  );
});
