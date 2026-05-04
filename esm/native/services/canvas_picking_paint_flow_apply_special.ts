import type { MirrorLayoutEntry, MirrorLayoutList } from '../../../types';

import { readMirrorLayoutList } from '../features/mirror_layout.js';
import { resolveGlassFrameStylePaintSelection } from '../features/door_style_overrides.js';
import {
  __wp_canonDoorPartKeyForMaps,
  __wp_scopeCornerPartKeyForStack,
} from './canvas_picking_core_helpers.js';
import { resolveMirrorLayoutForPaintClick } from './canvas_picking_paint_flow_mirror.js';
import {
  isSpecialPart,
  isSpecialVal,
  readCurtainChoice,
  type MirrorLayoutClickResult,
} from './canvas_picking_paint_flow_shared.js';
import type { CanvasPaintClickArgs } from './canvas_picking_paint_flow_contracts.js';
import type { PaintFlowMutableState } from './canvas_picking_paint_flow_apply_state.js';

export type ResolveMirrorLayoutForPaintClickFn = (
  args: CanvasPaintClickArgs,
  layouts?: MirrorLayoutList | null
) => MirrorLayoutClickResult;

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
  const effectiveDoorId =
    typeof args.effectiveDoorId === 'string' && args.effectiveDoorId ? args.effectiveDoorId : null;
  const foundDrawerId =
    typeof args.foundDrawerId === 'string' && args.foundDrawerId ? args.foundDrawerId : null;
  const foundPartId = args.foundPartId;
  const rawTarget =
    effectiveDoorId && (!isSpecialPart(foundPartId) || isSpecialPart(effectiveDoorId))
      ? effectiveDoorId
      : foundDrawerId || foundPartId;
  return resolvePaintPartKey(rawTarget, args.activeStack);
}

function normalizeMirrorClickFaceSign(value: unknown): 1 | -1 {
  return typeof value === 'number' && Number.isFinite(value) && value < 0 ? -1 : 1;
}

function isFullDoorMirrorClick(result: MirrorLayoutClickResult): boolean {
  return !result.nextLayout && result.isFullDoorMirror !== false;
}

function createFullDoorMirrorLayout(faceSign: 1 | -1): MirrorLayoutEntry {
  return { faceSign };
}

function resolveMirrorLayoutsAfterAdd(args: {
  existingSpecial: string | null;
  existingMirrorLayouts: MirrorLayoutList;
  result: MirrorLayoutClickResult;
}): MirrorLayoutList | null {
  const { existingSpecial, existingMirrorLayouts, result } = args;
  if (result.nextLayout) {
    return existingSpecial === 'mirror'
      ? existingMirrorLayouts.concat([result.nextLayout])
      : [result.nextLayout];
  }

  if (!isFullDoorMirrorClick(result)) return null;

  const faceSign = normalizeMirrorClickFaceSign(result.hitFaceSign);
  if (existingSpecial !== 'mirror') return faceSign === -1 ? [createFullDoorMirrorLayout(-1)] : null;
  if (existingMirrorLayouts.length)
    return existingMirrorLayouts.concat([createFullDoorMirrorLayout(faceSign)]);

  // Legacy/canonical full mirror without a layout means “outside face”.
  // When the user clicks the inside face, preserve that existing outside mirror and add an explicit inside one.
  return faceSign === -1 ? [createFullDoorMirrorLayout(1), createFullDoorMirrorLayout(-1)] : null;
}

export function applyPaintPartMutation(args: {
  state: PaintFlowMutableState;
  paintPartKey: string;
  paintSelection: string;
  clickArgs: CanvasPaintClickArgs;
  resolveMirrorLayout?: ResolveMirrorLayoutForPaintClickFn;
}): void {
  const { state, paintPartKey, paintSelection, clickArgs } = args;
  const curtainChoice = readCurtainChoice(state.App);
  const existingCurtain = state.curtains0[paintPartKey];
  const existingSpecial = isSpecialVal(state.special0[paintPartKey])
    ? String(state.special0[paintPartKey])
    : null;
  const existingMirrorLayouts = readMirrorLayoutList(state.mirror0[paintPartKey]);
  const resolveMirrorLayout = args.resolveMirrorLayout || resolveMirrorLayoutForPaintClick;
  const glassFrameStyle = resolveGlassFrameStylePaintSelection(paintSelection);

  if (isSpecialPart(paintPartKey) && (paintSelection === 'mirror' || glassFrameStyle)) {
    if (paintSelection === 'mirror') {
      const mirrorResult = resolveMirrorLayout(clickArgs, existingMirrorLayouts);
      const { removeMatch, canApplyMirror } = mirrorResult;
      if (existingSpecial === 'mirror' && removeMatch) {
        const nextLayouts = existingMirrorLayouts.filter((_, idx) => idx !== removeMatch.index);
        if (nextLayouts.length) {
          state.ensureSpecial()[paintPartKey] = 'mirror';
          delete state.ensureCurtains()[paintPartKey];
          state.ensureMirrorLayout()[paintPartKey] = nextLayouts;
        } else {
          delete state.ensureSpecial()[paintPartKey];
          delete state.ensureCurtains()[paintPartKey];
          delete state.ensureMirrorLayout()[paintPartKey];
        }
        return;
      }

      if (!canApplyMirror) return;

      const isTogglingCanonicalOutsideMirror =
        existingSpecial === 'mirror' &&
        isFullDoorMirrorClick(mirrorResult) &&
        normalizeMirrorClickFaceSign(mirrorResult.hitFaceSign) === 1 &&
        !existingMirrorLayouts.length;
      if (isTogglingCanonicalOutsideMirror) {
        delete state.ensureSpecial()[paintPartKey];
        delete state.ensureCurtains()[paintPartKey];
        delete state.ensureMirrorLayout()[paintPartKey];
        return;
      }

      const nextLayouts = resolveMirrorLayoutsAfterAdd({
        existingSpecial,
        existingMirrorLayouts,
        result: mirrorResult,
      });

      state.ensureSpecial()[paintPartKey] = 'mirror';
      delete state.ensureCurtains()[paintPartKey];
      if (nextLayouts && nextLayouts.length) state.ensureMirrorLayout()[paintPartKey] = nextLayouts;
      else delete state.ensureMirrorLayout()[paintPartKey];
      return;
    }

    const existingStyle = state.style0[paintPartKey] || null;
    const shouldRemove =
      existingSpecial === 'glass' && existingCurtain === curtainChoice && existingStyle === glassFrameStyle;
    if (shouldRemove) {
      delete state.ensureSpecial()[paintPartKey];
      delete state.ensureCurtains()[paintPartKey];
      delete state.ensureMirrorLayout()[paintPartKey];
      return;
    }

    state.ensureSpecial()[paintPartKey] = 'glass';
    state.ensureCurtains()[paintPartKey] = curtainChoice;
    state.ensureStyle()[paintPartKey] = glassFrameStyle;
    delete state.ensureMirrorLayout()[paintPartKey];
    return;
  }

  const nextColors = state.ensureColors();
  const existingColor = nextColors[paintPartKey];
  if (existingColor === paintSelection) delete nextColors[paintPartKey];
  else nextColors[paintPartKey] = paintSelection;

  if (existingSpecial !== 'glass') delete state.ensureCurtains()[paintPartKey];
  if (existingSpecial !== 'mirror') delete state.ensureMirrorLayout()[paintPartKey];
}
