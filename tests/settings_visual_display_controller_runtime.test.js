import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';

import { loadTsRuntimeModule } from './_ts_runtime_module_loader.mjs';
function loadSettingsVisualDisplayControllerModule() {
  const file = path.join(
    process.cwd(),
    'esm/native/ui/react/tabs/settings_visual_display_controller_runtime.ts'
  );
  const localRequire = specifier => {
    if (specifier === '../actions/sketch_actions.js') {
      return { toggleSketchMode: () => undefined };
    }
    if (specifier === '../actions/store_actions.js') {
      return {
        setCfgMirrorReflectorEnabled: () => undefined,
        setCfgShowDimensions: () => undefined,
        setUiDarkMode: () => undefined,
        setUiGlobalClickUi: () => undefined,
        setUiShowHanger: () => undefined,
      };
    }
    if (specifier === './settings_visual_shared_interactions.js') {
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
    return undefined;
  };
  return loadTsRuntimeModule(file, {
    mock: specifier => localRequire(specifier),
  });
}

test('[settings-visual-display-controller] delegates display/global-click actions through one canonical owner', () => {
  const mod = loadSettingsVisualDisplayControllerModule();
  const calls = [];
  const app = { id: 'app' };
  const meta = {
    uiOnlyImmediate(source) {
      return { source, immediate: true };
    },
  };
  const controller = mod.createSettingsVisualDisplayController({
    app,
    meta,
    setCfgShowDimensionsFn: (nextApp, checked, actionMeta) =>
      calls.push(['dimensions', nextApp, checked, actionMeta]),
    setCfgMirrorReflectorEnabledFn: (nextApp, checked, actionMeta) =>
      calls.push(['mirrorReflector', nextApp, checked, actionMeta]),
    setUiDarkModeFn: (nextApp, checked, actionMeta) => calls.push(['darkMode', nextApp, checked, actionMeta]),
    setUiShowHangerFn: (nextApp, checked, actionMeta) => calls.push(['hanger', nextApp, checked, actionMeta]),
    setUiGlobalClickUiFn: (nextApp, checked, actionMeta) =>
      calls.push(['globalUi', nextApp, checked, actionMeta]),
    syncGlobalClickModeFn: (nextApp, checked, actionMeta) =>
      calls.push(['globalRt', nextApp, checked, actionMeta]),
    closeInteractiveStateOnGlobalOffFn: nextApp => calls.push(['closeInteractive', nextApp]),
  });

  controller.onToggleShowDimensions(true);
  controller.onToggleMirrorReflector(false);
  controller.onToggleShowHanger(true);
  controller.onToggleGlobalClick(false);
  controller.onToggleGlobalClick(true);
  controller.onToggleDarkMode(true);
  controller.syncGlobalClickState(false, true);
  controller.syncGlobalClickState(true, true);

  assert.equal(
    JSON.stringify(calls),
    JSON.stringify([
      ['dimensions', app, true, { source: 'react:settingsVisual:showDimensions', immediate: true }],
      ['mirrorReflector', app, false, { source: 'react:settingsVisual:mirrorReflector', immediate: true }],
      ['hanger', app, true, { source: 'react:settingsVisual:showHanger', immediate: true }],
      ['globalUi', app, false, { source: 'react:settingsVisual:globalClickUi', immediate: true }],
      ['globalRt', app, false, { source: 'react:settingsVisual:globalClick', immediate: true }],
      ['closeInteractive', app],
      ['globalUi', app, true, { source: 'react:settingsVisual:globalClickUi', immediate: true }],
      ['globalRt', app, true, { source: 'react:settingsVisual:globalClick', immediate: true }],
      ['darkMode', app, true, { source: 'react:settingsVisual:darkMode', immediate: true }],
      ['globalRt', app, true, { source: 'react:settingsVisual:globalClickSync', immediate: true }],
    ])
  );
});

test('[settings-visual-display-controller] swallowed action errors degrade safely', () => {
  const mod = loadSettingsVisualDisplayControllerModule();
  const calls = [];
  const controller = mod.createSettingsVisualDisplayController({
    app: { id: 'app' },
    meta: { uiOnlyImmediate: source => ({ source, immediate: true }) },
    syncGlobalClickModeFn: () => {
      throw new Error('boom');
    },
    closeInteractiveStateOnGlobalOffFn: () => calls.push('closed'),
  });

  assert.doesNotThrow(() => controller.syncGlobalClickState(false, true));
  assert.doesNotThrow(() => controller.onToggleGlobalClick(false));
  assert.equal(JSON.stringify(calls), JSON.stringify(['closed']));
});
