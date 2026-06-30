import type { AppContainer, MetaActionsNamespaceLike } from '../../../../../types';

import {
  setCfgMirrorReflectorEnabled,
  setCfgShowDimensions,
  setUiDarkMode,
  setUiGlobalClickUi,
  setUiShowHanger,
} from '../actions/store_actions.js';
import {
  closeInteractiveStateOnGlobalOff,
  syncGlobalClickMode,
} from './settings_visual_shared_interactions.js';
import { runPerfAction } from '../../../services/api.js';

export type SettingsVisualDisplayController = {
  syncGlobalClickState: (globalClickRt: boolean, globalClickUi: boolean) => void;
  onToggleShowDimensions: (checked: boolean) => void;
  onToggleMirrorReflector: (checked: boolean) => void;
  onToggleShowHanger: (checked: boolean) => void;
  onToggleGlobalClick: (checked: boolean) => void;
  onToggleDarkMode: (checked: boolean) => void;
};

type SettingsVisualDisplayControllerArgs = {
  app: AppContainer;
  meta: MetaActionsNamespaceLike;
  setCfgShowDimensionsFn?: typeof setCfgShowDimensions;
  setCfgMirrorReflectorEnabledFn?: typeof setCfgMirrorReflectorEnabled;
  setUiDarkModeFn?: typeof setUiDarkMode;
  setUiShowHangerFn?: typeof setUiShowHanger;
  setUiGlobalClickUiFn?: typeof setUiGlobalClickUi;
  syncGlobalClickModeFn?: typeof syncGlobalClickMode;
  closeInteractiveStateOnGlobalOffFn?: typeof closeInteractiveStateOnGlobalOff;
};

export function createSettingsVisualDisplayController(
  args: SettingsVisualDisplayControllerArgs
): SettingsVisualDisplayController {
  const {
    app,
    meta,
    setCfgShowDimensionsFn = setCfgShowDimensions,
    setCfgMirrorReflectorEnabledFn = setCfgMirrorReflectorEnabled,
    setUiDarkModeFn = setUiDarkMode,
    setUiShowHangerFn = setUiShowHanger,
    setUiGlobalClickUiFn = setUiGlobalClickUi,
    syncGlobalClickModeFn = syncGlobalClickMode,
    closeInteractiveStateOnGlobalOffFn = closeInteractiveStateOnGlobalOff,
  } = args;

  const onToggleShowDimensions = (checked: boolean): void => {
    runPerfAction(
      app,
      'settingsVisual.showDimensions.toggle',
      () =>
        setCfgShowDimensionsFn(app, !!checked, {
          source: 'react:settingsVisual:showDimensions',
          immediate: true,
        }),
      { detail: { checked: !!checked } }
    );
  };

  const onToggleMirrorReflector = (checked: boolean): void => {
    const next = !!checked;
    runPerfAction(
      app,
      'settingsVisual.mirrorReflector.toggle',
      () =>
        setCfgMirrorReflectorEnabledFn(app, next, {
          source: 'react:settingsVisual:mirrorReflector',
          immediate: true,
        }),
      { detail: { checked: next } }
    );
  };

  const onToggleShowHanger = (checked: boolean): void => {
    runPerfAction(
      app,
      'settingsVisual.showHanger.toggle',
      () => setUiShowHangerFn(app, !!checked, { source: 'react:settingsVisual:showHanger', immediate: true }),
      { detail: { checked: !!checked } }
    );
  };

  const onToggleGlobalClick = (checked: boolean): void => {
    const next = !!checked;
    runPerfAction(
      app,
      'settingsVisual.globalClick.toggle',
      () => {
        setUiGlobalClickUiFn(app, next, meta.uiOnlyImmediate('react:settingsVisual:globalClickUi'));
        try {
          syncGlobalClickModeFn(app, next, meta.uiOnlyImmediate('react:settingsVisual:globalClick'));
        } catch {
          // ignore
        }
        if (!next) closeInteractiveStateOnGlobalOffFn(app);
      },
      {
        detail: { checked: next },
      }
    );
  };

  const onToggleDarkMode = (checked: boolean): void => {
    const next = !!checked;
    runPerfAction(
      app,
      'settingsVisual.darkMode.toggle',
      () => setUiDarkModeFn(app, next, meta.uiOnlyImmediate('react:settingsVisual:darkMode')),
      {
        detail: { checked: next },
      }
    );
  };

  const syncGlobalClickState = (globalClickRt: boolean, globalClickUi: boolean): void => {
    try {
      if (!!globalClickRt === !!globalClickUi) return;
      syncGlobalClickModeFn(
        app,
        !!globalClickUi,
        meta.uiOnlyImmediate('react:settingsVisual:globalClickSync')
      );
    } catch {
      // ignore
    }
  };

  return {
    syncGlobalClickState,
    onToggleShowDimensions,
    onToggleMirrorReflector,
    onToggleShowHanger,
    onToggleGlobalClick,
    onToggleDarkMode,
  };
}
