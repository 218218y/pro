import type { AppContainer } from '../../../types';

import {
  isAdhesiveGlassValue,
  parseDoorStyleOverridePaintToken,
  resolveGlassFrameStylePaintSelection,
} from '../features/door_authoring/api.js';
import {
  __wp_canonDoorPartKeyForMaps,
  __wp_scopeCornerPartKeyForStack,
} from './canvas_picking_core_helpers.js';
import type { CanvasPaintClickArgs } from './canvas_picking_paint_flow_contracts.js';
import {
  getPaintSourceTag,
  hasLiveMaterialRefresh,
  isSpecialPart,
} from './canvas_picking_paint_flow_shared.js';
import {
  inferCanvasPickingTargetKind,
  type CanvasPickingHitIdentity,
  type CanvasPickingHitTargetKind,
} from './canvas_picking_hit_identity.js';
import {
  readCanvasPaintTargetScopeFromObject,
  type CanvasPaintTargetScope,
} from './canvas_picking_paint_target_scope.js';

export type CanvasPaintMutationKind =
  'color' | 'group' | 'mirror' | 'adhesiveGlass' | 'glassFrame' | 'doorStyle' | 'unsupported';

export type PaintInvalidationKind = 'materialRefreshOnly' | 'structuralRebuild' | 'noChange';

export type CanvasPaintHitReferences = {
  readonly primaryObject: unknown | null;
  readonly doorObject: unknown | null;
  readonly primaryPoint: unknown | null;
  readonly doorPoint: unknown | null;
};

export type ResolvedCanvasPaintCommand = {
  readonly selection: string;
  readonly sourceTag: string;
  readonly targetKind: CanvasPickingHitTargetKind;
  readonly originalFoundPartId: string;
  readonly canonicalPartKey: string;
  readonly effectiveDoorId: string | null;
  readonly drawerId: string | null;
  readonly stack: 'top' | 'bottom';
  readonly targetScope: CanvasPaintTargetScope;
  readonly hitIdentity: CanvasPickingHitIdentity | null;
  readonly hitReferences: CanvasPaintHitReferences;
  readonly mutationKind: CanvasPaintMutationKind;
  readonly invalidationKind: PaintInvalidationKind;
};

function cleanString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export function resolvePaintPartKey(foundPartId: string, activeStack: 'top' | 'bottom'): string {
  const scoped = __wp_scopeCornerPartKeyForStack(foundPartId, activeStack);
  return __wp_canonDoorPartKeyForMaps(scoped);
}

export function resolveDirectPaintTargetKey(args: {
  foundPartId: string;
  effectiveDoorId?: string | null;
  foundDrawerId?: string | null;
  activeStack: 'top' | 'bottom';
}): string {
  const effectiveDoorId = cleanString(args.effectiveDoorId);
  const foundDrawerId = cleanString(args.foundDrawerId);
  const foundPartId = args.foundPartId;
  const rawTarget =
    effectiveDoorId && (!isSpecialPart(foundPartId) || isSpecialPart(effectiveDoorId))
      ? effectiveDoorId
      : foundDrawerId || foundPartId;
  return resolvePaintPartKey(rawTarget, args.activeStack);
}

function resolvePaintCommandMutationKind(args: {
  selection: string;
  sourceTag: string;
  canonicalPartKey: string;
}): CanvasPaintMutationKind {
  if (parseDoorStyleOverridePaintToken(args.selection)) return 'doorStyle';
  if (args.selection === 'mirror') return isSpecialPart(args.canonicalPartKey) ? 'mirror' : 'unsupported';
  if (isAdhesiveGlassValue(args.selection))
    return isSpecialPart(args.canonicalPartKey) ? 'adhesiveGlass' : 'unsupported';
  if (resolveGlassFrameStylePaintSelection(args.selection) != null)
    return isSpecialPart(args.canonicalPartKey) ? 'glassFrame' : 'unsupported';
  return args.sourceTag === 'paint.apply:group' || args.sourceTag === 'paint.apply:corner'
    ? 'group'
    : 'color';
}

function resolveCommandInvalidationKind(
  App: AppContainer,
  mutationKind: CanvasPaintMutationKind
): PaintInvalidationKind {
  if (mutationKind === 'unsupported') return 'noChange';
  if ((mutationKind === 'color' || mutationKind === 'group') && hasLiveMaterialRefresh(App)) {
    return 'materialRefreshOnly';
  }
  return 'structuralRebuild';
}

function resolveCommandTargetKind(args: {
  hitIdentity: CanvasPickingHitIdentity | null;
  canonicalPartKey: string;
  drawerId: string | null;
  effectiveDoorId: string | null;
}): CanvasPickingHitTargetKind {
  return (
    args.hitIdentity?.targetKind ||
    inferCanvasPickingTargetKind(args.canonicalPartKey, args.drawerId, args.effectiveDoorId)
  );
}

export function resolveCanvasPaintCommand(
  args: CanvasPaintClickArgs,
  paintSelection: string
): ResolvedCanvasPaintCommand {
  const originalFoundPartId = args.foundPartId || '';
  const effectiveDoorId = cleanString(args.effectiveDoorId);
  const drawerId = cleanString(args.foundDrawerId);
  const stack = args.activeStack;
  const canonicalPartKey = resolveDirectPaintTargetKey({
    foundPartId: originalFoundPartId,
    effectiveDoorId,
    foundDrawerId: drawerId,
    activeStack: stack,
  });
  const sourceTag = getPaintSourceTag(paintSelection, originalFoundPartId);
  const mutationKind = resolvePaintCommandMutationKind({
    selection: paintSelection,
    sourceTag,
    canonicalPartKey,
  });
  const hitIdentity = args.hitIdentity || null;
  return {
    selection: paintSelection,
    sourceTag,
    targetKind: resolveCommandTargetKind({ hitIdentity, canonicalPartKey, drawerId, effectiveDoorId }),
    originalFoundPartId,
    canonicalPartKey,
    effectiveDoorId,
    drawerId,
    stack,
    targetScope: readCanvasPaintTargetScopeFromObject(args.App, args.primaryHitObject || args.doorHitObject),
    hitIdentity,
    hitReferences: {
      primaryObject: args.primaryHitObject ?? null,
      doorObject: args.doorHitObject ?? null,
      primaryPoint: args.primaryHitPoint ?? null,
      doorPoint: args.doorHitPoint ?? null,
    },
    mutationKind,
    invalidationKind: resolveCommandInvalidationKind(args.App, mutationKind),
  };
}
