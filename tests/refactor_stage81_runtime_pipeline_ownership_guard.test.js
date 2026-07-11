import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

function read(path) {
  return readFileSync(path, 'utf8');
}

function lineCount(source) {
  return source.split(/\r\n|\r|\n/).length;
}

test('stage 81 planar reflector render-pass ownership is explicit and failure-safe', () => {
  const runtime = read('esm/native/runtime/planar_reflector_runtime.ts');
  const contracts = read('esm/native/runtime/planar_reflector_contracts.ts');
  const renderPass = read('esm/native/runtime/planar_reflector_render_pass.ts');

  assert.match(runtime, /from '\.\/planar_reflector_contracts\.js';/);
  assert.match(
    runtime,
    /import \{ renderPlanarReflectorSurface \} from '\.\/planar_reflector_render_pass\.js';/
  );
  assert.match(runtime, /const renderResult = renderPlanarReflectorSurface\(/);
  assert.doesNotMatch(runtime, /function runPlanarReflectorRendererPass/);
  assert.doesNotMatch(runtime, /renderer-surface-incomplete|clip-plane-degenerate|render-exception/);

  assert.match(renderPass, /export function runPlanarReflectorRendererPass/);
  assert.match(renderPass, /export function renderPlanarReflectorSurface/);
  assert.match(renderPass, /finally \{[\s\S]*restorePlanarReflectorSurfacesAfterInternalPass/);
  assert.match(renderPass, /mirror\.visible = mirrorVisibleBefore/);
  assert.match(renderPass, /rendererShadowMap\.autoUpdate = previousShadowAutoUpdate/);
  assert.match(renderPass, /xr\.enabled = previousXrEnabled/);

  assert.match(contracts, /export type PlanarReflectorRenderFailureReason/);
  assert.match(contracts, /'renderer-surface-incomplete'/);
  assert.match(contracts, /'render-exception'/);
});

test('stage 81 free-box preview and commit share one typed command protocol', () => {
  const content = read('esm/native/services/canvas_picking_manual_layout_free_box_content.ts');
  const contracts = read('esm/native/services/canvas_picking_manual_layout_free_box_contracts.ts');
  const plans = read('esm/native/services/canvas_picking_manual_layout_free_box_plans.ts');
  const protocol = read('esm/native/services/canvas_picking_manual_layout_free_box_hover_protocol.ts');
  const commit = read('esm/native/services/canvas_picking_manual_layout_free_box_commit.ts');

  assert.ok(lineCount(content) <= 550, 'free-box hover orchestrator must remain below 550 lines');
  assert.match(content, /from '\.\/canvas_picking_manual_layout_free_box_plans\.js';/);
  assert.match(content, /from '\.\/canvas_picking_manual_layout_free_box_hover_protocol\.js';/);
  assert.match(content, /from '\.\/canvas_picking_manual_layout_free_box_commit\.js';/);
  assert.doesNotMatch(content, /computeInteriorPresetOps|getModulesActions|patchForStack/);
  assert.doesNotMatch(
    content,
    /readShelfGridFreeBoxCommand|readPresetLayoutFreeBoxCommand|readBraceShelvesFreeBoxCommand/
  );

  assert.match(contracts, /export type ManualLayoutFreeBoxShelfGridPlan/);
  assert.match(contracts, /export type PresetLayoutFreeBoxPlan/);
  assert.match(contracts, /export type BraceShelvesFreeBoxPlan/);
  assert.match(plans, /computeInteriorPresetOps/);
  assert.match(protocol, /export type ShelfGridFreeBoxCommand/);
  assert.match(protocol, /export type PresetLayoutFreeBoxCommand/);
  assert.match(protocol, /export type BraceShelvesFreeBoxCommand/);
  assert.match(commit, /type BraceShelvesFreeBoxCommand/);
  assert.match(commit, /readShelfGridFreeBoxCommand/);
  assert.match(commit, /readPresetLayoutFreeBoxCommand/);
  assert.match(commit, /readBraceShelvesFreeBoxCommand/);
  assert.match(commit, /getModulesActions/);
});

test('stage 81 order PDF editor surface remains a grouped-prop compositor', () => {
  const caller = read('esm/native/ui/react/pdf/OrderPdfInPlaceEditorOverlay.tsx');
  const surface = read('esm/native/ui/react/pdf/order_pdf_overlay_editor_surface.tsx');
  const contracts = read('esm/native/ui/react/pdf/order_pdf_overlay_editor_surface_contracts.ts');
  const modes = read('esm/native/ui/react/pdf/order_pdf_overlay_editor_modes.ts');
  const stage = read('esm/native/ui/react/pdf/order_pdf_overlay_editor_stage.tsx');

  assert.ok(lineCount(surface) <= 90, 'PDF editor surface must remain a small compositor');
  assert.match(surface, /OrderPdfOverlayEditorModeControls/);
  assert.match(surface, /useOrderPdfOverlayEditorModes/);
  assert.match(surface, /OrderPdfOverlayEditorStage/);
  assert.match(surface, /OrderPdfOverlayInlineConfirm/);
  assert.doesNotMatch(surface, /useState|useEffect|createInitialStageGesture|finishStagePointerUp/);

  assert.match(contracts, /refs: OrderPdfOverlayEditorRefs;/);
  assert.match(contracts, /stage: OrderPdfOverlayEditorStageModel;/);
  assert.match(contracts, /sketch: OrderPdfOverlaySketchModel;/);
  assert.match(contracts, /annotations: OrderPdfOverlayAnnotationActions;/);
  assert.match(contracts, /inlineConfirm: OrderPdfOverlayInlineConfirmModel;/);
  assert.match(caller, /refs=\{\{/);
  assert.match(caller, /stage=\{\{/);
  assert.match(caller, /sketch=\{\{/);
  assert.match(caller, /annotations=\{\{/);
  assert.match(caller, /inlineConfirm=\{\{/);

  assert.match(stage, /from '\.\/order_pdf_overlay_sketch_panel\.js';/);
  assert.doesNotMatch(stage, /order_pdf_overlay_sketch_panel_(view|types|header|cards)\.js/);
  assert.doesNotMatch(modes, /\[[^\]]*\bsketch\b[^\]]*\]/);
  assert.doesNotMatch(modes, /\[[^\]]*\bstage\b[^\]]*\]/);
});
