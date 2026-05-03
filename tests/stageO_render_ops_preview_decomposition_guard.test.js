import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = rel => fs.readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');

const renderOps = read('esm/native/builder/render_ops.ts');
const previewOps = read('esm/native/builder/render_preview_ops.ts');
const previewMarkerOps = read('esm/native/builder/render_preview_marker_ops.ts');
const previewMarkerFactory = read('esm/native/builder/render_preview_marker_ops_factory.ts');
const previewMarkerSplit = read('esm/native/builder/render_preview_marker_ops_split.ts');
const previewSketchOps = read('esm/native/builder/render_preview_sketch_ops.ts');
const previewSketchFactory = read('esm/native/builder/render_preview_sketch_ops_factory.ts');
const previewSketchContext = read('esm/native/builder/render_preview_sketch_ops_context.ts');
const previewSketchState = read('esm/native/builder/render_preview_sketch_ops_state.ts');
const previewSketchMaterials = read('esm/native/builder/render_preview_sketch_ops_materials.ts');
const previewSketchApply = read('esm/native/builder/render_preview_sketch_ops_apply.ts');
const previewSketchShared = read('esm/native/builder/render_preview_sketch_shared.ts');
const previewSketchPipeline = read('esm/native/builder/render_preview_sketch_pipeline.ts');
const previewSketchPipelineShared = read('esm/native/builder/render_preview_sketch_pipeline_shared.ts');
const previewSketchPipelineObjectBoxes = read(
  'esm/native/builder/render_preview_sketch_pipeline_object_boxes.ts'
);
const previewSketchPipelineBoxContent = read(
  'esm/native/builder/render_preview_sketch_pipeline_box_content.ts'
);
const previewSketchPipelineBoxContentDrawers = read(
  'esm/native/builder/render_preview_sketch_pipeline_box_content_drawers.ts'
);
const previewSketchPipelineBoxContentBox = read(
  'esm/native/builder/render_preview_sketch_pipeline_box_content_box.ts'
);
const previewSketchPipelineLinear = read('esm/native/builder/render_preview_sketch_pipeline_linear.ts');
const previewInteriorHoverOps = read('esm/native/builder/render_preview_interior_hover_ops.ts');
const audit = read('docs/layering_completion_audit.md');

test('[stageO] render_ops preview/hover helpers are extracted behind a focused helper module', () => {
  assert.match(renderOps, /import \{ createBuilderRenderPreviewOps \} from '\.\/render_preview_ops\.js';/);
  assert.match(renderOps, /const __previewOps = createBuilderRenderPreviewOps\(\{/);
  assert.match(renderOps, /export const ensureSplitHoverMarker = __previewOps\.ensureSplitHoverMarker;/);
  assert.match(
    renderOps,
    /export const ensureSketchPlacementPreview = __previewOps\.ensureSketchPlacementPreview;/
  );
  assert.match(
    renderOps,
    /export const setInteriorLayoutHoverPreview = __previewOps\.setInteriorLayoutHoverPreview;/
  );
  assert.doesNotMatch(renderOps, /export function ensureSplitHoverMarker\(/);
  assert.doesNotMatch(renderOps, /export function ensureSketchPlacementPreview\(/);
  assert.doesNotMatch(renderOps, /export function ensureInteriorLayoutHoverPreview\(/);

  // The focused owner now aggregates three dedicated helper factories.
  assert.match(previewOps, /export function createBuilderRenderPreviewOps\(deps: RenderPreviewOpsDeps\)/);
  assert.match(previewOps, /createBuilderRenderPreviewMarkerOps\(deps\)/);
  assert.match(previewOps, /createBuilderRenderSketchPlacementPreviewOps\(deps\)/);
  assert.match(previewOps, /createBuilderRenderInteriorLayoutHoverPreviewOps\(deps\)/);
  assert.match(
    previewOps,
    /return \{[\s\S]*createBuilderRenderPreviewMarkerOps\(deps\)[\s\S]*createBuilderRenderSketchPlacementPreviewOps\(deps\)[\s\S]*createBuilderRenderInteriorLayoutHoverPreviewOps\(deps\)[\s\S]*\};/
  );

  // Smarter seam checks: validate the focused helpers themselves, not the aggregator text layout.
  assert.match(previewMarkerOps, /render_preview_marker_ops_factory\.js/);
  assert.match(previewMarkerFactory, /createSplitHoverMarkerOwner\(ctx\)/);
  assert.match(previewMarkerSplit, /function ensureSplitHoverMarker\(args: PreviewMarkerArgs\)/);
  assert.match(previewSketchOps, /render_preview_sketch_ops_factory\.js/);
  assert.match(previewSketchFactory, /createRenderPreviewSketchOpsContext\(deps\)/);
  assert.match(previewSketchFactory, /ensureSketchPlacementPreviewOwner\(owner, args\)/);
  assert.match(previewSketchContext, /createRenderPreviewSketchShared\(deps\)/);
  assert.match(previewSketchState, /export function ensureSketchPlacementPreviewOwner\(/);
  assert.match(
    previewSketchMaterials,
    /matBoxOverlay: createSketchMeshMaterial\(THREE, shared, 0xfbbf24, 0\.3, false\)/
  );
  assert.match(previewSketchApply, /applySketchPlacementPreview\(\{/);
  assert.match(
    previewSketchShared,
    /export function createRenderPreviewSketchShared\(deps: Pick<RenderPreviewOpsDeps, 'asObject'>\)/
  );
  assert.match(
    previewSketchPipeline,
    /export function applySketchPlacementPreview\(args: ApplySketchPlacementPreviewArgs\): PreviewGroupLike/
  );
  assert.match(previewSketchPipeline, /createSketchPlacementPreviewContext\(args\)/);
  assert.match(previewSketchPipeline, /applyObjectBoxesSketchPlacementPreview\(ctx\)/);
  assert.match(previewSketchPipeline, /applyBoxContentSketchPlacementPreview\(ctx\)/);
  assert.match(previewSketchPipeline, /applyLinearSketchPlacementPreview\(ctx\)/);
  assert.match(
    previewSketchPipelineShared,
    /export function createSketchPlacementPreviewContext\(args: ApplySketchPlacementPreviewArgs\)/
  );
  assert.match(
    previewSketchPipelineObjectBoxes,
    /export function applyObjectBoxesSketchPlacementPreview\(ctx: SketchPlacementPreviewContext\): boolean/
  );
  assert.match(
    previewSketchPipelineBoxContent,
    /export function applyBoxContentSketchPlacementPreview\(ctx: SketchPlacementPreviewContext\): boolean/
  );
  assert.match(previewSketchPipelineBoxContent, /render_preview_sketch_pipeline_box_content_drawers\.js/);
  assert.match(previewSketchPipelineBoxContent, /render_preview_sketch_pipeline_box_content_box\.js/);
  assert.match(
    previewSketchPipelineBoxContentDrawers,
    /function applyDrawersPreview\(ctx: SketchPlacementPreviewContext\): boolean/
  );
  assert.match(
    previewSketchPipelineBoxContentBox,
    /export function applyBoxVolumeSketchPlacementPreview\(ctx: SketchPlacementPreviewContext\): boolean/
  );
  assert.match(
    previewSketchPipelineLinear,
    /export function applyLinearSketchPlacementPreview\(ctx: SketchPlacementPreviewContext\): boolean/
  );
  assert.match(previewInteriorHoverOps, /render_preview_interior_hover_shared\.js/);
  assert.match(previewInteriorHoverOps, /render_preview_interior_hover_cache\.js/);
  assert.match(previewInteriorHoverOps, /render_preview_interior_hover_apply\.js/);
  assert.doesNotMatch(previewInteriorHoverOps, /function setInteriorLayoutHoverPreview\(/);

  assert.ok(
    audit.includes('`render_ops.ts` preview/hover helpers extracted into `builder/render_preview_ops.ts`')
  );
});
