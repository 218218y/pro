import type {
  ProjectDataEnvelopeLike,
  ProjectDataLike,
  ProjectLoadOpts,
  HandleType,
  ProjectSettingsLike,
  ProjectTogglesLike,
  UiStateLike,
  UnknownRecord,
  ToggleValue,
} from '../../../types/index.js';

import { asObjectRecord } from './project_payload_shared.js';

export type ProjectIoPrevUiModeLike = {
  prevChestMode: boolean;
  prevCornerMode: boolean;
  prevCornerSide: 'left' | 'right';
};

export type ProjectIoSourceFlagsLike = {
  source: string;
  isHistoryApply: boolean;
  isModelApply: boolean;
  isCloudApply: boolean;
};

export type ProjectTextMapLike = Record<string, string | null | undefined>;
export type ProjectToggleMapLike = Record<string, ToggleValue | undefined>;

export function asRecord(v: unknown): UnknownRecord | null {
  return asObjectRecord(v);
}

export function readProjectSettings(
  rec: ProjectDataLike | ProjectDataEnvelopeLike | UnknownRecord | null | undefined
): ProjectSettingsLike {
  const settings = asRecord(asRecord(rec)?.settings);
  return settings ? { ...settings } : {};
}

export function readProjectToggles(
  rec: ProjectDataLike | ProjectDataEnvelopeLike | UnknownRecord | null | undefined
): ProjectTogglesLike {
  const toggles = asRecord(asRecord(rec)?.toggles);
  return toggles ? { ...toggles } : {};
}

export function readToggleValue(value: unknown): ToggleValue | undefined {
  if (value === true) return true;
  if (value === false) return false;
  if (value === null) return null;
  if (value === 1) return 1;
  if (value === 0) return 0;
  if (typeof value === 'string') {
    const norm = value.trim().toLowerCase();
    if (norm === 'true' || norm === '1') return true;
    if (norm === 'false' || norm === '0') return false;
  }
  return undefined;
}

export function readToggleMap(value: unknown): ProjectToggleMapLike {
  const src = asRecord(value);
  if (!src) return {};
  const out: ProjectToggleMapLike = {};
  for (const [key, entry] of Object.entries(src)) {
    const next = readToggleValue(entry);
    if (typeof next !== 'undefined') out[key] = next;
  }
  return out;
}

export function readStringMap(value: unknown): ProjectTextMapLike {
  const src = asRecord(value);
  if (!src) return {};
  const out: ProjectTextMapLike = {};
  for (const [key, entry] of Object.entries(src)) {
    if (typeof entry === 'string') out[key] = entry;
    else if (entry === null) out[key] = null;
    else if (typeof entry === 'undefined') out[key] = undefined;
  }
  return out;
}

export function normalizeGlobalHandleType(value: unknown): HandleType | undefined {
  if (value === 'edge' || value === 'none' || value === 'standard') return value;
  return undefined;
}

export function captureProjectPrevUiMode(uiState: UiStateLike | null | undefined): ProjectIoPrevUiModeLike {
  const uiNow = asRecord(uiState) || {};
  const rawNow = asRecord(uiNow.raw) || {};
  const cornerModeVal = uiNow.cornerMode ?? uiNow.isCornerMode ?? uiNow.cornerConnectorEnabled;
  const sideVal = uiNow.cornerSide ?? rawNow.cornerSide;
  return {
    prevChestMode: !!uiNow.isChestMode,
    prevCornerMode: !!cornerModeVal,
    prevCornerSide: sideVal === 'left' ? 'left' : 'right',
  };
}

export function captureProjectLoadSourceFlags(opts?: ProjectLoadOpts): ProjectIoSourceFlagsLike {
  const source = String((opts && opts.meta && opts.meta.source) || '');
  return {
    source,
    isHistoryApply:
      source.indexOf('history.') === 0 || source.indexOf('history:') === 0 || source === 'history.undoRedo',
    isModelApply: source.indexOf('model.') === 0 || source.indexOf('model:') === 0,
    isCloudApply: source.indexOf('cloudSketch.') === 0 || source.indexOf('cloudSketch:') === 0,
  };
}

export function preserveUiEphemeral(uiSnap: UiStateLike, uiNow: UiStateLike | null | undefined): UiStateLike {
  const next = (() => {
    const snap = asRecord(uiSnap);
    return snap ? { ...snap } : {};
  })();
  const current = asRecord(uiNow) || {};
  const preserveIfMissing = (key: string) => {
    if (!Object.prototype.hasOwnProperty.call(next, key) && typeof current[key] !== 'undefined') {
      next[key] = current[key];
    }
  };
  preserveIfMissing('activeTab');
  preserveIfMissing('selectedModelId');
  preserveIfMissing('site2TabsGateOpen');
  preserveIfMissing('site2TabsGateUntil');
  preserveIfMissing('site2TabsGateBy');
  return next;
}
