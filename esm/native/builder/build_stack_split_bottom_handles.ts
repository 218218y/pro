import { computeHingedDoorPivotMap } from './pure_api.js';
import { makeHandleTypeResolver } from './doors_state_utils.js';
import { readRecord } from './build_flow_readers.js';
import { moduleRequiresCustomBoundaryGeometry } from './module_custom_geometry_policy.js';

import type { AppContainer, BuilderDoorStateAccessorsLike, UnknownRecord } from '../../../types';

function buildLocalBottomHingeMap(args: { cfg: UnknownRecord; lowerDoorIdOffset: number }): UnknownRecord {
  const c = readRecord(args.cfg);
  const rawHingeMap = c ? readRecord(c.hingeMap) : null;
  const out: UnknownRecord = {};
  if (!rawHingeMap) return out;

  for (const key of Object.keys(rawHingeMap)) {
    const m = /^door_hinge_(\d+)$/.exec(key);
    if (!m || !m[1]) continue;

    const globalDoorId = Number(m[1]);
    if (!Number.isFinite(globalDoorId) || globalDoorId <= args.lowerDoorIdOffset) continue;

    const localDoorId = globalDoorId - args.lowerDoorIdOffset;
    if (!Number.isInteger(localDoorId) || localDoorId < 1) continue;
    out[`door_hinge_${localDoorId}`] = rawHingeMap[key];
  }

  return out;
}

function buildBottomModuleCustomFlags(
  bottomModules: unknown[],
  bottomModuleConfigs: unknown[] | null
): boolean[] | null {
  if (!Array.isArray(bottomModules)) return null;
  if (!Array.isArray(bottomModuleConfigs) || bottomModuleConfigs.length !== bottomModules.length) {
    return bottomModules.map(() => false);
  }
  return bottomModules.map((_module, index) =>
    moduleRequiresCustomBoundaryGeometry(bottomModuleConfigs[index], 0)
  );
}

export function buildShiftedBottomHingedPivotMap(args: {
  cfg: UnknownRecord;
  bottomModules: unknown[];
  bottomTotalW: number;
  woodThick: number;
  bottomSingleUnitWidth: number;
  bottomModuleInternalWidths: number[] | null;
  bottomModuleConfigs: unknown[] | null;
  lowerDoorIdOffset: number;
}): UnknownRecord | null {
  if (args.cfg.wardrobeType !== 'hinged') return null;
  const baseMap0 = computeHingedDoorPivotMap({
    modulesStructure: args.bottomModules,
    totalW: args.bottomTotalW,
    woodThick: args.woodThick,
    singleUnitWidth: args.bottomSingleUnitWidth,
    hingeMap: buildLocalBottomHingeMap({
      cfg: args.cfg,
      lowerDoorIdOffset: args.lowerDoorIdOffset,
    }),
    moduleInternalWidths: args.bottomModuleInternalWidths,
    moduleIsCustom: buildBottomModuleCustomFlags(args.bottomModules, args.bottomModuleConfigs),
    moduleConfigs: Array.isArray(args.bottomModuleConfigs) ? args.bottomModuleConfigs : null,
    doorMountMode: readRecord(args.cfg)?.doorMountMode,
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
