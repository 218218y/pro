import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import { createSourceFile, walkAst } from '../tools/wp_ast_adapter.mjs';
import { analyzeModuleDependencies, collectNamedModuleExports } from '../tools/wp_layer_contract_support.mjs';

const cache = new Map();
const read = file => {
  if (!cache.has(file)) cache.set(file, fs.readFileSync(file, 'utf8'));
  return cache.get(file);
};
const ast = file => createSourceFile(file, read(file), { label: 'runtime pipeline topology' });
const deps = file => analyzeModuleDependencies(file, read(file)).imports;
const exported = file => new Set(collectNamedModuleExports(file, read(file)).map(item => item.exportedName));

function assertModule({ file, imports = {}, forbidden = [], exports = [], maxLines }) {
  const entries = deps(file);
  const bySpecifier = specifier => entries.filter(item => item.specifier === specifier);
  if (maxLines)
    assert.ok(read(file).split(/\r\n|\r|\n/).length <= maxLines, `${file} exceeds ${maxLines} lines`);
  for (const [specifier, names] of Object.entries(imports)) {
    const matches = bySpecifier(specifier);
    assert.ok(matches.length, `${file} must import ${specifier}`);
    const symbols = new Set(matches.flatMap(item => item.importedSymbols || []));
    for (const name of names) assert.ok(symbols.has(name), `${file} must import ${name} from ${specifier}`);
  }
  for (const specifier of forbidden)
    assert.equal(bySpecifier(specifier).length, 0, `${file} must not import ${specifier}`);
  const names = exported(file);
  for (const name of exports) assert.ok(names.has(name), `${file} must export ${name}`);
}

function typeFields(file, typeName) {
  const names = [];
  walkAst(ast(file), node => {
    if (node.type !== 'TSTypeAliasDeclaration' || node.id?.name !== typeName) return;
    for (const member of node.typeAnnotation?.members || []) {
      if (member.type === 'TSPropertySignature' && member.key?.type === 'Identifier')
        names.push(member.key.name);
    }
  });
  return names.sort();
}

function jsxProps(file, componentName) {
  let names = [];
  walkAst(ast(file), node => {
    if (
      node.type !== 'JSXOpeningElement' ||
      node.name?.type !== 'JSXIdentifier' ||
      node.name.name !== componentName
    )
      return;
    names = (node.attributes || [])
      .filter(item => item.type === 'JSXAttribute' && item.name?.type === 'JSXIdentifier')
      .map(item => item.name.name);
  });
  return new Set(names);
}

function hookBareDependencies(file) {
  const names = [];
  walkAst(ast(file), node => {
    if (node.type !== 'CallExpression' || !['useCallback', 'useEffect'].includes(node.callee?.name)) return;
    const array = node.arguments?.at(-1);
    if (array?.type !== 'ArrayExpression') return;
    for (const item of array.elements || []) if (item?.type === 'Identifier') names.push(item.name);
  });
  return names;
}

test('planar reflector pipeline keeps render-pass ownership and state contracts separated', () => {
  assertModule({
    file: 'esm/native/runtime/planar_reflector_runtime.ts',
    imports: {
      './planar_reflector_refresh_runtime.js': ['refreshTrackedPlanarMirrorSurfacesNow'],
      './planar_reflector_warm_cache.js': [
        'capturePlanarReflectorWarmCache',
        'finalizePlanarReflectorWarmCache',
      ],
      './planar_reflector_state.js': ['isPlanarMirrorSurface'],
    },
    forbidden: ['./planar_reflector_render_pass.js'],
  });
  assertModule({
    file: 'esm/native/runtime/planar_reflector_refresh_runtime.ts',
    imports: {
      './planar_reflector_render_pass.js': ['renderPlanarReflectorSurface'],
      './planar_reflector_state.js': [],
    },
  });
  assertModule({
    file: 'esm/native/runtime/planar_reflector_warm_cache.ts',
    forbidden: ['./planar_reflector_render_pass.js'],
  });
  assertModule({
    file: 'esm/native/runtime/planar_reflector_render_pass.ts',
    imports: { './planar_reflector_state.js': ['readPlanarReflectorState'] },
    exports: ['runPlanarReflectorRendererPass', 'renderPlanarReflectorSurface'],
  });
  assertModule({
    file: 'esm/native/runtime/planar_reflector_state.ts',
    exports: ['readPlanarReflectorState'],
  });
  assertModule({
    file: 'esm/native/runtime/planar_reflector_contracts.ts',
    exports: ['PlanarReflectorState', 'PlanarReflectorRenderFailureReason'],
  });
});

test('free-box preview and commit remain separated by the typed command protocol', () => {
  assertModule({
    file: 'esm/native/services/canvas_picking_manual_layout_free_box_content.ts',
    maxLines: 550,
    imports: {
      './canvas_picking_manual_layout_free_box_plans.js': ['resolvePresetLayoutFreeBoxPlan'],
      './canvas_picking_manual_layout_free_box_hover_protocol.js': [],
      './canvas_picking_manual_layout_free_box_commit.js': ['tryCommitManualLayoutFreeBoxFromHover'],
    },
    forbidden: [
      '../features/interior_layout_presets/api.js',
      './canvas_picking_structural_commit.js',
      '../runtime/actions_access_domains.js',
    ],
  });
  assertModule({
    file: 'esm/native/services/canvas_picking_manual_layout_free_box_plans.ts',
    imports: { '../features/interior_layout_presets/api.js': ['computeInteriorPresetOps'] },
  });
  assertModule({
    file: 'esm/native/services/canvas_picking_manual_layout_free_box_commit.ts',
    imports: {
      './canvas_picking_manual_layout_free_box_hover_protocol.js': [
        'readShelfGridFreeBoxCommand',
        'readPresetLayoutFreeBoxCommand',
        'readBraceShelvesFreeBoxCommand',
      ],
      './canvas_picking_structural_commit.js': ['commitCanvasModuleStructuralPatch'],
    },
    forbidden: ['../runtime/actions_access_domains.js'],
  });
  assertModule({
    file: 'esm/native/services/canvas_picking_manual_layout_free_box_hover_protocol.ts',
    exports: [
      'ShelfGridFreeBoxCommand',
      'PresetLayoutFreeBoxCommand',
      'BraceShelvesFreeBoxCommand',
      'readShelfGridFreeBoxCommand',
      'readPresetLayoutFreeBoxCommand',
      'readBraceShelvesFreeBoxCommand',
    ],
  });
});

test('order PDF editor remains a grouped-prop compositor with stage and mode owners isolated', () => {
  assertModule({
    file: 'esm/native/ui/react/pdf/order_pdf_overlay_editor_surface.tsx',
    maxLines: 90,
    imports: {
      './order_pdf_overlay_editor_mode_controls.js': ['OrderPdfOverlayEditorModeControls'],
      './order_pdf_overlay_editor_modes.js': ['useOrderPdfOverlayEditorModes'],
      './order_pdf_overlay_editor_stage.js': ['OrderPdfOverlayEditorStage'],
      './order_pdf_overlay_inline_confirm.js': ['OrderPdfOverlayInlineConfirm'],
    },
    forbidden: ['./order_pdf_overlay_stage_interactions.js'],
  });
  assertModule({
    file: 'esm/native/ui/react/pdf/order_pdf_overlay_editor_stage.tsx',
    imports: { './order_pdf_overlay_sketch_panel.js': ['OrderPdfOverlaySketchPanel'] },
    forbidden: [
      './order_pdf_overlay_sketch_panel_view.js',
      './order_pdf_overlay_sketch_panel_types.js',
      './order_pdf_overlay_sketch_panel_header.js',
      './order_pdf_overlay_sketch_panel_cards.js',
    ],
  });
  assert.deepEqual(
    typeFields(
      'esm/native/ui/react/pdf/order_pdf_overlay_editor_surface_contracts.ts',
      'OrderPdfOverlayEditorSurfaceProps'
    ),
    ['annotations', 'inlineConfirm', 'refs', 'sketch', 'stage', 'toolbar']
  );
  const props = jsxProps(
    'esm/native/ui/react/pdf/OrderPdfInPlaceEditorOverlay.tsx',
    'OrderPdfOverlayEditorSurface'
  );
  for (const name of ['refs', 'stage', 'sketch', 'annotations', 'inlineConfirm'])
    assert.ok(props.has(name), `caller must pass grouped prop ${name}`);
  const deps = hookBareDependencies('esm/native/ui/react/pdf/order_pdf_overlay_editor_modes.ts');
  assert.equal(deps.includes('sketch'), false);
  assert.equal(deps.includes('stage'), false);
});
