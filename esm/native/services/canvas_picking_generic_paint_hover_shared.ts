import type { AppContainer, SketchPlacementPreviewArgsLike, UnknownRecord } from '../../../types';
import type { MouseVectorLike, RaycasterLike } from './canvas_picking_engine.js';
import { getThreeMaybe } from '../runtime/three_access.js';

export type PreviewOpsArgs = SketchPlacementPreviewArgsLike &
  UnknownRecord & { App: AppContainer; THREE: unknown; __reason?: string };

export type PaintPreviewGroupBox = {
  centerX: number;
  centerY: number;
  centerZ: number;
  width: number;
  height: number;
  depth: number;
  woodThick: number;
  anchor: UnknownRecord;
  anchorParent: UnknownRecord;
  kind?: string;
  previewObjects?: UnknownRecord[];
};

export function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object';
}

export function asRecordMap(value: unknown): UnknownRecord | null {
  return isRecord(value) ? value : null;
}

export function createPreviewOpsArgs(App: AppContainer, extra: UnknownRecord = {}): PreviewOpsArgs {
  return { App, THREE: getThreeMaybe(App), ...extra };
}

function isRaycasterLike(value: unknown): value is RaycasterLike {
  const rec = asRecordMap(value);
  return !!(rec && typeof rec.setFromCamera === 'function' && typeof rec.intersectObjects === 'function');
}

export function asRaycasterLike(value: unknown): RaycasterLike | null {
  return isRaycasterLike(value) ? value : null;
}

function isMouseVectorLike(value: unknown): value is MouseVectorLike {
  const rec = asRecordMap(value);
  return !!(rec && typeof rec.x === 'number' && typeof rec.y === 'number');
}

export function asMouseVectorLike(value: unknown): MouseVectorLike | null {
  return isMouseVectorLike(value) ? value : null;
}

export function __isCornicePaintKey(partKey: string): boolean {
  return (
    partKey === 'cornice_color' ||
    partKey === 'cornice_wave_front' ||
    partKey === 'cornice_wave_side_left' ||
    partKey === 'cornice_wave_side_right' ||
    partKey === 'corner_cornice' ||
    partKey === 'corner_cornice_front' ||
    partKey === 'corner_cornice_side_left' ||
    partKey === 'corner_cornice_side_right' ||
    partKey === 'lower_corner_cornice' ||
    partKey === 'lower_corner_cornice_front' ||
    partKey === 'lower_corner_cornice_side_left' ||
    partKey === 'lower_corner_cornice_side_right'
  );
}

function __scopeCornerCorniceFrontPreviewKey(stackKey: 'top' | 'bottom'): string {
  return stackKey === 'bottom' ? 'lower_corner_cornice_front' : 'corner_cornice_front';
}

export function __isCornerCorniceFrontPreviewKey(partKey: string): boolean {
  return partKey === 'corner_cornice_front' || partKey === 'lower_corner_cornice_front';
}

export function __isScopedCornerCornicePaintKey(partKey: string): boolean {
  return (
    partKey === 'corner_cornice' ||
    partKey === 'corner_cornice_front' ||
    partKey === 'corner_cornice_side_left' ||
    partKey === 'corner_cornice_side_right' ||
    partKey === 'lower_corner_cornice' ||
    partKey === 'lower_corner_cornice_front' ||
    partKey === 'lower_corner_cornice_side_left' ||
    partKey === 'lower_corner_cornice_side_right'
  );
}

export function __isScopedCornerCornicePreviewKeyList(partKeys: string[]): boolean {
  return partKeys.length > 0 && partKeys.every(__isScopedCornerCornicePaintKey);
}

export function __resolvePaintPreviewTargetKeys(
  partId: string,
  stackKey: 'top' | 'bottom',
  targetKeys: string[]
): string[] {
  if (__isCornerCorniceFrontPreviewKey(partId)) return [__scopeCornerCorniceFrontPreviewKey(stackKey)];
  if (
    partId === 'corner_cornice' ||
    partId === 'corner_cornice_side_left' ||
    partId === 'corner_cornice_side_right' ||
    partId === 'lower_corner_cornice' ||
    partId === 'lower_corner_cornice_side_left' ||
    partId === 'lower_corner_cornice_side_right'
  ) {
    return targetKeys.filter(__isScopedCornerCornicePaintKey);
  }
  return targetKeys;
}

export function __applyCornicePreviewPadding(previewGroup: PaintPreviewGroupBox): PaintPreviewGroupBox {
  const padXY = Math.max(0.0015, Math.min(0.004, previewGroup.woodThick * 0.12 || 0.002));
  const padZ = Math.max(0.0005, Math.min(0.002, padXY * 0.5));
  return {
    ...previewGroup,
    width: previewGroup.width + padXY * 2,
    height: previewGroup.height + padXY * 2,
    depth: previewGroup.depth + padZ * 2,
    woodThick: Math.max(0.003, Math.min(0.02, previewGroup.woodThick * 0.8 || previewGroup.woodThick)),
  };
}

export function __readPaintHoverOp(
  colors: UnknownRecord,
  effectiveKeys: string[],
  selection: string
): 'add' | 'remove' {
  if (!effectiveKeys.length) return 'add';
  const isCorniceGroup = effectiveKeys.some(__isCornicePaintKey);
  if (isCorniceGroup) {
    const baseCorniceKey = effectiveKeys.some(partKey => partKey.startsWith('lower_corner_cornice'))
      ? 'lower_corner_cornice'
      : effectiveKeys.some(partKey => partKey.startsWith('corner_cornice'))
        ? 'corner_cornice'
        : 'cornice_color';
    const baseColor = typeof colors[baseCorniceKey] === 'string' ? String(colors[baseCorniceKey]) : '';
    const segmentOverridesCompatible = effectiveKeys.every(partKey => {
      if (!__isCornicePaintKey(partKey) || partKey === baseCorniceKey) return true;
      const value = colors[partKey];
      return value == null || String(value) === selection;
    });
    return baseColor === selection && segmentOverridesCompatible ? 'remove' : 'add';
  }
  return effectiveKeys.every(
    partKey => typeof colors[partKey] === 'string' && String(colors[partKey]) === selection
  )
    ? 'remove'
    : 'add';
}

export function asObject3DRecord(value: unknown): UnknownRecord | null {
  const rec = asRecordMap(value);
  return rec && Array.isArray(rec.children) ? rec : null;
}

export function __readObjectLocalGeometryBox(obj: unknown): {
  centerX: number;
  centerY: number;
  centerZ: number;
  width: number;
  height: number;
  depth: number;
} | null {
  const rec = asRecordMap(obj);
  if (!rec) return null;
  const geometry = asRecordMap(rec.geometry);
  if (!geometry) return null;

  const boundingBox = asRecordMap(geometry.boundingBox);
  const computeBoundingBox =
    typeof geometry.computeBoundingBox === 'function' ? geometry.computeBoundingBox : null;
  if (!boundingBox && computeBoundingBox) {
    try {
      computeBoundingBox.call(geometry);
    } catch {
      // ignore bounding-box computation failures
    }
  }

  const bb = asRecordMap(geometry.boundingBox);
  const min = asRecordMap(bb?.min);
  const max = asRecordMap(bb?.max);
  const minX = typeof min?.x === 'number' ? Number(min.x) : NaN;
  const minY = typeof min?.y === 'number' ? Number(min.y) : NaN;
  const minZ = typeof min?.z === 'number' ? Number(min.z) : NaN;
  const maxX = typeof max?.x === 'number' ? Number(max.x) : NaN;
  const maxY = typeof max?.y === 'number' ? Number(max.y) : NaN;
  const maxZ = typeof max?.z === 'number' ? Number(max.z) : NaN;
  if (
    !(
      Number.isFinite(minX) &&
      Number.isFinite(minY) &&
      Number.isFinite(minZ) &&
      Number.isFinite(maxX) &&
      Number.isFinite(maxY) &&
      Number.isFinite(maxZ)
    )
  ) {
    return null;
  }

  const width = maxX - minX;
  const height = maxY - minY;
  const depth = maxZ - minZ;
  if (!(width > 0 && height > 0 && depth > 0)) return null;

  return {
    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2,
    centerZ: (minZ + maxZ) / 2,
    width,
    height,
    depth,
  };
}
