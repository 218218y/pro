import type { AppContainer, SavedModelLike } from '../../../types';

import {
  _cloneJSON,
  _normalizeModel,
  _notify,
  _persistPresetOrder,
  _persistUserOnly,
  asMutableSavedModel,
  markModelAsCorePreset,
  markModelAsSavedModel,
  markModelAsUserPreset,
  readModelId,
  syncModelsStateToApp,
} from './models_registry.js';
import { getModelsRuntimeStateForApp } from './models_registry_state.js';

export function isPresetModel(model: SavedModelLike | null | undefined): boolean {
  return !!model?.isPreset;
}

export function isUserPresetModel(model: SavedModelLike | null | undefined): boolean {
  return !!model?.isUserPreset;
}

export function isLockedModel(model: SavedModelLike | null | undefined): boolean {
  return !!model?.locked;
}

export function setLockedFlag(model: SavedModelLike | null | undefined, locked: boolean): void {
  const mutable = asMutableSavedModel(model);
  if (!mutable || !model) return;
  if (locked) mutable.locked = true;
  else delete mutable.locked;
  Object.assign(model, mutable);
}

export function promoteModelToUserPreset(model: SavedModelLike | null | undefined): void {
  const mutable = asMutableSavedModel(model);
  if (!mutable || !model) return;
  markModelAsUserPreset(mutable);
  mutable.locked = true;
  delete mutable.fromCorePreset;
  Object.assign(model, mutable);
}

export function markModelAsCorePresetEntry(model: SavedModelLike | null | undefined): void {
  const mutable = asMutableSavedModel(model);
  if (!mutable || !model) return;
  markModelAsCorePreset(mutable);
  Object.assign(model, mutable);
}

export function demotePresetToSavedModel(model: SavedModelLike | null | undefined): void {
  const mutable = asMutableSavedModel(model);
  if (!mutable || !model) return;
  markModelAsSavedModel(mutable);
  Object.assign(model, mutable);
}

export function findModelIndexById(App: AppContainer, id: unknown): number {
  const state = getModelsRuntimeStateForApp(App);
  const want = String(id);
  for (let i = 0; i < state.all.length; i++) {
    if (readModelId(state.all[i]) === want) return i;
  }
  return -1;
}

export function findInListById(list: SavedModelLike[], id: string): number {
  for (let i = 0; i < list.length; i++) {
    if (readModelId(list[i]) === id) return i;
  }
  return -1;
}

export function getCorePresetById(App: AppContainer, id: string): SavedModelLike | null {
  const state = getModelsRuntimeStateForApp(App);
  for (let i = 0; i < state.presets.length; i++) {
    if (readModelId(state.presets[i]) === id) return state.presets[i] || null;
  }
  return null;
}

export function cloneNormalizedModel(App: AppContainer, model: unknown): SavedModelLike | null {
  return _normalizeModel(_cloneJSON(model), { App });
}

export function splitModels(App: AppContainer): { presets: SavedModelLike[]; saved: SavedModelLike[] } {
  const state = getModelsRuntimeStateForApp(App);
  const presets: SavedModelLike[] = [];
  const saved: SavedModelLike[] = [];
  for (let i = 0; i < state.all.length; i++) {
    const model = state.all[i];
    if (!model) continue;
    if (model.isPreset) presets.push(model);
    else saved.push(model);
  }
  return { presets, saved };
}

export function computeInsertIndex(
  arr: SavedModelLike[],
  dropPos: 'before' | 'after' | 'end',
  overId: string
): number {
  if (dropPos === 'end' || !overId) return arr.length;
  const overIndex = findInListById(arr, overId);
  if (overIndex < 0) return arr.length;
  return dropPos === 'before' ? overIndex : overIndex + 1;
}

export function commitModels(App: AppContainer, presets: SavedModelLike[], saved: SavedModelLike[]): void {
  const state = getModelsRuntimeStateForApp(App);
  state.all = presets.concat(saved);
  _persistUserOnly(App);
  _persistPresetOrder(App);
  syncModelsStateToApp(App);
  _notify(App);
}
