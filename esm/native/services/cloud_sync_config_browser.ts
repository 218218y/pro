// Cloud Sync browser URL + site-variant helpers.

import type { AppContainer } from '../../../types';

import { getLocationSearchMaybe, getWindowMaybe } from '../runtime/api.js';
import { isSite2Variant } from './site_variant.js';
import { _cloudSyncReportNonFatal } from './cloud_sync_support.js';

export function getRoomFromUrl(App: AppContainer, roomParam: string): string | null {
  try {
    const search = getLocationSearchMaybe(App) || '';
    const sp = new URLSearchParams(search);
    const v = String(sp.get(roomParam) || '').trim();
    return v ? v : null;
  } catch (e) {
    _cloudSyncReportNonFatal(App, 'getRoomFromUrl.parse', e, { throttleMs: 8000 });
    return null;
  }
}

export function setRoomInUrl(App: AppContainer, roomParam: string, room: string | null): void {
  try {
    const w = getWindowMaybe(App);
    const href = w && w.location && typeof w.location.href === 'string' ? String(w.location.href) : '';
    if (!href) return;

    const url = new URL(href);
    if (!room) url.searchParams.delete(roomParam);
    else url.searchParams.set(roomParam, room);

    // Keep hash.
    if (w && w.location) w.location.href = url.toString();
  } catch (e) {
    _cloudSyncReportNonFatal(App, 'setRoomInUrl.navigate', e, { throttleMs: 10000 });
  }
}

export function isExplicitSite2Bundle(App: AppContainer): boolean {
  // Pure ESM: determine site variant from injected config and/or URL params.
  // (No window.site-variant Window global globals.)
  try {
    return isSite2Variant(App);
  } catch {
    return false;
  }
}
