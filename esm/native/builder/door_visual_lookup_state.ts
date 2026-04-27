import { readMirrorLayoutList } from '../features/mirror_layout.js';

import type { MirrorLayoutList } from '../../../types';

function hasOwn(map: Record<string, unknown> | undefined | null, key: string): boolean {
  return !!map && !!key && Object.prototype.hasOwnProperty.call(map, key);
}

function isSegmentedDoorBaseId(partId: string): boolean {
  if (!partId) return false;
  if (/^(?:lower_)?d\d+$/.test(partId)) return true;
  if (/^(?:lower_)?corner_door_\d+$/.test(partId)) return true;
  if (/^(?:lower_)?corner_pent_door_\d+$/.test(partId)) return true;
  return false;
}

export function buildDoorVisualLookupKeys(partId: string): string[] {
  if (typeof partId !== 'string' || !partId) return [];
  const out: string[] = [partId];
  const push = (value: string) => {
    if (!value || out.includes(value)) return;
    out.push(value);
  };

  if (partId.endsWith('_top') || partId.endsWith('_mid') || partId.endsWith('_bot')) {
    push(partId.replace(/_(top|mid|bot)$/i, '_full'));
  }
  if (partId.endsWith('_full')) {
    push(partId.slice(0, -5));
  }
  if (isSegmentedDoorBaseId(partId)) {
    push(`${partId}_full`);
  }

  return out;
}

export function readDoorVisualMapValue(
  map: Record<string, unknown> | undefined | null,
  partId: string
): unknown {
  const keys = buildDoorVisualLookupKeys(partId);
  for (let i = 0; i < keys.length; i += 1) {
    const key = keys[i];
    if (hasOwn(map, key)) return map![key];
  }
  return null;
}

export function readDoorVisualTextValue(
  map: Record<string, unknown> | undefined | null,
  partId: string
): string | null {
  const value = readDoorVisualMapValue(map, partId);
  return typeof value === 'string' && value ? String(value) : null;
}

export function readDoorVisualMirrorLayout(
  map: Record<string, unknown> | undefined | null,
  partId: string
): MirrorLayoutList | null {
  const value = readDoorVisualMapValue(map, partId);
  const layouts = readMirrorLayoutList(value);
  return layouts.length ? layouts : null;
}
