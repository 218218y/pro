import type { AppContainer, DoorSpecialMap, MirrorLayoutMap, CurtainMap } from '../../../types';

import { cfgSetMap, setCfgDoorStyleMap, setCfgMirrorLayoutMap } from '../runtime/cfg_access.js';
import {
  readDoorVisualMapEntry,
  isDoorStyleOverrideValue,
  parseDoorStyleOverridePaintToken,
  readDoorStyleMap,
  resolveDoorStylePaintTargetKey as resolveDoorAuthoringStylePaintTargetKey,
} from '../features/door_authoring/api.js';
import {
  isDoorVisualInheritedOwner,
  materializeInheritedDoorVisualOwner,
} from './canvas_picking_door_segment_materialization.js';
import {
  __wp_historyBatch,
  __wp_isDoorOrDrawerLikePartId,
  __wp_map,
  __wp_scopeCornerPartKeyForStack,
} from './canvas_picking_core_helpers.js';
import { createCanvasPickingPaintStructuralMeta } from './canvas_picking_paint_meta.js';
import {
  cloneCurtainMap,
  cloneDoorSpecialMap,
  cloneDoorStyleMap,
  cloneMirrorLayoutConfigMap,
  readCurtainMap,
  readDoorSpecialMap,
  readMirrorLayoutConfigMap,
  sameFlatMap,
  sameMirrorLayoutMap,
} from './canvas_picking_paint_flow_shared.js';
import {
  deleteDoorVisualOwnerAliasEntries,
  deletePrefixedDoorVisualOwnerAliasEntries,
} from './canvas_picking_door_visual_owner_map.js';

const GLASS_PREVIOUS_STYLE_PREFIX = '__wp_glass_previous_door_style__:';

export function resolveDoorStylePaintTargetKey(args: {
  foundPartId: string;
  effectiveDoorId?: string | null;
  foundDrawerId?: string | null;
  activeStack: 'top' | 'bottom';
}): string {
  return resolveDoorAuthoringStylePaintTargetKey({
    foundPartId: args.foundPartId,
    effectiveDoorId: args.effectiveDoorId,
    foundDrawerId: args.foundDrawerId,
    activeStack: args.activeStack,
    isDoorOrDrawerLikePartId: __wp_isDoorOrDrawerLikePartId,
    scopePartKeyForStack: __wp_scopeCornerPartKeyForStack,
  });
}

function cloneMirrorMap(src: MirrorLayoutMap): MirrorLayoutMap {
  return cloneMirrorLayoutConfigMap(src);
}

function clearSpecialVisualForDoorStyleTarget(args: {
  App: AppContainer;
  targetPartKey: string;
  special0: DoorSpecialMap;
  curtains0: CurtainMap;
  mirror0: MirrorLayoutMap;
}): {
  hadSpecialVisual: boolean;
  special: DoorSpecialMap;
  curtains: CurtainMap;
  mirror: MirrorLayoutMap;
} {
  const specialEntry = readDoorVisualMapEntry(args.special0, args.targetPartKey);
  const specialValue = specialEntry?.value;
  const hadSpecialVisual = specialValue === 'glass' || specialValue === 'mirror';
  let special = args.special0;
  let curtains = args.curtains0;
  let mirror = args.mirror0;

  if (!hadSpecialVisual) return { hadSpecialVisual: false, special, curtains, mirror };

  const ensureSpecial = () => {
    if (Object.is(special, args.special0)) special = cloneDoorSpecialMap(args.special0);
    return special;
  };
  const ensureCurtains = () => {
    if (Object.is(curtains, args.curtains0)) curtains = cloneCurtainMap(args.curtains0);
    return curtains;
  };
  const ensureMirror = () => {
    if (Object.is(mirror, args.mirror0)) mirror = cloneMirrorMap(args.mirror0);
    return mirror;
  };

  const specialOwnerKey = specialEntry?.key || args.targetPartKey;
  const curtainOwnerKey = readDoorVisualMapEntry(args.curtains0, args.targetPartKey)?.key || specialOwnerKey;
  const mirrorOwnerKey = readDoorVisualMapEntry(args.mirror0, args.targetPartKey)?.key || specialOwnerKey;
  const isInheritedSpecialOwner = isDoorVisualInheritedOwner({
    targetPartId: args.targetPartKey,
    ownerPartId: specialOwnerKey,
  });

  if (isInheritedSpecialOwner) {
    materializeInheritedDoorVisualOwner({
      App: args.App,
      map: ensureSpecial(),
      targetPartId: args.targetPartKey,
      ownerPartId: specialOwnerKey,
    });
    materializeInheritedDoorVisualOwner({
      App: args.App,
      map: ensureCurtains(),
      targetPartId: args.targetPartKey,
      ownerPartId: curtainOwnerKey,
    });
    materializeInheritedDoorVisualOwner({
      App: args.App,
      map: ensureMirror(),
      targetPartId: args.targetPartKey,
      ownerPartId: mirrorOwnerKey,
    });
  }

  deleteDoorVisualOwnerAliasEntries(
    ensureSpecial(),
    isInheritedSpecialOwner ? args.targetPartKey : specialOwnerKey
  );
  deleteDoorVisualOwnerAliasEntries(
    ensureCurtains(),
    isInheritedSpecialOwner ? args.targetPartKey : curtainOwnerKey
  );
  deleteDoorVisualOwnerAliasEntries(
    ensureMirror(),
    isInheritedSpecialOwner ? args.targetPartKey : mirrorOwnerKey
  );
  deletePrefixedDoorVisualOwnerAliasEntries({
    map: ensureSpecial(),
    prefix: GLASS_PREVIOUS_STYLE_PREFIX,
    partId: args.targetPartKey,
  });
  deletePrefixedDoorVisualOwnerAliasEntries({
    map: ensureSpecial(),
    prefix: GLASS_PREVIOUS_STYLE_PREFIX,
    partId: specialOwnerKey,
  });

  return { hadSpecialVisual: true, special, curtains, mirror };
}

export function tryHandleDoorStyleOverridePaintClick(args: {
  App: AppContainer;
  foundPartId: string;
  effectiveDoorId?: string | null;
  foundDrawerId?: string | null;
  activeStack: 'top' | 'bottom';
  paintSelection: string;
  paintSource: string;
}): boolean | null {
  const doorStyleSelection = parseDoorStyleOverridePaintToken(args.paintSelection);
  if (!doorStyleSelection) return null;

  const paintTargetKey = resolveDoorStylePaintTargetKey(args);
  if (!paintTargetKey) return true;

  const doorStyleMap0 = readDoorStyleMap(__wp_map(args.App, 'doorStyleMap'));
  const special0 = readDoorSpecialMap(args.App);
  const curtains0 = readCurtainMap(args.App);
  const mirror0 = readMirrorLayoutConfigMap(args.App);
  let doorStyleMap = doorStyleMap0;
  const ensureDoorStyleMap = () => {
    if (Object.is(doorStyleMap, doorStyleMap0)) doorStyleMap = cloneDoorStyleMap(doorStyleMap0);
    return doorStyleMap;
  };

  const specialCleanup = clearSpecialVisualForDoorStyleTarget({
    App: args.App,
    targetPartKey: paintTargetKey,
    special0,
    curtains0,
    mirror0,
  });

  const existingStyleEntry = readDoorVisualMapEntry(doorStyleMap0, paintTargetKey);
  const existingStyle = isDoorStyleOverrideValue(existingStyleEntry?.value)
    ? existingStyleEntry.value
    : undefined;
  if (existingStyle === doorStyleSelection && !specialCleanup.hadSpecialVisual) {
    const existingStyleOwnerKey = existingStyleEntry?.key || paintTargetKey;
    const nextDoorStyleMap = ensureDoorStyleMap();
    if (
      isDoorVisualInheritedOwner({
        targetPartId: paintTargetKey,
        ownerPartId: existingStyleOwnerKey,
      })
    ) {
      materializeInheritedDoorVisualOwner({
        App: args.App,
        map: nextDoorStyleMap,
        targetPartId: paintTargetKey,
        ownerPartId: existingStyleOwnerKey,
      });
      delete nextDoorStyleMap[paintTargetKey];
    } else {
      deleteDoorVisualOwnerAliasEntries(nextDoorStyleMap, existingStyleOwnerKey);
    }
  } else ensureDoorStyleMap()[paintTargetKey] = doorStyleSelection;

  const styleChanged = !sameFlatMap(doorStyleMap0, doorStyleMap);
  const specialChanged = !sameFlatMap(special0, specialCleanup.special);
  const curtainsChanged = !sameFlatMap(curtains0, specialCleanup.curtains);
  const mirrorChanged = !sameMirrorLayoutMap(mirror0, specialCleanup.mirror);
  if (!styleChanged && !specialChanged && !curtainsChanged && !mirrorChanged) return true;

  const baseMeta = createCanvasPickingPaintStructuralMeta(args.paintSource);
  __wp_historyBatch(args.App, baseMeta, () => {
    if (specialChanged) cfgSetMap(args.App, 'doorSpecialMap', specialCleanup.special, baseMeta);
    if (curtainsChanged) cfgSetMap(args.App, 'curtainMap', specialCleanup.curtains, baseMeta);
    if (mirrorChanged) setCfgMirrorLayoutMap(args.App, specialCleanup.mirror, baseMeta);
    if (styleChanged) setCfgDoorStyleMap(args.App, doorStyleMap, baseMeta);
    return undefined;
  });
  return true;
}
