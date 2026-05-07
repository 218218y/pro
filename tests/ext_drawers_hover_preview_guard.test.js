import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const CORE = path.resolve(
  process.cwd(),
  'esm/native/services/canvas_picking_hover_flow_nonsplit_preview_interior.ts'
);
const SEAM = path.resolve(process.cwd(), 'esm/native/services/canvas_picking_hover_preview_modes.ts');
const SRC = path.resolve(
  process.cwd(),
  'esm/native/services/canvas_picking_hover_preview_modes_ext_drawers.ts'
);
const TOKENS = path.resolve(process.cwd(), 'esm/shared/wardrobe_dimension_tokens_shared.ts');

test('[ext-drawers-hover] preview payload passes finite y to sketch placement preview', () => {
  const seam = fs.readFileSync(SEAM, 'utf8');
  const src = fs.readFileSync(SRC, 'utf8');
  const core = fs.readFileSync(CORE, 'utf8');
  assert.match(core, /tryHandleExtDrawersHoverPreview\(/);
  assert.match(
    seam,
    /export \{ tryHandleExtDrawersHoverPreview \} from '\.\/canvas_picking_hover_preview_modes_ext_drawers\.js';/
  );
  assert.match(
    src,
    /kind:\s*'ext_drawers'[\s\S]{0,220}?x:\s*centerX,[\s\S]{0,120}?y:\s*baseY,[\s\S]{0,120}?z:\s*frontZ,/
  );
});

test('[ext-drawers-hover] preview front z is pushed to the visible front face', () => {
  const src = fs.readFileSync(SRC, 'utf8');
  const tokens = fs.readFileSync(TOKENS, 'utf8');
  assert.match(tokens, /externalPreviewFrontZOffsetM:\s*0\.001,/);
  assert.match(src, /const\s+frontPlaneZ\s*=\s*centerZ\s*\+\s*outerD\s*\/\s*2\s*;/);
  assert.match(
    src,
    /const\s+frontZ\s*=\s*frontPlaneZ\s*\+\s*visualT\s*\/\s*2\s*\+\s*DRAWER_DIMENSIONS\.sketch\.externalPreviewFrontZOffsetM\s*;/
  );
  assert.doesNotMatch(src, /const\s+frontZ\s*=\s*frontPlaneZ\s*\+\s*visualT\s*\/\s*2\s*\+\s*0\.001\s*;/);
});

test('[ext-drawers-hover] regular drawers preview stacks above shoe drawer when present', () => {
  const src = fs.readFileSync(SRC, 'utf8');
  const tokens = fs.readFileSync(TOKENS, 'utf8');
  assert.match(tokens, /shoeHeightM:\s*0\.2,/);
  assert.match(src, /const\s+shoeH\s*=\s*DRAWER_DIMENSIONS\.external\.shoeHeightM\s*;/);
  assert.doesNotMatch(src, /const\s+shoeH\s*=\s*0\.2\s*;/);
  assert.match(
    src,
    /const\s+baseStackOffset\s*=\s*drawerType\s*===\s*'shoe'\s*\?\s*0\s*:\s*hasShoe\s*\?\s*shoeH\s*:\s*0\s*;/
  );
  assert.match(
    src,
    /y:\s*baseY\s*\+\s*Number\(target\.woodThick\)\s*\+\s*baseStackOffset\s*\+\s*i\s*\*\s*regH\s*\+\s*regH\s*\/\s*2/
  );
});

test('[ext-drawers-hover] sketch external drawer direct hit removal now routes through the dedicated direct-hit workflow owner', () => {
  const router = fs.readFileSync(
    path.resolve(
      process.cwd(),
      'esm/native/services/canvas_picking_manual_layout_sketch_click_direct_hit_actions.ts'
    ),
    'utf8'
  );
  const workflow = [
    fs.readFileSync(
      path.resolve(process.cwd(), 'esm/native/services/canvas_picking_sketch_direct_hit_workflow.ts'),
      'utf8'
    ),
    fs.readFileSync(
      path.resolve(process.cwd(), 'esm/native/services/canvas_picking_sketch_direct_hit_workflow_drawer.ts'),
      'utf8'
    ),
    fs.readFileSync(
      path.resolve(process.cwd(), 'esm/native/services/canvas_picking_sketch_direct_hit_workflow_shared.ts'),
      'utf8'
    ),
  ].join('\n');
  assert.match(router, /tryApplySketchDirectHitDrawerActions\(args\)/);
  assert.match(workflow, /if \(__mt\.startsWith\('sketch_ext_drawers:'\)\) \{/);
  assert.match(workflow, /findPartAncestor\(App, intersects, 'sketch_ext_drawers_', __wp_isViewportRoot\)/);
  assert.match(workflow, /removeSketchExternalDrawerById\(cfg, drawerId, boxId \|\| undefined\);/);
});
