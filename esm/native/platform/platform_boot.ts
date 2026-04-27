import { getLocationSearchMaybe, getWindowMaybe } from '../runtime/api.js';
import { patchRuntime } from '../runtime/runtime_write_access.js';

import {
  readLocalStorage,
  readWindowSearch,
  type DepsFlagsLike,
  type PlatformReportErrorLike,
} from './platform_shared.js';

import type { AppContainer, UnknownRecord } from '../../../types';

export type PlatformDepsFlagsReader = () => DepsFlagsLike | null;

export function readBootFailFastFlag(App: AppContainer, reportError: PlatformReportErrorLike): boolean {
  try {
    let enabled = false;

    const win = readWindowSearch(getWindowMaybe(App));

    try {
      const storage = readLocalStorage(win?.localStorage);
      if (storage) {
        const value = String(storage.getItem('WP_FAIL_FAST') || '');
        if (value === '1' || value === 'true' || value === 'yes' || value === 'on') enabled = true;
      }
    } catch (e) {
      reportError(e, 'platform.failFast.localStorage');
    }

    if (!enabled) {
      try {
        const search = getLocationSearchMaybe(App);
        if (search && /[?&](failFast|failfast|WP_FAIL_FAST)=?(1|true|yes|on)?(&|$)/.test(search)) {
          enabled = true;
        }
      } catch (e) {
        reportError(e, 'platform.failFast.query');
      }
    }

    return !!enabled;
  } catch (e) {
    reportError(e, 'platform.failFast.init');
    return false;
  }
}

export function applyPlatformBootFlagsToRuntime(
  App: AppContainer,
  bootFailFast: boolean,
  getDepsFlags: PlatformDepsFlagsReader
): void {
  try {
    const patch: UnknownRecord = {};
    if (bootFailFast) patch.failFast = true;

    const flags = getDepsFlags();
    if (flags && typeof flags.verboseConsoleErrors === 'boolean') {
      patch.verboseConsoleErrors = !!flags.verboseConsoleErrors;
    }
    if (flags && typeof flags.verboseConsoleErrorsDedupeMs === 'number') {
      patch.verboseConsoleErrorsDedupeMs = Number(flags.verboseConsoleErrorsDedupeMs);
    }
    if (flags && typeof flags.debug === 'boolean') patch.debug = !!flags.debug;

    if (Object.keys(patch).length > 0) {
      patchRuntime(App, patch, { source: 'platform:bootFlags' });
    }
  } catch {
    // swallow
  }
}
