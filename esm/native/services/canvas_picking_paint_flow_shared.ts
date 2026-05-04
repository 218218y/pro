import type {
  ActionMetaLike,
  AppContainer,
  CurtainMap,
  DoorSpecialMap,
  DoorSpecialValue,
  DoorStyleMap,
  IndividualColorsMap,
  MirrorLayoutEntry,
  MirrorLayoutMap,
  UnknownRecord,
} from '../../../types';

import { getBuilderMaterialsService } from '../runtime/builder_service_access.js';
import { isGlassPaintSelection, readDoorStyleMap } from '../features/door_style_overrides.js';
import { __wp_map, __wp_ui } from './canvas_picking_core_helpers.js';
import {
  CHEST_BODY_PARTS,
  CORNICE_PARTS,
  MAIN_BODY_PARTS,
  __isAnyCornicePart,
} from './canvas_picking_paint_targets.js';
import {
  cloneMirrorLayoutList,
  mirrorLayoutListEquals,
  readMirrorLayoutMap,
} from '../features/mirror_layout.js';

export type PaintMetaLike = ActionMetaLike & { immediate?: boolean };

export type MirrorLayoutClickResult = {
  nextLayout: MirrorLayoutEntry | null;
  removeMatch: { index: number } | null;
  canApplyMirror: boolean;
  /**
   * The clicked face in the hit owner local Z axis. +1 is the canonical outside face;
   * -1 is the inside/back face. Kept optional so old tests/injected resolvers stay compatible.
   */
  hitFaceSign?: number | null;
  /** True when the click represents a full-door mirror request rather than a sized placement. */
  isFullDoorMirror?: boolean;
};

export function isRecord(value: unknown): value is UnknownRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function cloneStringMap(src: UnknownRecord): Record<string, string | null | undefined> {
  const out: Record<string, string | null | undefined> = {};
  for (const [key, value] of Object.entries(src || {})) {
    let nextValue: string | null | undefined;
    if (typeof value === 'string') {
      nextValue = value;
    } else if (value === null) {
      nextValue = null;
    } else if (value === undefined) {
      nextValue = undefined;
    } else {
      nextValue = String(value);
    }
    out[key] = nextValue;
  }
  return out;
}

function readNamedMap(
  App: AppContainer,
  name: 'individualColors' | 'curtainMap' | 'doorSpecialMap'
): Record<string, string | null | undefined> {
  const value = __wp_map(App, name);
  return isRecord(value) ? cloneStringMap(value) : {};
}

export function cloneIndividualColorsMap(src: IndividualColorsMap): IndividualColorsMap {
  const out: IndividualColorsMap = {};
  for (const [key, value] of Object.entries(src || {})) out[key] = value;
  return out;
}

export function cloneCurtainMap(src: CurtainMap): CurtainMap {
  const out: CurtainMap = {};
  for (const [key, value] of Object.entries(src || {})) out[key] = value;
  return out;
}

export function cloneDoorSpecialMap(src: DoorSpecialMap): DoorSpecialMap {
  const out: DoorSpecialMap = {};
  for (const [key, value] of Object.entries(src || {})) out[key] = value;
  return out;
}

export function cloneDoorStyleMap(src: DoorStyleMap): DoorStyleMap {
  const out: DoorStyleMap = {};
  for (const [key, value] of Object.entries(src || {})) out[key] = value;
  return out;
}

export function cloneMirrorLayoutConfigMap(src: MirrorLayoutMap): MirrorLayoutMap {
  const out: MirrorLayoutMap = {};
  for (const [key, value] of Object.entries(src || {})) {
    const next = cloneMirrorLayoutList(value);
    if (next.length) out[key] = next;
  }
  return out;
}

export function readIndividualColorsMap(App: AppContainer): IndividualColorsMap {
  return cloneIndividualColorsMap(readNamedMap(App, 'individualColors'));
}

export function readCurtainMap(App: AppContainer): CurtainMap {
  return cloneCurtainMap(readNamedMap(App, 'curtainMap'));
}

export function readDoorSpecialMap(App: AppContainer): DoorSpecialMap {
  return cloneDoorSpecialMap(readNamedMap(App, 'doorSpecialMap'));
}

export function readDoorStyleConfigMap(App: AppContainer): DoorStyleMap {
  return cloneDoorStyleMap(readDoorStyleMap(__wp_map(App, 'doorStyleMap')));
}

export function readMirrorLayoutConfigMap(App: AppContainer): MirrorLayoutMap {
  return cloneMirrorLayoutConfigMap(readMirrorLayoutMap(__wp_map(App, 'mirrorLayoutMap')));
}

export function createImmediateMeta(source: string): PaintMetaLike {
  return { source, immediate: true };
}

export function readCurtainChoice(App: AppContainer): string {
  const __ui = __wp_ui(App);
  return __ui && typeof __ui.currentCurtainChoice === 'string' && __ui.currentCurtainChoice
    ? __ui.currentCurtainChoice
    : 'none';
}

export function toggleGroupedPaint(__colors: IndividualColorsMap, targetKeys: string[], paint: string): void {
  const shouldRemove = targetKeys.every(part => __colors[part] === paint);
  for (const part of targetKeys) {
    if (shouldRemove) {
      delete __colors[part];
    } else {
      __colors[part] = paint;
    }
  }
}

export function toggleSinglePaintTarget(
  __colors: IndividualColorsMap,
  targetKey: string,
  paint: string
): void {
  const existingColor = __colors[targetKey];
  const shouldRemove = existingColor === paint;

  if (shouldRemove) {
    delete __colors[targetKey];
  } else {
    __colors[targetKey] = paint;
  }
}

export function toggleCorniceGroupPaint(__colors: IndividualColorsMap, paint: string): void {
  const shouldRemove = CORNICE_PARTS.every(part => {
    if (part === 'cornice_color') return __colors[part] === paint;
    return __colors[part] == null || __colors[part] === paint;
  });

  if (shouldRemove) {
    for (let i = 0; i < CORNICE_PARTS.length; i += 1) delete __colors[CORNICE_PARTS[i]];
    return;
  }

  __colors.cornice_color = paint;
  for (let i = 1; i < CORNICE_PARTS.length; i += 1) delete __colors[CORNICE_PARTS[i]];
}

export function sameFlatMap<T extends Record<string, unknown>>(a: T, b: T): boolean {
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  for (let i = 0; i < aKeys.length; i += 1) {
    const key = aKeys[i];
    if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
    if (!Object.is(a[key], b[key])) return false;
  }
  return true;
}

export function sameMirrorLayoutMap(a: MirrorLayoutMap, b: MirrorLayoutMap): boolean {
  const aKeys = Object.keys(a || {});
  const bKeys = Object.keys(b || {});
  if (aKeys.length !== bKeys.length) return false;
  for (let i = 0; i < aKeys.length; i += 1) {
    const key = aKeys[i];
    if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
    if (!mirrorLayoutListEquals(a[key], b[key])) return false;
  }
  return true;
}

export function isSpecialPart(__paintPartKey: string): boolean {
  if (!__paintPartKey) return false;
  if (/^d\d+_/.test(__paintPartKey)) return true;
  if (__paintPartKey.startsWith('sliding') || __paintPartKey.startsWith('slide')) return true;
  if (__paintPartKey.startsWith('corner_door') || __paintPartKey.startsWith('corner_pent_door')) return true;
  if (__paintPartKey.startsWith('lower_corner_door') || __paintPartKey.startsWith('lower_corner_pent_door')) {
    return true;
  }
  if (/^(?:lower_)?corner_c\d+_draw_(?:shoe|\d+)$/.test(__paintPartKey)) return true;
  if (/^sketch_box(?:_free)?_.+_door(?:_|$)/.test(__paintPartKey)) return true;
  if (__paintPartKey.startsWith('sketch_ext_drawers_')) return true;
  if (/^sketch_box(?:_free)?_.+_ext_drawers_/.test(__paintPartKey)) return true;
  return false;
}

export function isSpecialVal(v: unknown): v is DoorSpecialValue {
  return v === 'mirror' || v === 'glass';
}

export function getPaintSourceTag(paint: string, foundPartId: string): string {
  const selection = String(paint || '')
    .trim()
    .toLowerCase();
  if (selection === 'mirror') return 'paint.apply:mirror';
  if (isGlassPaintSelection(selection)) return 'paint.apply:glass';
  if (
    foundPartId &&
    (MAIN_BODY_PARTS.includes(foundPartId) ||
      CHEST_BODY_PARTS.includes(foundPartId) ||
      __isAnyCornicePart(foundPartId))
  ) {
    return 'paint.apply:group';
  }
  if (foundPartId && foundPartId.startsWith('corner_')) return 'paint.apply:corner';
  return 'paint.apply:color';
}

export function hasLiveMaterialRefresh(App: AppContainer): boolean {
  const mats = getBuilderMaterialsService(App);
  return !!(mats && typeof mats.applyMaterials === 'function');
}

export function refreshMaterialsNoBuild(App: AppContainer): boolean {
  const mats = getBuilderMaterialsService(App);
  const fn = mats && typeof mats.applyMaterials === 'function' ? mats.applyMaterials : null;
  if (typeof fn !== 'function') return false;
  try {
    fn.call(mats);
    return true;
  } catch {
    return false;
  }
}
