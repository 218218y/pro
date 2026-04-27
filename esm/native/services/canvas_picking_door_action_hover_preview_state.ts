import type { AppContainer, UnknownRecord } from '../../../types';
import {
  normalizeDoorTrimAxis,
  normalizeDoorTrimColor,
  normalizeDoorTrimSpan,
} from '../features/door_trim.js';
import { readMapOrEmpty } from '../runtime/maps_access.js';
import {
  readDoorTrimConfigMap as readDoorTrimConfigMapForEdit,
  readDoorTrimModeOpts,
} from './canvas_picking_door_edit_shared.js';
import type { ReadUiFn } from './canvas_picking_door_action_hover_preview_contracts.js';
import { __asObject } from './canvas_picking_door_action_hover_preview_contracts.js';

function __readUiString(ui: UnknownRecord | null, key: string): string {
  const value = ui && typeof ui[key] === 'string' ? String(ui[key]) : '';
  return value.trim();
}

function __readPositiveDraftCm(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) && value > 0 ? Number(value) : null;
  if (typeof value === 'string') {
    const text = value.trim().replace(',', '.');
    if (!text) return null;
    const parsed = Number(text);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }
  return null;
}

export function __readMirrorDraft(
  readUi: ReadUiFn,
  App: AppContainer
): { widthCm?: unknown; heightCm?: unknown } {
  const ui = readUi(App);
  return {
    widthCm: ui?.currentMirrorDraftWidthCm,
    heightCm: ui?.currentMirrorDraftHeightCm,
  };
}

export function __hasMirrorSizedDraft(readUi: ReadUiFn, App: AppContainer): boolean {
  const draft = __readMirrorDraft(readUi, App);
  return __readPositiveDraftCm(draft.widthCm) != null || __readPositiveDraftCm(draft.heightCm) != null;
}

export function __readCurtainChoice(readUi: ReadUiFn, App: AppContainer): string {
  const ui = readUi(App);
  const direct = __readUiString(ui, 'curtainChoice');
  return direct || 'none';
}

export function __readMapRecord(App: AppContainer, key: string): UnknownRecord {
  return __asObject<UnknownRecord>(readMapOrEmpty(App, key)) || {};
}

export function __readDoorTrimModeDraft(App: AppContainer): {
  axis: 'vertical' | 'horizontal';
  color: string;
  span: string;
  sizeCm: number;
  crossSizeCm: number | undefined;
} {
  const modeOpts = __asObject<UnknownRecord>(readDoorTrimModeOpts(App)) || {};
  return {
    axis: normalizeDoorTrimAxis(modeOpts.trimAxis),
    color: normalizeDoorTrimColor(modeOpts.trimColor),
    span: normalizeDoorTrimSpan(modeOpts.trimSpan),
    sizeCm:
      typeof modeOpts.trimSizeCm === 'number' && Number.isFinite(modeOpts.trimSizeCm)
        ? Number(modeOpts.trimSizeCm)
        : 90,
    crossSizeCm:
      typeof modeOpts.trimCrossSizeCm === 'number' && Number.isFinite(modeOpts.trimCrossSizeCm)
        ? Number(modeOpts.trimCrossSizeCm)
        : undefined,
  };
}

export function __readDoorTrimConfigMap(App: AppContainer) {
  return readDoorTrimConfigMapForEdit(App);
}

export function __resolveMirrorFaceSignFromLocalPoint(localPoint: { z: number } | null): 1 | -1 {
  if (localPoint && typeof localPoint.z === 'number' && Number(localPoint.z) < 0) return -1;
  return 1;
}

export function __isSpecialPaintTarget(partId: string): boolean {
  if (!partId) return false;
  if (/^d\d+_/.test(partId)) return true;
  if (partId.startsWith('lower_d') && partId.indexOf('_') !== -1) return true;
  if (partId.startsWith('sliding') || partId.startsWith('slide')) return true;
  if (partId.startsWith('corner_door') || partId.startsWith('corner_pent_door')) return true;
  if (partId.startsWith('lower_corner_door') || partId.startsWith('lower_corner_pent_door')) return true;
  if (/^sketch_box(?:_free)?_.+_door(?:_|$)/.test(partId)) return true;
  if (partId.startsWith('sketch_ext_drawers_')) return true;
  if (/^sketch_box(?:_free)?_.+_ext_drawers_/.test(partId)) return true;
  return false;
}
