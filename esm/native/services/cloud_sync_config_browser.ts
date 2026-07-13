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

export function setRoomCredentialInUrl(
  App: AppContainer,
  args: {
    roomParam: string;
    room: string | null;
    roomTokenParam: string;
    roomToken: string | null;
  }
): boolean {
  try {
    const w = getWindowMaybe(App);
    const href = w && w.location && typeof w.location.href === 'string' ? String(w.location.href) : '';
    if (!href) return false;

    const url = new URL(href);
    if (!args.room) url.searchParams.delete(args.roomParam);
    else url.searchParams.set(args.roomParam, args.room);
    if (args.roomTokenParam) {
      if (!args.roomToken) url.searchParams.delete(args.roomTokenParam);
      else url.searchParams.set(args.roomTokenParam, args.roomToken);
    }

    // Keep hash.
    if (!w?.location) return false;
    w.location.href = url.toString();
    return true;
  } catch (e) {
    _cloudSyncReportNonFatal(App, 'setRoomCredentialInUrl.navigate', e, { throttleMs: 10000 });
    return false;
  }
}

export function removeRoomTokenFromUrl(App: AppContainer, roomTokenParam: string): boolean {
  try {
    const tokenParam = String(roomTokenParam || '').trim();
    const w = getWindowMaybe(App);
    const href = w && w.location && typeof w.location.href === 'string' ? String(w.location.href) : '';
    if (!tokenParam || !href || !w?.history?.replaceState) return false;
    const url = new URL(href);
    if (!url.searchParams.has(tokenParam)) return true;
    url.searchParams.delete(tokenParam);
    w.history.replaceState(w.history.state, '', url.toString());
    return true;
  } catch (e) {
    _cloudSyncReportNonFatal(App, 'removeRoomTokenFromUrl.replaceState', e, { throttleMs: 10000 });
    return false;
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
