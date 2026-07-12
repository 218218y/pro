import type { ModuleConfigLike, UnknownRecord } from '../../../types';
import { formatIdentityValue, readIdentityValue } from '../../shared/identity_value_shared.js';
import { SKETCH_BOX_REGULAR_EXTERNAL_DRAWERS_KEY } from '../features/sketch_box_regular_external_drawers.js';
import { createCanvasPickingConfigStructuralPatchMeta } from './canvas_picking_config_patch_meta.js';
import type { ModuleKey, PatchConfigForKeyFn } from './canvas_picking_drawer_mode_flow_shared.js';
import type { CrossDrawerHit } from './canvas_picking_drawer_cross_family_model.js';

export type SketchExternalDrawerRemoveTarget =
  | {
      kind: 'drawer-id';
      drawerId: string;
      boxId?: string;
      partId?: string;
    }
  | {
      kind: 'part-id';
      partId: string;
      boxId?: string;
    };

export type CrossDrawerRemovePlan =
  | {
      kind: 'remove-sketch-external-drawer';
      moduleKey: ModuleKey | 'corner';
      target: SketchExternalDrawerRemoveTarget;
    }
  | {
      kind: 'remove-sketch-internal-drawer';
      moduleKey: ModuleKey | 'corner';
      drawerId: string;
      partId: string;
    }
  | {
      kind: 'remove-standard-external-drawer';
      moduleKey: ModuleKey | 'corner';
      partId: string;
    };

type BoxExternalDrawerListKey = 'extDrawers' | typeof SKETCH_BOX_REGULAR_EXTERNAL_DRAWERS_KEY;

function readString(value: unknown): string {
  return formatIdentityValue(readIdentityValue(value));
}

function readSketchExtras(cfg: UnknownRecord): UnknownRecord | null {
  const current = cfg.sketchExtras;
  return current && typeof current === 'object' && !Array.isArray(current)
    ? (current as UnknownRecord)
    : null;
}

function readArray(record: UnknownRecord | null, key: string): UnknownRecord[] {
  const current = record ? record[key] : null;
  return Array.isArray(current) ? (current as UnknownRecord[]) : [];
}

function removeListItemById(list: UnknownRecord[], id: string): boolean {
  if (!id) return false;
  const idx = list.findIndex(item => readString(item && typeof item === 'object' ? item.id : '') === id);
  if (idx < 0) return false;
  list.splice(idx, 1);
  return true;
}

function partIdMatchesDrawerId(partId: string, drawerId: string): boolean {
  return !!drawerId && (partId.endsWith(`_${drawerId}`) || partId.includes(`_${drawerId}_`));
}

function removeSketchDrawerByPartSuffix(
  cfg: UnknownRecord,
  listKey: 'drawers' | 'extDrawers',
  partId: string
): boolean {
  const extra = readSketchExtras(cfg);
  const list = readArray(extra, listKey);
  for (let i = list.length - 1; i >= 0; i--) {
    const item = list[i];
    const id = readString(item && typeof item === 'object' ? item.id : '');
    if (partIdMatchesDrawerId(partId, id)) {
      list.splice(i, 1);
      return true;
    }
  }
  return false;
}

function removeSketchBoxExternalDrawerByTarget(
  box: UnknownRecord,
  listKey: BoxExternalDrawerListKey,
  target: SketchExternalDrawerRemoveTarget
): boolean {
  const list = readArray(box, listKey);
  if (target.kind === 'drawer-id' && removeListItemById(list, target.drawerId)) return true;

  const partId = target.partId || '';
  if (!partId) return false;
  for (let i = list.length - 1; i >= 0; i--) {
    const id = readString(list[i]?.id);
    if (partIdMatchesDrawerId(partId, id)) {
      list.splice(i, 1);
      return true;
    }
  }
  return false;
}

function coerceCrossDrawerModuleKey(value: unknown): ModuleKey | 'corner' | null {
  if (value === 'corner') return 'corner';
  if (typeof value === 'string' && /^corner:\d+$/.test(value)) return value as `corner:${number}`;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value);
    if (Number.isInteger(n) && Number.isFinite(n)) return n;
  }
  return null;
}

function stripSketchInternalDrawerSlotSuffix(partId: string): string {
  return partId.replace(/_(?:lower|upper)$/u, '');
}

function readSketchInternalDrawerIdFromPartId(partId: string, moduleKey: unknown): string {
  const normalizedPartId = stripSketchInternalDrawerSlotSuffix(partId);
  const prefix = `div_int_sketch_${String(moduleKey)}_`;
  if (normalizedPartId.startsWith(prefix)) return normalizedPartId.slice(prefix.length);
  const shortPrefix = 'div_int_sketch_';
  if (!normalizedPartId.startsWith(shortPrefix)) return '';
  const suffix = normalizedPartId.slice(shortPrefix.length);
  const splitAt = suffix.indexOf('_');
  return splitAt >= 0 ? suffix.slice(splitAt + 1) : suffix;
}

export function sameCrossDrawerModuleKey(a: unknown, b: unknown): boolean {
  const left = readIdentityValue(a);
  const right = readIdentityValue(b);
  return left != null && right != null && formatIdentityValue(left) === formatIdentityValue(right);
}

export function resolveCrossDrawerRemovePlan(args: {
  hit: Pick<CrossDrawerHit, 'family' | 'partId' | 'moduleIndex' | 'sketchExtDrawerId' | 'sketchBoxId'>;
  activeModuleKey: ModuleKey | 'corner' | null;
}): CrossDrawerRemovePlan | null {
  const { hit } = args;
  if (
    hit.moduleIndex &&
    args.activeModuleKey != null &&
    !sameCrossDrawerModuleKey(hit.moduleIndex, args.activeModuleKey)
  ) {
    return null;
  }

  const moduleKey = args.activeModuleKey ?? coerceCrossDrawerModuleKey(hit.moduleIndex);
  if (moduleKey == null) return null;

  if (hit.family === 'sketch_external') {
    const drawerId = readString(hit.sketchExtDrawerId);
    const partId = readString(hit.partId);
    const boxId = readString(hit.sketchBoxId) || undefined;
    if (drawerId) {
      return {
        kind: 'remove-sketch-external-drawer',
        moduleKey,
        target: {
          kind: 'drawer-id',
          drawerId,
          ...(boxId ? { boxId } : {}),
          ...(partId ? { partId } : {}),
        },
      };
    }
    if (partId) {
      return {
        kind: 'remove-sketch-external-drawer',
        moduleKey,
        target: {
          kind: 'part-id',
          partId,
          ...(boxId ? { boxId } : {}),
        },
      };
    }
    return null;
  }

  if (hit.family === 'sketch_internal') {
    const partId = readString(hit.partId);
    const drawerId = readSketchInternalDrawerIdFromPartId(partId, moduleKey);
    if (!partId || !drawerId) return null;
    return {
      kind: 'remove-sketch-internal-drawer',
      moduleKey,
      drawerId,
      partId,
    };
  }

  if (hit.family === 'standard_external') {
    const partId = readString(hit.partId);
    if (!partId) return null;
    return {
      kind: 'remove-standard-external-drawer',
      moduleKey,
      partId,
    };
  }

  return null;
}

export function removeSketchInternalDrawerFromConfig(
  cfg: ModuleConfigLike | UnknownRecord,
  partId: string
): boolean {
  return removeSketchDrawerByPartSuffix(cfg as UnknownRecord, 'drawers', partId);
}

export function removeSketchExternalDrawerFromConfig(
  cfg: ModuleConfigLike | UnknownRecord,
  drawerId: string,
  boxId?: string,
  partId?: string
): boolean {
  const target: SketchExternalDrawerRemoveTarget = drawerId
    ? {
        kind: 'drawer-id',
        drawerId,
        ...(boxId ? { boxId } : {}),
        ...(partId ? { partId } : {}),
      }
    : {
        kind: 'part-id',
        partId: partId || '',
        ...(boxId ? { boxId } : {}),
      };
  return removeSketchExternalDrawerTargetFromConfig(cfg, target);
}

export function removeSketchExternalDrawerTargetFromConfig(
  cfg: ModuleConfigLike | UnknownRecord,
  target: SketchExternalDrawerRemoveTarget
): boolean {
  const config = cfg as UnknownRecord;
  const extra = readSketchExtras(config);
  const topLevel = readArray(extra, 'extDrawers');
  if (target.kind === 'drawer-id' && removeListItemById(topLevel, target.drawerId)) return true;
  if (target.partId && removeSketchDrawerByPartSuffix(config, 'extDrawers', target.partId)) return true;

  const boxes = readArray(extra, 'boxes');
  const candidateBoxes = target.boxId ? boxes.filter(box => readString(box?.id) === target.boxId) : boxes;
  for (let i = 0; i < candidateBoxes.length; i++) {
    const box = candidateBoxes[i];
    if (!box || typeof box !== 'object') continue;
    if (removeSketchBoxExternalDrawerByTarget(box, 'extDrawers', target)) return true;
    if (removeSketchBoxExternalDrawerByTarget(box, SKETCH_BOX_REGULAR_EXTERNAL_DRAWERS_KEY, target)) {
      return true;
    }
  }
  return false;
}

export function removeStandardInternalDrawerFromConfig(
  _cfg: ModuleConfigLike | UnknownRecord,
  _partId: string,
  _slotHint?: number | null
): boolean {
  return false;
}

export function removeStandardExternalDrawerFromConfig(
  cfg: ModuleConfigLike | UnknownRecord,
  partId: string
): boolean {
  const rec = cfg as UnknownRecord;
  if (/^d\d+_draw_shoe$/.test(partId)) {
    if (rec.hasShoeDrawer) {
      rec.hasShoeDrawer = false;
      return true;
    }
    return false;
  }
  if (/^d\d+_draw_\d+$/.test(partId)) {
    if (Number(rec.extDrawersCount) !== 0) {
      rec.extDrawersCount = 0;
      return true;
    }
    return false;
  }
  return false;
}

export function applyCrossDrawerRemovePlanToConfig(
  cfg: ModuleConfigLike | UnknownRecord,
  plan: CrossDrawerRemovePlan
): boolean {
  if (plan.kind === 'remove-sketch-external-drawer') {
    return removeSketchExternalDrawerTargetFromConfig(cfg, plan.target);
  }
  if (plan.kind === 'remove-sketch-internal-drawer') {
    return removeSketchInternalDrawerFromConfig(cfg, plan.partId);
  }
  return removeStandardExternalDrawerFromConfig(cfg, plan.partId);
}

export function commitCrossDrawerRemovePlan(args: {
  plan: CrossDrawerRemovePlan;
  patchConfigForKey: PatchConfigForKeyFn;
  source: string;
}): boolean {
  args.patchConfigForKey(
    args.plan.moduleKey,
    cfg => {
      applyCrossDrawerRemovePlanToConfig(cfg, args.plan);
    },
    createCanvasPickingConfigStructuralPatchMeta(args.source)
  );
  return true;
}
