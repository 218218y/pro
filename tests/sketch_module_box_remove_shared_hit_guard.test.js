import test from 'node:test';
import assert from 'node:assert/strict';
import { bundleSources } from './_source_bundle.js';

const workflowBundle = bundleSources(
  [
    '../esm/native/services/canvas_picking_sketch_module_box_workflow.ts',
    '../esm/native/services/canvas_picking_sketch_module_box_workflow_flow.ts',
    '../esm/native/services/canvas_picking_sketch_module_box_workflow_remove.ts',
    '../esm/native/services/canvas_picking_sketch_module_box_workflow_placement.ts',
    '../esm/native/services/canvas_picking_sketch_box_overlap.ts',
    '../esm/native/services/canvas_picking_sketch_box_overlap_hit.ts',
    '../esm/native/services/canvas_picking_sketch_box_overlap_placement.ts',
  ],
  import.meta.url
);

test('module box remove hover and click share the same footprint hit helper instead of center-only matching', () => {
  assert.match(
    workflowBundle,
    /export \{ findSketchModuleBoxHit \} from '\.\/canvas_picking_sketch_box_overlap_hit\.js';/
  );
  assert.match(
    workflowBundle,
    /export \{[\s\S]*resolveSketchModuleBoxPlacement[\s\S]*\} from '\.\/canvas_picking_sketch_box_overlap_placement\.js';/
  );
  assert.match(workflowBundle, /const\s+removeTarget\s*=\s*findSketchModuleBoxHit\(\{/);
  assert.match(workflowBundle, /const\s+resolvedPlacement\s*=\s*resolveSketchModuleBoxPlacement\(\{/);
});
