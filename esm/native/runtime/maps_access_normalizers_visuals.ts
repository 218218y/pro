import type {
  DoorTrimAxis,
  DoorTrimColor,
  DoorTrimEntry,
  DoorTrimMap,
  DoorTrimSpan,
  MapsByName,
} from '../../../types';

import { readMirrorLayoutMap as readCanonicalMirrorLayoutMap } from '../../shared/mirror_layout_contracts_shared.js';
import { asRecord } from './maps_access_shared.js';
import {
  createStableDoorTrimId,
  normalizeDoorStyleMap,
  normalizeDoorTrimCenterNorm,
  normalizeDoorTrimCrossSizeCm,
  normalizeDoorTrimCustomSizeCm,
} from './maps_access_normalizers_shared.js';

export function normalizeMirrorLayoutMap(value: unknown): MapsByName['mirrorLayoutMap'] {
  return readCanonicalMirrorLayoutMap(value);
}

function normalizeDoorTrimAxis(value: unknown): DoorTrimAxis {
  return value === 'vertical' ? 'vertical' : 'horizontal';
}

function normalizeDoorTrimColor(value: unknown): DoorTrimColor {
  return value === 'silver' || value === 'gold' || value === 'black' || value === 'nickel' ? value : 'nickel';
}

function normalizeDoorTrimSpan(value: unknown): DoorTrimSpan {
  return value === 'full' ||
    value === 'three_quarters' ||
    value === 'half' ||
    value === 'third' ||
    value === 'quarter' ||
    value === 'custom'
    ? value
    : 'full';
}

function normalizeDoorTrimEntry(value: unknown): DoorTrimEntry | null {
  const rec = asRecord(value);
  if (!rec) return null;
  const axis = normalizeDoorTrimAxis(rec.axis);
  const color = normalizeDoorTrimColor(rec.color);
  const span = normalizeDoorTrimSpan(rec.span);
  const legacyCenterNorm = normalizeDoorTrimCenterNorm(rec.centerNorm);
  const centerXNorm = normalizeDoorTrimCenterNorm(
    rec.centerXNorm ?? (axis === 'vertical' ? legacyCenterNorm : 0.5)
  );
  const centerYNorm = normalizeDoorTrimCenterNorm(
    rec.centerYNorm ?? (axis === 'horizontal' ? legacyCenterNorm : 0.5)
  );
  const sizeCm = normalizeDoorTrimCustomSizeCm(rec.sizeCm);
  const crossSizeCm = normalizeDoorTrimCrossSizeCm(rec.crossSizeCm);
  const explicitId = typeof rec.id === 'string' && rec.id.trim() ? String(rec.id) : '';
  const out: DoorTrimEntry = {
    id:
      explicitId ||
      createStableDoorTrimId({ axis, color, span, centerXNorm, centerYNorm, sizeCm, crossSizeCm }),
    axis,
    color,
    span,
    centerNorm: axis === 'vertical' ? centerXNorm : centerYNorm,
    centerXNorm,
    centerYNorm,
  };
  if (span === 'custom' && sizeCm != null) out.sizeCm = sizeCm;
  if (crossSizeCm != null) out.crossSizeCm = crossSizeCm;
  return out;
}

function normalizeDoorTrimList(value: unknown): DoorTrimEntry[] {
  if (Array.isArray(value)) {
    const out: DoorTrimEntry[] = [];
    for (let i = 0; i < value.length; i += 1) {
      const entry = normalizeDoorTrimEntry(value[i]);
      if (entry) out.push({ ...entry });
    }
    return out;
  }
  const single = normalizeDoorTrimEntry(value);
  return single ? [{ ...single }] : [];
}

export function normalizeDoorTrimMap(value: unknown): DoorTrimMap {
  const rec = asRecord(value);
  const out: DoorTrimMap = Object.create(null);
  if (!rec) return out;
  for (const key of Object.keys(rec)) {
    const next = normalizeDoorTrimList(rec[key]);
    if (next.length) out[key] = next;
  }
  return out;
}

export { normalizeDoorStyleMap };
