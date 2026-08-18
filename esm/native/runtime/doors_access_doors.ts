import type {
  ActionMetaLike,
  DoorsCaptureLocalOpenOptionsLike,
  DoorsCloseDrawerOptionsLike,
  DoorsReleaseEditHoldOptionsLike,
  DoorsSetOpenOptionsLike,
  DoorsSyncVisualsOptionsLike,
} from '../../../types';

import { asRecord } from './record.js';
import { reportError } from './errors.js';
import { asFiniteNumber, asKey } from './doors_access_shared.js';
import {
  getDoorEditHoldActive,
  getDoorsMethod,
  readDoorsRuntimeNumber,
  writeDoorsRuntimeNumber,
} from './doors_access_services.js';

function reportDoorsAccessNonFatal(App: unknown, op: string, error: unknown): void {
  reportError(App, error, { where: 'native/runtime/doors_access', op, fatal: false });
}

export function getDoorsOpenViaService(App: unknown): boolean | null {
  try {
    const getOpen = getDoorsMethod<() => unknown>(App, 'getOpen');
    if (getOpen) return !!getOpen();
  } catch (error) {
    reportDoorsAccessNonFatal(App, 'getOpen.ownerRejected', error);
  }
  return null;
}

export function getDoorsLastToggleTime(App: unknown): number {
  try {
    const getLastToggleTime = getDoorsMethod<() => unknown>(App, 'getLastToggleTime');
    if (getLastToggleTime) return asFiniteNumber(getLastToggleTime(), 0);
  } catch (error) {
    reportDoorsAccessNonFatal(App, 'getLastToggleTime.ownerRejected', error);
  }
  return readDoorsRuntimeNumber(App, 'lastToggleTime', 0);
}

export function setDoorsOpenViaService(App: unknown, open: boolean, opts?: DoorsSetOpenOptionsLike): boolean {
  try {
    const setOpen = getDoorsMethod<(open: boolean, opts?: DoorsSetOpenOptionsLike) => unknown>(
      App,
      'setOpen'
    );
    if (setOpen) {
      setOpen(!!open, asRecord<DoorsSetOpenOptionsLike>(opts) || undefined);
      return true;
    }
  } catch (error) {
    reportDoorsAccessNonFatal(App, 'setOpen.ownerRejected', error);
  }
  return false;
}

export function toggleDoorsViaService(App: unknown, meta?: ActionMetaLike): boolean {
  try {
    const toggle = getDoorsMethod<(meta?: ActionMetaLike) => unknown>(App, 'toggle');
    if (toggle) {
      toggle(asRecord<ActionMetaLike>(meta) || undefined);
      return true;
    }
  } catch (error) {
    reportDoorsAccessNonFatal(App, 'toggle.ownerRejected', error);
  }
  return false;
}

export function releaseDoorsEditHoldViaService(
  App: unknown,
  opts?: DoorsReleaseEditHoldOptionsLike
): boolean {
  try {
    const releaseEditHold = getDoorsMethod<(opts?: DoorsReleaseEditHoldOptionsLike) => unknown>(
      App,
      'releaseEditHold'
    );
    if (releaseEditHold) {
      releaseEditHold(asRecord<DoorsReleaseEditHoldOptionsLike>(opts) || undefined);
      return true;
    }
  } catch (error) {
    reportDoorsAccessNonFatal(App, 'releaseEditHold.ownerRejected', error);
  }
  return false;
}

export function closeDrawerByIdViaService(
  App: unknown,
  drawerId: unknown,
  opts?: DoorsCloseDrawerOptionsLike
): boolean {
  const key = asKey(drawerId);
  if (!key) return false;
  try {
    const closeDrawerById = getDoorsMethod<
      (drawerId: string | number, opts?: DoorsCloseDrawerOptionsLike) => unknown
    >(App, 'closeDrawerById');
    if (closeDrawerById) {
      closeDrawerById(
        typeof drawerId === 'number' ? drawerId : key,
        asRecord<DoorsCloseDrawerOptionsLike>(opts) || undefined
      );
      return true;
    }
  } catch (error) {
    reportDoorsAccessNonFatal(App, 'closeDrawerById.ownerRejected', error);
  }
  return false;
}

export function captureLocalOpenStateBeforeBuild(
  App: unknown,
  opts?: DoorsCaptureLocalOpenOptionsLike
): boolean {
  try {
    const capture = getDoorsMethod<(opts?: DoorsCaptureLocalOpenOptionsLike) => unknown>(
      App,
      'captureLocalOpenStateBeforeBuild'
    );
    if (capture) {
      capture(asRecord<DoorsCaptureLocalOpenOptionsLike>(opts) || undefined);
      return true;
    }
  } catch (error) {
    reportDoorsAccessNonFatal(App, 'captureLocalOpenStateBeforeBuild.ownerRejected', error);
  }
  return false;
}

export function applyLocalOpenStateAfterBuild(App: unknown): boolean {
  try {
    const apply = getDoorsMethod<() => unknown>(App, 'applyLocalOpenStateAfterBuild');
    if (apply) {
      apply();
      return true;
    }
  } catch (error) {
    reportDoorsAccessNonFatal(App, 'applyLocalOpenStateAfterBuild.ownerRejected', error);
  }
  return false;
}

export function applyEditHoldAfterBuild(App: unknown): boolean {
  try {
    const apply = getDoorsMethod<() => unknown>(App, 'applyEditHoldAfterBuild');
    if (apply) {
      apply();
      return true;
    }
  } catch (error) {
    reportDoorsAccessNonFatal(App, 'applyEditHoldAfterBuild.ownerRejected', error);
  }
  return false;
}

export function syncDoorsVisualsNow(App: unknown, opts?: DoorsSyncVisualsOptionsLike): boolean {
  try {
    const syncVisualsNow = getDoorsMethod<(opts?: DoorsSyncVisualsOptionsLike) => unknown>(
      App,
      'syncVisualsNow'
    );
    if (syncVisualsNow) {
      syncVisualsNow(asRecord<DoorsSyncVisualsOptionsLike>(opts) || undefined);
      return true;
    }
  } catch (error) {
    reportDoorsAccessNonFatal(App, 'syncVisualsNow.ownerRejected', error);
  }
  return false;
}

export function snapDrawersToTargetsViaService(App: unknown): boolean {
  try {
    const snapDrawersToTargets = getDoorsMethod<() => unknown>(App, 'snapDrawersToTargets');
    if (snapDrawersToTargets) {
      snapDrawersToTargets();
      return true;
    }
  } catch (error) {
    reportDoorsAccessNonFatal(App, 'snapDrawersToTargets.ownerRejected', error);
  }
  return false;
}

export { getDoorEditHoldActive };

export function getSuppressGlobalToggleUntil(App: unknown): number {
  return readDoorsRuntimeNumber(App, 'suppressGlobalToggleUntil', 0);
}

export function setSuppressGlobalToggleUntil(App: unknown, until: number): number {
  return writeDoorsRuntimeNumber(App, 'suppressGlobalToggleUntil', until);
}

export function suppressGlobalToggleForMs(App: unknown, ms: number): number {
  return setSuppressGlobalToggleUntil(App, Date.now() + Math.max(0, asFiniteNumber(ms, 0)));
}

export function getHardCloseUntil(App: unknown): number {
  return readDoorsRuntimeNumber(App, 'hardCloseUntil', 0);
}

export function setHardCloseUntil(App: unknown, until: number): number {
  return writeDoorsRuntimeNumber(App, 'hardCloseUntil', until);
}

export function setHardCloseForMs(App: unknown, ms: number, extraMs = 0): number {
  const total = Math.max(0, asFiniteNumber(ms, 0)) + Math.max(0, asFiniteNumber(extraMs, 0));
  return setHardCloseUntil(App, total > 0 ? Date.now() + total : 0);
}
