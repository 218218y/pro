import type {
  ActionMetaLike,
  ConfigActionsNamespaceLike,
  KnownMapName,
  MapsByName,
  UnknownRecord,
} from '../../../types';

import { cfgPatchWithReplaceKeys } from '../runtime/cfg_access.js';
import { normalizeKnownMapSnapshot } from '../runtime/maps_access_normalizers.js';
import { asRecord } from '../runtime/record.js';
import {
  commitConfigWrite,
  reuseEquivalentValue,
  toConfigPatch,
} from './state_api_config_namespace_shared.js';

interface StateApiConfigNamespaceMapsContext {
  configNs: ConfigActionsNamespaceLike;
  normMeta(meta: unknown, source: string): ActionMetaLike;
  safeCall(fn: () => unknown): unknown;
  commitConfigPatch(patch: Record<string, unknown>, meta: ActionMetaLike): unknown;
}

export function installStateApiConfigNamespaceMaps(ctx: StateApiConfigNamespaceMapsContext): void {
  const { configNs, normMeta, safeCall, commitConfigPatch } = ctx;

  delete configNs['setMap'];
  delete configNs['patchMap'];

  const readNormalizedConfigMap = <K extends KnownMapName>(mapName: K): MapsByName[K] => {
    const snap = asRecord(safeCall(() => configNs.captureSnapshot?.())) || {};
    return normalizeKnownMapSnapshot(mapName, snap[mapName]);
  };

  const commitKnownMapSnapshot = <K extends KnownMapName>(
    mapName: K,
    nextMap: unknown,
    meta: ActionMetaLike
  ): MapsByName[K] => {
    const cur = readNormalizedConfigMap(mapName);
    const nextRec = reuseEquivalentValue(cur, normalizeKnownMapSnapshot(mapName, nextMap)) as MapsByName[K];
    if (Object.is(cur, nextRec)) return cur;
    const patch = toConfigPatch(cfgPatchWithReplaceKeys({ [mapName]: nextRec }, { [mapName]: true }));
    void commitConfigWrite(commitConfigPatch, patch, meta);
    return nextRec;
  };

  if (typeof configNs.setHingeMap !== 'function') {
    configNs.setHingeMap = function setHingeMap(next: unknown, meta?: ActionMetaLike) {
      const m = normMeta(meta, 'actions.config:setHingeMap');
      return commitKnownMapSnapshot('hingeMap', next, m);
    };
  }

  if (typeof configNs.setHandlesMap !== 'function') {
    configNs.setHandlesMap = function setHandlesMap(next: unknown, meta?: ActionMetaLike) {
      const m = normMeta(meta, 'actions.config:setHandlesMap');
      return commitKnownMapSnapshot('handlesMap', next, m);
    };
  }

  if (typeof configNs.applyPaintSnapshot !== 'function') {
    configNs.applyPaintSnapshot = function applyPaintSnapshot(
      individualColors: unknown,
      curtainMap: unknown,
      meta?: ActionMetaLike,
      doorSpecialMap?: unknown,
      mirrorLayoutMap?: unknown,
      doorStyleMap?: unknown
    ) {
      const cfg0 = asRecord(safeCall(() => configNs.get?.())) || {};
      const prevColors = asRecord(cfg0.individualColors) || {};
      const prevCurtains = asRecord(cfg0.curtainMap) || {};
      const prevSpecial = asRecord(cfg0.doorSpecialMap) || {};
      const prevMirrorLayout = asRecord(cfg0.mirrorLayoutMap) || {};
      const prevDoorStyle = asRecord(cfg0.doorStyleMap) || {};

      const nextColors = reuseEquivalentValue(
        prevColors,
        normalizeKnownMapSnapshot('individualColors', individualColors)
      );
      const nextCurtains = reuseEquivalentValue(
        prevCurtains,
        normalizeKnownMapSnapshot('curtainMap', curtainMap)
      );
      const nextSpecial =
        doorSpecialMap === undefined
          ? null
          : reuseEquivalentValue(prevSpecial, normalizeKnownMapSnapshot('doorSpecialMap', doorSpecialMap));
      const nextMirrorLayout =
        mirrorLayoutMap === undefined
          ? null
          : reuseEquivalentValue(
              prevMirrorLayout,
              normalizeKnownMapSnapshot('mirrorLayoutMap', mirrorLayoutMap)
            );
      const nextDoorStyle =
        doorStyleMap === undefined
          ? null
          : reuseEquivalentValue(prevDoorStyle, normalizeKnownMapSnapshot('doorStyleMap', doorStyleMap));

      const basePatch: UnknownRecord = {};
      const replaceKeys: string[] = [];
      if (!Object.is(prevColors, nextColors)) {
        basePatch.individualColors = nextColors;
        replaceKeys.push('individualColors');
      }
      if (!Object.is(prevCurtains, nextCurtains)) {
        basePatch.curtainMap = nextCurtains;
        replaceKeys.push('curtainMap');
      }
      if (nextSpecial && !Object.is(prevSpecial, nextSpecial)) {
        basePatch.doorSpecialMap = nextSpecial;
        replaceKeys.push('doorSpecialMap');
      }
      if (nextMirrorLayout && !Object.is(prevMirrorLayout, nextMirrorLayout)) {
        basePatch.mirrorLayoutMap = nextMirrorLayout;
        replaceKeys.push('mirrorLayoutMap');
      }
      if (nextDoorStyle && !Object.is(prevDoorStyle, nextDoorStyle)) {
        basePatch.doorStyleMap = nextDoorStyle;
        replaceKeys.push('doorStyleMap');
      }
      if (!Object.keys(basePatch).length) return cfg0;
      const patch = toConfigPatch(cfgPatchWithReplaceKeys(basePatch, replaceKeys));
      const m = normMeta(meta, 'actions.config:applyPaintSnapshot');
      return commitConfigWrite(commitConfigPatch, patch, m);
    };
  }
}
