import type {
  AppContainer,
  DoorSpecialValue,
  DoorSurfaceOverlayKind,
  MirrorLayoutEntry,
  MirrorLayoutList,
} from '../../../types';

import {
  isAdhesiveGlassValue,
  materializeMirrorLayoutSurfaceKinds,
  readMirrorLayoutList,
  readMirrorLayoutSurfaceKind,
  readDoorVisualMapEntry,
  isDoorStyleOverrideValue,
  resolveGlassFrameStylePaintSelection,
  type DoorStyleOverrideValue,
} from '../features/door_authoring/api.js';
import {
  deleteDoorVisualOwnerAliasEntries,
  deletePrefixedDoorVisualOwnerAliasEntries,
  readPrefixedDoorVisualOwnerAliasValue,
} from './canvas_picking_door_visual_owner_map.js';
import { isHexCellDiagonalPanelPartId } from '../features/hex_cell/index.js';
import { resolveMirrorLayoutForPaintClick } from './canvas_picking_paint_flow_mirror.js';
import {
  isSpecialPart,
  readCurtainChoice,
  type MirrorLayoutClickResult,
  type ResolvedMirrorLayoutClickResult,
} from './canvas_picking_paint_flow_shared.js';
import {
  isDoorVisualInheritedOwner,
  materializeInheritedDoorVisualOwner,
  type DoorVisualSegmentMaterializeResult,
} from './canvas_picking_door_segment_materialization.js';
import type { ResolvedCanvasPaintCommand } from './canvas_picking_paint_command.js';
import type { PaintFlowMutableState } from './canvas_picking_paint_flow_apply_state.js';

const GLASS_PREVIOUS_STYLE_PREFIX = '__wp_glass_previous_door_style__:';
const GLASS_PREVIOUS_STYLE_NONE = '__wp_none__';

function getGlassPreviousStyleKey(partKey: string): string {
  return `${GLASS_PREVIOUS_STYLE_PREFIX}${partKey}`;
}

function normalizeCurtainChoiceForCompare(value: unknown): string {
  const text = typeof value === 'string' ? value.trim() : '';
  return text || 'none';
}

function readEffectiveMapEntry(
  map: Record<string, unknown> | null | undefined,
  partKey: string
): { key: string; value: unknown } | null {
  return readDoorVisualMapEntry(map, partKey);
}

function readEffectiveSpecialEntry(
  state: PaintFlowMutableState,
  partKey: string
): { key: string; value: Exclude<DoorSpecialValue, null> } | null {
  const entry = readEffectiveMapEntry(state.special0, partKey);
  return entry && (entry.value === 'mirror' || entry.value === 'glass' || isAdhesiveGlassValue(entry.value))
    ? { key: entry.key, value: entry.value }
    : null;
}

function readEffectiveTextEntry(
  map: Record<string, unknown> | null | undefined,
  partKey: string
): { key: string; value: string } | null {
  const entry = readEffectiveMapEntry(map, partKey);
  return entry && typeof entry.value === 'string' ? { key: entry.key, value: String(entry.value) } : null;
}

function readEffectiveDoorStyleEntry(
  state: PaintFlowMutableState,
  partKey: string
): { key: string; value: DoorStyleOverrideValue } | null {
  const entry = readEffectiveMapEntry(state.style0, partKey);
  return entry && isDoorStyleOverrideValue(entry.value) ? { key: entry.key, value: entry.value } : null;
}

function rememberDoorStyleBeforeGlass(state: PaintFlowMutableState, paintPartKey: string): void {
  const markerKey = getGlassPreviousStyleKey(paintPartKey);
  if (typeof state.special0[markerKey] !== 'undefined') return;
  const previousStyle = state.style0[paintPartKey];
  state.ensureSpecial()[markerKey] = isDoorStyleOverrideValue(previousStyle)
    ? previousStyle
    : GLASS_PREVIOUS_STYLE_NONE;
}

function restoreDoorStyleBeforeGlass(state: PaintFlowMutableState, paintPartKey: string): void {
  const previousStyle = readGlassPreviousStyleMarkerValue(state, paintPartKey);
  const nextStyle = state.ensureStyle();
  if (isDoorStyleOverrideValue(previousStyle)) nextStyle[paintPartKey] = previousStyle;
  else deleteDoorVisualOwnerAliasEntries(nextStyle, paintPartKey);
  deletePrefixedDoorVisualOwnerAliasEntries({
    map: state.ensureSpecial(),
    prefix: GLASS_PREVIOUS_STYLE_PREFIX,
    partId: paintPartKey,
  });
}

function clearDoorStyleBeforeGlassMarker(state: PaintFlowMutableState, paintPartKey: string): void {
  const marker = readPrefixedDoorVisualOwnerAliasValue({
    map: state.special,
    prefix: GLASS_PREVIOUS_STYLE_PREFIX,
    partId: paintPartKey,
  });
  const initialMarker = readPrefixedDoorVisualOwnerAliasValue({
    map: state.special0,
    prefix: GLASS_PREVIOUS_STYLE_PREFIX,
    partId: paintPartKey,
  });
  if (typeof marker !== 'undefined' || typeof initialMarker !== 'undefined') {
    deletePrefixedDoorVisualOwnerAliasEntries({
      map: state.ensureSpecial(),
      prefix: GLASS_PREVIOUS_STYLE_PREFIX,
      partId: paintPartKey,
    });
  }
}

function readGlassPreviousStyleMarkerValue(state: PaintFlowMutableState, paintPartKey: string): unknown {
  const currentValue = readPrefixedDoorVisualOwnerAliasValue({
    map: state.special,
    prefix: GLASS_PREVIOUS_STYLE_PREFIX,
    partId: paintPartKey,
  });
  if (typeof currentValue !== 'undefined') return currentValue;
  return readPrefixedDoorVisualOwnerAliasValue({
    map: state.special0,
    prefix: GLASS_PREVIOUS_STYLE_PREFIX,
    partId: paintPartKey,
  });
}

function restoreDoorStyleBeforeGlassToTarget(
  state: PaintFlowMutableState,
  targetPartKey: string,
  markerOwnerPartKey: string
): void {
  const previousStyle = readGlassPreviousStyleMarkerValue(state, markerOwnerPartKey);
  const nextStyle = state.ensureStyle();
  if (isDoorStyleOverrideValue(previousStyle)) nextStyle[targetPartKey] = previousStyle;
  else deleteDoorVisualOwnerAliasEntries(nextStyle, targetPartKey);
}

function restoreDoorStyleBeforeReplacingGlassSpecial(
  state: PaintFlowMutableState,
  targetPartKey: string,
  markerOwnerPartKey: string
): void {
  restoreDoorStyleBeforeGlassToTarget(state, targetPartKey, markerOwnerPartKey);
  if (markerOwnerPartKey === targetPartKey) {
    deletePrefixedDoorVisualOwnerAliasEntries({
      map: state.ensureSpecial(),
      prefix: GLASS_PREVIOUS_STYLE_PREFIX,
      partId: markerOwnerPartKey,
    });
  }
}

function materializeInheritedPaintMapOwner(args: {
  state: PaintFlowMutableState;
  map: Record<string, unknown> | null | undefined;
  targetPartKey: string;
  ownerPartKey: string | null | undefined;
}): DoorVisualSegmentMaterializeResult | null {
  return materializeInheritedDoorVisualOwner({
    App: args.state.App,
    map: args.map,
    targetPartId: args.targetPartKey,
    ownerPartId: args.ownerPartKey,
  });
}

function materializeGlassPreviousStyleMarkers(args: {
  state: PaintFlowMutableState;
  sourceOwnerPartKey: string;
  materialized: DoorVisualSegmentMaterializeResult | null;
}): void {
  const { state, sourceOwnerPartKey, materialized } = args;
  if (!materialized) return;
  const markerValue = readGlassPreviousStyleMarkerValue(state, sourceOwnerPartKey);
  const nextSpecial = state.ensureSpecial();
  for (let index = 0; index < materialized.segmentPartIds.length; index += 1) {
    const segmentPartId = materialized.segmentPartIds[index];
    if (!segmentPartId || segmentPartId === materialized.clickedPartId) continue;
    if (nextSpecial[segmentPartId] === 'glass') {
      nextSpecial[getGlassPreviousStyleKey(segmentPartId)] = isDoorStyleOverrideValue(markerValue)
        ? markerValue
        : GLASS_PREVIOUS_STYLE_NONE;
    }
  }
}

function deleteClickedDoorVisualEntries(args: {
  state: PaintFlowMutableState;
  partKey: string;
  includeStyle?: boolean;
}): void {
  const { state, partKey, includeStyle } = args;
  deleteDoorVisualOwnerAliasEntries(state.ensureSpecial(), partKey);
  deleteDoorVisualOwnerAliasEntries(state.ensureCurtains(), partKey);
  deleteDoorVisualOwnerAliasEntries(state.ensureMirrorLayout(), partKey);
  if (includeStyle) deleteDoorVisualOwnerAliasEntries(state.ensureStyle(), partKey);
}

export type ResolveMirrorLayoutForPaintClickFn = (
  args: {
    App: AppContainer;
    command: ResolvedCanvasPaintCommand;
    surfaceKind?: DoorSurfaceOverlayKind;
    fallbackSurfaceKind?: DoorSurfaceOverlayKind;
  },
  layouts?: MirrorLayoutList | null
) => MirrorLayoutClickResult;

function createFullDoorSurfaceLayout(
  surfaceKind: DoorSurfaceOverlayKind,
  faceSign: 1 | -1
): MirrorLayoutEntry {
  return faceSign === -1 ? { surfaceKind, faceSign: -1 } : { surfaceKind };
}

function resolveSurfaceLayoutsAfterAdd(args: {
  existingSpecial: DoorSpecialValue;
  existingMirrorLayouts: MirrorLayoutList;
  surfaceKind: DoorSurfaceOverlayKind;
  result: ResolvedMirrorLayoutClickResult;
}): MirrorLayoutList | null {
  const { existingSpecial, existingMirrorLayouts, surfaceKind, result } = args;
  const faceSign = result.hitFaceSign;
  const existingOverlayKind: DoorSurfaceOverlayKind | null =
    existingSpecial === 'mirror' || isAdhesiveGlassValue(existingSpecial) ? existingSpecial : null;
  const explicitExistingLayouts = existingMirrorLayouts.length
    ? existingMirrorLayouts
    : existingOverlayKind && existingOverlayKind !== surfaceKind
      ? [createFullDoorSurfaceLayout(existingOverlayKind, 1)]
      : [];

  if (!result.isFullDoorMirror) {
    return explicitExistingLayouts.concat([{ ...result.nextLayout, surfaceKind }]);
  }

  if (existingOverlayKind !== surfaceKind) {
    if (explicitExistingLayouts.length) {
      return explicitExistingLayouts.concat([createFullDoorSurfaceLayout(surfaceKind, faceSign)]);
    }
    return faceSign === -1 ? [createFullDoorSurfaceLayout(surfaceKind, -1)] : null;
  }

  if (existingMirrorLayouts.length) {
    return existingMirrorLayouts.concat([createFullDoorSurfaceLayout(surfaceKind, faceSign)]);
  }

  // Preserve the existing compact representation for a single outside full-face overlay.
  // If the user adds the inside face, materialize both faces so they remain independently removable.
  return faceSign === -1
    ? [createFullDoorSurfaceLayout(surfaceKind, 1), createFullDoorSurfaceLayout(surfaceKind, -1)]
    : null;
}

function resolveRepresentativeOverlaySpecial(
  layouts: MirrorLayoutList,
  fallback: DoorSurfaceOverlayKind
): DoorSurfaceOverlayKind {
  return layouts.length ? readMirrorLayoutSurfaceKind(layouts[0], fallback) : fallback;
}

export function applyPaintPartMutation(args: {
  state: PaintFlowMutableState;
  command: ResolvedCanvasPaintCommand;
  resolveMirrorLayout?: ResolveMirrorLayoutForPaintClickFn;
}): void {
  const { state, command } = args;
  const paintPartKey = command.canonicalPartKey;
  const paintSelection = command.selection;
  const curtainChoice = readCurtainChoice(state.App);
  const existingCurtainEntry = readEffectiveTextEntry(state.curtains0, paintPartKey);
  const existingCurtain = existingCurtainEntry?.value;
  const existingSpecialEntry = readEffectiveSpecialEntry(state, paintPartKey);
  const existingSpecial = existingSpecialEntry?.value ?? null;
  const specialOwnerKey = existingSpecialEntry?.key || paintPartKey;
  const existingMirrorEntry = readEffectiveMapEntry(state.mirror0, paintPartKey);
  const existingMirrorLayoutsRaw = readMirrorLayoutList(existingMirrorEntry?.value);
  const existingOverlayFallback: DoorSurfaceOverlayKind =
    existingSpecial === 'mirror' || isAdhesiveGlassValue(existingSpecial) ? existingSpecial : 'mirror';
  const existingMirrorLayouts = materializeMirrorLayoutSurfaceKinds(
    existingMirrorLayoutsRaw,
    existingOverlayFallback
  );
  const mirrorOwnerKey = existingMirrorLayouts.length
    ? existingMirrorEntry?.key || paintPartKey
    : specialOwnerKey;
  const existingStyleEntry = readEffectiveDoorStyleEntry(state, paintPartKey);
  const resolveMirrorLayout = args.resolveMirrorLayout || resolveMirrorLayoutForPaintClick;
  const glassFrameStyle = resolveGlassFrameStylePaintSelection(paintSelection);
  const isSpecialPaintPart = isSpecialPart(paintPartKey);
  const isHexCellDiagonalPaintPart = isHexCellDiagonalPanelPartId(paintPartKey);

  const surfaceKind: DoorSurfaceOverlayKind | null =
    paintSelection === 'mirror' || isAdhesiveGlassValue(paintSelection) ? paintSelection : null;

  if (isSpecialPaintPart && !isHexCellDiagonalPaintPart && surfaceKind) {
    const mirrorResult = resolveMirrorLayout(
      {
        App: state.App,
        command,
        surfaceKind,
        fallbackSurfaceKind: existingOverlayFallback,
      },
      existingMirrorLayouts
    );
    const { removeMatch, canApplyMirror } = mirrorResult;
    if (removeMatch) {
      const nextLayouts = existingMirrorLayouts.filter((_, idx) => idx !== removeMatch.index);
      const isInheritedSpecialOwner = isDoorVisualInheritedOwner({
        targetPartId: paintPartKey,
        ownerPartId: specialOwnerKey,
      });
      if (isInheritedSpecialOwner) {
        materializeInheritedPaintMapOwner({
          state,
          map: state.ensureSpecial(),
          targetPartKey: paintPartKey,
          ownerPartKey: specialOwnerKey,
        });
        materializeInheritedPaintMapOwner({
          state,
          map: state.ensureCurtains(),
          targetPartKey: paintPartKey,
          ownerPartKey: existingCurtainEntry?.key || specialOwnerKey,
        });
        materializeInheritedPaintMapOwner({
          state,
          map: state.ensureMirrorLayout(),
          targetPartKey: paintPartKey,
          ownerPartKey: existingMirrorEntry?.key || mirrorOwnerKey,
        });
        deleteClickedDoorVisualEntries({ state, partKey: paintPartKey });
        if (nextLayouts.length) {
          state.ensureSpecial()[paintPartKey] = resolveRepresentativeOverlaySpecial(nextLayouts, surfaceKind);
          state.ensureMirrorLayout()[paintPartKey] = nextLayouts;
        }
      } else if (nextLayouts.length) {
        state.ensureSpecial()[mirrorOwnerKey] = resolveRepresentativeOverlaySpecial(nextLayouts, surfaceKind);
        deleteDoorVisualOwnerAliasEntries(state.ensureCurtains(), mirrorOwnerKey);
        state.ensureMirrorLayout()[mirrorOwnerKey] = nextLayouts;
      } else {
        deleteDoorVisualOwnerAliasEntries(state.ensureSpecial(), mirrorOwnerKey);
        clearDoorStyleBeforeGlassMarker(state, mirrorOwnerKey);
        deleteDoorVisualOwnerAliasEntries(state.ensureCurtains(), mirrorOwnerKey);
        deleteDoorVisualOwnerAliasEntries(state.ensureMirrorLayout(), mirrorOwnerKey);
      }
      return;
    }

    if (!canApplyMirror) return;

    const isTogglingCanonicalOutsideMirror =
      existingSpecial === paintSelection &&
      mirrorResult.isFullDoorMirror &&
      mirrorResult.hitFaceSign === 1 &&
      !existingMirrorLayouts.length;
    if (isTogglingCanonicalOutsideMirror) {
      const isInheritedSpecialOwner = isDoorVisualInheritedOwner({
        targetPartId: paintPartKey,
        ownerPartId: specialOwnerKey,
      });
      if (isInheritedSpecialOwner) {
        materializeInheritedPaintMapOwner({
          state,
          map: state.ensureSpecial(),
          targetPartKey: paintPartKey,
          ownerPartKey: specialOwnerKey,
        });
        materializeInheritedPaintMapOwner({
          state,
          map: state.ensureCurtains(),
          targetPartKey: paintPartKey,
          ownerPartKey: existingCurtainEntry?.key || specialOwnerKey,
        });
        materializeInheritedPaintMapOwner({
          state,
          map: state.ensureMirrorLayout(),
          targetPartKey: paintPartKey,
          ownerPartKey: existingMirrorEntry?.key || mirrorOwnerKey,
        });
        deleteClickedDoorVisualEntries({ state, partKey: paintPartKey });
      } else {
        deleteDoorVisualOwnerAliasEntries(state.ensureSpecial(), specialOwnerKey);
        clearDoorStyleBeforeGlassMarker(state, specialOwnerKey);
        deleteDoorVisualOwnerAliasEntries(state.ensureCurtains(), specialOwnerKey);
        deleteDoorVisualOwnerAliasEntries(state.ensureMirrorLayout(), specialOwnerKey);
      }
      return;
    }

    const nextLayouts = resolveSurfaceLayoutsAfterAdd({
      existingSpecial,
      existingMirrorLayouts,
      surfaceKind,
      result: mirrorResult,
    });

    if (existingSpecial === 'glass') {
      restoreDoorStyleBeforeReplacingGlassSpecial(state, paintPartKey, specialOwnerKey);
    }
    state.ensureSpecial()[paintPartKey] = nextLayouts?.length
      ? resolveRepresentativeOverlaySpecial(nextLayouts, surfaceKind)
      : surfaceKind;
    clearDoorStyleBeforeGlassMarker(state, paintPartKey);
    deleteDoorVisualOwnerAliasEntries(state.ensureCurtains(), paintPartKey);
    if (nextLayouts?.length) state.ensureMirrorLayout()[paintPartKey] = nextLayouts;
    else deleteDoorVisualOwnerAliasEntries(state.ensureMirrorLayout(), paintPartKey);
    return;
  }

  if (isSpecialPaintPart && glassFrameStyle != null) {
    const existingStyle = existingStyleEntry?.value || null;
    const shouldRemove =
      existingSpecial === 'glass' &&
      normalizeCurtainChoiceForCompare(existingCurtain) === curtainChoice &&
      existingStyle === glassFrameStyle;
    if (shouldRemove) {
      const isInheritedSpecialOwner = isDoorVisualInheritedOwner({
        targetPartId: paintPartKey,
        ownerPartId: specialOwnerKey,
      });
      if (isInheritedSpecialOwner) {
        const materializedSpecial = materializeInheritedPaintMapOwner({
          state,
          map: state.ensureSpecial(),
          targetPartKey: paintPartKey,
          ownerPartKey: specialOwnerKey,
        });
        materializeInheritedPaintMapOwner({
          state,
          map: state.ensureCurtains(),
          targetPartKey: paintPartKey,
          ownerPartKey: existingCurtainEntry?.key || specialOwnerKey,
        });
        materializeInheritedPaintMapOwner({
          state,
          map: state.ensureStyle(),
          targetPartKey: paintPartKey,
          ownerPartKey: existingStyleEntry?.key || specialOwnerKey,
        });
        materializeInheritedPaintMapOwner({
          state,
          map: state.ensureMirrorLayout(),
          targetPartKey: paintPartKey,
          ownerPartKey: mirrorOwnerKey,
        });
        materializeGlassPreviousStyleMarkers({
          state,
          sourceOwnerPartKey: specialOwnerKey,
          materialized: materializedSpecial,
        });
        deleteClickedDoorVisualEntries({ state, partKey: paintPartKey, includeStyle: true });
        restoreDoorStyleBeforeGlassToTarget(state, paintPartKey, specialOwnerKey);
        deletePrefixedDoorVisualOwnerAliasEntries({
          map: state.ensureSpecial(),
          prefix: GLASS_PREVIOUS_STYLE_PREFIX,
          partId: specialOwnerKey,
        });
      } else {
        deleteDoorVisualOwnerAliasEntries(state.ensureSpecial(), specialOwnerKey);
        restoreDoorStyleBeforeGlass(state, specialOwnerKey);
        deleteDoorVisualOwnerAliasEntries(
          state.ensureCurtains(),
          existingCurtainEntry?.key || specialOwnerKey
        );
        deleteDoorVisualOwnerAliasEntries(state.ensureMirrorLayout(), mirrorOwnerKey);
      }
      return;
    }

    if (existingSpecial !== 'glass') rememberDoorStyleBeforeGlass(state, paintPartKey);
    state.ensureSpecial()[paintPartKey] = 'glass';
    state.ensureCurtains()[paintPartKey] = curtainChoice;
    state.ensureStyle()[paintPartKey] = glassFrameStyle;
    deleteDoorVisualOwnerAliasEntries(state.ensureMirrorLayout(), paintPartKey);
    return;
  }

  const nextColors = state.ensureColors();
  const existingColorEntry = readEffectiveTextEntry(state.colors0, paintPartKey);
  const existingColor = existingColorEntry?.value;
  if (existingColor === paintSelection) {
    const existingColorOwnerKey = existingColorEntry?.key || paintPartKey;
    if (
      isDoorVisualInheritedOwner({
        targetPartId: paintPartKey,
        ownerPartId: existingColorOwnerKey,
      })
    ) {
      materializeInheritedPaintMapOwner({
        state,
        map: nextColors,
        targetPartKey: paintPartKey,
        ownerPartKey: existingColorOwnerKey,
      });
      delete nextColors[paintPartKey];
    } else {
      delete nextColors[existingColorOwnerKey];
    }
  } else nextColors[paintPartKey] = paintSelection;

  if (existingSpecial !== 'glass') deleteDoorVisualOwnerAliasEntries(state.ensureCurtains(), paintPartKey);
  if (existingSpecial !== 'mirror')
    deleteDoorVisualOwnerAliasEntries(state.ensureMirrorLayout(), paintPartKey);
}
