import { createCanvasViaPlatform } from '../runtime/platform_access.js';

import type { ThreeLike, Vec3Like } from '../../../types/index.js';
import type {
  AppLike,
  CanvasLike,
  DimLabelEntryLike,
  LabelShiftLike,
  PointLike,
  RenderOpsExtrasSurface,
  SpriteLike,
  TextureLike,
  MaterialLike,
} from './render_ops_extras_shared.js';
import {
  ensureRenderOpsExtrasRuntime,
  ensureRenderOpsExtrasTHREE,
  readRenderOpsExtrasContextApp,
  readCanvas,
  readLabelShift,
  readPoint,
  readVector,
  readWardrobeGroup,
  toFiniteNumber,
  touchRenderOpsMeta,
} from './render_ops_extras_shared.js';

type ThreeLabelSurface = ThreeLike & {
  CanvasTexture: new (canvas: CanvasLike) => TextureLike;
  SpriteMaterial: new (opts: Record<string, unknown>) => MaterialLike;
};

type ThreeLineSurface = ThreeLike & {
  BufferGeometry: new () => { setFromPoints: (points: Vec3Like[]) => unknown };
  Line: new (geo: unknown, material: unknown) => import('../../../types/index.js').Object3DLike;
  Sprite: new (material: unknown) => SpriteLike;
  Vector3: new (x?: number, y?: number, z?: number) => import('./render_ops_extras_shared.js').VectorLike;
  LineBasicMaterial: new (opts: Record<string, unknown>) => MaterialLike;
};

function isThreeLabelSurface(value: unknown): value is ThreeLabelSurface {
  return !!value && typeof value === 'object' && 'CanvasTexture' in value && 'SpriteMaterial' in value;
}

function isThreeLineSurface(value: unknown): value is ThreeLineSurface {
  return !!(
    value &&
    typeof value === 'object' &&
    'BufferGeometry' in value &&
    'Line' in value &&
    'Sprite' in value &&
    'Vector3' in value &&
    'LineBasicMaterial' in value
  );
}

type DimensionTextScaleSpec = {
  scale?: unknown;
  textScale?: unknown;
  styleKey?: unknown;
  labelStyleKey?: unknown;
};

function readFiniteScale(value: unknown, defaultValue: number): number {
  const numeric = typeof value === 'number' ? value : NaN;
  return Number.isFinite(numeric) && numeric > 0 ? numeric : defaultValue;
}

function readDimensionTextScaleSpec(value: unknown): { textScale: number; styleKey: string | null } {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const spec = value as DimensionTextScaleSpec;
    const scaleSource = spec.scale ?? spec.textScale;
    const styleSource = spec.styleKey ?? spec.labelStyleKey;
    return {
      textScale: readFiniteScale(scaleSource, 1),
      styleKey: typeof styleSource === 'string' && styleSource.trim() ? styleSource.trim() : null,
    };
  }
  return { textScale: readFiniteScale(value, 1), styleKey: null };
}

export function getDimLabelEntry(textStr: unknown, ctx: unknown, styleKeyIn?: unknown): DimLabelEntryLike {
  const runtime = ensureRenderOpsExtrasRuntime(readRenderOpsExtrasContextApp(ctx));
  const { App, renderMeta } = runtime;
  const util = runtime.platform.util;
  const styleKey = styleKeyIn ? String(styleKeyIn) : 'default';
  const key = `dim:${styleKey}:${String(textStr || '')}`;

  const cached = util.dimLabelCache instanceof Map ? util.dimLabelCache.get(key) || null : null;
  if (cached) {
    touchRenderOpsMeta(App, renderMeta.dimLabel, key);
    return cached;
  }

  const isCell = styleKey === 'cell';
  const isNeighbor = styleKey === 'neighbor';
  const isCenter = styleKey === 'center';
  const isCompactTotal = styleKey === 'compactTotal';
  const isCompactLabel = isCell || isNeighbor || isCenter || isCompactTotal;
  const width = isCompactLabel ? 96 : 128;
  const height = isCompactLabel ? 48 : 64;

  const canvas = readCanvas(createCanvasViaPlatform(App, width, height));
  if (!canvas) throw new Error('[DimLabel] cannot create canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx2d = canvas.getContext('2d');
  if (!ctx2d) throw new Error('[DimLabel] cannot get 2d context');

  ctx2d.fillStyle = isCell
    ? 'rgba(232,244,255,0.62)'
    : isNeighbor || isCompactTotal
      ? 'rgba(255,255,255,0.9)'
      : isCenter
        ? 'rgba(209,250,229,0.78)'
        : 'rgba(255,255,255,0.7)';
  ctx2d.fillRect(0, 0, width, height);
  ctx2d.font =
    isCell || isCenter
      ? 'bold 28px Arial'
      : isNeighbor || isCompactTotal
        ? 'bold 30px Arial'
        : 'bold 40px Arial';
  ctx2d.fillStyle = isCell ? '#0b4f79' : isCenter ? '#047857' : 'black';
  ctx2d.textAlign = 'center';
  ctx2d.textBaseline = 'middle';
  ctx2d.fillText(String(textStr || ''), width / 2, height / 2);

  const THREEBase = ensureRenderOpsExtrasTHREE(App);
  if (!isThreeLabelSurface(THREEBase)) throw new Error('[DimLabel] THREE canvas surface unavailable');
  const THREE = THREEBase;

  const texture = new THREE.CanvasTexture(canvas);
  const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true });

  texture.userData = texture.userData || {};
  texture.userData.isCached = true;
  spriteMat.userData = spriteMat.userData || {};
  spriteMat.userData.isCached = true;

  const entry: DimLabelEntryLike = { texture, mat: spriteMat };
  if (util.dimLabelCache instanceof Map) util.dimLabelCache.set(key, entry);
  touchRenderOpsMeta(App, renderMeta.dimLabel, key);
  return entry;
}

export function addDimensionLine(
  start: PointLike,
  end: PointLike,
  offset: Vec3Like,
  textStr: unknown,
  textScale: unknown,
  ctx: unknown,
  labelShift?: LabelShiftLike
): { line: import('../../../types/index.js').Object3DLike; sprite: SpriteLike } | void {
  const scaleSpec = readDimensionTextScaleSpec(textScale);
  const textScaleNum = scaleSpec.textScale;
  const runtime = ensureRenderOpsExtrasRuntime(readRenderOpsExtrasContextApp(ctx));
  const { App, renderMaterials } = runtime;
  const wardrobeGroup = readWardrobeGroup(App);
  if (!wardrobeGroup) return;

  const THREEBase = ensureRenderOpsExtrasTHREE(App);
  if (!isThreeLineSurface(THREEBase)) throw new Error('[render_ops_extras] THREE line surface unavailable');
  const THREE = THREEBase;
  const isCompactTotal = scaleSpec.styleKey === 'compactTotal';
  const isCell = scaleSpec.styleKey ? scaleSpec.styleKey === 'cell' : textScaleNum < 0.95;
  const labelStyleKey = scaleSpec.styleKey || (isCell ? 'cell' : 'default');

  if (!renderMaterials.dimLineMaterial) {
    const material = new THREE.LineBasicMaterial({ color: 0x555555 });
    material.userData = material.userData || {};
    material.userData.isCached = true;
    renderMaterials.dimLineMaterial = material;
  }
  if (!renderMaterials.dimLineMaterialCell) {
    const material = new THREE.LineBasicMaterial({ color: 0x2b7dbb });
    material.userData = material.userData || {};
    material.userData.isCached = true;
    renderMaterials.dimLineMaterialCell = material;
  }

  const material = isCell ? renderMaterials.dimLineMaterialCell : renderMaterials.dimLineMaterial;
  const points = [start.clone().add(offset), end.clone().add(offset)];
  const geoBase = new THREE.BufferGeometry();
  const geometry = typeof geoBase.setFromPoints === 'function' ? geoBase.setFromPoints(points) : geoBase;
  const line = new THREE.Line(geometry, material);
  line.userData = line.userData || {};
  line.userData.__wpExcludeWardrobeBounds = true;
  wardrobeGroup.add(line);

  const entry = getDimLabelEntry(textStr, ctx, labelStyleKey);
  const sprite = new THREE.Sprite(entry.mat);
  sprite.userData = sprite.userData || {};
  sprite.userData.__wpExcludeWardrobeBounds = true;
  let midPoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5).add(offset);

  if (labelShift && typeof labelShift === 'object') {
    const sx = toFiniteNumber(labelShift.x, 0);
    const sy = toFiniteNumber(labelShift.y, 0);
    const sz = toFiniteNumber(labelShift.z, 0);
    if (sx || sy || sz) midPoint = midPoint.add(new THREE.Vector3(sx, sy, sz));
  }

  sprite.position.copy(midPoint);
  if (isCell || isCompactTotal) sprite.scale.set(0.48 * textScaleNum, 0.24 * textScaleNum, 1);
  else sprite.scale.set(0.6 * textScaleNum, 0.3 * textScaleNum, 1);

  wardrobeGroup.add(sprite);
  return { line, sprite };
}

export function createAddDimensionLine(
  App: AppLike
): NonNullable<RenderOpsExtrasSurface['addDimensionLine']> {
  return (start, end, offset, textStr, textScale, labelShift) => {
    const startPoint = readPoint(start);
    const endPoint = readPoint(end);
    const offsetVec = readVector(offset);
    if (!startPoint || !endPoint || !offsetVec) {
      throw new Error('[render_ops_extras] addDimensionLine received invalid vector args');
    }
    return addDimensionLine(
      startPoint,
      endPoint,
      offsetVec,
      textStr,
      textScale,
      { App },
      readLabelShift(labelShift)
    );
  };
}
