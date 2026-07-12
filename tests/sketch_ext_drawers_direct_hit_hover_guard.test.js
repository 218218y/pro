import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROUTER = path.resolve(
  process.cwd(),
  'esm/native/services/canvas_picking_manual_layout_sketch_click_direct_hit_actions.ts'
);
const WORKFLOW = [
  path.resolve(process.cwd(), 'esm/native/services/canvas_picking_sketch_direct_hit_workflow.ts'),
  path.resolve(process.cwd(), 'esm/native/services/canvas_picking_sketch_direct_hit_workflow_drawer.ts'),
  path.resolve(process.cwd(), 'esm/native/services/canvas_picking_sketch_direct_hit_workflow_shared.ts'),
  path.resolve(process.cwd(), 'esm/native/services/canvas_picking_sketch_direct_hit_workflow_contracts.ts'),
  path.resolve(process.cwd(), 'esm/native/services/canvas_picking_sketch_direct_hit_workflow_objects.ts'),
  path.resolve(process.cwd(), 'esm/native/services/canvas_picking_drawer_cross_family_remove_plan.ts'),
];

test('[sketch-ext-drawers-direct-hit] router delegates drawer/shelf direct hits through the canonical workflow owner', () => {
  const router = fs.readFileSync(ROUTER, 'utf8');
  assert.match(router, /tryApplySketchDirectHitDrawerActions\(args\)/);
  assert.match(router, /tryApplySketchDirectHitShelfActions\(args\)/);
});

test('[sketch-ext-drawers-direct-hit] removal is gated by the live hover remove target before direct-hit delete runs', () => {
  const src = WORKFLOW.map(file => fs.readFileSync(file, 'utf8')).join('\n');
  assert.match(src, /__hoverOk:\s*boolean;/);
  assert.match(src, /decodeSketchBoxContentCommandHover\(hoverRec\)/);
  assert.match(src, /function\s+readStrictDrawerRemoval\(/);
  assert.match(src, /command\.op !== 'remove'/);
  assert.match(src, /!\('removeId' in command\) \|\| !command\.removeId/);
  assert.match(src, /const\s+removal\s*=\s*readStrictDrawerRemoval\(args\.hoverRec\);/);
  assert.match(
    src,
    /removal\.contentKind === 'ext_drawers' \|\| removal\.contentKind === 'regular_ext_drawers'/
  );
  assert.match(src, /removal\.removeId === args\.drawerId/);
  assert.match(src, /!args\.boxId \|\| removal\.boxId === args\.boxId/);
  assert.doesNotMatch(src, /hoverKind === 'box_content'/);
  assert.doesNotMatch(src, /hoverContentKind/);
});

test('[sketch-ext-drawers-direct-hit] removal can target nested box external drawers and not only the module-level list', () => {
  const src = WORKFLOW.map(file => fs.readFileSync(file, 'utf8')).join('\n');
  assert.match(src, /export type SketchExternalDrawerRemoveTarget/);
  assert.match(src, /target\.kind === 'drawer-id'/);
  assert.match(src, /const\s+boxes\s*=\s*readArray\(extra, 'boxes'\);/);
  assert.match(
    src,
    /const\s+candidateBoxes\s*=\s*target\.boxId\s*\?\s*boxes\.filter\(box => readString\(box\?\.id\) === target\.boxId\)\s*:\s*boxes;/
  );
  assert.match(src, /removeSketchBoxExternalDrawerByTarget\(box, 'extDrawers', target\)/);
  assert.match(src, /commitCrossDrawerRemovePlan\(/);
  assert.doesNotMatch(src, /removeSketchExternalDrawerById\(/);
});
