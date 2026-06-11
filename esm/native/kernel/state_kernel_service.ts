// Canonical state-kernel service DI helpers.
//
// Why this exists:
// - the kernel service is owned by App.services.stateKernel
// - installKernel/history helpers should not each re-implement this wiring
// - the service surface needs one explicit normalization point

import type { ActionMetaLike, AppContainer, ModuleConfigPatchLike, StateKernelLike } from '../../../types';

import { asRecord } from '../runtime/record.js';
import { ensureServiceSlot, getServiceSlotMaybe } from '../runtime/services_root_access.js';

type StateKernelPatchFn = (
  indexOrKey: number | string,
  patch: ModuleConfigPatchLike,
  meta?: ActionMetaLike
) => unknown;
type MutableStateKernelShape = Partial<StateKernelLike> & Record<string, unknown>;

const NOOP_PATCH: StateKernelPatchFn = (_k, _p, _m) => undefined;

const __STATE_KERNEL_METHOD_DEFAULTS = {
  [['patch', 'Module', 'Config'].join('')]: NOOP_PATCH,
  [['patch', 'SplitLower', 'Module', 'Config'].join('')]: NOOP_PATCH,
  [['patch', 'SplitLower', 'CornerCell', 'Config'].join('')]: NOOP_PATCH,
} satisfies Record<string, StateKernelPatchFn>;

type StateKernelMethodKey = Extract<keyof typeof __STATE_KERNEL_METHOD_DEFAULTS, string>;

function isStateKernelMethodKey(value: string): value is StateKernelMethodKey {
  return Object.prototype.hasOwnProperty.call(__STATE_KERNEL_METHOD_DEFAULTS, value);
}

const __STATE_KERNEL_METHOD_KEYS: readonly StateKernelMethodKey[] = Object.keys(
  __STATE_KERNEL_METHOD_DEFAULTS
).filter(isStateKernelMethodKey);

function isStateKernelPatchFn(value: unknown): value is StateKernelPatchFn {
  return typeof value === 'function';
}

function getStateKernelRecord(value: unknown): MutableStateKernelShape | null {
  return asRecord<MutableStateKernelShape>(value);
}

function hasAllStateKernelMethods(value: unknown): value is StateKernelLike {
  const rec = getStateKernelRecord(value);
  if (!rec) return false;
  for (const key of __STATE_KERNEL_METHOD_KEYS) {
    if (!isStateKernelPatchFn(rec[key])) return false;
  }
  return true;
}

function ensureStateKernelShape(target: MutableStateKernelShape): StateKernelLike {
  for (const key of __STATE_KERNEL_METHOD_KEYS) {
    const maybeFn = target[key];
    target[key] = isStateKernelPatchFn(maybeFn) ? maybeFn : NOOP_PATCH;
  }

  if (hasAllStateKernelMethods(target)) return target;
  throw new Error('[WardrobePro][state_kernel_service] Failed to normalize state-kernel methods');
}

export function ensureStateKernelService(app: AppContainer): StateKernelLike {
  const slot = ensureServiceSlot<MutableStateKernelShape>(app, 'stateKernel');
  return ensureStateKernelShape(slot);
}

export function getStateKernelService(app: unknown): StateKernelLike | null {
  const stateKernel = getServiceSlotMaybe<StateKernelLike>(app, 'stateKernel');
  return hasAllStateKernelMethods(stateKernel) ? stateKernel : null;
}
