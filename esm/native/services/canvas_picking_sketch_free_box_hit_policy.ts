import { asRecord } from '../runtime/record.js';

function readObjectFromHit(hit: unknown): unknown {
  return asRecord(hit)?.object ?? null;
}

function readUserData(value: unknown): Record<string, unknown> | null {
  return asRecord(asRecord(value)?.userData) as Record<string, unknown> | null;
}

function isRenderableHitObject(value: unknown): boolean {
  const obj = asRecord(value);
  if (!obj) return false;
  if (obj.type === 'LineSegments' || obj.type === 'Line' || obj.type === 'Sprite') return false;
  const mat = asRecord(obj.material);
  if (mat && mat.visible === false) return false;
  if (mat && mat.opacity === 0) return false;
  return true;
}

const FREE_BOX_ACTIONABLE_PART_MARKERS = [
  '_door_',
  '_ext_drawers_',
  '_int_drawers_',
  '_shelf_',
  '_rod_',
  '_storage_',
  '_divider_',
  '_hdivider_',
] as const;

export function isSketchFreeBoxPartId(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  const partId = value.trim();
  if (!partId.startsWith('sketch_box_free_')) return false;
  return !FREE_BOX_ACTIONABLE_PART_MARKERS.some(marker => partId.includes(marker));
}

export function isSketchFreeBoxRenderableHit(hit: unknown): boolean {
  const obj = readObjectFromHit(hit);
  if (!isRenderableHitObject(obj)) return false;
  return isSketchFreeBoxPartId(readUserData(obj)?.partId);
}

export function firstRenderableHitIsSketchFreeBox(intersects: readonly unknown[]): boolean {
  for (let i = 0; i < intersects.length; i += 1) {
    const obj = readObjectFromHit(intersects[i]);
    if (!isRenderableHitObject(obj)) continue;
    return isSketchFreeBoxRenderableHit(intersects[i]);
  }
  return false;
}
