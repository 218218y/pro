// Export canvas workflow helpers.
//
// Keeps export_canvas.ts as the canonical owner entrypoint while delegating the
// user-facing export/copy/snapshot workflows into focused workflow modules.

import type { ExportCanvasWorkflowOpsLike } from '../../../../types';

import type { ExportCanvasWorkflowDeps } from './export_canvas_workflow_shared.js';
import { createCopyToClipboardWorkflow } from './export_canvas_workflow_copy.js';
import { createExportDualImageWorkflow } from './export_canvas_workflow_dual.js';
import { createExportRenderAndSketchWorkflow } from './export_canvas_workflow_render_sketch.js';
import { createTakeSnapshotWorkflow } from './export_canvas_workflow_snapshot.js';

export type { ExportCanvasWorkflowDeps } from './export_canvas_workflow_shared.js';

export function createExportCanvasWorkflowOps(deps: ExportCanvasWorkflowDeps): ExportCanvasWorkflowOpsLike {
  return {
    copyToClipboard: createCopyToClipboardWorkflow(deps),
    exportDualImage: createExportDualImageWorkflow(deps),
    exportRenderAndSketch: createExportRenderAndSketchWorkflow(deps),
    takeSnapshot: createTakeSnapshotWorkflow(deps),
  };
}
