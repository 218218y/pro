import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ts = require('typescript');

function loadRenderTabDisplayControllerModule() {
  const file = path.join(process.cwd(), 'esm/native/ui/react/tabs/render_tab_display_controller_runtime.ts');
  const source = fs.readFileSync(file, 'utf8');
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
    fileName: file,
  }).outputText;
  const mod = { exports: {} };
  const localRequire = specifier => {
    if (specifier === '../actions/sketch_actions.js') {
      return { toggleSketchMode: () => undefined };
    }
    if (specifier === '../actions/store_actions.js') {
      return {
        setCfgShowDimensions: () => undefined,
        setUiGlobalClickUi: () => undefined,
        setUiShowContents: () => undefined,
        setUiShowHanger: () => undefined,
      };
    }
    if (specifier === './render_tab_shared_interactions.js') {
      return {
        syncGlobalClickMode: () => undefined,
        closeInteractiveStateOnGlobalOff: () => undefined,
      };
    }
    if (specifier === '../../../services/api.js') {
      return {
        runPerfAction: (_app, _name, run) => run(),
      };
    }
    return require(specifier);
  };
  const sandbox = {
    module: mod,
    exports: mod.exports,
    require: localRequire,
    __dirname: path.dirname(file),
    __filename: file,
    console,
    process,
    setTimeout,
    clearTimeout,
  };
  vm.runInNewContext(transpiled, sandbox, { filename: file });
  return mod.exports;
}

test('[render-tab-display-controller] delegates display/global-click actions through one canonical owner', () => {
  const mod = loadRenderTabDisplayControllerModule();
  const calls = [];
  const app = { id: 'app' };
  const meta = {
    uiOnlyImmediate(source) {
      return { source, immediate: true };
    },
  };
  const controller = mod.createRenderTabDisplayController({
    app,
    meta,
    sketchMode: false,
    setCfgShowDimensionsFn: (nextApp, checked, actionMeta) =>
      calls.push(['dimensions', nextApp, checked, actionMeta]),
    setUiShowContentsFn: (nextApp, checked, actionMeta) =>
      calls.push(['contents', nextApp, checked, actionMeta]),
    setUiShowHangerFn: (nextApp, checked, actionMeta) => calls.push(['hanger', nextApp, checked, actionMeta]),
    toggleSketchModeFn: (nextApp, actionMeta) => calls.push(['sketch', nextApp, actionMeta]),
    setUiGlobalClickUiFn: (nextApp, checked, actionMeta) =>
      calls.push(['globalUi', nextApp, checked, actionMeta]),
    syncGlobalClickModeFn: (nextApp, checked, actionMeta) =>
      calls.push(['globalRt', nextApp, checked, actionMeta]),
    closeInteractiveStateOnGlobalOffFn: nextApp => calls.push(['closeInteractive', nextApp]),
  });

  controller.onToggleShowDimensions(true);
  controller.onToggleShowContents(false);
  controller.onToggleShowHanger(true);
  controller.onToggleSketchMode(true);
  controller.onToggleSketchMode(false);
  controller.onToggleGlobalClick(false);
  controller.onToggleGlobalClick(true);
  controller.syncGlobalClickState(false, true);
  controller.syncGlobalClickState(true, true);

  assert.equal(
    JSON.stringify(calls),
    JSON.stringify([
      ['dimensions', app, true, { source: 'react:renderTab:showDimensions', immediate: true }],
      ['contents', app, false, { source: 'react:renderTab:showContents', immediate: true }],
      ['hanger', app, true, { source: 'react:renderTab:showHanger', immediate: true }],
      ['sketch', app, { source: 'react:renderTab:sketchMode' }],
      ['globalUi', app, false, { source: 'react:renderTab:globalClickUi', immediate: true }],
      ['globalRt', app, false, { source: 'react:renderTab:globalClick', immediate: true }],
      ['closeInteractive', app],
      ['globalUi', app, true, { source: 'react:renderTab:globalClickUi', immediate: true }],
      ['globalRt', app, true, { source: 'react:renderTab:globalClick', immediate: true }],
      ['globalRt', app, true, { source: 'react:renderTab:globalClickSync', immediate: true }],
    ])
  );
});

test('[render-tab-display-controller] swallowed action errors degrade safely', () => {
  const mod = loadRenderTabDisplayControllerModule();
  const calls = [];
  const controller = mod.createRenderTabDisplayController({
    app: { id: 'app' },
    meta: { uiOnlyImmediate: source => ({ source, immediate: true }) },
    sketchMode: false,
    toggleSketchModeFn: () => {
      throw new Error('boom');
    },
    syncGlobalClickModeFn: () => {
      throw new Error('boom');
    },
    closeInteractiveStateOnGlobalOffFn: () => calls.push('closed'),
  });

  assert.doesNotThrow(() => controller.onToggleSketchMode(true));
  assert.doesNotThrow(() => controller.syncGlobalClickState(false, true));
  assert.doesNotThrow(() => controller.onToggleGlobalClick(false));
  assert.equal(JSON.stringify(calls), JSON.stringify(['closed']));
});
