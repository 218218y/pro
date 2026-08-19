import type { AppContainer, DoorVisualEntryLike, GrooveLayoutEntry, UnknownRecord } from '../../../types';
import { formatIdentityValue, readIdentityValue } from '../../shared/identity_value_shared.js';

import {
  doesGrooveLayoutOverlapMirrorOnFace,
  hasMirrorSurfaceOnFace,
  readDoorVisualMirrorLayout,
} from '../features/door_authoring/api.js';
import { setDoorsOpenViaService } from '../runtime/doors_access.js';
import { getDoorsArray } from '../runtime/render_access.js';
import {
  normalizeKnownMapSnapshot,
  patchDoorGrooveLinesCountEntries,
  patchDoorGrooveMapEntries,
  patchDoorGrooveLayoutEntries,
  toggleGrooveKey,
  writeHinge,
} from '../runtime/maps_access.js';
import { callDoorsAction, hasDoorsAction } from '../runtime/actions_access_domains.js';
import { toggleGrooveViaActions } from '../runtime/actions_access_mutations.js';
import {
  createCanvasPickingDoorAuthoringRefreshGatedMeta,
  createCanvasPickingDoorAuthoringStructuralMeta,
} from './canvas_picking_door_authoring_meta.js';
import {
  computeAutoGrooveLinesCount,
  normalizeGrooveLinesCount,
  readGrooveLinesCountOverride,
  readGrooveLinesCountForPart,
  readPendingGrooveLinesCountForPart,
  resolvePendingGrooveLinesCount,
} from '../runtime/groove_lines_access.js';
import {
  readDoorPartIdFromHitObject,
  readDoorWidthFromHitObject,
  readGrooveSurfaceRectFromUserData,
  readPointXYZ,
  resolveGrooveSurfaceOwnerByPartId,
} from './canvas_picking_door_shared.js';
import { readCanvasDoorSplitNodeOwnBounds } from './canvas_picking_door_split_bounds_shared.js';
import {
  asRecord,
  buildGrooveLayoutFromHit,
  findGrooveLayoutMatchInRect,
  readGrooveLinesCountMap,
  readGrooveLayoutListForPart,
  resolveGroovePlacementInRect,
  writePendingGrooveLinesCountForPart,
} from './canvas_picking_door_edit_shared.js';
import {
  isSketchBoxDoorSegmentPartId,
  parseSketchBoxDoorTarget,
  patchSketchBoxDoor,
  readSketchBoxDoorRecord,
} from './canvas_picking_door_sketch_box_edit.js';
import {
  toCanonicalDoorGrooveTargetKey,
  toCanonicalGrooveLinesCountMapKey,
  toCanonicalGroovesMapKey,
} from '../../shared/door_groove_key_contracts_shared.js';
import { requestDoorAuthoringImmediateRefresh } from './canvas_picking_door_authoring_burst.js';
import {
  hasAnyDoorGrooveSegmentMapEntry,
  isDoorGrooveSegmentPartId,
  readDoorGrooveBasePartId,
  readDoorGrooveFullPartId,
  readDoorGrooveLinesCountForPart,
  readDoorGrooveMapFlag,
  readDoorGrooveVisualMapFlag,
} from './canvas_picking_door_groove_segments.js';
import { readDoorVisualSiblingSegmentPartIds } from './canvas_picking_door_segment_materialization.js';
import {
  __wp_str,
  __wp_hingeDir,
  __wp_map,
  __wp_isMultiMode,
  __wp_colorGet,
  __wp_toast,
  __wp_canonDoorPartKeyForMaps,
  __wp_scopeCornerPartKeyForStack,
  __wp_historyBatch,
  __wp_ui,
} from './canvas_picking_core_helpers.js';

export interface CanvasDoorHingeClickArgs {
  App: AppContainer;
  effectiveDoorId: string;
}

export function handleCanvasDoorHingeClick(args: CanvasDoorHingeClickArgs): boolean {
  const { App, effectiveDoorId } = args;
  const doorIdStr = __wp_str(App, effectiveDoorId);
  let hingeKey: string;

  if (doorIdStr.startsWith('d')) {
    const [head = ''] = doorIdStr.split('_');
    const doorIdRaw = head.replace('d', '');
    hingeKey = `door_hinge_${doorIdRaw}`;
  } else {
    const [first = '', second = '', third = ''] = doorIdStr.split('_');
    hingeKey = `${first}_${second}_${third}_hinge`;
  }

  const doorsArray = getDoorsArray(App);
  const relatedDoor = doorsArray.find((door: DoorVisualEntryLike) => {
    const pid = door && door.group && door.group.userData ? door.group.userData.partId : null;
    const partId = formatIdentityValue(readIdentityValue(pid));
    return partId === doorIdStr || (!!partId && doorIdStr.includes(partId));
  });

  let currentDir: 'left' | 'right' = 'left';
  if (relatedDoor && (relatedDoor.hingeSide === 'left' || relatedDoor.hingeSide === 'right')) {
    currentDir = relatedDoor.hingeSide;
  } else {
    currentDir = __wp_hingeDir(App, hingeKey, 'left');
  }

  const nextHinge = currentDir === 'left' ? 'right' : 'left';
  if (hasDoorsAction(App, 'setHinge')) {
    callDoorsAction(
      App,
      'setHinge',
      hingeKey,
      nextHinge,
      createCanvasPickingDoorAuthoringStructuralMeta('hinge:click')
    );
  } else {
    writeHinge(App, hingeKey, nextHinge, createCanvasPickingDoorAuthoringStructuralMeta('hinge:click'));
  }
  requestDoorAuthoringImmediateRefresh(App, 'hinge:click');
  setDoorsOpenViaService(App, false, { forceUpdate: true });
  return true;
}

export interface CanvasDoorGrooveClickArgs {
  App: AppContainer;
  effectiveDoorId: string | null;
  foundPartId: string | null;
  activeStack: 'top' | 'bottom';
  foundModuleStack: 'top' | 'bottom';
  doorHitY?: number | null | undefined;
  doorHitPoint?: UnknownRecord | null | undefined;
  doorHitObject: unknown;
  doorHitGroup?: UnknownRecord | null | undefined;
}

function readGrooveLayoutToolState(App: AppContainer): {
  usesLayoutPlacement: boolean;
  manual: boolean;
  widthCm: unknown;
  heightCm: unknown;
  orientation: 'vertical' | 'horizontal';
} {
  const ui = __wp_ui(App);
  const manual = ui.grooveManualEnabled === true;
  const orientation = ui.currentGrooveOrientation === 'horizontal' ? 'horizontal' : 'vertical';
  return {
    usesLayoutPlacement: manual || orientation === 'horizontal',
    manual,
    widthCm: ui.currentGrooveDraftWidthCm,
    heightCm: ui.currentGrooveDraftHeightCm,
    orientation,
  };
}

function handleCanvasDoorGrooveLayoutClick(args: {
  App: AppContainer;
  targetId: string;
  doorHitPoint?: UnknownRecord | null | undefined;
  doorHitObject: unknown;
  doorHitGroup?: UnknownRecord | null | undefined;
  foundModuleStack: 'top' | 'bottom';
}): boolean | null {
  const tool = readGrooveLayoutToolState(args.App);
  const currentLookup = readGrooveLayoutListForPart({
    map: __wp_map(args.App, 'grooveLayoutMap'),
    partId: args.targetId,
  });
  const currentLayouts = currentLookup?.layouts || [];
  if (!tool.usesLayoutPlacement && !currentLayouts.length) return null;

  const surfaceOwner = resolveGrooveSurfaceOwnerByPartId(
    (asRecord(args.doorHitObject) || asRecord(args.doorHitGroup)) as UnknownRecord | null,
    args.targetId
  );
  const surfaceUserData = asRecord(surfaceOwner?.userData);
  const surfaceRect = readGrooveSurfaceRectFromUserData(surfaceUserData);
  const hitPoint = asRecord(args.doorHitPoint) as (UnknownRecord & { clone?: () => unknown }) | null;
  const localHitVector = hitPoint && typeof hitPoint.clone === 'function' ? hitPoint.clone() : null;
  if (
    !surfaceOwner ||
    !surfaceRect ||
    !readPointXYZ(localHitVector) ||
    typeof surfaceOwner.worldToLocal !== 'function'
  ) {
    __wp_toast(args.App, 'לא ניתן לזהות בבטחה את אזור החריטה בדלת זו', 'error');
    return true;
  }

  if (!localHitVector) {
    __wp_toast(args.App, 'לא ניתן למקם את החריטה בדלת זו', 'error');
    return true;
  }
  try {
    surfaceOwner.worldToLocal(localHitVector as { x: number; y: number; z: number });
  } catch {
    __wp_toast(args.App, 'לא ניתן למקם את החריטה בדלת זו', 'error');
    return true;
  }
  const localHit = readPointXYZ(localHitVector);
  if (!localHit) return true;

  const removeMatch = findGrooveLayoutMatchInRect({
    rect: surfaceRect,
    layouts: currentLayouts,
    hitX: localHit.x,
    hitY: localHit.y,
  });
  const groovesMap = normalizeKnownMapSnapshot('groovesMap', __wp_map(args.App, 'groovesMap'));
  const hasCanonicalFullVertical =
    !currentLayouts.length && readDoorGrooveVisualMapFlag(groovesMap, args.targetId) === true;
  const currentPartLinesCount =
    readGrooveLinesCountForPart(args.App, args.targetId) ??
    readPendingGrooveLinesCountForPart(args.App, args.targetId);
  const nextLayouts = currentLayouts.map(layout => {
    const storedLinesCount = normalizeGrooveLinesCount(layout.linesCount);
    if (storedLinesCount != null) return { ...layout, linesCount: storedLinesCount };
    const placement = resolveGroovePlacementInRect({ rect: surfaceRect, layout });
    const distributionSpan = placement.orientation === 'horizontal' ? placement.heightM : placement.widthM;
    return {
      ...layout,
      linesCount: currentPartLinesCount ?? computeAutoGrooveLinesCount(distributionSpan),
    };
  });
  let nextGrooveOn = true;
  let nextGrooveLinesCount: number | null = null;

  const nextLayout = buildGrooveLayoutFromHit({
    rect: surfaceRect,
    hitX: localHit.x,
    hitY: localHit.y,
    draft: {
      widthCm: tool.manual ? tool.widthCm : null,
      heightCm: tool.manual ? tool.heightCm : null,
      orientation: tool.orientation,
    },
  });

  const resolveNextGrooveLinesCount = (layout: GrooveLayoutEntry | null): number => {
    const placement = resolveGroovePlacementInRect({ rect: surfaceRect, layout });
    const distributionSpan = placement.orientation === 'horizontal' ? placement.heightM : placement.widthM;
    return resolvePendingGrooveLinesCount(args.App, distributionSpan, undefined, args.targetId);
  };

  const isPureRemoval =
    (removeMatch && removeMatch.placement.orientation === tool.orientation) ||
    (hasCanonicalFullVertical && tool.orientation === 'vertical');
  if (!isPureRemoval && __wp_isMultiMode(args.App)) {
    const matType = __wp_colorGet(args.App, args.targetId);
    if (matType === 'glass') {
      toastOutsideGrooveBlocked(args.App);
      return true;
    }
    if (
      matType === 'mirror' &&
      doesGrooveLayoutOverlapMirrorOnFace({
        rect: surfaceRect,
        grooveLayout: nextLayout,
        mirrorLayouts: readDoorVisualMirrorLayout(__wp_map(args.App, 'mirrorLayoutMap'), args.targetId),
        faceSign: 1,
        defaultSurfaceFaceSign: 1,
      })
    ) {
      __wp_toast(args.App, 'לא ניתן למקם חריטה באזור שחופף למראה', 'error');
      return true;
    }
  }

  if (removeMatch && removeMatch.placement.orientation !== tool.orientation) {
    nextLayouts.splice(removeMatch.index, 1);
    nextGrooveLinesCount = resolveNextGrooveLinesCount(nextLayout);
    if (nextLayout) {
      nextLayouts.splice(removeMatch.index, 0, {
        ...nextLayout,
        linesCount: nextGrooveLinesCount,
      });
    }
  } else if (removeMatch) {
    nextLayouts.splice(removeMatch.index, 1);
    nextGrooveOn = nextLayouts.length > 0;
  } else if (hasCanonicalFullVertical && tool.orientation === 'vertical') {
    nextGrooveOn = false;
  } else {
    nextGrooveLinesCount = resolveNextGrooveLinesCount(nextLayout);
    if (nextLayout) nextLayouts.push({ ...nextLayout, linesCount: nextGrooveLinesCount });
  }

  const grooveKey = toCanonicalGroovesMapKey(args.targetId);
  const layoutPatchValue: GrooveLayoutEntry[] | null = nextLayouts.length ? nextLayouts : null;
  const partLinesCountValue = nextGrooveOn && !layoutPatchValue ? nextGrooveLinesCount : null;
  const structuralMeta = createCanvasPickingDoorAuthoringStructuralMeta('groove:layout:click');
  const refreshMeta = createCanvasPickingDoorAuthoringRefreshGatedMeta(
    args.App,
    'groove:layout:click',
    structuralMeta
  );
  __wp_historyBatch(args.App, structuralMeta, () => {
    const sketchTarget = parseSketchBoxDoorTarget(args.targetId);
    if (sketchTarget && !isSketchBoxDoorSegmentPartId(args.targetId)) {
      patchSketchBoxDoor(
        args.App,
        sketchTarget,
        args.foundModuleStack,
        current =>
          current && current.enabled !== false
            ? {
                ...current,
                groove: nextGrooveOn,
                grooveLinesCount: partLinesCountValue,
              }
            : current,
        { source: 'groove:layout:click' }
      );
    }
    writePendingGrooveLinesCountForPart(
      args.App,
      args.targetId,
      partLinesCountValue,
      'groove:layout:click:pendingCount'
    );
    patchDoorGrooveLinesCountEntries(
      args.App,
      [{ key: toCanonicalGrooveLinesCountMapKey(args.targetId), value: partLinesCountValue }],
      refreshMeta
    );
    patchDoorGrooveLayoutEntries(args.App, [{ key: args.targetId, value: layoutPatchValue }], refreshMeta);
    patchDoorGrooveMapEntries(args.App, [{ key: grooveKey, value: nextGrooveOn }], refreshMeta);
    return undefined;
  });
  requestDoorAuthoringImmediateRefresh(args.App, 'groove:layout:click');
  return true;
}

type GrooveHitNode = {
  userData?: Record<string, unknown> | null;
  children?: unknown[] | null;
};

function readGrooveHitNodePartId(node: unknown): string {
  const rec = asRecord(node) as GrooveHitNode | null;
  const userData = asRecord(rec?.userData);
  return typeof userData?.partId === 'string' ? toCanonicalDoorGrooveTargetKey(userData.partId) : '';
}

function readGrooveHitNodeChildren(node: unknown): unknown[] {
  const rec = asRecord(node) as GrooveHitNode | null;
  return Array.isArray(rec?.children) ? rec.children : [];
}

type SketchBoxInheritedGrooveState = {
  groove: true;
  grooveLinesCount: number | null;
};

function readSketchBoxInheritedGrooveStateFromHitObject(args: {
  doorHitObject: unknown;
  basePartId: string;
}): SketchBoxInheritedGrooveState | null {
  const basePartId = toCanonicalDoorGrooveTargetKey(args.basePartId);
  if (!basePartId) return null;

  let current = asRecord(args.doorHitObject) as (GrooveHitNode & { parent?: unknown }) | null;
  const seen = new Set<unknown>();
  while (current && !seen.has(current)) {
    seen.add(current);
    const userData = asRecord(current.userData);
    const partId = readGrooveHitNodePartId(current);
    const partMatches = !partId || partId === basePartId || readDoorGrooveBasePartId(partId) === basePartId;

    if (partMatches && userData?.__wpSketchBoxDoorGroove === true) {
      return {
        groove: true,
        grooveLinesCount: normalizeGrooveLinesCount(userData.__wpSketchBoxDoorGrooveLinesCount),
      };
    }

    current = asRecord((current as { parent?: unknown }).parent) as
      (GrooveHitNode & { parent?: unknown }) | null;
  }

  return null;
}

function isHitYInsideBounds(hitY: number, bounds: { minY: number; maxY: number }): boolean {
  const epsilon = 1e-6;
  return hitY >= bounds.minY - epsilon && hitY <= bounds.maxY + epsilon;
}

function hasOutsideMirrorSurfaceForGroove(App: AppContainer, partId: string): boolean {
  const mirrorLayout = readDoorVisualMirrorLayout(__wp_map(App, 'mirrorLayoutMap'), partId);
  return hasMirrorSurfaceOnFace(mirrorLayout, 1, 1);
}

function blocksOutsideGrooveForPart(App: AppContainer, partId: string): boolean {
  if (!__wp_isMultiMode(App)) return false;
  const matType = __wp_colorGet(App, partId);
  return matType === 'glass' || (matType === 'mirror' && hasOutsideMirrorSurfaceForGroove(App, partId));
}

function toastOutsideGrooveBlocked(App: AppContainer): void {
  __wp_toast(App, 'לא ניתן לבצע חריטה על זכוכית או מראה', 'error');
}

function resolveSketchBoxSegmentTargetFromHitY(args: {
  App: AppContainer;
  targetId: string;
  doorHitY: number | null | undefined;
}): string {
  const hitY = typeof args.doorHitY === 'number' && Number.isFinite(args.doorHitY) ? args.doorHitY : null;
  if (hitY == null) return args.targetId;

  const targetId = toCanonicalDoorGrooveTargetKey(args.targetId);
  const basePartId = isSketchBoxDoorSegmentPartId(targetId) ? readDoorGrooveBasePartId(targetId) : targetId;
  if (!basePartId || !parseSketchBoxDoorTarget(basePartId)) return args.targetId;

  let resolvedPartId = '';
  let resolvedSpan = Infinity;
  const visit = (node: unknown) => {
    const stack: unknown[] = [node];
    const seen = new Set<unknown>();
    while (stack.length) {
      const current = stack.pop();
      if (!current || seen.has(current)) continue;
      seen.add(current);

      const partId = readGrooveHitNodePartId(current);
      if (partId && isSketchBoxDoorSegmentPartId(partId) && readDoorGrooveBasePartId(partId) === basePartId) {
        const bounds = readCanvasDoorSplitNodeOwnBounds(args.App, current);
        if (bounds && isHitYInsideBounds(hitY, bounds)) {
          const span = bounds.maxY - bounds.minY;
          if (span > 0 && span < resolvedSpan) {
            resolvedSpan = span;
            resolvedPartId = partId;
          }
        }
      }

      const children = readGrooveHitNodeChildren(current);
      for (let index = 0; index < children.length; index += 1) stack.push(children[index]);
    }
  };

  try {
    const doorsArray = getDoorsArray(args.App);
    for (let index = 0; index < doorsArray.length; index += 1) {
      visit(doorsArray[index]?.group);
    }
  } catch {
    return args.targetId;
  }

  return resolvedPartId || args.targetId;
}

export function handleCanvasDoorGrooveClick(args: CanvasDoorGrooveClickArgs): boolean {
  const {
    App,
    effectiveDoorId,
    foundPartId,
    activeStack,
    foundModuleStack,
    doorHitObject,
    doorHitY,
    doorHitPoint,
    doorHitGroup,
  } = args;
  const doorHitRecord = asRecord(doorHitObject);
  const targetIdRaw = readDoorPartIdFromHitObject(doorHitRecord) || effectiveDoorId || foundPartId;
  const targetId = resolveSketchBoxSegmentTargetFromHitY({
    App,
    targetId: toCanonicalDoorGrooveTargetKey(
      __wp_canonDoorPartKeyForMaps(__wp_scopeCornerPartKeyForStack(targetIdRaw, activeStack))
    ),
    doorHitY,
  });
  const clickedDoorWidth = readDoorWidthFromHitObject(doorHitRecord);
  const grooveLinesCountForClick = resolvePendingGrooveLinesCount(App, clickedDoorWidth, undefined, targetId);
  const explicitGrooveLinesCountForClick = readGrooveLinesCountOverride(App);

  if (targetId) {
    const layoutHandled = handleCanvasDoorGrooveLayoutClick({
      App,
      targetId,
      doorHitPoint,
      doorHitObject,
      doorHitGroup,
      foundModuleStack,
    });
    if (layoutHandled !== null) return layoutHandled;
    if (blocksOutsideGrooveForPart(App, targetId)) {
      toastOutsideGrooveBlocked(App);
      return true;
    }
  }

  const sketchTarget = parseSketchBoxDoorTarget(targetId || effectiveDoorId || foundPartId);
  const isSketchBoxSegmentTarget = isSketchBoxDoorSegmentPartId(targetId || effectiveDoorId || foundPartId);
  if (sketchTarget && !isSketchBoxSegmentTarget) {
    if (targetId && blocksOutsideGrooveForPart(App, targetId)) {
      toastOutsideGrooveBlocked(App);
      return true;
    }
    const patchedSketchDoor = patchSketchBoxDoor(
      App,
      sketchTarget,
      foundModuleStack,
      current => {
        if (!(current && current.enabled !== false)) return current;
        const currentGrooveOn = current.groove === true;
        const currentGrooveLinesCount = normalizeGrooveLinesCount(current.grooveLinesCount);
        if (
          currentGrooveOn &&
          explicitGrooveLinesCountForClick !== null &&
          currentGrooveLinesCount !== grooveLinesCountForClick
        ) {
          return {
            ...current,
            groove: true,
            grooveLinesCount: grooveLinesCountForClick,
          };
        }
        const nextGroove = !currentGrooveOn;
        if (!nextGroove) return { ...current, groove: false, grooveLinesCount: null };
        return {
          ...current,
          groove: true,
          grooveLinesCount: grooveLinesCountForClick,
        };
      },
      { source: 'groove:click' }
    );
    if (patchedSketchDoor) return true;
  }

  if (targetId) {
    if (blocksOutsideGrooveForPart(App, targetId)) {
      toastOutsideGrooveBlocked(App);
      return true;
    }

    const grooveKey = toCanonicalGroovesMapKey(targetId);
    const grooveLinesCountKey = toCanonicalGrooveLinesCountMapKey(targetId);
    const groovesMap = normalizeKnownMapSnapshot('groovesMap', __wp_map(App, 'groovesMap'));
    const grooveLinesCountMap = readGrooveLinesCountMap(App);
    const targetGrooveFlag = readDoorGrooveMapFlag(groovesMap, targetId);
    const sketchSegmentBasePartId = isSketchBoxSegmentTarget ? readDoorGrooveBasePartId(targetId) : '';
    const sketchSegmentDoor =
      isSketchBoxSegmentTarget && sketchTarget
        ? readSketchBoxDoorRecord(App, sketchTarget, foundModuleStack)
        : null;
    const inheritedSketchBoxGrooveState = isSketchBoxSegmentTarget
      ? readSketchBoxInheritedGrooveStateFromHitObject({
          doorHitObject,
          basePartId: sketchSegmentBasePartId,
        })
      : null;
    const hasExplicitSketchSegmentGrooveState = hasAnyDoorGrooveSegmentMapEntry(
      groovesMap,
      sketchSegmentBasePartId
    );
    const isInheritedSketchSegmentGrooveOn =
      isSketchBoxSegmentTarget &&
      !hasExplicitSketchSegmentGrooveState &&
      (sketchSegmentDoor?.groove === true ||
        inheritedSketchBoxGrooveState?.groove === true ||
        readDoorGrooveVisualMapFlag(groovesMap, targetId) === true);
    const regularSegmentBasePartId =
      !isSketchBoxSegmentTarget && isDoorGrooveSegmentPartId(targetId)
        ? readDoorGrooveBasePartId(targetId)
        : '';
    const regularSegmentFullPartId = regularSegmentBasePartId ? readDoorGrooveFullPartId(targetId) : '';
    const isInheritedRegularSegmentGrooveOn =
      !!regularSegmentFullPartId &&
      targetGrooveFlag === null &&
      readDoorGrooveVisualMapFlag(groovesMap, targetId) === true;
    const isGrooveOn =
      targetGrooveFlag === true || isInheritedSketchSegmentGrooveOn || isInheritedRegularSegmentGrooveOn;
    const inheritedSketchSegmentGrooveLinesCount = isInheritedSketchSegmentGrooveOn
      ? (readDoorGrooveLinesCountForPart(grooveLinesCountMap, targetId) ??
        normalizeGrooveLinesCount(sketchSegmentDoor?.grooveLinesCount) ??
        inheritedSketchBoxGrooveState?.grooveLinesCount ??
        null)
      : null;
    const inheritedRegularSegmentGrooveLinesCount = isInheritedRegularSegmentGrooveOn
      ? readDoorGrooveLinesCountForPart(grooveLinesCountMap, regularSegmentFullPartId)
      : null;
    const inheritedGrooveLinesCount = isInheritedSketchSegmentGrooveOn
      ? inheritedSketchSegmentGrooveLinesCount
      : inheritedRegularSegmentGrooveLinesCount;
    const currentGrooveLinesCount =
      isInheritedSketchSegmentGrooveOn || isInheritedRegularSegmentGrooveOn
        ? inheritedGrooveLinesCount
        : readDoorGrooveLinesCountForPart(grooveLinesCountMap, targetId);
    const shouldUpdateExistingGrooveLinesCount =
      isGrooveOn &&
      explicitGrooveLinesCountForClick !== null &&
      currentGrooveLinesCount !== grooveLinesCountForClick;
    const nextGrooveOn = shouldUpdateExistingGrooveLinesCount || !isGrooveOn;
    const grooveLinesCountPatchEntries: { key: unknown; value: unknown }[] = [];
    const siblingSketchSegmentPartIds = isInheritedSketchSegmentGrooveOn
      ? readDoorVisualSiblingSegmentPartIds({
          App,
          basePartId: sketchSegmentBasePartId,
          clickedPartId: targetId,
        })
      : [];
    const siblingRegularSegmentPartIds = isInheritedRegularSegmentGrooveOn
      ? readDoorVisualSiblingSegmentPartIds({
          App,
          basePartId: regularSegmentBasePartId,
          clickedPartId: targetId,
        })
      : [];
    if (isInheritedSketchSegmentGrooveOn || isInheritedRegularSegmentGrooveOn) {
      const siblingPartIds = isInheritedSketchSegmentGrooveOn
        ? siblingSketchSegmentPartIds
        : siblingRegularSegmentPartIds;
      for (let i = 0; i < siblingPartIds.length; i += 1) {
        const siblingPartId = siblingPartIds[i];
        if (!siblingPartId || siblingPartId === targetId) continue;
        if (inheritedGrooveLinesCount != null) {
          grooveLinesCountPatchEntries.push({ key: siblingPartId, value: inheritedGrooveLinesCount });
        }
      }
    }
    if (isInheritedSketchSegmentGrooveOn && sketchSegmentBasePartId) {
      grooveLinesCountPatchEntries.push({ key: sketchSegmentBasePartId, value: null });
      grooveLinesCountPatchEntries.push({ key: `${sketchSegmentBasePartId}_full`, value: null });
    }
    if (isInheritedRegularSegmentGrooveOn && regularSegmentFullPartId) {
      grooveLinesCountPatchEntries.push({ key: regularSegmentFullPartId, value: null });
    }
    if (nextGrooveOn && grooveLinesCountForClick != null)
      grooveLinesCountPatchEntries.push({ key: grooveLinesCountKey, value: grooveLinesCountForClick });
    else grooveLinesCountPatchEntries.push({ key: grooveLinesCountKey, value: null });

    const grooveStructuralMeta = createCanvasPickingDoorAuthoringStructuralMeta('groove:click');
    const grooveRefreshGatedMeta = createCanvasPickingDoorAuthoringRefreshGatedMeta(
      App,
      'groove:click',
      grooveStructuralMeta
    );
    const grooveCountRefreshGatedMeta = createCanvasPickingDoorAuthoringRefreshGatedMeta(
      App,
      'groove:click:count'
    );

    __wp_historyBatch(App, grooveStructuralMeta, () => {
      writePendingGrooveLinesCountForPart(
        App,
        targetId,
        nextGrooveOn && grooveLinesCountForClick != null ? grooveLinesCountForClick : null,
        'groove:click:pendingCount'
      );
      patchDoorGrooveLinesCountEntries(App, grooveLinesCountPatchEntries, grooveCountRefreshGatedMeta);
      if (isSketchBoxSegmentTarget || isInheritedRegularSegmentGrooveOn) {
        const groovePatchEntries: { key: unknown; value: unknown }[] = [];
        const siblingPartIds = isInheritedSketchSegmentGrooveOn
          ? siblingSketchSegmentPartIds
          : siblingRegularSegmentPartIds;
        if (isInheritedSketchSegmentGrooveOn && sketchSegmentBasePartId) {
          groovePatchEntries.push({ key: sketchSegmentBasePartId, value: null });
          groovePatchEntries.push({ key: `${sketchSegmentBasePartId}_full`, value: null });
        }
        if (isInheritedRegularSegmentGrooveOn && regularSegmentFullPartId) {
          groovePatchEntries.push({ key: regularSegmentFullPartId, value: null });
        }
        if (isInheritedSketchSegmentGrooveOn || isInheritedRegularSegmentGrooveOn) {
          for (let i = 0; i < siblingPartIds.length; i += 1) {
            const siblingPartId = siblingPartIds[i];
            if (!siblingPartId || siblingPartId === targetId) continue;
            groovePatchEntries.push({ key: siblingPartId, value: true });
          }
        }
        if (isSketchBoxSegmentTarget) {
          groovePatchEntries.push({ key: grooveKey, value: nextGrooveOn });
        } else if (nextGrooveOn) {
          groovePatchEntries.push({ key: grooveKey, value: true });
        } else {
          groovePatchEntries.push({ key: grooveKey, value: null });
        }
        patchDoorGrooveMapEntries(App, groovePatchEntries, grooveRefreshGatedMeta);
      } else if (!shouldUpdateExistingGrooveLinesCount) {
        if (!toggleGrooveViaActions(App, grooveKey, grooveRefreshGatedMeta)) {
          toggleGrooveKey(App, grooveKey, grooveRefreshGatedMeta);
        }
      }
      return undefined;
    });
    requestDoorAuthoringImmediateRefresh(App, 'groove:click');
  }
  return true;
}
