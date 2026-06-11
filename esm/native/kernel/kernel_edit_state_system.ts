import type { AppContainer, UnknownRecord } from '../../../types';

import { getMode, getRuntime } from './store_access.js';
import { resetAllEditModesViaService } from '../runtime/edit_state_access.js';
import { setModePrimary } from '../runtime/mode_write_access.js';
import { asRecord, isRecord } from './kernel_shared.js';

export interface KernelEditStateSnapshot {
  primary: string;
  opts: UnknownRecord;
}

export interface KernelEditStateSystem {
  captureEditState: () => KernelEditStateSnapshot;
  applyEditState: (edit: unknown) => void;
}

export interface CreateKernelEditStateSystemArgs {
  App: AppContainer;
  reportNonFatal: (op: string, error: unknown, opts?: { throttleMs?: number; failFast?: boolean }) => void;
}

export function createKernelEditStateSystem(args: CreateKernelEditStateSystemArgs): KernelEditStateSystem {
  const captureEditState = (): KernelEditStateSnapshot => {
    try {
      const mode = asRecord(getMode(args.App), {});
      const rt = asRecord(getRuntime(args.App), {});

      const primary = mode && mode.primary != null ? String(mode.primary) : 'none';
      const optsBase: UnknownRecord = isRecord(mode.opts) ? mode.opts : {};
      const opts: UnknownRecord = { ...optsBase };

      if (primary === 'handle' && rt && typeof rt.handlesType !== 'undefined') {
        opts.handleType = rt.handlesType;
      }
      if (primary === 'paint' && rt && typeof rt.paintColor !== 'undefined') {
        opts.paintColor = rt.paintColor;
      }

      return { primary, opts };
    } catch (_e) {
      args.reportNonFatal('captureEditState.outer', _e, { throttleMs: 8000 });
      return { primary: 'none', opts: {} };
    }
  };

  const applyEditState = (edit: unknown): void => {
    try {
      if (!edit) return;

      const e = asRecord(edit, {});
      const primaryRaw = e.primary ?? e.primaryMode ?? e.mode ?? 'none';
      const primary =
        typeof primaryRaw === 'string' || typeof primaryRaw === 'number' || typeof primaryRaw === 'boolean'
          ? String(primaryRaw)
          : 'none';

      const optsRaw = isRecord(e.opts) ? e.opts : isRecord(e.options) ? e.options : {};
      const opts = asRecord(optsRaw, {});

      try {
        resetAllEditModesViaService(args.App);
      } catch (_eResetModes) {
        args.reportNonFatal('applyEditState.resetAllEditModes', _eResetModes, { throttleMs: 8000 });
      }

      try {
        setModePrimary(args.App, primary, opts, { source: 'applyEditState' });
      } catch (_eStoreSetMode) {
        args.reportNonFatal('applyEditState.storeSetMode', _eStoreSetMode, { throttleMs: 6000 });
      }
    } catch (_e) {
      args.reportNonFatal('applyEditState.outer', _e, { throttleMs: 6000 });
    }
  };

  return { captureEditState, applyEditState };
}
