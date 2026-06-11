import test from 'node:test';
import assert from 'node:assert/strict';

import { bundleSources, readSource, assertMatchesAll } from './_source_bundle.js';

const exportOwner = readSource('../esm/native/ui/export_canvas.ts', import.meta.url);
const exportBundle = bundleSources(
  [
    '../esm/native/ui/export_canvas.ts',
    '../esm/native/ui/export/export_canvas_shared.ts',
    '../esm/native/ui/export/export_canvas_core.ts',
    '../esm/native/ui/export/export_canvas_scene.ts',
    '../esm/native/ui/export/export_canvas_viewport.ts',
    '../esm/native/ui/export/export_canvas_delivery.ts',
    '../esm/native/ui/export/export_order_pdf_ops.ts',
    '../esm/native/ui/export/export_order_pdf_shared.ts',
    '../esm/native/ui/export/export_order_pdf_text.ts',
    '../esm/native/ui/export/export_order_pdf_capture.ts',
    '../esm/native/ui/export/export_order_pdf_builder.ts',
    '../esm/native/ui/export/export_order_pdf_builder_assets.ts',
    '../esm/native/ui/export/export_order_pdf_builder_document.ts',
    '../esm/native/ui/export/export_order_pdf_builder_shared.ts',
    '../esm/native/ui/export/export_order_pdf_builder_layout.ts',
    '../esm/native/ui/export/export_order_pdf_builder_runtime.ts',
    '../esm/native/ui/export/export_order_pdf_builder_template.ts',
    '../esm/native/ui/export/export_order_pdf_builder_fields.ts',
    '../esm/native/ui/export/export_canvas_workflows.ts',
    '../esm/native/ui/export/export_canvas_workflow_shared.ts',
    '../esm/native/ui/export/export_canvas_workflow_contracts.ts',
    '../esm/native/ui/export/export_canvas_workflow_header.ts',
    '../esm/native/ui/export/export_canvas_workflow_front_notes.ts',
    '../esm/native/ui/export/export_canvas_workflow_copy.ts',
    '../esm/native/ui/export/export_canvas_workflow_dual.ts',
    '../esm/native/ui/export/export_canvas_workflow_render_sketch.ts',
    '../esm/native/ui/export/export_canvas_workflow_snapshot.ts',
  ],
  import.meta.url
);

test('[stage4-workflows] export workflow keeps a thin owner and delegates order-pdf + user-facing workflow seams', () => {
  assertMatchesAll(
    assert,
    exportOwner,
    [
      /createExportOrderPdfOps/,
      /createExportCanvasWorkflowOps/,
      /export const getOrderPdfDraft = __orderPdfOps.getOrderPdfDraft/,
      /export const copyToClipboard = __workflowOps.copyToClipboard/,
    ],
    'export owner'
  );
  assertMatchesAll(
    assert,
    exportBundle,
    [
      /function createExportOrderPdfOps\(/,
      /function createExportOrderPdfTextOps\(/,
      /function createExportOrderPdfCaptureOps\(/,
      /function createExportOrderPdfBuilderOps\(/,
      /async function buildOrderPdfInteractiveBlobFromDraft\(/,
      /function resolveOrderPdfBuildDraft\(/,
      /async function loadOrderPdfBuilderRuntime\(/,
      /function createOrderPdfBuilderTemplateOps\(/,
      /function createOrderPdfBuilderFieldOps\(/,
      /function createExportCanvasWorkflowOps\(/,
      /createCopyToClipboardWorkflow/,
      /createExportDualImageWorkflow/,
      /createExportRenderAndSketchWorkflow/,
      /createTakeSnapshotWorkflow/,
      /async function copyToClipboard\(/,
      /async function takeSnapshot\(/,
    ],
    'export bundle'
  );
});
