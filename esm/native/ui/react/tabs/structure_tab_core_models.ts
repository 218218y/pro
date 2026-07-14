import type {
  ModelsCommandResult,
  ModelsLoadOptions,
  ModelsLockResult,
  ModelsSaveResult,
  ModelsServiceLike,
  SavedModelLike,
  UnknownRecord,
} from '../../../../../types';

import { getModelsServiceMaybe, getModelsServiceSourceMaybe } from '../../../services/api.js';

const __emptyModelsService: ModelsServiceLike = {
  setNormalizer: () => void 0,
  setPresets: () => void 0,
  ensureLoaded: (_opts?: ModelsLoadOptions) => [],
  getAll: (): SavedModelLike[] => [],
  getById: (): SavedModelLike | null => null,
  saveCurrent: async (): Promise<ModelsSaveResult> => ({ ok: false, reason: 'missing' }),
  overwriteFromCurrent: async (): Promise<ModelsCommandResult> => ({ ok: false, reason: 'missing' }),
  deleteById: async (): Promise<ModelsCommandResult> => ({ ok: false, reason: 'missing' }),
  setLocked: async (): Promise<ModelsLockResult> => ({ ok: false, reason: 'missing' }),
  deleteTemporary: async () => ({ ok: false, reason: 'missing', removed: 0 }),
  move: async (): Promise<ModelsCommandResult> => ({ ok: false, reason: 'missing' }),
  transfer: async (): Promise<ModelsCommandResult> => ({ ok: false, reason: 'missing' }),
  apply: (): ModelsCommandResult => ({ ok: false, reason: 'missing' }),
  exportUserModels: (): SavedModelLike[] => [],
  mergeImportedModels: async () => ({ added: 0, updated: 0 }),
  onChange: () => () => void 0,
  offChange: () => void 0,
};

function isRecord(value: unknown): value is UnknownRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function readRecord(value: unknown): UnknownRecord | null {
  return isRecord(value) ? value : null;
}

function readModelsServiceSource(app: unknown): (ModelsServiceLike & UnknownRecord) | null {
  const source = getModelsServiceSourceMaybe(app);
  if (source) return source;
  const svc = getModelsServiceMaybe(app);
  const rec = readRecord(svc);
  return rec ? { ...__emptyModelsService, ...rec } : null;
}

export function getModelsService(app: unknown): ModelsServiceLike {
  const source = readModelsServiceSource(app);
  if (!source) return __emptyModelsService;

  const base: ModelsServiceLike = source;
  const onChange0 = typeof source.onChange === 'function' ? source.onChange : null;
  const offChange0 = typeof source.offChange === 'function' ? source.offChange : null;

  if (!onChange0) return base;

  return {
    ...base,
    onChange: (fn: (models: SavedModelLike[]) => void) => {
      Reflect.apply(onChange0, source, [fn]);
      return () => {
        if (offChange0) Reflect.apply(offChange0, source, [fn]);
      };
    },
  };
}
