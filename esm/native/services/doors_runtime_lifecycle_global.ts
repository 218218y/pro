import type { ActionMetaLike, UnknownRecord } from '../../../types';

import { getDoorsArray } from '../runtime/render_access.js';
import { patchRuntime } from '../runtime/runtime_write_access.js';
import { readConfigLooseScalarFromApp } from '../runtime/config_selectors.js';
import { syncVisualsNow } from './doors_runtime_visuals.js';
import {
  type AppLike,
  type SetDoorsOptions,
  doorsRuntimeNow,
  ensureDoorsRuntimeDefaults,
  getActionsNamespace,
  getDoorsOpen,
  hasOpenInternalDrawers,
  reportDoorsRuntimeNonFatal,
  setDoorStatusCss,
  touchDoorsRuntimeRender,
  wardrobeType,
} from './doors_runtime_shared.js';

export function setDoorsOpen(App: AppLike, open: boolean, opts?: SetDoorsOptions): void {
  if (!App || typeof App !== 'object') return;
  const runtime = ensureDoorsRuntimeDefaults(App);

  const next = !!open;
  const safeOpts = opts && typeof opts === 'object' ? opts : {};
  const touch = !!safeOpts.touch;
  const forceUpdate = !!safeOpts.forceUpdate;

  const current = getDoorsOpen(App);
  if (current === next && !forceUpdate) {
    try {
      runtime.closeDelayUntil = 0;
    } catch (_) {
      reportDoorsRuntimeNonFatal(App, 'L230', _);
    }
    touchDoorsRuntimeRender(App);
    return;
  }

  const delayMs = Number(readConfigLooseScalarFromApp(App, 'DOOR_DELAY_MS', 600)) || 600;
  const shouldDelayCloseForInternalDrawers = hasOpenInternalDrawers(App);

  if (!next) {
    if (
      current &&
      touch &&
      shouldDelayCloseForInternalDrawers &&
      !(safeOpts.hardCloseDoors === true || safeOpts.hardClose === true)
    ) {
      runtime.closeDelayUntil = doorsRuntimeNow() + delayMs;
    } else {
      runtime.closeDelayUntil = 0;
    }
  } else {
    runtime.closeDelayUntil = 0;
  }

  runtime.open = next;
  if (touch) runtime.lastToggleTime = doorsRuntimeNow();

  if (!next) {
    try {
      getDoorsArray(App).forEach(entry => {
        if (entry && entry.noGlobalOpen) entry.isOpen = false;
      });
    } catch (_) {
      reportDoorsRuntimeNonFatal(App, 'L265', _);
    }
  }

  const actions = getActionsNamespace(App);
  const metaNs = actions && actions.meta ? actions.meta : null;
  const metaRt: ActionMetaLike =
    metaNs && typeof metaNs.transient === 'function'
      ? metaNs.transient(undefined, 'doors')
      : { source: 'doors' };

  try {
    const runtimeNs = actions && actions.runtime ? actions.runtime : null;

    if (runtimeNs && typeof runtimeNs.setDoorsOpen === 'function') {
      if (touch) runtimeNs.setDoorsOpen(next, { touch: true, ts: runtime.lastToggleTime }, metaRt);
      else runtimeNs.setDoorsOpen(next, metaRt);
    } else if (runtimeNs && typeof runtimeNs.patch === 'function') {
      const patch: UnknownRecord = { doorsOpen: next };
      if (touch) patch.doorsLastToggleTime = runtime.lastToggleTime;
      runtimeNs.patch(patch, metaRt);
    } else {
      const patch: UnknownRecord = { doorsOpen: next };
      if (touch) patch.doorsLastToggleTime = runtime.lastToggleTime;
      patchRuntime(App, patch, metaRt);
    }
  } catch (_) {
    reportDoorsRuntimeNonFatal(App, 'L302', _);
  }

  try {
    if (wardrobeType(App) === 'sliding') {
      getDoorsArray(App).forEach(entry => {
        if (entry && entry.type === 'sliding') entry.isOpen = next;
      });
    }
  } catch (_) {
    reportDoorsRuntimeNonFatal(App, 'L312', _);
  }

  setDoorStatusCss(App, next);
  touchDoorsRuntimeRender(App);

  if (forceUpdate) {
    try {
      syncVisualsNow(App, { open: next });
    } catch (_) {
      reportDoorsRuntimeNonFatal(App, 'setDoorsOpen.syncVisualsNow', _);
    }
  }
}

export function toggleDoors(App: AppLike, opts?: SetDoorsOptions): void {
  const next = !getDoorsOpen(App);
  const safeOpts = opts && typeof opts === 'object' ? opts : {};
  setDoorsOpen(App, next, Object.assign({ touch: true }, safeOpts));
}
