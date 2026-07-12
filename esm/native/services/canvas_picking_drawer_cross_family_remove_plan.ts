import type { ModuleConfigLike, UnknownRecord } from '../../../types';
import { formatIdentityValue, readIdentityValue } from '../../shared/identity_value_shared.js';
import { SKETCH_BOX_REGULAR_EXTERNAL_DRAWERS_KEY } from '../features/sketch_box_regular_external_drawers.js';
import { createCanvasPickingConfigStructuralPatchMeta } from './canvas_picking_config_patch_meta.js';
import type { ModuleKey, PatchConfigForKeyFn } from './canvas_picking_drawer_mode_flow_shared.js';
import type {
  CrossDrawerHit,
  SketchExternalDrawerListKind,
} from './canvas_picking_drawer_cross_family_model.js';

export type SketchExternalDrawerRemoveTarget =
  | {
      scope: 'module';
      drawerId: string;
    }
  | {
      scope: 'box';
      boxId: string;
      drawerId: string;
      listKind: SketchExternalDrawerListKind;
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
  let matchIndex = -1;
  for (let i = 0; i < list.length; i++) {
    const item = list[i];
    if (readString(item && typeof item === 'object' ? item.id : '') !== id) continue;
    if (matchIndex >= 0) return false;
    matchIndex = i;
  }
  if (matchIndex < 0) return false;
  list.splice(matchIndex, 1);
  return true;
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
  return normalizedPartId.startsWith(prefix) ? normalizedPartId.slice(prefix.length) : '';
}

export function sameCrossDrawerModuleKey(a: unknown, b: unknown): boolean {
  const left = readIdentityValue(a);
  const right = readIdentityValue(b);
  return left != null && right != null && formatIdentityValue(left) === formatIdentityValue(right);
}

export function resolveCrossDrawerRemovePlan(args: {
  hit: Pick<
    CrossDrawerHit,
    'family' | 'partId' | 'moduleIndex' | 'sketchExtDrawerId' | 'sketchBoxId' | 'sketchExternalListKind'
  >;
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
    const boxId = readString(hit.sketchBoxId);
    if (!drawerId) return null;
    if (boxId) {
      if (!hit.sketchExternalListKind) return null;
      return {
        kind: 'remove-sketch-external-drawer',
        moduleKey,
        target: {
          scope: 'box',
          boxId,
          drawerId,
          listKind: hit.sketchExternalListKind,
        },
      };
    }
    return {
      kind: 'remove-sketch-external-drawer',
      moduleKey,
      target: { scope: 'module', drawerId },
    };
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
  drawerId: string
): boolean {
  return removeListItemById(readArray(readSketchExtras(cfg as UnknownRecord), 'drawers'), drawerId);
}

export function removeSketchExternalDrawerTargetFromConfig(
  cfg: ModuleConfigLike | UnknownRecord,
  target: SketchExternalDrawerRemoveTarget
): boolean {
  const extra = readSketchExtras(cfg as UnknownRecord);
  if (target.scope === 'module') {
    return removeListItemById(readArray(extra, 'extDrawers'), target.drawerId);
  }
  const boxes = readArray(extra, 'boxes');
  const matchingBoxes = boxes.filter(box => readString(box?.id) === target.boxId);
  if (matchingBoxes.length !== 1) return false;
  const listKey: BoxExternalDrawerListKey =
    target.listKind === 'regular-external' ? SKETCH_BOX_REGULAR_EXTERNAL_DRAWERS_KEY : 'extDrawers';
  return removeListItemById(readArray(matchingBoxes[0] ?? null, listKey), target.drawerId);
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
    return removeSketchInternalDrawerFromConfig(cfg, plan.drawerId);
  }
  return removeStandardExternalDrawerFromConfig(cfg, plan.partId);
}

export function commitCrossDrawerRemovePlan(args: {
  plan: CrossDrawerRemovePlan;
  patchConfigForKey: PatchConfigForKeyFn;
  source: string;
}): boolean {
  let patchInvoked = false;
  let changed = false;
  args.patchConfigForKey(
    args.plan.moduleKey,
    cfg => {
      patchInvoked = true;
      const didChange = applyCrossDrawerRemovePlanToConfig(cfg, args.plan);
      changed = changed || didChange;
    },
    createCanvasPickingConfigStructuralPatchMeta(args.source)
  );
  return patchInvoked && changed;
}
