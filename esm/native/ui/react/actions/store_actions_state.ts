import type {
  AppContainer,
  ColorsActionsLike,
  ConfigActionsNamespaceLike,
  HistoryActionsNamespaceLike,
  ProjectSavedNotesLike,
  SavedColorLike,
  UiActionsNamespaceLike,
  UnknownRecord,
} from '../../../../../types';

import {
  getColorsActions,
  getConfigActions,
  getHistoryActions,
  getUiActions,
} from '../../../services/api.js';
import { getStoreSurfaceMaybe } from '../../../services/api.js';

function isRecord(v: unknown): v is UnknownRecord {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

function readRecord(v: unknown): UnknownRecord | null {
  return isRecord(v) ? v : null;
}

function emptyRecord(): UnknownRecord {
  return {};
}

function readSavedNotes(value: unknown): ProjectSavedNotesLike | null {
  if (!Array.isArray(value)) return null;
  return value.filter(isRecord);
}

function readSavedColor(value: unknown): SavedColorLike | string | null {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed || null;
  }
  const rec = readRecord(value);
  if (!rec) return null;
  const id = typeof rec.id === 'string' ? rec.id.trim() : '';
  if (!id) return null;
  const next: SavedColorLike = { id };
  if (typeof rec.type === 'string' && rec.type) next.type = rec.type;
  if (typeof rec.value === 'string') next.value = rec.value;
  if (typeof rec.textureData !== 'undefined') next.textureData = rec.textureData;
  return next;
}

function readSavedColorsList(value: unknown): Array<SavedColorLike | string> {
  if (!Array.isArray(value)) return [];
  const out: Array<SavedColorLike | string> = [];
  for (const entry of value) {
    const next = readSavedColor(entry);
    if (next) out.push(next);
  }
  return out;
}

function readColorSwatchesOrder(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const entry of value) {
    const next = entry == null ? '' : String(entry).trim();
    if (next) out.push(next);
  }
  return out;
}

type StoreReader = {
  getState: () => unknown;
};

type PartialUiActions = Partial<UiActionsNamespaceLike> & UnknownRecord;
type PartialConfigActions = Partial<ConfigActionsNamespaceLike> & UnknownRecord;
type PartialColorsActions = Partial<ColorsActionsLike> & UnknownRecord;
type PartialHistoryActions = Partial<HistoryActionsNamespaceLike> & UnknownRecord;

function readStore(value: unknown): StoreReader | null {
  const store = getStoreSurfaceMaybe(value);
  return store
    ? {
        getState: () => store.getState(),
      }
    : null;
}

function readUiActions(value: unknown): PartialUiActions {
  return readRecord(value) || emptyRecord();
}

function readConfigActions(value: unknown): PartialConfigActions {
  return readRecord(value) || emptyRecord();
}

function readColorsActions(value: unknown): PartialColorsActions {
  return readRecord(value) || emptyRecord();
}

function readHistoryActions(value: unknown): PartialHistoryActions {
  return readRecord(value) || emptyRecord();
}

function asBoolean(v: unknown): boolean {
  return !!v;
}

function asStringValue(v: unknown): string {
  return v == null ? '' : String(v);
}

function asStringOrNull(v: unknown): string | null {
  const s = asStringValue(v).trim();
  return s ? s : null;
}

function asNumberOrNull(v: unknown): number | null {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function getStore(app: AppContainer): StoreReader | null {
  return app && typeof app === 'object' ? readStore(app) : null;
}

function readRootState(app: AppContainer): UnknownRecord | null {
  try {
    const store = getStore(app);
    return store ? readRecord(store.getState()) : null;
  } catch {
    return null;
  }
}

function getUiNamespace(app: AppContainer): PartialUiActions {
  return readUiActions(getUiActions(app));
}

function getConfigNamespace(app: AppContainer): PartialConfigActions {
  return readConfigActions(getConfigActions(app));
}

function getColorsNamespace(app: AppContainer): PartialColorsActions {
  return readColorsActions(getColorsActions(app));
}

function getHistoryNamespace(app: AppContainer): PartialHistoryActions {
  return readHistoryActions(getHistoryActions(app));
}

function getUiSnapshot(app: AppContainer): UnknownRecord {
  const root = readRootState(app);
  return readRecord(root?.ui) || emptyRecord();
}

function getConfigSnapshot(app: AppContainer): UnknownRecord {
  const root = readRootState(app);
  return readRecord(root?.config) || emptyRecord();
}

export {
  asBoolean,
  asNumberOrNull,
  asStringOrNull,
  asStringValue,
  emptyRecord,
  getConfigNamespace,
  getConfigSnapshot,
  getColorsNamespace,
  getHistoryNamespace,
  getStore,
  getUiNamespace,
  getUiSnapshot,
  isRecord,
  readColorSwatchesOrder,
  readRecord,
  readRootState,
  readSavedColorsList,
  readSavedNotes,
};
export type {
  PartialColorsActions,
  PartialConfigActions,
  PartialHistoryActions,
  PartialUiActions,
  StoreReader,
};
