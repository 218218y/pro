// Canonical state-kernel service DI helpers.
//
// Why this exists:
// - the kernel service is owned by App.services.stateKernel
// - installKernel/history helpers should not each re-implement this wiring
// - the service surface needs one explicit normalization point

import type { AppContainer, StateKernelLike } from '../../../types';

import { asRecord } from '../runtime/record.js';
import { ensureServiceSlot, getServiceSlotMaybe } from '../runtime/services_root_access.js';

type MutableStateKernelShape = Partial<StateKernelLike> & Record<string, unknown>;

function getStateKernelRecord(value: unknown): MutableStateKernelShape | null {
  return asRecord<MutableStateKernelShape>(value);
}

export function ensureStateKernelService(app: AppContainer): StateKernelLike {
  return ensureServiceSlot<MutableStateKernelShape>(app, 'stateKernel');
}

export function getStateKernelService(app: unknown): StateKernelLike | null {
  return getStateKernelRecord(getServiceSlotMaybe<StateKernelLike>(app, 'stateKernel'));
}
