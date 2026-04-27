import type { AppContainer } from '../../../types';

import { cfgSetMap } from '../runtime/cfg_access.js';
import {
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
import { createImmediateMeta } from './canvas_picking_paint_flow_shared.js';

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

  const existingStyle = doorStyleMap0[paintTargetKey];
  if (existingStyle === doorStyleSelection) delete ensureDoorStyleMap()[paintTargetKey];
  else ensureDoorStyleMap()[paintTargetKey] = doorStyleSelection;

  if (Object.is(doorStyleMap, doorStyleMap0)) return true;

  const baseMeta = createImmediateMeta(args.paintSource);
  __wp_historyBatch(args.App, baseMeta, () => {
    cfgSetMap(args.App, 'doorStyleMap', doorStyleMap, baseMeta);
    return undefined;
  });
  return true;
}
