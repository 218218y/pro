import type {
  UiModesControllerLike,
  UiModesRuntimeServiceLike,
  UiPrimaryModeEffectsStoreLike,
  UnknownRecord,
} from '../../../types';

import { asRecord } from './record.js';
import { ensureServiceSlot, getServiceSlotMaybe } from './services_root_access.js';

function asUiModesController(value: unknown): UiModesControllerLike | null {
  return asRecord<UiModesControllerLike>(value);
}

function isPrimaryModeEffectsStore(value: unknown): value is UiPrimaryModeEffectsStoreLike {
  const rec = asRecord<UnknownRecord>(value);
  const unsubRec = asRecord<UnknownRecord>(rec?.unsub);
  return (
    !!rec &&
    (rec.apply == null || typeof rec.apply === 'function') &&
    (rec.unsub == null || typeof rec.unsub === 'function' || typeof unsubRec?.unsubscribe === 'function') &&
    (rec.render == null || typeof rec.render === 'function')
  );
}

function asPrimaryModeEffectsStore(value: unknown): UiPrimaryModeEffectsStoreLike | null {
  return isPrimaryModeEffectsStore(value) ? value : null;
}

export function getUiModesRuntimeServiceMaybe(App: unknown): UiModesRuntimeServiceLike | null {
  return getServiceSlotMaybe<UiModesRuntimeServiceLike>(App, 'uiModesRuntime');
}

export function ensureUiModesRuntimeService(App: unknown): UiModesRuntimeServiceLike {
  return ensureServiceSlot<UiModesRuntimeServiceLike>(App, 'uiModesRuntime');
}

export function getModesControllerMaybe(App: unknown): UiModesControllerLike | null {
  return asUiModesController(getUiModesRuntimeServiceMaybe(App)?.controller);
}

export function setModesController(
  App: unknown,
  controller: UiModesControllerLike | null
): UiModesControllerLike | null {
  const runtime = ensureUiModesRuntimeService(App);
  const previous = asUiModesController(runtime.controller);
  runtime.controller = controller || null;
  return previous || null;
}

export function getPrimaryModeEffectsMaybe(App: unknown): UiPrimaryModeEffectsStoreLike | null {
  return asPrimaryModeEffectsStore(getUiModesRuntimeServiceMaybe(App)?.primaryModeEffects);
}

export function setPrimaryModeEffects(
  App: unknown,
  effects: UiPrimaryModeEffectsStoreLike | null
): UiPrimaryModeEffectsStoreLike | null {
  const runtime = ensureUiModesRuntimeService(App);
  const previous = asPrimaryModeEffectsStore(runtime.primaryModeEffects);
  runtime.primaryModeEffects = effects || null;
  return previous || null;
}
