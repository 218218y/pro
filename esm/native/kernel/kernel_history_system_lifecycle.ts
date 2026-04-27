import type { HistoryPushRequestLike } from '../../../types';

import type {
  CreateKernelHistorySystemArgs,
  KernelHistorySystem,
} from './kernel_history_system_contracts.js';
import { normalizeUndoSnapshot, preserveUiOnlySnapshotFields } from './kernel_history_system_shared.js';

export function installKernelHistoryLifecycle(
  historySystem: KernelHistorySystem,
  args: CreateKernelHistorySystemArgs
): void {
  const scheduleTimeout = (handler: () => void, timeoutMs: number) => {
    try {
      return args.getTimers().setTimeout(handler, timeoutMs);
    } catch {
      return setTimeout(handler, timeoutMs);
    }
  };

  historySystem.pause = () => {
    historySystem.isPaused = true;
  };

  historySystem.resume = () => {
    historySystem.isPaused = false;
  };

  historySystem.flushPendingPush = (opts?: HistoryPushRequestLike) => {
    if (args.flushPendingPushViaAccess(opts)) return;
    historySystem.pushState(opts);
  };

  historySystem.schedulePush = meta => {
    args.schedulePushViaAccess(meta);
  };

  historySystem.resumeAfterRestore = timeoutMs => {
    const start = Date.now();
    const maxWait = typeof timeoutMs === 'number' && timeoutMs > 0 ? timeoutMs : 5000;
    const token =
      (typeof historySystem.__resumeAfterRestoreToken === 'number'
        ? historySystem.__resumeAfterRestoreToken
        : 0) + 1;
    historySystem.__resumeAfterRestoreToken = token;

    const tick = () => {
      if (historySystem.__resumeAfterRestoreToken !== token) return;
      const done = !args.isRestoring() || Date.now() - start > maxWait;
      if (done) {
        if (historySystem.__resumeAfterRestoreToken === token) {
          historySystem.__resumeAfterRestoreToken = 0;
        }
        historySystem.resume();
        historySystem.updateButtons();
        return;
      }

      scheduleTimeout(tick, 80);
    };

    tick();
  };

  historySystem.getCurrentSnapshot = () => {
    const rec = args.asRecord(args.getProjectUndoSnapshot(), {});
    return normalizeUndoSnapshot(rec, args.isRecord);
  };

  historySystem.pushState = (opts?: HistoryPushRequestLike) => {
    if (args.isRestoring()) return;
    if (historySystem.isPaused) return;

    const currentJson = historySystem.getCurrentSnapshot();
    if (currentJson === historySystem.lastSavedJSON) return;

    const o = args.isRecord(opts) ? opts : null;
    const coalesceKey = o && typeof o.coalesceKey === 'string' ? String(o.coalesceKey || '') : '';
    const coalesceMsRaw = o ? o.coalesceMs : undefined;
    const coalesceMsParsed =
      typeof coalesceMsRaw === 'number' ? coalesceMsRaw : parseInt(String(coalesceMsRaw || ''), 10);
    const coalesceMs = Number.isFinite(coalesceMsParsed) && coalesceMsParsed > 0 ? coalesceMsParsed : 1200;
    const now = Date.now();

    const lastKey = typeof historySystem._lastCoalesceKey === 'string' ? historySystem._lastCoalesceKey : '';
    const lastAt = typeof historySystem._lastCoalesceAt === 'number' ? historySystem._lastCoalesceAt : 0;
    const canCoalesce = !!coalesceKey && coalesceKey === lastKey && now - lastAt < coalesceMs;

    if (historySystem.lastSavedJSON && !canCoalesce) {
      historySystem.undoStack.push(historySystem.lastSavedJSON);
      if (historySystem.undoStack.length > historySystem.maxSteps) historySystem.undoStack.shift();
    }

    historySystem.lastSavedJSON = currentJson;
    historySystem._lastCoalesceKey = coalesceKey || '';
    historySystem._lastCoalesceAt = coalesceKey ? now : 0;

    const keepRedo = !!(o && o.keepRedo === true);
    if (!keepRedo) historySystem.redoStack = [];

    historySystem.updateButtons();
  };

  historySystem.undo = () => {
    if (historySystem.isPaused || args.isRestoring()) return;
    historySystem.flushPendingPush({ keepRedo: true });
    if (historySystem.undoStack.length === 0) {
      historySystem.isPaused = false;
      historySystem.updateButtons();
      return;
    }

    historySystem.pause();
    try {
      const cur = historySystem.getCurrentSnapshot();
      historySystem.redoStack.push(cur);

      let prevStateJSON = historySystem.undoStack.pop();
      while (prevStateJSON && prevStateJSON === cur && historySystem.undoStack.length) {
        prevStateJSON = historySystem.undoStack.pop();
      }

      if (!prevStateJSON || prevStateJSON === cur) {
        historySystem.redoStack.pop();
        historySystem.lastSavedJSON = cur;
        historySystem.resume();
        historySystem.updateButtons();
        return;
      }

      historySystem.lastSavedJSON = prevStateJSON;
      historySystem.applyState(prevStateJSON);
      historySystem.updateButtons();
    } catch {
      historySystem.resume();
      historySystem.updateButtons();
    }
  };

  historySystem.redo = () => {
    if (historySystem.isPaused || args.isRestoring()) return;
    historySystem.flushPendingPush({ noPush: true });
    if (historySystem.redoStack.length === 0) {
      historySystem.isPaused = false;
      historySystem.updateButtons();
      return;
    }

    historySystem.pause();
    try {
      const cur = historySystem.getCurrentSnapshot();
      historySystem.undoStack.push(cur);

      let nextStateJSON = historySystem.redoStack.pop();
      while (nextStateJSON && nextStateJSON === cur && historySystem.redoStack.length) {
        nextStateJSON = historySystem.redoStack.pop();
      }

      if (!nextStateJSON || nextStateJSON === cur) {
        historySystem.undoStack.pop();
        historySystem.lastSavedJSON = cur;
        historySystem.resume();
        historySystem.updateButtons();
        return;
      }

      historySystem.lastSavedJSON = nextStateJSON;
      historySystem.applyState(nextStateJSON);
      historySystem.updateButtons();
    } catch {
      historySystem.resume();
      historySystem.updateButtons();
    }
  };

  historySystem.applyState = jsonState => {
    try {
      if (typeof jsonState !== 'string') return;
      const data = JSON.parse(jsonState);
      const rec = args.asRecord(data, {});
      preserveUiOnlySnapshotFields(rec, args.getCurrentUiSnapshot(), args.captureSavedNotes);
      args.loadProjectSnapshot(rec);
    } catch (error) {
      args.reportNonFatal('kernelHistorySystem.applyState', error, { throttleMs: 4000 });
    } finally {
      historySystem.resumeAfterRestore();
    }
  };

  historySystem.resetBaseline = meta => {
    const m = args.asRecord(meta, {});
    historySystem.undoStack = [];
    historySystem.redoStack = [];
    historySystem.lastSavedJSON = historySystem.getCurrentSnapshot();
    historySystem._lastCoalesceKey = '';
    historySystem._lastCoalesceAt = 0;
    historySystem.isPaused = false;
    historySystem.updateButtons(m);
  };

  historySystem.ensureBaseline = () => {
    if (!historySystem.lastSavedJSON) historySystem.lastSavedJSON = historySystem.getCurrentSnapshot();
    historySystem.updateButtons();
  };

  historySystem.init = () => {
    if (historySystem.__didInit) return;
    historySystem.__didInit = true;

    const tryEnsure = () => {
      try {
        if (args.isRestoring()) {
          scheduleTimeout(tryEnsure, 120);
          return;
        }
        historySystem.ensureBaseline();
      } catch (error) {
        args.reportNonFatal('kernelHistorySystem.init', error, { throttleMs: 4000 });
      }
    };

    tryEnsure();
  };
}
