import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ts = require('typescript');

function areDepsEqual(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (!Object.is(a[i], b[i])) return false;
  }
  return true;
}

function createFakeReactRuntime() {
  const hookSlots = [];
  let hookIndex = 0;
  let pendingEffects = [];

  function useMemo(factory, deps) {
    const slotIndex = hookIndex;
    hookIndex += 1;
    const prev = hookSlots[slotIndex];
    if (!prev || prev.kind !== 'memo' || !areDepsEqual(prev.deps, deps)) {
      const next = { kind: 'memo', deps: Array.from(deps || []), value: factory() };
      hookSlots[slotIndex] = next;
      return next.value;
    }
    return prev.value;
  }

  function useEffect(effect, deps) {
    const slotIndex = hookIndex;
    hookIndex += 1;
    const prev = hookSlots[slotIndex];
    const changed = !prev || prev.kind !== 'effect' || !areDepsEqual(prev.deps, deps);
    hookSlots[slotIndex] = { kind: 'effect', deps: Array.from(deps || []) };
    if (changed) pendingEffects.push(effect);
  }

  return {
    reactModule: {
      __esModule: true,
      default: { useMemo, useEffect },
      useMemo,
      useEffect,
    },
    render(run) {
      hookIndex = 0;
      pendingEffects = [];
      const result = run();
      for (const effect of pendingEffects) effect();
      return result;
    },
  };
}

function loadSyncModule(stubs) {
  const file = path.join(process.cwd(), 'esm/native/ui/react/tabs/use_interior_tab_view_state_sync.ts');
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
    require(spec) {
      if (spec === 'react') return stubs.react;
      if (spec === './interior_tab_view_state_bindings_runtime.js') return stubs.bindings;
      if (spec === './interior_tab_view_state_controller_runtime.js') return stubs.controller;
      return require(spec);
    },
    __dirname: path.dirname(file),
    __filename: file,
    console,
    process,
  };
  vm.runInNewContext(transpiled, sandbox, { filename: file });
  return mod.exports;
}

test('[interior-view-state-sync] keeps the controller stable across local draft rerenders and only resyncs when inputs change', () => {
  const fakeReact = createFakeReactRuntime();
  const controllerCreations = [];
  const argsCreations = [];
  const syncCalls = [];
  const setSketchShelvesOpen = () => undefined;
  const setDoorTrimPanelOpen = () => undefined;
  const setDoorTrimColor = () => undefined;
  const setDoorTrimHorizontalSpan = () => undefined;
  const setDoorTrimHorizontalCustomCm = () => undefined;
  const setDoorTrimHorizontalCustomDraft = () => undefined;
  const setDoorTrimHorizontalCrossCm = () => undefined;
  const setDoorTrimHorizontalCrossDraft = () => undefined;
  const setDoorTrimVerticalSpan = () => undefined;
  const setDoorTrimVerticalCustomCm = () => undefined;
  const setDoorTrimVerticalCustomDraft = () => undefined;
  const setDoorTrimVerticalCrossCm = () => undefined;
  const setDoorTrimVerticalCrossDraft = () => undefined;
  const setSketchBoxPanelOpen = () => undefined;
  const setSketchBoxHeightCm = () => undefined;
  const setSketchBoxHeightDraft = () => undefined;
  const setSketchBoxWidthCm = () => undefined;
  const setSketchBoxWidthDraft = () => undefined;
  const setSketchBoxDepthCm = () => undefined;
  const setSketchBoxDepthDraft = () => undefined;
  const setSketchStorageHeightCm = () => undefined;
  const setSketchStorageHeightDraft = () => undefined;
  const setSketchBoxCorniceType = () => undefined;
  const setSketchBoxCornicePanelOpen = () => undefined;
  const setSketchBoxBaseType = () => undefined;
  const setSketchBoxBasePanelOpen = () => undefined;
  const setSketchBoxLegStyle = () => undefined;
  const setSketchBoxLegColor = () => undefined;
  const setSketchBoxLegHeightCm = () => undefined;
  const setSketchBoxLegHeightDraft = () => undefined;
  const setSketchBoxLegWidthCm = () => undefined;
  const setSketchBoxLegWidthDraft = () => undefined;
  const setSketchExtDrawerCount = () => undefined;
  const setSketchExtDrawerHeightCm = () => undefined;
  const setSketchExtDrawerHeightDraft = () => undefined;
  const setSketchIntDrawerHeightCm = () => undefined;
  const setSketchIntDrawerHeightDraft = () => undefined;
  const setSketchExtDrawersPanelOpen = () => undefined;
  const setSketchShelfDepthByVariant = () => undefined;
  const setSketchShelfDepthDraftByVariant = () => undefined;
  const setManualUiTool = () => undefined;

  const bindings = {
    setSketchShelvesOpen,
    setDoorTrimPanelOpen,
    setDoorTrimColor,
    setDoorTrimHorizontalSpan,
    setDoorTrimHorizontalCustomCm,
    setDoorTrimHorizontalCustomDraft,
    setDoorTrimHorizontalCrossCm,
    setDoorTrimHorizontalCrossDraft,
    setDoorTrimVerticalSpan,
    setDoorTrimVerticalCustomCm,
    setDoorTrimVerticalCustomDraft,
    setDoorTrimVerticalCrossCm,
    setDoorTrimVerticalCrossDraft,
    setSketchBoxPanelOpen,
    setSketchBoxHeightCm,
    setSketchBoxHeightDraft,
    setSketchBoxWidthCm,
    setSketchBoxWidthDraft,
    setSketchBoxDepthCm,
    setSketchBoxDepthDraft,
    setSketchStorageHeightCm,
    setSketchStorageHeightDraft,
    setSketchBoxCorniceType,
    setSketchBoxCornicePanelOpen,
    setSketchBoxBaseType,
    setSketchBoxBasePanelOpen,
    setSketchBoxLegStyle,
    setSketchBoxLegColor,
    setSketchBoxLegHeightCm,
    setSketchBoxLegHeightDraft,
    setSketchBoxLegWidthCm,
    setSketchBoxLegWidthDraft,
    setSketchExtDrawerCount,
    setSketchExtDrawerHeightCm,
    setSketchExtDrawerHeightDraft,
    setSketchIntDrawerHeightCm,
    setSketchIntDrawerHeightDraft,
    setSketchExtDrawersPanelOpen,
    setSketchShelfDepthByVariant,
    setSketchShelfDepthDraftByVariant,
    setManualUiTool,
  };

  const appA = { id: 'app-a' };
  const appB = { id: 'app-b' };
  const syncInputA = { token: 'a' };
  const syncInputB = { token: 'b' };
  const localStateA = { sketchBoxHeightDraft: '11', ...bindings };
  const localStateB = { sketchBoxHeightDraft: '99', manualUiTool: 'rod', ...bindings };

  const { useInteriorTabViewStateSync } = loadSyncModule({
    react: fakeReact.reactModule,
    bindings: {
      createInteriorTabViewStateControllerMemoDeps(app, localState) {
        return [
          app,
          localState.setSketchShelvesOpen,
          localState.setDoorTrimPanelOpen,
          localState.setDoorTrimColor,
          localState.setDoorTrimHorizontalSpan,
          localState.setDoorTrimHorizontalCustomCm,
          localState.setDoorTrimHorizontalCustomDraft,
          localState.setDoorTrimHorizontalCrossCm,
          localState.setDoorTrimHorizontalCrossDraft,
          localState.setDoorTrimVerticalSpan,
          localState.setDoorTrimVerticalCustomCm,
          localState.setDoorTrimVerticalCustomDraft,
          localState.setDoorTrimVerticalCrossCm,
          localState.setDoorTrimVerticalCrossDraft,
          localState.setSketchBoxPanelOpen,
          localState.setSketchBoxHeightCm,
          localState.setSketchBoxHeightDraft,
          localState.setSketchBoxWidthCm,
          localState.setSketchBoxWidthDraft,
          localState.setSketchBoxDepthCm,
          localState.setSketchBoxDepthDraft,
          localState.setSketchStorageHeightCm,
          localState.setSketchStorageHeightDraft,
          localState.setSketchBoxCorniceType,
          localState.setSketchBoxCornicePanelOpen,
          localState.setSketchBoxBaseType,
          localState.setSketchBoxBasePanelOpen,
          localState.setSketchBoxLegStyle,
          localState.setSketchBoxLegColor,
          localState.setSketchBoxLegHeightCm,
          localState.setSketchBoxLegHeightDraft,
          localState.setSketchBoxLegWidthCm,
          localState.setSketchBoxLegWidthDraft,
          localState.setSketchExtDrawerCount,
          localState.setSketchExtDrawerHeightCm,
          localState.setSketchExtDrawerHeightDraft,
          localState.setSketchIntDrawerHeightCm,
          localState.setSketchIntDrawerHeightDraft,
          localState.setSketchExtDrawersPanelOpen,
          localState.setSketchShelfDepthByVariant,
          localState.setSketchShelfDepthDraftByVariant,
          localState.setManualUiTool,
        ];
      },
      createInteriorTabViewStateControllerArgs(app, localState) {
        argsCreations.push({ app, localState });
        return { app, localState };
      },
    },
    controller: {
      createInteriorTabViewStateController(args) {
        controllerCreations.push(args);
        return {
          syncFromViewState(input) {
            syncCalls.push({ args, input });
          },
        };
      },
    },
  });

  fakeReact.render(() => useInteriorTabViewStateSync(appA, localStateA, syncInputA));
  fakeReact.render(() => useInteriorTabViewStateSync(appA, localStateB, syncInputA));
  fakeReact.render(() => useInteriorTabViewStateSync(appA, localStateB, syncInputB));
  fakeReact.render(() => useInteriorTabViewStateSync(appB, localStateB, syncInputB));

  assert.equal(argsCreations.length, 2);
  assert.equal(controllerCreations.length, 2);
  assert.deepEqual(
    syncCalls.map(entry => entry.input.token),
    ['a', 'b', 'b']
  );
  assert.equal(controllerCreations[0].app, appA);
  assert.equal(controllerCreations[1].app, appB);
});
