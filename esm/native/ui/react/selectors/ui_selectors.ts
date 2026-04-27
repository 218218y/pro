// React UI selectors (typed)
//
// Purpose:
// - Centralize common reads from the UI slice.
// - Avoid loose record casts like `(ui as Record<string, unknown>).x` throughout components.
// - Keep defaulting rules consistent.

import type { TabId, UiState } from '../../../../../types';

type AutosaveInfo = {
  timestamp?: number;
  dateString?: string;
};

export function selectActiveTabId(ui: UiState): TabId {
  const t = typeof ui.activeTab === 'string' ? ui.activeTab.trim().toLowerCase() : '';
  if (
    t === 'structure' ||
    t === 'design' ||
    t === 'interior' ||
    t === 'render' ||
    t === 'export' ||
    t === 'sketch'
  )
    return t;
  return 'structure';
}

export function selectProjectName(ui: UiState): string {
  return typeof ui.projectName === 'string' ? ui.projectName : '';
}

export function selectSelectedModelId(ui: UiState): string {
  return typeof ui.selectedModelId === 'string' ? ui.selectedModelId : '';
}

export function selectSite2GateState(ui: UiState): { open: boolean; untilMs: number } {
  const open = typeof ui.site2TabsGateOpen === 'boolean' ? ui.site2TabsGateOpen : false;
  const untilMs =
    typeof ui.site2TabsGateUntil === 'number' && Number.isFinite(ui.site2TabsGateUntil)
      ? ui.site2TabsGateUntil
      : 0;
  return { open, untilMs };
}

export function selectAutosaveInfo(ui: UiState): AutosaveInfo | null {
  const v = ui.autosaveInfo;
  if (!v) return null;
  const timestamp = typeof v.timestamp === 'number' && Number.isFinite(v.timestamp) ? v.timestamp : undefined;
  const dateString = typeof v.dateString === 'string' ? v.dateString : undefined;
  return timestamp || dateString ? { timestamp, dateString } : null;
}
