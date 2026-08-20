const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function read(rel) {
  return fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
}

async function semanticContracts() {
  return import('./_semantic_source_contracts.js');
}

function findPreviewFact(returns, kind) {
  for (const entry of returns || []) {
    const preview = entry?.kind === 'object' ? entry.properties?.preview : null;
    if (
      preview?.kind === 'object' &&
      preview.properties?.kind?.kind === 'literal' &&
      preview.properties.kind.value === kind
    ) {
      return preview;
    }
    const boxPreviewResult = entry?.kind === 'object' ? entry.properties?.boxPreviewResult : null;
    const nestedPreview = boxPreviewResult?.kind === 'object' ? boxPreviewResult.properties?.preview : null;
    if (
      nestedPreview?.kind === 'object' &&
      nestedPreview.properties?.kind?.kind === 'literal' &&
      nestedPreview.properties.kind.value === kind
    ) {
      return nestedPreview;
    }
  }
  return null;
}

test('sketch placement preview renderer supports explicit front overlays for sketch hover facades', async () => {
  const src = [
    'esm/native/builder/render_preview_sketch_ops.ts',
    'esm/native/builder/render_preview_sketch_ops_factory.ts',
    'esm/native/builder/render_preview_sketch_ops_context.ts',
    'esm/native/builder/render_preview_sketch_ops_state.ts',
    'esm/native/builder/render_preview_sketch_ops_materials.ts',
    'esm/native/builder/render_preview_sketch_ops_meshes.ts',
    'esm/native/builder/render_preview_sketch_ops_apply.ts',
  ]
    .map(read)
    .join('\n');
  const pipeline = read('esm/native/builder/render_preview_sketch_pipeline.ts');
  const pipelineShared = read('esm/native/builder/render_preview_sketch_pipeline_shared.ts');
  const pipelineBoxContent = read('esm/native/builder/render_preview_sketch_pipeline_box_content.ts');
  const pipelineBoxContentDrawers = read(
    'esm/native/builder/render_preview_sketch_pipeline_box_content_drawers.ts'
  );
  const pipelineBoxContentBox = read('esm/native/builder/render_preview_sketch_pipeline_box_content_box.ts');
  const previewBundle = `${src}
${pipeline}
${pipelineShared}
${pipelineBoxContent}
${pipelineBoxContentDrawers}
${pipelineBoxContentBox}`;
  const { getFunctionCallSequenceFacts, getVariableFunctionSignatureFact } = await semanticContracts();
  const sharedSource = read('esm/native/builder/render_preview_sketch_pipeline_shared.ts');
  const overlaySignature = getVariableFunctionSignatureFact(
    sharedSource,
    'readFrontOverlay',
    'render_preview_sketch_pipeline_shared.ts'
  );
  assert.deepEqual(
    overlaySignature?.params.map(param => [param.name, param.type]),
    [
      ['fallbackX', 'number'],
      ['fallbackY', 'number'],
      ['fallbackW', 'number'],
      ['fallbackH', 'number'],
      ['fallbackT', 'number'],
    ]
  );
  assert.equal(overlaySignature?.returnType, 'FrontOverlay|null');
  const drawerPreviewSource = read(
    'esm/native/builder/render_preview_sketch_pipeline_box_content_drawers.ts'
  );
  for (const functionName of ['applyDrawersPreview', 'applyExternalDrawersPreview', 'applyStoragePreview']) {
    const calls = getFunctionCallSequenceFacts(
      drawerPreviewSource,
      functionName,
      'render_preview_sketch_pipeline_box_content_drawers.ts'
    );
    assert.ok(
      calls?.some(call => call.callee === 'ctx.readFrontOverlay'),
      `${functionName} should read front overlay`
    );
  }
  assert.match(previewBundle, /if \(fillFront \|\| frontOverlay\) setBox\(/);
});

test('free-box sketch hover forwards front overlays for drawers, base, and remove-box previews', async () => {
  const stackPreview = [
    'esm/native/services/canvas_picking_sketch_box_stack_preview.ts',
    'esm/native/services/canvas_picking_sketch_box_stack_preview_contracts.ts',
    'esm/native/services/canvas_picking_sketch_box_stack_preview_records.ts',
    'esm/native/services/canvas_picking_sketch_box_stack_preview_shared.ts',
    'esm/native/services/canvas_picking_sketch_box_stack_preview_context.ts',
    'esm/native/services/canvas_picking_sketch_box_stack_preview_overlay.ts',
    'esm/native/services/canvas_picking_sketch_box_stack_preview_drawers.ts',
    'esm/native/services/canvas_picking_sketch_box_stack_preview_ext_drawers.ts',
  ]
    .map(read)
    .join('\n');
  const freeSurfaceContent = [
    'esm/native/services/canvas_picking_sketch_free_surface_preview_content.ts',
    'esm/native/services/canvas_picking_sketch_free_surface_preview_adornment_preview.ts',
  ]
    .map(read)
    .join('\n');
  const freeSurfacePlacement = [
    'esm/native/services/canvas_picking_sketch_free_surface_preview_placement.ts',
    'esm/native/services/canvas_picking_sketch_free_surface_preview_placement_remove.ts',
  ]
    .map(read)
    .join('\n');
  const { getFunctionReturnFacts, getFunctionVariableFacts } = await semanticContracts();
  const contextSource = read('esm/native/services/canvas_picking_sketch_box_stack_preview_context.ts');
  const contextVars = getFunctionVariableFacts(
    contextSource,
    'resolveSketchBoxStackPreviewContext',
    'canvas_picking_sketch_box_stack_preview_context.ts'
  );
  const frontOverlay = contextVars?.frontOverlay;
  assert.equal(frontOverlay?.kind, 'call');
  assert.equal(frontOverlay?.callee, 'resolveSketchBoxVisibleFrontOverlay');
  assert.deepEqual(frontOverlay?.args[0]?.properties?.segment, { kind: 'identifier', name: 'activeSegment' });

  const drawersSource = read('esm/native/services/canvas_picking_sketch_box_stack_preview_drawers.ts');
  const drawersPreview = findPreviewFact(
    getFunctionReturnFacts(
      drawersSource,
      'resolveSketchBoxDrawersPreview',
      'canvas_picking_sketch_box_stack_preview_drawers.ts'
    ),
    'drawers'
  );
  assert.equal(drawersPreview?.spreads?.[0]?.kind, 'conditional');
  assert.equal(drawersPreview?.spreads?.[0]?.alternate?.callee, 'buildSketchBoxFrontOverlayFields');

  const extDrawersSource = read('esm/native/services/canvas_picking_sketch_box_stack_preview_ext_drawers.ts');
  const extDrawersPreview = findPreviewFact(
    getFunctionReturnFacts(
      extDrawersSource,
      'resolveSketchBoxExternalDrawersPreview',
      'canvas_picking_sketch_box_stack_preview_ext_drawers.ts'
    ),
    'ext_drawers'
  );
  assert.equal(extDrawersPreview?.spreads?.[0]?.kind, 'conditional');
  assert.equal(extDrawersPreview?.spreads?.[0]?.alternate?.callee, 'buildSketchBoxFrontOverlayFields');

  const adornmentSource = read(
    'esm/native/services/canvas_picking_sketch_free_surface_preview_adornment_preview.ts'
  );
  const storagePreview = getFunctionReturnFacts(
    adornmentSource,
    'resolveSketchFreeSurfaceAdornmentPreview',
    'canvas_picking_sketch_free_surface_preview_adornment_preview.ts'
  )
    .map(entry => (entry?.kind === 'object' ? entry.properties?.preview : null))
    .find(
      preview =>
        preview?.kind === 'object' &&
        preview.properties?.kind?.kind === 'literal' &&
        preview.properties.kind.value === 'storage' &&
        preview.properties?.frontOverlayZ
    );
  assert.equal(storagePreview?.properties?.frontOverlayZ?.kind, 'conditional');
  assert.deepEqual(storagePreview?.properties?.frontOverlayZ?.alternate, {
    kind: 'identifier',
    name: 'undefined',
  });

  const placementSource = read('esm/native/services/canvas_picking_sketch_free_surface_preview_placement.ts');
  const boxPreview = findPreviewFact(
    getFunctionReturnFacts(
      placementSource,
      'resolveSketchFreePlacementBoxPreview',
      'canvas_picking_sketch_free_surface_preview_placement.ts'
    ),
    'box'
  );
  assert.equal(boxPreview?.properties?.fillFront?.kind, 'unary');
  assert.equal(boxPreview?.properties?.frontOverlayZ?.kind, 'conditional');
  assert.deepEqual(boxPreview?.properties?.frontOverlayZ?.alternate, {
    kind: 'identifier',
    name: 'undefined',
  });
});

test('module sketch box remove hover forwards a front overlay so box removal can mark door facades', async () => {
  const shared = read('esm/native/services/canvas_picking_sketch_module_surface_preview_shared.ts');
  const boxOverlay = read('esm/native/services/canvas_picking_sketch_module_surface_preview_box_overlay.ts');
  const box = read('esm/native/services/canvas_picking_sketch_module_surface_preview_box.ts');
  assert.match(shared, /canvas_picking_sketch_module_surface_preview_box_overlay\.js/);
  assert.match(boxOverlay, /resolveSketchBoxVisibleFrontOverlay\(/);
  const { getFunctionReturnFacts } = await semanticContracts();
  const boxPreview = findPreviewFact(
    getFunctionReturnFacts(
      box,
      'resolveSketchModuleBoxPreviewState',
      'canvas_picking_sketch_module_surface_preview_box.ts'
    ),
    'box'
  );
  assert.equal(boxPreview?.properties?.fillFront?.kind, 'unary');
  assert.equal(boxPreview?.properties?.frontOverlayZ?.kind, 'conditional');
  assert.deepEqual(boxPreview?.properties?.frontOverlayZ?.alternate, {
    kind: 'identifier',
    name: 'undefined',
  });
});
