import type { UnknownRecord } from '../../../types';

import { installKernelHistoryLifecycle } from './kernel_history_system_lifecycle.js';
import { installKernelHistoryStatusSurface } from './kernel_history_system_status.js';
import {
  createKernelHistorySystemShell,
  readHistoryListenerSetSafe,
} from './kernel_history_system_shared.js';

export type {
  CreateKernelHistorySystemArgs,
  KernelHistoryStatus,
  KernelHistoryStatusListener,
  KernelHistorySystem,
} from './kernel_history_system_contracts.js';
import type {
  CreateKernelHistorySystemArgs,
  KernelHistorySystem,
} from './kernel_history_system_contracts.js';

function isRecord(value: unknown): value is UnknownRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function isKernelHistorySystem(value: unknown): value is KernelHistorySystem {
  const rec = isRecord(value) ? value : null;
  return (
    !!rec &&
    Array.isArray(rec.undoStack) &&
    Array.isArray(rec.redoStack) &&
    typeof rec.pause === 'function' &&
    typeof rec.resume === 'function' &&
    typeof rec.undo === 'function' &&
    typeof rec.redo === 'function'
  );
}

export function createKernelHistorySystem(args: CreateKernelHistorySystemArgs): KernelHistorySystem {
  const historySystem = isKernelHistorySystem(args.existing)
    ? args.existing
    : createKernelHistorySystemShell(args.existing);

  historySystem.undoStack = Array.isArray(historySystem.undoStack)
    ? historySystem.undoStack.filter((item): item is string => typeof item === 'string')
    : [];
  historySystem.redoStack = Array.isArray(historySystem.redoStack)
    ? historySystem.redoStack.filter((item): item is string => typeof item === 'string')
    : [];
  historySystem.maxSteps =
    typeof historySystem.maxSteps === 'number' && historySystem.maxSteps > 0 ? historySystem.maxSteps : 30;
  historySystem.lastSavedJSON =
    typeof historySystem.lastSavedJSON === 'string' || historySystem.lastSavedJSON === null
      ? historySystem.lastSavedJSON
      : null;
  historySystem.isPaused = historySystem.isPaused === true;
  historySystem._lastCoalesceKey =
    typeof historySystem._lastCoalesceKey === 'string' ? historySystem._lastCoalesceKey : '';
  historySystem._lastCoalesceAt =
    typeof historySystem._lastCoalesceAt === 'number' ? historySystem._lastCoalesceAt : 0;
  historySystem.__didInit = historySystem.__didInit === true;
  historySystem._statusListeners = readHistoryListenerSetSafe(historySystem._statusListeners);

  installKernelHistoryLifecycle(historySystem, args);
  installKernelHistoryStatusSurface(historySystem, args);

  return historySystem;
}
