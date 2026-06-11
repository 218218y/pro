import type {
  ModelsCommandResult,
  ModelsServiceLike,
  ModelsTransferPosition,
  ModelsTransferTargetList,
  SavedModelId,
  SavedModelLike,
  UiFeedbackNamespaceLike,
} from '../../../../../types';

export type SavedModelsListType = ModelsTransferTargetList;
export type SavedModelsDropPos = ModelsTransferPosition;
export type SavedModelsDragIndicatorPos = 'before' | 'after' | '';
export type SavedModelsMoveDir = 'up' | 'down';

export type SavedModelsFeedbackLike = UiFeedbackNamespaceLike & {
  toast: (message: string, kind?: string) => void;
  prompt: (title: string, defaultValue: string, cb: (value: string | null) => void) => void;
  confirm: (title: string, message: string, onYes: () => void, onNo?: (() => void) | null) => void;
};

export type SavedModelsTransferFn = (
  id: SavedModelId,
  targetList: SavedModelsListType,
  overId: SavedModelId | null,
  pos: SavedModelsDropPos
) => ModelsCommandResult;

export type SavedModelsReorderPlan = {
  dir: SavedModelsMoveDir;
  count: number;
};

export function getModelId(model: SavedModelLike | null | undefined): SavedModelId {
  return String(model?.id || '').trim();
}

export function getModelName(model: SavedModelLike | null | undefined, fallback = ''): string {
  return String(model?.name || fallback).trim();
}

export function isPresetModel(model: SavedModelLike | null | undefined): boolean {
  return !!model?.isPreset;
}

export function isLockedModel(model: SavedModelLike | null | undefined): boolean {
  return !!model?.locked;
}

export function normalizeModelName(value: string): string {
  return String(value || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export function getNextDefaultSavedModelName(models: SavedModelLike[]): string {
  const usedNums = new Set<number>();
  for (const model of models) {
    if (isPresetModel(model)) continue;
    const match = getModelName(model).match(/^דגם\s*(\d+)$/);
    if (!match || !match[1]) continue;
    const num = Number.parseInt(match[1], 10);
    if (Number.isFinite(num) && num > 0) usedNums.add(num);
  }

  let next = 1;
  while (usedNums.has(next)) next += 1;
  return `דגם ${next}`;
}

export function getTransferFn(modelsApi: ModelsServiceLike): SavedModelsTransferFn | null {
  if (typeof modelsApi.transfer !== 'function') return null;
  return (id, targetList, overId, pos) => modelsApi.transfer(id, targetList, overId, pos);
}

export function getDragIdFromDataTransfer(
  dataTransfer: Pick<DataTransfer, 'getData'> | null | undefined
): string {
  if (!dataTransfer || typeof dataTransfer.getData !== 'function') return '';
  try {
    return String(dataTransfer.getData('text/plain') || '').trim();
  } catch {
    return '';
  }
}

export function buildDnDReorderPlan(
  ids: string[],
  dragId: string,
  overId: string | null,
  pos: SavedModelsDropPos
): SavedModelsReorderPlan | null {
  const sourceId = String(dragId || '').trim();
  if (!sourceId) return null;

  const from = ids.indexOf(sourceId);
  if (from < 0) return null;

  let to = ids.length;
  if (overId) {
    const targetId = String(overId || '').trim();
    const overIndex = ids.indexOf(targetId);
    if (overIndex >= 0) to = overIndex + (pos === 'after' ? 1 : 0);
  }

  if (pos === 'end') to = ids.length;

  let newIndex = to;
  if (newIndex > from) newIndex -= 1;
  if (newIndex < 0) newIndex = 0;
  if (newIndex > ids.length - 1) newIndex = ids.length - 1;
  if (newIndex === from) return null;

  const steps = newIndex - from;
  return {
    dir: steps < 0 ? 'up' : 'down',
    count: Math.abs(steps),
  };
}
