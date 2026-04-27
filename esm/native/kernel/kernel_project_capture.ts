import type { AppContainer, StateKernelLike, UnknownRecord } from '../../../types';

import { readConfigLooseScalarFromApp } from '../runtime/config_selectors.js';
import { hasEssentialUiDimsFromSnapshot } from '../runtime/ui_raw_selectors.js';
import { asRecord } from './kernel_shared.js';
import { buildKernelProjectCaptureData } from './kernel_project_capture_payload.js';

export interface CreateKernelProjectCaptureArgs {
  App: AppContainer;
  stateKernel: StateKernelLike | null | undefined;
  getUiSnapshot: () => unknown;
  captureSavedNotes: () => unknown;
  reportKernelError: (App: AppContainer, err: unknown, ctx: unknown) => boolean;
}

export function createKernelProjectCapture(
  args: CreateKernelProjectCaptureArgs
): (scope: unknown) => UnknownRecord {
  return function captureProject(scope: unknown): UnknownRecord {
    const scopeStr = typeof scope === 'string' && scope ? scope : 'persist';
    const ui = asRecord(args.getUiSnapshot(), {});

    if (!hasEssentialUiDimsFromSnapshot(ui)) {
      const err = new Error(
        '[WardrobePro] Project capture requires essential UI fields in store.ui (width/height/depth/doors). ' +
          'DOM fallback (legacy UI reader) has been removed; ensure store.ui is seeded before capture.'
      );
      args.reportKernelError(args.App, err, 'project.capture');
      throw err;
    }

    const uiRec = asRecord(ui, {});
    const rawAny = asRecord(uiRec.raw, {});

    const cfgRec: UnknownRecord =
      args.stateKernel && typeof args.stateKernel.captureConfig === 'function'
        ? asRecord(args.stateKernel.captureConfig(), {})
        : {};

    const data = buildKernelProjectCaptureData({
      uiRec,
      rawAny,
      cfgRec,
      savedNotes: args.captureSavedNotes(),
    });

    const wantEditState =
      scopeStr === 'session' && !!readConfigLooseScalarFromApp(args.App, 'PERSIST_EDIT_STATE', false);
    if (wantEditState && args.stateKernel && typeof args.stateKernel.captureEditState === 'function') {
      const settings = asRecord(data.settings, {});
      settings.editState = args.stateKernel.captureEditState();
      settings.__persistEditState = true;
    } else {
      const settings = asRecord(data.settings, {});
      if (Object.prototype.hasOwnProperty.call(settings, 'editState')) delete settings.editState;
      if (Object.prototype.hasOwnProperty.call(settings, '__persistEditState')) {
        delete settings.__persistEditState;
      }
    }

    data.__schema = 9;
    data.__savedAt = Date.now();
    data.__scope = scopeStr;
    if (scopeStr === 'undo') {
      if (Object.prototype.hasOwnProperty.call(data, '__savedAt')) delete data.__savedAt;
      if (Object.prototype.hasOwnProperty.call(data, '__scope')) delete data.__scope;
      if (Object.prototype.hasOwnProperty.call(data, 'projectName')) delete data.projectName;
      if (Object.prototype.hasOwnProperty.call(data, 'timestamp')) delete data.timestamp;
      if (Object.prototype.hasOwnProperty.call(data, 'dateString')) delete data.dateString;
      if (Object.prototype.hasOwnProperty.call(data, 'version')) delete data.version;
    }

    return data;
  };
}
