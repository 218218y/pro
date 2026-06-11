import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function lineCount(source) {
  return source.split(/\r\n|\r|\n/).length;
}

function normalizeSource(source) {
  return source
    .replace(/\s+/g, ' ')
    .replace(/\(\s+/g, '(')
    .replace(/\s+\)/g, ')')
    .replace(/,\s+/g, ', ')
    .replace(/\{\s+/g, '{ ')
    .replace(/\s+\}/g, ' }')
    .trim();
}

test('stage 72 render interior sketch box external drawers ownership split is anchored', () => {
  const facade = read('esm/native/builder/render_interior_sketch_boxes_fronts_drawers.ts');
  const apply = read('esm/native/builder/render_interior_sketch_boxes_fronts_drawers_apply.ts');
  const context = read('esm/native/builder/render_interior_sketch_boxes_fronts_drawers_context.ts');
  const plan = read('esm/native/builder/render_interior_sketch_boxes_fronts_drawers_plan.ts');
  const group = read('esm/native/builder/render_interior_sketch_boxes_fronts_drawers_group.ts');
  const visual = read('esm/native/builder/render_interior_sketch_boxes_fronts_drawers_visual.ts');
  const box = read('esm/native/builder/render_interior_sketch_boxes_fronts_drawers_box.ts');
  const motion = read('esm/native/builder/render_interior_sketch_boxes_fronts_drawers_motion.ts');
  const types = read('esm/native/builder/render_interior_sketch_boxes_fronts_drawers_types.ts');
  const frontsOwner = read('esm/native/builder/render_interior_sketch_boxes_fronts.ts');

  assert.ok(lineCount(facade) <= 3, 'sketch box external drawers public module must stay a tiny facade');
  assert.match(facade, /render_interior_sketch_boxes_fronts_drawers_apply\.js/);
  assert.match(facade, /render_interior_sketch_boxes_fronts_drawers_types\.js/);
  assert.doesNotMatch(
    facade,
    /computeExternalDrawersOpsForModule|resolveBuilderMirrorMaterial|createInternalDrawerBox|resolveSketchFrontVisualState|drawersArray\.push/,
    'sketch box drawer facade must not own planning, material cache, visual, box, or motion logic'
  );

  assert.match(apply, /export function renderSketchBoxExternalDrawers\(/);
  assert.match(apply, /createSketchBoxExternalDrawersContext\(args\)/);
  assert.match(apply, /createSketchBoxExternalDrawerStackPlan\(/);
  assert.match(apply, /createSketchBoxExternalDrawerOpPlan\(/);
  assert.match(apply, /createSketchBoxExternalDrawerGroupNode\(/);
  assert.match(apply, /addSketchBoxExternalDrawerFrontVisual\(/);
  assert.match(apply, /addSketchBoxExternalDrawerBoxAndConnector\(/);
  assert.match(apply, /registerSketchBoxExternalDrawerMotionEntry\(/);
  assert.doesNotMatch(
    apply,
    /computeExternalDrawersOpsForModule|resolveBuilderMirrorMaterial|new context\.THREE\.Mesh\(/
  );

  assert.match(context, /export function createSketchBoxExternalDrawersContext\(/);
  assert.match(context, /asRecordArray<InteriorValueRecord>\(box\.extDrawers\)/);
  assert.match(context, /resolveBuilderMirrorMaterial\(/);
  assert.match(context, /getDrawersArray\(App\)/);
  assert.match(context, /const clampDrawerCenterY = \(centerY: number, stackH: number\)/);
  assert.doesNotMatch(
    context,
    /computeExternalDrawersOpsForModule|resolveSketchFrontVisualState|drawersArray\.push/
  );

  assert.match(plan, /export function createSketchBoxExternalDrawerStackPlan\(/);
  assert.match(plan, /computeExternalDrawersOpsForModule\(/);
  assert.match(plan, /resolveSketchExternalDrawerMetrics\(/);
  assert.match(plan, /applySketchExternalDrawerFaceOverrides\(/);
  assert.match(plan, /export function createSketchBoxExternalDrawerOpPlan\(/);
  assert.match(plan, /resolveSketchExternalDrawerFaceVerticalAlignment\(/);
  assert.match(plan, /containerMaxY: innerTopY - context\.woodThick/);
  assert.doesNotMatch(
    plan,
    /resolveBuilderMirrorMaterial|resolveSketchFrontVisualState|createInternalDrawerBox|drawersArray\.push/
  );

  assert.match(group, /export function createSketchBoxExternalDrawerGroupNode\(/);
  assert.match(group, /__wpSketchBoxId: bid/);
  assert.match(group, /__wpSketchFreePlacement: isFreePlacement === true/);
  assert.match(group, /__wpSketchExtDrawer: true/);
  assert.doesNotMatch(
    group,
    /computeExternalDrawersOpsForModule|resolveSketchFrontVisualState|createInternalDrawerBox|drawersArray\.push/
  );

  assert.match(visual, /export function addSketchBoxExternalDrawerFrontVisual\(/);
  assert.match(visual, /resolveSketchFrontVisualState\(context\.input, opPlan\.partId\)/);
  const normalizedVisual = normalizeSource(visual);
  assert.match(
    normalizedVisual,
    /resolveEffectiveDoorStyle\(context\.doorStyle, context\.doorStyleMap, opPlan\.partId\)/
  );
  assert.match(visual, /applySketchBoxPickMetaDeep\(visualObj, opPlan\.partId, context\.moduleKeyStr, bid/);
  assert.doesNotMatch(
    visual,
    /computeExternalDrawersOpsForModule|createInternalDrawerBox|drawersArray\.push/
  );

  assert.match(box, /export function addSketchBoxExternalDrawerBoxAndConnector\(/);
  assert.match(box, /context\.createInternalDrawerBox\(/);
  assert.match(box, /applySketchBoxPickMetaDeep\(drawerBoxObj, opPlan\.partId, context\.moduleKeyStr, bid/);
  assert.match(box, /applySketchBoxPickMeta\(connector, opPlan\.partId, context\.moduleKeyStr, bid\)/);
  assert.doesNotMatch(box, /resolveSketchFrontVisualState|drawersArray\.push/);

  assert.match(motion, /export function registerSketchBoxExternalDrawerMotionEntry\(/);
  assert.match(motion, /context\.drawersArray\.push\(drawerEntry\)/);
  assert.match(motion, /new context\.THREE\.Vector3\(x, y, z\)/);
  assert.doesNotMatch(
    motion,
    /computeExternalDrawersOpsForModule|resolveSketchFrontVisualState|createInternalDrawerBox/
  );

  for (const exportedType of [
    'RenderSketchBoxExternalDrawersArgs',
    'SketchBoxExternalDrawersContext',
    'SketchBoxExternalDrawerStackPlan',
    'SketchBoxExternalDrawerOpPlan',
    'SketchBoxExternalDrawerGroupNode',
  ]) {
    assert.match(types, new RegExp(`export type ${exportedType}`));
  }
  assert.doesNotMatch(
    types,
    /export function |computeExternalDrawersOpsForModule|resolveSketchFrontVisualState/
  );

  assert.match(frontsOwner, /from '\.\/render_interior_sketch_boxes_fronts_drawers\.js';/);
  assert.doesNotMatch(
    frontsOwner,
    /render_interior_sketch_boxes_fronts_drawers_(apply|context|plan|group|visual|box|motion|types)\.js/,
    'sketch box fronts owner must keep using the public drawer facade instead of private drawer owners'
  );

  assert.doesNotMatch(
    facade + apply + context + plan + group + visual + box + motion + types,
    /export default\s+/
  );
});
