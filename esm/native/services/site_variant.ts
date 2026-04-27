import type { AppContainer, ConfigStateLike } from '../../../types';
import { getDocumentMaybe, getLocationSearchMaybe, getWindowMaybe } from '../runtime/api.js';
import { readConfigStateFromApp } from '../runtime/root_state_access.js';

export type SiteVariant = 'main' | 'site2';

function asString(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v.trim() : null;
}

function readQueryParam(App: AppContainer, key: string): string | null {
  try {
    const search = getLocationSearchMaybe(App);
    const s = asString(search);
    if (!s) return null;
    const params = new URLSearchParams(s.startsWith('?') ? s.slice(1) : s);
    const v = params.get(key);
    return asString(v);
  } catch {
    return null;
  }
}

function readVariantFromConfig(App: AppContainer): SiteVariant | null {
  try {
    const cfg: ConfigStateLike = readConfigStateFromApp(App);

    const v0 = asString(cfg.siteVariant);
    if (v0 && v0.toLowerCase() === 'site2') return 'site2';
    if (v0 && v0.toLowerCase() === 'main') return 'main';

    if (cfg.site2 === true) return 'site2';

    const v1 = asString(cfg.site);
    if (v1 && (v1 === '2' || v1.toLowerCase() === 'site2')) return 'site2';
  } catch {
    // ignore
  }
  return null;
}

function readVariantFromMeta(App: AppContainer): SiteVariant | null {
  try {
    const doc = getDocumentMaybe(App);
    const el =
      doc && typeof doc.querySelector === 'function'
        ? doc.querySelector('meta[name="wp-site-variant"]')
        : null;
    const content = el && typeof el.getAttribute === 'function' ? asString(el.getAttribute('content')) : null;
    if (content && content.toLowerCase() === 'site2') return 'site2';
    if (content && content.toLowerCase() === 'main') return 'main';
  } catch {
    // ignore
  }
  return null;
}

function readVariantFromPath(App: AppContainer): SiteVariant | null {
  try {
    const win = getWindowMaybe(App);
    const pathname = asString(win?.location?.pathname);
    if (!pathname) return null;
    if (/index_site2(?:\.html)?$/i.test(pathname) || /(?:^|\/)site2(?:\/|$)/i.test(pathname)) return 'site2';
  } catch {
    // ignore
  }
  return null;
}

export function getSiteVariant(App: AppContainer): SiteVariant {
  try {
    const fromCfg = readVariantFromConfig(App);
    if (fromCfg) return fromCfg;

    const v1 = readQueryParam(App, 'site');
    if (v1 && (v1 === '2' || v1.toLowerCase() === 'site2')) return 'site2';

    const v2 = readQueryParam(App, 'site2');
    if (v2 && (v2 === '1' || v2.toLowerCase() === 'true')) return 'site2';

    const fromMeta = readVariantFromMeta(App);
    if (fromMeta) return fromMeta;

    const fromPath = readVariantFromPath(App);
    if (fromPath) return fromPath;
  } catch {
    // ignore
  }
  return 'main';
}

export function isSite2Variant(App: AppContainer): boolean {
  return getSiteVariant(App) === 'site2';
}
