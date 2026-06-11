import type { ActionMetaLike } from '../../../types';

import type {
  CreateKernelHistorySystemArgs,
  KernelHistoryStatus,
  KernelHistoryStatusListener,
  KernelHistorySystem,
} from './kernel_history_system_contracts.js';

export function installKernelHistoryStatusSurface(
  historySystem: KernelHistorySystem,
  args: CreateKernelHistorySystemArgs
): void {
  historySystem.getStatus = (): KernelHistoryStatus => {
    return {
      canUndo: historySystem.undoStack.length > 0,
      canRedo: historySystem.redoStack.length > 0,
      undoCount: historySystem.undoStack.length | 0,
      redoCount: historySystem.redoStack.length | 0,
      isPaused: !!historySystem.isPaused,
    };
  };

  historySystem.subscribeStatus = (listener: KernelHistoryStatusListener) => {
    historySystem._statusListeners.add(listener);
    return () => {
      historySystem._statusListeners.delete(listener);
    };
  };

  historySystem.updateButtons = (meta?: ActionMetaLike) => {
    const m: ActionMetaLike = args.asRecord(meta, {});
    const status = historySystem.getStatus();
    try {
      if (typeof historySystem.onStatusChange === 'function') {
        historySystem.onStatusChange(status, m);
      }
    } catch (error) {
      args.reportNonFatal('kernelHistorySystem.updateButtons', error, { throttleMs: 4000 });
    }

    for (const listener of historySystem._statusListeners) {
      try {
        listener(status, m);
      } catch (error) {
        args.reportNonFatal('kernelHistorySystem.updateButtons.listener', error, { throttleMs: 4000 });
      }
    }
  };
}
