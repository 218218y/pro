import type { AppContainer } from '../../../types';

import { cfgSetMap } from '../runtime/cfg_access.js';
import { readDoorVisualMapEntry } from '../features/door_visual_map_lookup.js';
import {
  isDoorVisualInheritedOwner,
  materializeInheritedDoorVisualOwner,
} from './canvas_picking_door_segment_materialization.js';
import {
  isDoorStyleOverrideValue,
  parseDoorStyleOverridePaintToken,
  readDoorStyleMap,
  toDoorStyleOverrideMapKey,
} from '../features/door_style_overrides.js';
import {
  __wp_historyBatch,
  __wp_isDoorOrDrawerLikePartId,
  __wp_map,
  __wp_scopeCornerPartKeyForStack,
} from './canvas_picking_core_helpers.js';
import { createCanvasPickingPaintStructuralMeta } from './canvas_picking_paint_meta.js';

export function resolveDoorStylePaintTargetKey(args: {
  foundPartId: string;
  effectiveDoorId?: string | null;
  foundDrawerId?: string | null;
  activeStack: 'top' | 'bottom';
}): string {
  const rawTarget =
    args.effectiveDoorId ||
    args.foundDrawerId ||
    (__wp_isDoorOrDrawerLikePartId(args.foundPartId) ? args.foundPartId : '');
  const scopedTarget = __wp_scopeCornerPartKeyForStack(rawTarget, args.activeStack);
  return toDoorStyleOverrideMapKey(scopedTarget);
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
  let doorStyleMap = doorStyleMap0;
  const ensureDoorStyleMap = () => {
    if (Object.is(doorStyleMap, doorStyleMap0)) doorStyleMap = { ...doorStyleMap0 };
    return doorStyleMap;
  };

  const existingStyleEntry = readDoorVisualMapEntry(doorStyleMap0, paintTargetKey);
  const existingStyle = isDoorStyleOverrideValue(existingStyleEntry?.value)
    ? existingStyleEntry.value
    : undefined;
  if (existingStyle === doorStyleSelection) {
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
      delete nextDoorStyleMap[existingStyleOwnerKey];
    }
  } else ensureDoorStyleMap()[paintTargetKey] = doorStyleSelection;

  if (Object.is(doorStyleMap, doorStyleMap0)) return true;

  const baseMeta = createCanvasPickingPaintStructuralMeta(args.paintSource);
  __wp_historyBatch(args.App, baseMeta, () => {
    cfgSetMap(args.App, 'doorStyleMap', doorStyleMap, baseMeta);
    return undefined;
  });
  return true;
}
