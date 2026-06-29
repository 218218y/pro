import type {
  ProjectDataLike,
  ProjectLoadOpts,
  HandleType,
  ProjectSettingsLike,
  ProjectTogglesLike,
  UiStateLike,
  UnknownRecord,
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
export type ProjectToggleMapLike = Record<string, boolean | undefined>;

export function asRecord(v: unknown): UnknownRecord | null {
  return asObjectRecord(v);
}

export function readProjectSettings(
  rec: ProjectDataLike | UnknownRecord | null | undefined
): ProjectSettingsLike {
  const settings = asRecord(asRecord(rec)?.settings);
  return settings ? { ...settings } : {};
}

export function readProjectToggles(
  rec: ProjectDataLike | UnknownRecord | null | undefined
): ProjectTogglesLike {
  const toggles = asRecord(asRecord(rec)?.toggles);
  return toggles ? { ...toggles } : {};
}

export function readToggleMap(value: unknown): ProjectToggleMapLike {
  const src = asRecord(value);
  if (!src) return {};
  const out: ProjectToggleMapLike = {};
  for (const [key, entry] of Object.entries(src)) {
    if (typeof entry === 'boolean') out[key] = entry;
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
  const sideVal = uiNow.cornerSide;
  return {
    prevChestMode: uiNow.isChestMode === true,
    prevCornerMode: uiNow.cornerMode === true,
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

export function shouldPreserveProjectAutosaveOnLoad(opts?: ProjectLoadOpts): boolean {
  const optsRec = asRecord(opts);
  const metaRec = asRecord(optsRec?.meta);
  return (
    optsRec?.preserveAutosave === true ||
    optsRec?.preserveAutosaveOnLoad === true ||
    metaRec?.preserveAutosave === true ||
    metaRec?.preserveAutosaveOnLoad === true ||
    metaRec?.autosavePolicy === 'preserve-existing'
  );
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
  preserveIfMissing('autosaveInfo');
  return next;
}
