import type {
  ModelsChangeListener,
  ModelsLoadOptions,
  ModelsNormalizer,
  ModelsServiceLike,
  SavedModelLike,
  StorageNamespaceLike,
  UnknownRecord,
} from '../../../types';

export type ModelsOpts = ModelsLoadOptions;

export type AppModelsState = ModelsServiceLike & {
  _normalizer?: ModelsNormalizer | null;
  _presets?: SavedModelLike[];
  _loaded?: boolean;
  _all?: SavedModelLike[];
  _listeners?: ModelsChangeListener[];
  __wpRuntimeState?: ModelsRuntimeState;
  __wpCompatRevision?: number;
};

export type StorageLike = StorageNamespaceLike & {
  KEYS?: {
    SAVED_MODELS?: string;
  };
  getString?(key: string): string | null | undefined;
  setString?(key: string, value: string): unknown;
};

export type UtilLike = {
  normalizeSplitDoorsMapWithDoors?: (splitDoorsMap: unknown, doors: unknown) => unknown;
};

export type HistorySystemLike = {
  getCurrentSnapshot?: () => unknown;
};

export type ModelsRuntimeState = {
  normalizer: ModelsNormalizer | null;
  presets: SavedModelLike[];
  loaded: boolean;
  all: SavedModelLike[];
  listeners: ModelsChangeListener[];
  revision: number;
};

export const modelsRuntimeState: ModelsRuntimeState = {
  normalizer: null,
  presets: [],
  loaded: false,
  all: [],
  listeners: [],
  revision: 0,
};

export type MutableSavedModel = SavedModelLike & {
  isPreset?: boolean;
  isUserPreset?: boolean;
  isCorePreset?: boolean;
  locked?: boolean;
};

export type PdfDraftSnapshotLike = UnknownRecord & {
  orderPdfEditorDraft?: unknown;
  orderPdfEditorZoom?: number;
};

export function isObject(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object';
}

export function isModelsNormalizer(fn: unknown): fn is ModelsNormalizer {
  return typeof fn === 'function';
}

export function isModelsChangeListener(fn: unknown): fn is ModelsChangeListener {
  return typeof fn === 'function';
}

export function isAppModelsState(value: unknown): value is AppModelsState {
  return isObject(value);
}

export function isStorageLike(value: unknown): value is StorageLike {
  const rec = isObject(value) ? value : null;
  return (
    !!rec &&
    (isObject(rec.KEYS) || typeof rec.KEYS === 'undefined') &&
    (typeof rec.getJSON === 'function' || typeof rec.getJSON === 'undefined') &&
    (typeof rec.getString === 'function' || typeof rec.getString === 'undefined') &&
    (typeof rec.setJSON === 'function' || typeof rec.setJSON === 'undefined') &&
    (typeof rec.setString === 'function' || typeof rec.setString === 'undefined')
  );
}

export function isUtilLike(value: unknown): value is UtilLike {
  const rec = isObject(value) ? value : null;
  return (
    !!rec &&
    (typeof rec.normalizeSplitDoorsMapWithDoors === 'function' ||
      typeof rec.normalizeSplitDoorsMapWithDoors === 'undefined')
  );
}

export function asMutableSavedModel(value: unknown): MutableSavedModel | null {
  if (!isObject(value)) return null;
  const id = value.id != null ? String(value.id).trim() : '';
  const name = value.name != null ? String(value.name).trim() : '';
  if (!id || !name) return null;
  return { ...value, id, name, isPreset: !!value.isPreset };
}

export function asMutableModelsList(value: unknown): MutableSavedModel[] {
  if (!Array.isArray(value)) return [];
  const out: MutableSavedModel[] = [];
  for (let i = 0; i < value.length; i += 1) {
    const model = asMutableSavedModel(value[i]);
    if (model) out.push(model);
  }
  return out;
}

function asSavedModelRecord(value: unknown): MutableSavedModel | null {
  return asMutableSavedModel(value);
}

export function asModelsList(value: unknown): SavedModelLike[] {
  if (!Array.isArray(value)) return [];
  const out: SavedModelLike[] = [];
  for (let i = 0; i < value.length; i += 1) {
    const model = asSavedModelRecord(value[i]);
    if (model) out.push(model);
  }
  return out;
}

export function asListenersList(value: unknown): ModelsChangeListener[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isModelsChangeListener);
}

export function normalizeModelsOpts(value: unknown): ModelsOpts {
  const rec = isObject(value) ? value : null;
  return {
    forceRebuild: !!rec?.forceRebuild,
    silent: !!rec?.silent,
  };
}

export function readModelId(model: { id?: unknown } | null | undefined): string {
  return model && model.id != null ? String(model.id).trim() : '';
}

export function readModelName(model: { name?: unknown } | null | undefined): string {
  return model && model.name != null ? String(model.name).trim() : '';
}

export function markModelAsUserPreset(model: MutableSavedModel): void {
  model.isPreset = true;
  model.isUserPreset = true;
  delete model.isCorePreset;
}

export function markModelAsCorePreset(model: MutableSavedModel): void {
  model.isPreset = true;
  model.isCorePreset = true;
  delete model.isUserPreset;
}

export function markModelAsSavedModel(model: MutableSavedModel): void {
  model.isPreset = false;
  delete model.isUserPreset;
  delete model.isCorePreset;
}

export function syncPresetFlags(model: MutableSavedModel): void {
  if (model.isPreset) {
    if (!model.isUserPreset && !model.isCorePreset) model.isPreset = true;
    return;
  }
  delete model.isUserPreset;
  delete model.isCorePreset;
}
