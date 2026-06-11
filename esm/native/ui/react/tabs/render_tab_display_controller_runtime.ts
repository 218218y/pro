import type { AppContainer, MetaActionsNamespaceLike } from '../../../../../types';

import { toggleSketchMode } from '../actions/sketch_actions.js';
import {
  setCfgShowDimensions,
  setUiGlobalClickUi,
  setUiShowContents,
  setUiShowHanger,
} from '../actions/store_actions.js';
import { closeInteractiveStateOnGlobalOff, syncGlobalClickMode } from './render_tab_shared_interactions.js';
import { runPerfAction } from '../../../services/api.js';

export type RenderTabDisplayController = {
  syncGlobalClickState: (globalClickRt: boolean, globalClickUi: boolean) => void;
  onToggleShowDimensions: (checked: boolean) => void;
  onToggleShowContents: (checked: boolean) => void;
  onToggleShowHanger: (checked: boolean) => void;
  onToggleSketchMode: (checked: boolean) => void;
  onToggleGlobalClick: (checked: boolean) => void;
};

type RenderTabDisplayControllerArgs = {
  app: AppContainer;
  meta: MetaActionsNamespaceLike;
  sketchMode: boolean;
  toggleSketchModeFn?: typeof toggleSketchMode;
  setCfgShowDimensionsFn?: typeof setCfgShowDimensions;
  setUiShowContentsFn?: typeof setUiShowContents;
  setUiShowHangerFn?: typeof setUiShowHanger;
  setUiGlobalClickUiFn?: typeof setUiGlobalClickUi;
  syncGlobalClickModeFn?: typeof syncGlobalClickMode;
  closeInteractiveStateOnGlobalOffFn?: typeof closeInteractiveStateOnGlobalOff;
};

export function createRenderTabDisplayController(
  args: RenderTabDisplayControllerArgs
): RenderTabDisplayController {
  const {
    app,
    meta,
    sketchMode,
    toggleSketchModeFn = toggleSketchMode,
    setCfgShowDimensionsFn = setCfgShowDimensions,
    setUiShowContentsFn = setUiShowContents,
    setUiShowHangerFn = setUiShowHanger,
    setUiGlobalClickUiFn = setUiGlobalClickUi,
    syncGlobalClickModeFn = syncGlobalClickMode,
    closeInteractiveStateOnGlobalOffFn = closeInteractiveStateOnGlobalOff,
  } = args;

  const onToggleShowDimensions = (checked: boolean): void => {
    runPerfAction(
      app,
      'render.showDimensions.toggle',
      () =>
        setCfgShowDimensionsFn(app, !!checked, { source: 'react:renderTab:showDimensions', immediate: true }),
      { detail: { checked: !!checked } }
    );
  };

  const onToggleShowContents = (checked: boolean): void => {
    runPerfAction(
      app,
      'render.showContents.toggle',
      () => setUiShowContentsFn(app, !!checked, { source: 'react:renderTab:showContents', immediate: true }),
      { detail: { checked: !!checked } }
    );
  };

  const onToggleShowHanger = (checked: boolean): void => {
    runPerfAction(
      app,
      'render.showHanger.toggle',
      () => setUiShowHangerFn(app, !!checked, { source: 'react:renderTab:showHanger', immediate: true }),
      { detail: { checked: !!checked } }
    );
  };

  const onToggleSketchMode = (checked: boolean): void => {
    if (!!checked === !!sketchMode) return;
    try {
      runPerfAction(
        app,
        'render.sketchMode.toggle',
        () => toggleSketchModeFn(app, { source: 'react:renderTab:sketchMode' }),
        {
          detail: { checked: !!checked },
        }
      );
    } catch {
      // ignore
    }
  };

  const onToggleGlobalClick = (checked: boolean): void => {
    const next = !!checked;
    runPerfAction(
      app,
      'render.globalClick.toggle',
      () => {
        setUiGlobalClickUiFn(app, next, meta.uiOnlyImmediate('react:renderTab:globalClickUi'));
        try {
          syncGlobalClickModeFn(app, next, meta.uiOnlyImmediate('react:renderTab:globalClick'));
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

  const syncGlobalClickState = (globalClickRt: boolean, globalClickUi: boolean): void => {
    try {
      if (!!globalClickRt === !!globalClickUi) return;
      syncGlobalClickModeFn(app, !!globalClickUi, meta.uiOnlyImmediate('react:renderTab:globalClickSync'));
    } catch {
      // ignore
    }
  };

  return {
    syncGlobalClickState,
    onToggleShowDimensions,
    onToggleShowContents,
    onToggleShowHanger,
    onToggleSketchMode,
    onToggleGlobalClick,
  };
}
