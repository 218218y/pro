import {
  DEFAULT_HANDLE_FINISH_COLOR,
  HANDLE_COLOR_GLOBAL_KEY,
  handleColorPartKey,
  normalizeHandleFinishColor,
} from '../features/handle_finish_shared.js';

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function readStringEntry(mapLike: unknown, key: string): string | undefined {
  if (!isRecord(mapLike) || !key || !Object.prototype.hasOwnProperty.call(mapLike, key)) return undefined;
  const value = mapLike[key];
  if (value === undefined || value === null || value === '') return undefined;
  return String(value);
}

function stripDoorPartSuffix(partId: string): string {
  return String(partId || '').replace(/_(top|mid|bot|full)$/i, '');
}

export function resolveConfiguredHandleColor(handlesMapLike: unknown, partId: unknown): string {
  const sid = String(partId || '');
  const base = stripDoorPartSuffix(sid);
  const direct = readStringEntry(handlesMapLike, handleColorPartKey(sid));
  const baseValue = base !== sid ? readStringEntry(handlesMapLike, handleColorPartKey(base)) : undefined;
  const globalValue = readStringEntry(handlesMapLike, HANDLE_COLOR_GLOBAL_KEY);
  return normalizeHandleFinishColor(direct ?? baseValue ?? globalValue ?? DEFAULT_HANDLE_FINISH_COLOR);
}
