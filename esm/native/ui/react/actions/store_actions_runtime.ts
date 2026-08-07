import type { ActionMetaLike, AppContainer, ModulesRecomputeFromUiOptionsLike } from '../../../../../types';

import {
  setRuntimeGlobalClickMode as setRuntimeGlobalClickModeApi,
  setRuntimeSketchMode as setRuntimeSketchModeApi,
} from '../../../services/api.js';
import { runAppStructuralModulesRecompute } from '../../../services/api.js';
import { reportUiNonFatal, reportUiRejected } from '../../feedback_shared.js';

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
    const result = runAppStructuralModulesRecompute(
      app,
      uiArg,
      meta,
      { source: 'react:recomputeFromUi' },
      opts,
      {}
    );
    if (result === false) {
      reportUiRejected(
        app,
        'storeActions.recomputeFromUi',
        'Structural module recompute was rejected.',
        'native/ui/react/actions'
      );
    }
  } catch (error) {
    reportUiNonFatal(app, 'storeActions.recomputeFromUi', error, { where: 'native/ui/react/actions' });
  }
}

export { recomputeFromUi, setRuntimeGlobalClickMode, setRuntimeSketchMode };
