import { getLocationSearchMaybe, getWindowMaybe } from '../runtime/api.js';
import { getDepsNamespaceMaybe } from '../runtime/deps_access.js';
import { getPlatformRootMaybe } from '../runtime/app_roots_access.js';
import { patchRuntime } from '../runtime/runtime_write_access.js';

import {
  readLocalStorage,
  readPlatformReportError,
  readWindowSearch,
  type DepsFlagsLike,
  type PlatformReportErrorLike,
} from './platform_shared.js';

import type { AppContainer, UnknownRecord } from '../../../types';

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

export function applyPlatformBootFlagsToRuntime(App: AppContainer): void {
  const platform = getPlatformRootMaybe(App);
  const reportError = readPlatformReportError(platform?.reportError) || (() => undefined);
  const bootFailFast = readBootFailFastFlag(App, reportError);
  const patch: UnknownRecord = {};
  if (bootFailFast) patch.failFast = true;

  let flags: DepsFlagsLike | null = null;
  try {
    flags = getDepsNamespaceMaybe<DepsFlagsLike>(App, 'flags');
  } catch (error) {
    reportError(error, 'platform.bootFlags.deps');
  }

  if (flags) {
    if (typeof flags.verboseConsoleErrors === 'boolean') {
      patch.verboseConsoleErrors = !!flags.verboseConsoleErrors;
    }
    if (typeof flags.verboseConsoleErrorsDedupeMs === 'number') {
      patch.verboseConsoleErrorsDedupeMs = Number(flags.verboseConsoleErrorsDedupeMs);
    }
    if (typeof flags.debug === 'boolean') patch.debug = !!flags.debug;
  }

  if (Object.keys(patch).length > 0) {
    patchRuntime(App, patch, { source: 'platform:bootFlags' });
  }
}
