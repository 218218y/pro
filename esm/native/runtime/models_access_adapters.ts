import type {
  ModelsChangeListener,
  ModelsLoadOptions,
  ModelsMoveDirection,
  ModelsNormalizer,
  ModelsServiceLike,
  ModelsTransferPosition,
  ModelsTransferTargetList,
  SavedModelId,
  SavedModelLike,
  SavedModelName,
  UnknownRecord,
} from '../../../types';

import {
  MODELS_ACCESS_NORMALIZED,
  createEmptyModelsService,
  isNormalizedModelsService,
  isRecord,
  readCommandResult,
  readDeleteTemporaryResult,
  readLockResult,
  readMergeResult,
  readSaveResult,
  readSavedModel,
  readSavedModelList,
} from './models_access_contracts.js';

export type ZeroArgUnknownFn = () => unknown;
export type OneArgUnknownFn<Arg> = (arg: Arg) => unknown;
export type TwoArgUnknownFn<A, B> = (a: A, b: B) => unknown;
export type FourArgUnknownFn<A, B, C, D> = (a: A, b: B, c: C, d: D) => unknown;

export function readZeroArgUnknownFn(value: unknown): ZeroArgUnknownFn | null {
  if (typeof value !== 'function') return null;
  return () => Reflect.apply(value, undefined, []);
}

export function readOneArgUnknownFn<Arg>(value: unknown): OneArgUnknownFn<Arg> | null {
  if (typeof value !== 'function') return null;
  return (arg: Arg) => Reflect.apply(value, undefined, [arg]);
}

export function readTwoArgUnknownFn<A, B>(value: unknown): TwoArgUnknownFn<A, B> | null {
  if (typeof value !== 'function') return null;
  return (a: A, b: B) => Reflect.apply(value, undefined, [a, b]);
}

export function readFourArgUnknownFn<A, B, C, D>(value: unknown): FourArgUnknownFn<A, B, C, D> | null {
  if (typeof value !== 'function') return null;
  return (a: A, b: B, c: C, d: D) => Reflect.apply(value, undefined, [a, b, c, d]);
}

export function readChangeListenerFn(
  value: unknown
): ((fn: ModelsChangeListener) => void | (() => void)) | null {
  if (typeof value !== 'function') return null;
  return (fn: ModelsChangeListener) => {
    const out = Reflect.apply(value, undefined, [fn]);
    return typeof out === 'function'
      ? () => {
          Reflect.apply(out, undefined, []);
        }
      : undefined;
  };
}

export function readModelsService(value: unknown): ModelsServiceLike | null {
  if (!isRecord(value)) return null;
  if (isNormalizedModelsService(value)) return value;
  const defaults = createEmptyModelsService();
  const setNormalizer = readOneArgUnknownFn<ModelsNormalizer | null>(value.setNormalizer);
  const setPresets = readOneArgUnknownFn<SavedModelLike[]>(value.setPresets);
  const ensureLoadedRaw = readOneArgUnknownFn<ModelsLoadOptions | undefined>(value.ensureLoaded);
  const getAllRaw = readZeroArgUnknownFn(value.getAll);
  const getByIdRaw = readOneArgUnknownFn<SavedModelId>(value.getById);
  const saveCurrentRaw = readOneArgUnknownFn<SavedModelName>(value.saveCurrent);
  const overwriteFromCurrentRaw = readOneArgUnknownFn<SavedModelId>(value.overwriteFromCurrent);
  const deleteByIdRaw = readOneArgUnknownFn<SavedModelId>(value.deleteById);
  const setLockedRaw = readTwoArgUnknownFn<SavedModelId, boolean>(value.setLocked);
  const deleteTemporaryRaw = readZeroArgUnknownFn(value.deleteTemporary);
  const moveRaw = readTwoArgUnknownFn<SavedModelId, ModelsMoveDirection>(value.move);
  const transferRaw = readFourArgUnknownFn<
    SavedModelId,
    ModelsTransferTargetList,
    SavedModelId | null,
    ModelsTransferPosition
  >(value.transfer);
  const applyRaw = readOneArgUnknownFn<SavedModelId>(value.apply);
  const exportUserModelsRaw = readZeroArgUnknownFn(value.exportUserModels);
  const mergeImportedModelsRaw = readOneArgUnknownFn<SavedModelLike[]>(value.mergeImportedModels);
  const onChange = readChangeListenerFn(value.onChange) ?? defaults.onChange;

  const normalized: ModelsServiceLike & UnknownRecord = {
    setNormalizer: fn => {
      if (setNormalizer) setNormalizer(fn);
      else defaults.setNormalizer(fn);
    },
    setPresets: presetsArr => {
      const normalizedPresets = readSavedModelList(presetsArr);
      if (setPresets) setPresets(normalizedPresets);
      else defaults.setPresets(normalizedPresets);
    },
    ensureLoaded: opts => {
      if (!ensureLoadedRaw) return defaults.ensureLoaded(opts);
      return readSavedModelList(ensureLoadedRaw(opts));
    },
    getAll: () => {
      const out = getAllRaw ? getAllRaw() : defaults.getAll();
      return readSavedModelList(out);
    },
    getById: (id: SavedModelId) => {
      const out = getByIdRaw ? getByIdRaw(id) : defaults.getById(id);
      return readSavedModel(out);
    },
    saveCurrent: (name: SavedModelName) =>
      readSaveResult(saveCurrentRaw ? saveCurrentRaw(name) : defaults.saveCurrent(name)),
    overwriteFromCurrent: (id: SavedModelId) =>
      readCommandResult(
        overwriteFromCurrentRaw ? overwriteFromCurrentRaw(id) : defaults.overwriteFromCurrent(id)
      ),
    deleteById: (id: SavedModelId) =>
      readCommandResult(deleteByIdRaw ? deleteByIdRaw(id) : defaults.deleteById(id)),
    setLocked: (id: SavedModelId, locked: boolean) =>
      readLockResult(setLockedRaw ? setLockedRaw(id, locked) : defaults.setLocked(id, locked)),
    deleteTemporary: () =>
      readDeleteTemporaryResult(deleteTemporaryRaw ? deleteTemporaryRaw() : defaults.deleteTemporary()),
    move: (id: SavedModelId, dir: ModelsMoveDirection) =>
      readCommandResult(moveRaw ? moveRaw(id, dir) : defaults.move(id, dir)),
    transfer: (
      id: SavedModelId,
      targetList: ModelsTransferTargetList,
      overId: SavedModelId | null,
      pos: ModelsTransferPosition
    ) =>
      readCommandResult(
        transferRaw
          ? transferRaw(id, targetList, overId, pos)
          : defaults.transfer(id, targetList, overId, pos)
      ),
    apply: (id: SavedModelId) => readCommandResult(applyRaw ? applyRaw(id) : defaults.apply(id)),
    exportUserModels: () => {
      const out = exportUserModelsRaw ? exportUserModelsRaw() : defaults.exportUserModels();
      return readSavedModelList(out);
    },
    mergeImportedModels: (list: SavedModelLike[]) => {
      const normalizedList = readSavedModelList(list);
      const out = mergeImportedModelsRaw
        ? mergeImportedModelsRaw(normalizedList)
        : defaults.mergeImportedModels(normalizedList);
      return readMergeResult(out);
    },
    onChange,
  };
  normalized[MODELS_ACCESS_NORMALIZED] = true;
  return normalized;
}
