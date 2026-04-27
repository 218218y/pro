import { computeHingedDoorPivotMap } from './pure_api.js';
import { makeHandleTypeResolver } from './doors_state_utils.js';
import { readRecord } from './build_flow_readers.js';

import type { AppContainer, BuilderDoorStateAccessorsLike, UnknownRecord } from '../../../types';

export function buildShiftedBottomHingedPivotMap(args: {
  cfg: UnknownRecord;
  bottomModules: unknown[];
  bottomTotalW: number;
  woodThick: number;
  bottomSingleUnitWidth: number;
  bottomModuleInternalWidths: number[] | null;
  bottomHingedDoorPivotBase: UnknownRecord | null;
  lowerDoorIdOffset: number;
}): UnknownRecord | null {
  if (args.cfg.wardrobeType !== 'hinged') return null;
  const baseMap0 =
    args.bottomHingedDoorPivotBase && typeof args.bottomHingedDoorPivotBase === 'object'
      ? args.bottomHingedDoorPivotBase
      : computeHingedDoorPivotMap({
          modulesStructure: args.bottomModules,
          totalW: args.bottomTotalW,
          woodThick: args.woodThick,
          singleUnitWidth: args.bottomSingleUnitWidth,
          hingeMap: (() => {
            const c = readRecord(args.cfg);
            const hm = c ? readRecord(c.hingeMap) : null;
            return hm || {};
          })(),
          moduleInternalWidths: args.bottomModuleInternalWidths,
          moduleIsCustom: Array.isArray(args.bottomModules) ? args.bottomModules.map(() => false) : null,
        });

  const shifted: UnknownRecord = {};
  const baseMap = readRecord(baseMap0);
  if (!baseMap) return shifted;
  for (const k of Object.keys(baseMap)) {
    const n = Number(k);
    if (!Number.isFinite(n) || n < 1) continue;
    shifted[String(n + args.lowerDoorIdOffset)] = baseMap[k];
  }
  return shifted;
}

export function createBottomHandleTypeResolver(args: {
  App: AppContainer;
  cfg: UnknownRecord;
  doorState: BuilderDoorStateAccessorsLike;
  handleControlEnabled: boolean;
  bottomDoorsCount: number;
  topDoorsCount: number;
  lowerDoorIdStart: number;
  lowerDoorIdOffset: number;
  getHandleTypeTop: (id: unknown) => unknown;
}): (id: unknown) => unknown {
  const baseGetHandleTypeBottom = makeHandleTypeResolver({
    App: args.App,
    cfg: args.cfg,
    doorState: args.doorState,
    handleControlEnabled: args.handleControlEnabled,
    stackKey: 'bottom',
  });

  const hm = (() => {
    const c = readRecord(args.cfg);
    return c ? readRecord(c.handlesMap) : null;
  })();
  const globalHandleType = (() => {
    const c = readRecord(args.cfg);
    return c ? c.globalHandleType : undefined;
  })();

  const stripSuffix = (sid: string): string => sid.replace(/_(top|mid|bot|full)$/, '');
  const hasExplicitHandle = (sid: string): boolean => {
    if (!hm || !sid) return false;
    if (
      Object.prototype.hasOwnProperty.call(hm, sid) &&
      hm[sid] !== undefined &&
      hm[sid] !== null &&
      hm[sid] !== ''
    ) {
      return true;
    }
    const base = stripSuffix(sid);
    if (
      base &&
      base !== sid &&
      Object.prototype.hasOwnProperty.call(hm, base) &&
      hm[base] !== undefined &&
      hm[base] !== null &&
      hm[base] !== ''
    ) {
      return true;
    }
    return false;
  };

  return (id: unknown): unknown => {
    const sid = id == null ? '' : String(id);
    if (globalHandleType === 'edge') return baseGetHandleTypeBottom(sid);
    if (hasExplicitHandle(sid)) return baseGetHandleTypeBottom(sid);

    if (args.handleControlEnabled && args.bottomDoorsCount === args.topDoorsCount) {
      const m = /^d(\d+)(_.+)$/.exec(sid);
      if (m && m[1] && m[2]) {
        const dn = Number(m[1]);
        if (Number.isFinite(dn) && dn >= args.lowerDoorIdStart) {
          const topId = dn - args.lowerDoorIdOffset;
          if (topId >= 1) {
            const mapped = `d${topId}${m[2]}`;
            if (hasExplicitHandle(mapped)) {
              return args.getHandleTypeTop(mapped);
            }
          }
        }
      }
    }

    return baseGetHandleTypeBottom(sid);
  };
}
