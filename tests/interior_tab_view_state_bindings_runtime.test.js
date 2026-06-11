import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ts = require('typescript');

function loadBindingsModule() {
  const file = path.join(
    process.cwd(),
    'esm/native/ui/react/tabs/interior_tab_view_state_bindings_runtime.ts'
  );
  const source = fs.readFileSync(file, 'utf8');
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
    fileName: file,
  }).outputText;
  const mod = { exports: {} };
  const sandbox = {
    module: mod,
    exports: mod.exports,
    require,
    __dirname: path.dirname(file),
    __filename: file,
    console,
    process,
  };
  vm.runInNewContext(transpiled, sandbox, { filename: file });
  return mod.exports;
}

test('[interior-view-state-bindings] maps local setters into controller args once', () => {
  const { createInteriorTabViewStateControllerArgs, createInteriorTabViewStateControllerMemoDeps } =
    loadBindingsModule();
  const bindings = {
    setSketchShelvesOpen: () => 'shelves',
    setDoorTrimPanelOpen: () => 'doorTrimPanel',
    setDoorTrimColor: () => 'doorTrimColor',
    setDoorTrimHorizontalSpan: () => 'horizontalSpan',
    setDoorTrimHorizontalCustomCm: () => 'horizontalCustomCm',
    setDoorTrimHorizontalCustomDraft: () => 'horizontalCustomDraft',
    setDoorTrimHorizontalCrossCm: () => 'horizontalCrossCm',
    setDoorTrimHorizontalCrossDraft: () => 'horizontalCrossDraft',
    setDoorTrimVerticalSpan: () => 'verticalSpan',
    setDoorTrimVerticalCustomCm: () => 'verticalCustomCm',
    setDoorTrimVerticalCustomDraft: () => 'verticalCustomDraft',
    setDoorTrimVerticalCrossCm: () => 'verticalCrossCm',
    setDoorTrimVerticalCrossDraft: () => 'verticalCrossDraft',
    setSketchBoxPanelOpen: () => 'sketchBoxPanel',
    setSketchBoxHeightCm: () => 'sketchBoxHeightCm',
    setSketchBoxHeightDraft: () => 'sketchBoxHeightDraft',
    setSketchBoxWidthCm: () => 'sketchBoxWidthCm',
    setSketchBoxWidthDraft: () => 'sketchBoxWidthDraft',
    setSketchBoxDepthCm: () => 'sketchBoxDepthCm',
    setSketchBoxDepthDraft: () => 'sketchBoxDepthDraft',
    setSketchStorageHeightCm: () => 'storageHeightCm',
    setSketchStorageHeightDraft: () => 'storageHeightDraft',
    setSketchBoxCorniceType: () => 'corniceType',
    setSketchBoxCornicePanelOpen: () => 'cornicePanel',
    setSketchBoxBaseType: () => 'baseType',
    setSketchBoxBasePanelOpen: () => 'basePanel',
    setSketchBoxLegWidthCm: () => 'legWidthCm',
    setSketchBoxLegWidthDraft: () => 'legWidthDraft',
    setSketchBoxLegStyle: () => 'legStyle',
    setSketchBoxLegColor: () => 'legColor',
    setSketchBoxLegHeightCm: () => 'legHeightCm',
    setSketchBoxLegHeightDraft: () => 'legHeightDraft',
    setSketchExtDrawerCount: () => 'extDrawerCount',
    setSketchExtDrawerHeightCm: () => 'extDrawerHeightCm',
    setSketchExtDrawerHeightDraft: () => 'extDrawerHeightDraft',
    setSketchIntDrawerHeightCm: () => 'intDrawerHeightCm',
    setSketchIntDrawerHeightDraft: () => 'intDrawerHeightDraft',
    setSketchExtDrawersPanelOpen: () => 'extDrawerPanel',
    setSketchShelfDepthByVariant: () => 'shelfDepthByVariant',
    setSketchShelfDepthDraftByVariant: () => 'shelfDepthDraftByVariant',
    setManualUiTool: () => 'manualUiTool',
  };
  const args = createInteriorTabViewStateControllerArgs({ id: 'app' }, bindings);
  const deps = createInteriorTabViewStateControllerMemoDeps({ id: 'app' }, bindings);

  assert.equal(args.app.id, 'app');
  assert.equal(args.setSketchShelvesOpen, bindings.setSketchShelvesOpen);
  assert.equal(args.setDoorTrimVerticalCrossDraft, bindings.setDoorTrimVerticalCrossDraft);
  assert.equal(args.setSketchBoxHeightCm, bindings.setSketchBoxHeightCm);
  assert.equal(args.setSketchBoxLegStyle, bindings.setSketchBoxLegStyle);
  assert.equal(args.setSketchBoxLegColor, bindings.setSketchBoxLegColor);
  assert.equal(args.setSketchBoxLegHeightCm, bindings.setSketchBoxLegHeightCm);
  assert.equal(args.setSketchBoxLegWidthCm, bindings.setSketchBoxLegWidthCm);
  assert.equal(args.setSketchBoxLegWidthDraft, bindings.setSketchBoxLegWidthDraft);
  assert.equal(args.setSketchBoxLegHeightDraft, bindings.setSketchBoxLegHeightDraft);
  assert.equal(args.setSketchExtDrawerHeightCm, bindings.setSketchExtDrawerHeightCm);
  assert.equal(args.setSketchExtDrawerHeightDraft, bindings.setSketchExtDrawerHeightDraft);
  assert.equal(args.setSketchIntDrawerHeightCm, bindings.setSketchIntDrawerHeightCm);
  assert.equal(args.setSketchIntDrawerHeightDraft, bindings.setSketchIntDrawerHeightDraft);
  assert.equal(args.setSketchExtDrawersPanelOpen, bindings.setSketchExtDrawersPanelOpen);
  assert.equal(args.setManualUiTool, bindings.setManualUiTool);
  assert.equal(Object.keys(args).length, 42);
  assert.equal(deps.length, 42);
  assert.equal(deps[0].id, 'app');
  assert.equal(deps.at(-1), bindings.setManualUiTool);
  assert.equal(deps[1], bindings.setSketchShelvesOpen);
});
