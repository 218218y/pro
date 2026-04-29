'use strict';

const { spawnSync } = require('node:child_process');

const GROUPS = [
  {
    id: 'manual-hover',
    command: process.execPath,
    args: [
      'tools/wp_run_tsx_tests.mjs',
      'tests/sketch_manual_tool_host_runtime.test.ts',
      'tests/canvas_picking_layout_edit_flow_manual_runtime.test.ts',
      'tests/canvas_picking_manual_layout_sketch_hover_intent_runtime.test.ts',
      'tests/canvas_picking_sketch_hover_matching_runtime.test.ts',
      'tests/canvas_picking_manual_layout_sketch_hover_routing_runtime.test.ts',
      'tests/canvas_picking_manual_layout_sketch_hover_module_context_runtime.test.ts',
      'tests/canvas_picking_manual_layout_sketch_hover_module_preview_runtime.test.ts',
      'tests/canvas_picking_manual_layout_sketch_hover_surface_runtime.test.ts',
      'tests/canvas_picking_manual_layout_sketch_hover_tools_runtime.test.ts',
    ],
  },
  {
    id: 'box-hover',
    command: process.execPath,
    args: [
      'tools/wp_run_tsx_tests.mjs',
      'tests/canvas_picking_sketch_box_runtime_runtime.test.ts',
      'tests/canvas_picking_sketch_box_door_preview_runtime.test.ts',
      'tests/canvas_picking_sketch_box_doors_runtime.test.ts',
      'tests/canvas_picking_sketch_box_overlap_runtime.test.ts',
      'tests/sketch_box_hover_click_runtime.test.ts',
      'tests/sketch_box_door_visuals_runtime.test.ts',
    ],
  },
  {
    id: 'free-boxes',
    command: process.execPath,
    args: [
      'tools/wp_run_tsx_tests.mjs',
      'tests/canvas_picking_sketch_free_surface_preview_runtime.test.ts',
      'tests/canvas_picking_sketch_free_box_content_preview_runtime.test.ts',
      'tests/canvas_picking_sketch_free_commit_runtime.test.ts',
      'tests/sketch_free_boxes_attach_runtime.test.ts',
      'tests/sketch_free_boxes_hover_plane_attach_runtime.test.ts',
      'tests/sketch_free_boxes_outside_attach_runtime.test.ts',
      'tests/sketch_free_boxes_remove_and_sidewall_runtime.test.ts',
      'tests/sketch_free_boxes_room_floor_runtime.test.ts',
    ],
  },
  {
    id: 'render-visuals',
    command: process.execPath,
    args: [
      'tools/wp_run_tsx_tests.mjs',
      'tests/render_interior_sketch_visuals_runtime.test.ts',
      'tests/render_interior_sketch_fronts_runtime.test.ts',
      'tests/render_interior_sketch_layout_dimensions_runtime.test.ts',
      'tests/render_interior_sketch_layout_geometry_runtime.test.ts',
      'tests/sketch_front_visual_state_runtime.test.ts',
    ],
  },
];

for (const group of GROUPS) {
  console.log(`\n[sketch-surfaces] running ${group.id}`);
  const res = spawnSync(group.command, group.args, { stdio: 'inherit', env: process.env });
  if ((res.status ?? 1) !== 0) {
    console.error(`[sketch-surfaces] ${group.id} failed with exit ${res.status ?? 1}`);
    process.exit(res.status ?? 1);
  }
}
console.log('[sketch-surfaces] all groups passed');
