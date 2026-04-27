import type {
  ActionMetaLike,
  ActionsNamespaceLike,
  ConfigActionsNamespaceLike,
  UnknownRecord,
} from '../../../types';

import { cfgPatchWithReplaceKeys } from '../runtime/cfg_access.js';
import { asRecord, isRecord } from '../runtime/record.js';
import {
  commitConfigWrite,
  readConfigMapUpdater,
  reuseEquivalentValue,
  toConfigPatch,
} from './state_api_config_namespace_shared.js';

interface StateApiConfigNamespaceMapsContext {
  actions: ActionsNamespaceLike;
  configNs: ConfigActionsNamespaceLike;
  normMeta(meta: unknown, source: string): ActionMetaLike;
  safeCall(fn: () => unknown): unknown;
  shallowCloneObj(v: unknown): UnknownRecord;
  commitConfigPatch(patch: Record<string, unknown>, meta: ActionMetaLike): unknown;
}

export function installStateApiConfigNamespaceMaps(ctx: StateApiConfigNamespaceMapsContext): void {
  const { actions, configNs, normMeta, safeCall, shallowCloneObj, commitConfigPatch } = ctx;

  if (typeof configNs.setHingeMap !== 'function') {
    configNs.setHingeMap = function setHingeMap(next: unknown, meta?: ActionMetaLike) {
      const m = normMeta(meta, 'actions.config:setHingeMap');
      const v = isRecord(next) ? shallowCloneObj(next) : {};
      return configNs.setMap?.('hingeMap', v, m);
    };
  }

  if (typeof configNs.setHandlesMap !== 'function') {
    configNs.setHandlesMap = function setHandlesMap(next: unknown, meta?: ActionMetaLike) {
      const m = normMeta(meta, 'actions.config:setHandlesMap');
      const v = isRecord(next) ? shallowCloneObj(next) : {};
      return configNs.setMap?.('handlesMap', v, m);
    };
  }

  if (typeof configNs.applyPaintSnapshot !== 'function') {
    configNs.applyPaintSnapshot = function applyPaintSnapshot(
      individualColors: unknown,
      curtainMap: unknown,
      meta?: ActionMetaLike,
      doorSpecialMap?: unknown,
      mirrorLayoutMap?: unknown
    ) {
      const cfg0 = asRecord(safeCall(() => configNs.get?.())) || {};
      const prevColors = asRecord(cfg0.individualColors) || {};
      const prevCurtains = asRecord(cfg0.curtainMap) || {};
      const prevSpecial = asRecord(cfg0.doorSpecialMap) || {};
      const prevMirrorLayout = asRecord(cfg0.mirrorLayoutMap) || {};

      const nextColors = reuseEquivalentValue(
        prevColors,
        isRecord(individualColors) ? shallowCloneObj(individualColors) : {}
      );
      const nextCurtains = reuseEquivalentValue(
        prevCurtains,
        isRecord(curtainMap) ? shallowCloneObj(curtainMap) : {}
      );
      const nextSpecial =
        doorSpecialMap === undefined
          ? null
          : reuseEquivalentValue(
              prevSpecial,
              isRecord(doorSpecialMap) ? shallowCloneObj(doorSpecialMap) : {}
            );
      const nextMirrorLayout =
        mirrorLayoutMap === undefined
          ? null
          : reuseEquivalentValue(
              prevMirrorLayout,
              isRecord(mirrorLayoutMap) ? shallowCloneObj(mirrorLayoutMap) : {}
            );

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
      if (!Object.keys(basePatch).length) return cfg0;
      const patch = toConfigPatch(cfgPatchWithReplaceKeys(basePatch, replaceKeys));
      const m = normMeta(meta, 'actions.config:applyPaintSnapshot');
      return commitConfigWrite(commitConfigPatch, patch, m);
    };
  }

  if (typeof configNs.setMap !== 'function') {
    configNs.setMap = function setMap(mapName: unknown, nextMap: unknown, meta?: ActionMetaLike) {
      const key = String(mapName || '');
      if (!key) return {};
      const cur = asRecord(safeCall(() => configNs.map?.(key))) || {};
      const nextRec = reuseEquivalentValue(cur, isRecord(nextMap) ? shallowCloneObj(nextMap) : {});
      if (Object.is(cur, nextRec)) return cur;
      const m = normMeta(meta, 'actions.config:setMap');
      const patch = toConfigPatch(cfgPatchWithReplaceKeys({ [key]: nextRec }, { [key]: true }));
      void commitConfigWrite(commitConfigPatch, patch, m);
      return nextRec;
    };
  }

  if (typeof configNs.patchMap !== 'function') {
    configNs.patchMap = function patchMap(mapName: unknown, patchOrFn: unknown, meta?: ActionMetaLike) {
      const key = String(mapName || '');
      if (!key) return {};
      const cur = asRecord(safeCall(() => configNs.map?.(key))) || {};
      const next: UnknownRecord = { ...cur };
      let patchVal = patchOrFn;
      if (typeof patchOrFn === 'function') {
        try {
          const updateMap = readConfigMapUpdater(patchOrFn);
          patchVal = updateMap ? updateMap(next, cur) : undefined;
        } catch (_e) {
          patchVal = undefined;
        }
      }
      if (isRecord(patchVal)) {
        for (const k of Object.keys(patchVal)) {
          const v = patchVal[k];
          if (v === undefined || v === null) {
            try {
              delete next[k];
            } catch (_e) {}
          } else {
            next[k] = v;
          }
        }
      }
      const nextRec = reuseEquivalentValue(cur, next);
      if (Object.is(cur, nextRec)) return cur;
      const m = normMeta(meta, 'actions.config:patchMap');
      const patch = toConfigPatch(cfgPatchWithReplaceKeys({ [key]: nextRec }, { [key]: true }));
      void commitConfigWrite(commitConfigPatch, patch, m);
      return nextRec;
    };
  }

  void actions;
}
