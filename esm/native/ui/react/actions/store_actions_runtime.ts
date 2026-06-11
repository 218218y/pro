import type { ActionMetaLike, AppContainer, ModulesRecomputeFromUiOptionsLike } from '../../../../../types';

import {
  setRuntimeGlobalClickMode as setRuntimeGlobalClickModeApi,
  setRuntimeSketchMode as setRuntimeSketchModeApi,
} from '../../../services/api.js';
import { runAppStructuralModulesRecompute } from '../../../services/api.js';

function setRuntimeGlobalClickMode(app: AppContainer, on: unknown, meta?: ActionMetaLike): void {
  void setRuntimeGlobalClickModeApi(app, !!on, meta);
}

function setRuntimeSketchMode(app: AppContainer, on: unknown, meta?: ActionMetaLike): void {
  void setRuntimeSketchModeApi(app, !!on, meta);
}

function recomputeFromUi(
  app: AppContainer,
  uiArg?: unknown,
  meta?: ActionMetaLike,
  opts?: ModulesRecomputeFromUiOptionsLike
): void {
  try {
    void runAppStructuralModulesRecompute(app, uiArg, meta, { source: 'react:recomputeFromUi' }, opts, {});
  } catch {
    // ignore
  }
}

export { recomputeFromUi, setRuntimeGlobalClickMode, setRuntimeSketchMode };
