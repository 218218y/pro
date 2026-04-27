import { lazy } from 'react';

import type { AppContainer, CloudSyncServiceLike, TabId, UnknownRecord } from '../../../../types';
import { getCloudSyncServiceMaybe, readConfigLooseScalarFromApp } from '../../services/api.js';

let deferredSidebarTabsPromise: Promise<typeof import('./tabs/DeferredSidebarTabs.js')> | null = null;

function loadDeferredSidebarTabs() {
  if (!deferredSidebarTabsPromise) {
    deferredSidebarTabsPromise = import('./tabs/DeferredSidebarTabs.js');
  }
  return deferredSidebarTabsPromise;
}

export function prefetchDeferredSidebarTabs(tabId: TabId | null | undefined): void {
  if (tabId === 'structure' || !tabId) return;
  void loadDeferredSidebarTabs().catch(() => undefined);
}

export const DeferredSidebarTabsLazy = lazy(async () => {
  const mod = await loadDeferredSidebarTabs();
  return { default: mod.DeferredSidebarTabs };
});

export const TABS: Array<{ id: TabId; label: string }> = [
  { id: 'structure', label: 'מבנה' },
  { id: 'design', label: 'עיצוב' },
  { id: 'interior', label: 'פנים' },
  { id: 'render', label: 'הדמיה' },
  { id: 'export', label: 'ייצוא' },
];

// SITE2: which tabs are allowed to ever show (when the online gate is ON).
// Configure via the runtime config module (wp_runtime_config.mjs), for example:
//   export default { config: { site2EnabledTabs: ['export','render'] } };
const SITE2_ENABLED_TABS_DEFAULT: TabId[] = [];

function normalizeTabId(v: unknown): TabId | null {
  const s = typeof v === 'string' ? v.trim().toLowerCase() : '';
  if (s === 'structure' || s === 'design' || s === 'interior' || s === 'render' || s === 'export') return s;
  return null;
}

function isUnknownRecord(value: unknown): value is UnknownRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function readRecord(value: unknown): UnknownRecord | null {
  return isUnknownRecord(value) ? value : null;
}

export function readWindowLogoDataUri(win: unknown): string {
  const rec = readRecord(win);
  return rec && typeof rec.WP_LOGO_DATA_URI === 'string' ? rec.WP_LOGO_DATA_URI : '';
}

function readSite2EnabledTabsValue(app: AppContainer): unknown {
  return readConfigLooseScalarFromApp(app, 'site2EnabledTabs', null);
}

export function readCloudSyncService(app: AppContainer): CloudSyncServiceLike | null {
  return getCloudSyncServiceMaybe(app);
}

export function readEventTargetElement(target: EventTarget | null): HTMLElement | null {
  return target instanceof HTMLElement ? target : null;
}

export function getSite2EnabledTabs(app: AppContainer): TabId[] {
  try {
    const raw = readSite2EnabledTabsValue(app);

    if (Array.isArray(raw)) {
      const out: TabId[] = [];
      for (const x of raw) {
        const id = normalizeTabId(x);
        if (id && !out.includes(id)) out.push(id);
      }
      return out;
    }

    if (typeof raw === 'string') {
      const out: TabId[] = [];
      for (const part of raw.split(',')) {
        const id = normalizeTabId(part);
        if (id && !out.includes(id)) out.push(id);
      }
      return out;
    }
  } catch {
    // ignore
  }
  return SITE2_ENABLED_TABS_DEFAULT.slice();
}
