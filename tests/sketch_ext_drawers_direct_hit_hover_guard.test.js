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
  path.resolve(
    process.cwd(),
    'esm/native/services/canvas_picking_sketch_direct_hit_workflow_drawers_shared.ts'
  ),
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
  assert.match(src, /function\s+readSketchBoxId\(/);
  assert.match(
    src,
    /function\s+removeSketchExternalDrawerById\(\s*cfg: SketchConfigLike,\s*drawerId: string,\s*boxId\?: string\s*\): void \{/
  );
  assert.match(src, /const\s+boxes\s*=\s*ensureArray\(extra, 'boxes'\);/);
  assert.match(
    src,
    /const\s+candidateBoxes\s*=\s*boxId\s*\?\s*boxes\.filter\(box => readRecordIdentity\(box, 'id'\) === boxId\)\s*:\s*boxes;/
  );
  assert.match(src, /const\s+list\s*=\s*ensureArray\(box, 'extDrawers'\);/);
  assert.match(src, /removeSketchExternalDrawerById\(cfg, drawerId, boxId \|\| undefined\);/);
  assert.doesNotMatch(src, /readRecordString\(box, 'id'\)/);
});
