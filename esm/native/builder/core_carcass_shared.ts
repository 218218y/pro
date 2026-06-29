// Builder core carcass shared preparation and normalization helpers.
import {
  CARCASS_BASE_DIMENSIONS,
  CARCASS_SHELL_DIMENSIONS,
  MATERIAL_DIMENSIONS,
} from '../../shared/wardrobe_dimension_tokens_shared.js';

import {
  normalizeBaseLegPlatformMode,
  normalizeBaseLegPlatformSideMode,
  readBaseLegOptions,
} from '../features/base_leg_support.js';
import {
  DEFAULT_BASE_LEG_PLATFORM_FRONT_OVERHANG_CM,
  DEFAULT_BASE_LEG_PLATFORM_SIDE_OVERHANG_CM,
  platformOverhangCmToM,
} from '../features/platform_overhang_support.js';
import { isRemovedFrameSideOn } from '../features/removable_parts.js';
import { readModuleConfig } from './build_flow_readers.js';
import { getBasePlinthHeightM } from '../features/base_plinth_support.js';
import { readCorePureNumberArray } from './core_pure_number_contracts.js';
import { _asObject, __asArray, __asInt, __asNum } from './core_pure_shared.js';
import type { MutableRecord } from './core_pure_shared.js';

export const CARCASS_BACK_INSET_Z: number = CARCASS_SHELL_DIMENSIONS.backInsetZM;
export const CARCASS_FRONT_INSET_Z: number = CARCASS_SHELL_DIMENSIONS.frontInsetZM;

const PLINTH_DIMENSIONS = CARCASS_BASE_DIMENSIONS.plinth;
const BASE_LEG_LAYOUT_DIMENSIONS = CARCASS_BASE_DIMENSIONS.legs;
const BASE_LEG_PLATFORM_DIMENSIONS = CARCASS_BASE_DIMENSIONS.legs.platform;

export type PreparedCarcassInput = {
  totalW: number;
  D: number;
  H: number;
  woodThick: number;
  baseType: string;
  doorsCount: number;
  hasCornice: boolean;
  corniceType: string;
  baseHeight: number;
  startY: number;
  cabinetBodyHeight: number;
  base: MutableRecord | null;
  baseLegPlatformMode: 'stage' | 'plain';
  baseLegPlatformSideMode: 'overhang' | 'flush';
  baseLegPlatformSideOverhangM: number;
  baseLegPlatformFrontOverhangM: number;
  baseLegTopPlatformOnly: boolean;
  baseLegSuppressTopPlatform: boolean;
  baseLegBottomPlatformHeight: number;
  baseLegTopPlatformHeight: number;
  moduleWidths: number[] | null;
  moduleHeightsRaw: number[] | null;
  moduleDepths: number[] | null;
  moduleConfigs: unknown[] | null;
  hasStepData: boolean;
  hasDepthData: boolean;
  isStepped: boolean;
  isDepthStepped: boolean;
  removedLeftFrameSide: boolean;
  removedRightFrameSide: boolean;
};

export function prepareCarcassInput(input: unknown): PreparedCarcassInput {
  const inp = _asObject(input) || {};
  const totalW = __asNum(inp.totalW, 0);
  const D = __asNum(inp.D, 0);
  const H = __asNum(inp.H, 0);
  const woodThick = __asNum(inp.woodThick, MATERIAL_DIMENSIONS.wood.thicknessM);
  const baseType = String(inp.baseType || '');
  const doorsCount = __asInt(inp.doorsCount, 0);
  const hasCornice = !!inp.hasCornice;
  const corniceType = String(inp.corniceType || 'classic');
  const cfg = _asObject(inp.cfg) || {};
  const baseLegTopPlatformRequested = !!inp.baseLegTopPlatformOnly && baseType !== 'legs';
  const baseLegPlatformMode = normalizeBaseLegPlatformMode(
    inp.baseLegPlatformMode,
    baseLegTopPlatformRequested ? 'stage' : 'plain'
  );
  const baseLegPlatformSideMode = normalizeBaseLegPlatformSideMode(inp.baseLegPlatformSideMode);
  const baseLegPlatformSideOverhangM = platformOverhangCmToM(
    inp.baseLegPlatformSideOverhangCm,
    DEFAULT_BASE_LEG_PLATFORM_SIDE_OVERHANG_CM
  );
  const baseLegPlatformFrontOverhangM = platformOverhangCmToM(
    inp.baseLegPlatformFrontOverhangCm,
    DEFAULT_BASE_LEG_PLATFORM_FRONT_OVERHANG_CM
  );
  const baseLegPlatformEnabled = baseType === 'legs' && baseLegPlatformMode === 'stage';
  const baseLegTopPlatformOnly = baseLegTopPlatformRequested && baseLegPlatformMode === 'stage';
  const baseLegSuppressTopPlatform = !!inp.baseLegSuppressTopPlatform && baseLegPlatformEnabled;
  const baseLegBottomPlatformHeight = baseLegPlatformEnabled ? BASE_LEG_PLATFORM_DIMENSIONS.heightM : 0;
  const baseLegTopPlatformHeight =
    (baseLegPlatformEnabled && !baseLegSuppressTopPlatform) || baseLegTopPlatformOnly
      ? BASE_LEG_PLATFORM_DIMENSIONS.heightM
      : 0;

  let baseHeight = 0;
  let startY = 0;
  let base: MutableRecord | null = null;

  if (baseType === 'plinth') {
    baseHeight = getBasePlinthHeightM(inp.basePlinthHeightCm);
    startY = baseHeight;
    base = {
      kind: 'plinth',
      width: totalW - PLINTH_DIMENSIONS.widthClearanceM,
      height: baseHeight,
      depth: D - PLINTH_DIMENSIONS.depthClearanceM,
      x: 0,
      y: baseHeight / 2,
      z: -PLINTH_DIMENSIONS.frontInsetM,
      partId: 'plinth_color',
    };
  } else if (baseType === 'legs') {
    const legOptions = readBaseLegOptions(inp);
    baseHeight = legOptions.heightM + baseLegBottomPlatformHeight;
    startY = baseHeight;
    const pos: MutableRecord[] = [
      {
        x: -totalW / 2 + BASE_LEG_LAYOUT_DIMENSIONS.cornerInsetM,
        z: D / 2 - BASE_LEG_LAYOUT_DIMENSIONS.cornerInsetM,
      },
      {
        x: totalW / 2 - BASE_LEG_LAYOUT_DIMENSIONS.cornerInsetM,
        z: D / 2 - BASE_LEG_LAYOUT_DIMENSIONS.cornerInsetM,
      },
      {
        x: -totalW / 2 + BASE_LEG_LAYOUT_DIMENSIONS.cornerInsetM,
        z: -D / 2 + BASE_LEG_LAYOUT_DIMENSIONS.cornerInsetM,
      },
      {
        x: totalW / 2 - BASE_LEG_LAYOUT_DIMENSIONS.cornerInsetM,
        z: -D / 2 + BASE_LEG_LAYOUT_DIMENSIONS.cornerInsetM,
      },
    ];
    if (doorsCount >= BASE_LEG_LAYOUT_DIMENSIONS.centerSupportDoorsThreshold) {
      pos.push({ x: 0, z: D / 2 - BASE_LEG_LAYOUT_DIMENSIONS.cornerInsetM });
      pos.push({ x: 0, z: -D / 2 + BASE_LEG_LAYOUT_DIMENSIONS.cornerInsetM });
    }
    base = {
      kind: 'legs',
      height: legOptions.heightM,
      style: legOptions.style,
      geo: legOptions.geometry,
      positions: pos,
    };
  }

  const cabinetBodyHeight = H - baseHeight;

  if (baseLegPlatformEnabled && _asObject(base)?.kind === 'legs') {
    attachBaseLegPlatformOps({
      base,
      totalW,
      D,
      H,
      legHeight: readBaseLegOptions(inp).heightM,
      sideMode: baseLegPlatformSideMode,
      sideOverhangM: baseLegPlatformSideOverhangM,
      frontOverhangM: baseLegPlatformFrontOverhangM,
      includeTop: !baseLegSuppressTopPlatform,
    });
  } else if (baseLegTopPlatformOnly) {
    base = makeTopOnlyBaseLegPlatformOps({
      totalW,
      D,
      H,
      sideMode: baseLegPlatformSideMode,
      sideOverhangM: baseLegPlatformSideOverhangM,
      frontOverhangM: baseLegPlatformFrontOverhangM,
    });
  }

  const moduleWidthsRaw = readCorePureNumberArray(inp.moduleInternalWidths);
  const moduleHeightsRaw = readCorePureNumberArray(inp.moduleHeightsTotal);
  const moduleDepthsRaw = readCorePureNumberArray(inp.moduleDepthsTotal);
  const moduleConfigsRaw = Array.isArray(inp.moduleCfgList)
    ? __asArray(inp.moduleCfgList)
    : Array.isArray(inp.moduleConfigs)
      ? __asArray(inp.moduleConfigs)
      : null;

  const hasStepData =
    !!moduleWidthsRaw &&
    !!moduleHeightsRaw &&
    moduleWidthsRaw.length > 0 &&
    moduleHeightsRaw.length > 0 &&
    moduleWidthsRaw.length === moduleHeightsRaw.length;

  const hasDepthData =
    !!moduleWidthsRaw &&
    !!moduleDepthsRaw &&
    moduleWidthsRaw.length > 0 &&
    moduleDepthsRaw.length > 0 &&
    moduleWidthsRaw.length === moduleDepthsRaw.length;

  const isStepped =
    !!hasStepData &&
    moduleHeightsRaw.some(h => {
      return Math.abs(h - H) > 1e-6;
    });

  const isDepthStepped =
    !!hasDepthData &&
    moduleDepthsRaw.some(d => {
      return Math.abs(d - D) > 1e-6;
    });

  const moduleWidths = moduleWidthsRaw ? moduleWidthsRaw.map(v => Math.max(0, v)) : null;
  const moduleDepths =
    hasDepthData && moduleDepthsRaw ? moduleDepthsRaw.map(v => Math.max(woodThick, v)) : null;
  const moduleConfigs =
    moduleConfigsRaw && moduleWidths && moduleConfigsRaw.length === moduleWidths.length
      ? moduleConfigsRaw.map(cfgMod => readModuleConfig(cfgMod))
      : null;

  if (
    isDepthStepped &&
    moduleWidths &&
    moduleDepths &&
    moduleWidths.length === moduleDepths.length &&
    moduleWidths.length > 0
  ) {
    adaptDepthSteppedBase({ totalW, D, woodThick, baseType, baseHeight, base, moduleWidths, moduleDepths });
  }

  return {
    totalW,
    D,
    H,
    woodThick,
    baseType,
    doorsCount,
    hasCornice,
    corniceType,
    baseHeight,
    startY,
    cabinetBodyHeight,
    base,
    baseLegPlatformMode,
    baseLegPlatformSideMode,
    baseLegPlatformSideOverhangM,
    baseLegPlatformFrontOverhangM,
    baseLegTopPlatformOnly,
    baseLegSuppressTopPlatform,
    baseLegBottomPlatformHeight,
    baseLegTopPlatformHeight,
    moduleWidths,
    moduleHeightsRaw,
    moduleDepths,
    moduleConfigs,
    hasStepData,
    hasDepthData,
    isStepped,
    isDepthStepped,
    removedLeftFrameSide: isRemovedFrameSideOn(cfg, 'left', inp.frameSidePartIdPrefix),
    removedRightFrameSide: isRemovedFrameSideOn(cfg, 'right', inp.frameSidePartIdPrefix),
  };
}

type BaseLegPlatformAttachParams = {
  base: MutableRecord | null;
  totalW: number;
  D: number;
  H: number;
  legHeight: number;
  sideMode: 'overhang' | 'flush';
  sideOverhangM: number;
  frontOverhangM: number;
  includeTop?: boolean;
};

function makeBaseLegPlatformOp(args: {
  width: number;
  height: number;
  depth: number;
  y: number;
  partId: string;
  sideMode: 'overhang' | 'flush';
  sideOverhangM: number;
  frontOverhangM: number;
}): MutableRecord {
  const frontOverhang = Math.max(0, __asNum(args.frontOverhangM, 0));
  const platformDepth = Math.max(BASE_LEG_PLATFORM_DIMENSIONS.minDepthM, args.depth + frontOverhang);
  const sideOverhang = args.sideMode === 'flush' ? 0 : Math.max(0, __asNum(args.sideOverhangM, 0));
  return {
    kind: 'leg_platform',
    width: Math.max(BASE_LEG_PLATFORM_DIMENSIONS.minWidthM, args.width + sideOverhang * 2),
    height: args.height,
    depth: platformDepth,
    x: 0,
    y: args.y,
    z: -args.depth / 2 + platformDepth / 2,
    partId: args.partId,
  };
}

function attachBaseLegPlatformOps(params: BaseLegPlatformAttachParams): void {
  const baseRec = _asObject(params.base);
  if (!baseRec) return;
  const h = BASE_LEG_PLATFORM_DIMENSIONS.heightM;
  if (!(h > 0)) return;
  const platforms: MutableRecord[] = [
    makeBaseLegPlatformOp({
      width: params.totalW,
      height: h,
      depth: params.D,
      y: params.legHeight + h / 2,
      partId: 'base_leg_platform_bottom',
      sideMode: params.sideMode,
      sideOverhangM: params.sideOverhangM,
      frontOverhangM: params.frontOverhangM,
    }),
  ];
  if (params.includeTop !== false) {
    platforms.push(
      makeBaseLegPlatformOp({
        width: params.totalW,
        height: h,
        depth: params.D,
        y: params.H + h / 2,
        partId: 'base_leg_platform_top',
        sideMode: params.sideMode,
        sideOverhangM: params.sideOverhangM,
        frontOverhangM: params.frontOverhangM,
      })
    );
  }
  baseRec.platforms = platforms;
}

function makeTopOnlyBaseLegPlatformOps(args: {
  totalW: number;
  D: number;
  H: number;
  sideMode: 'overhang' | 'flush';
  sideOverhangM: number;
  frontOverhangM: number;
}): MutableRecord {
  const h = BASE_LEG_PLATFORM_DIMENSIONS.heightM;
  return {
    kind: 'leg_platforms',
    platforms:
      h > 0
        ? [
            makeBaseLegPlatformOp({
              width: args.totalW,
              height: h,
              depth: args.D,
              y: args.H + h / 2,
              partId: 'base_leg_platform_top',
              sideMode: args.sideMode,
              sideOverhangM: args.sideOverhangM,
              frontOverhangM: args.frontOverhangM,
            }),
          ]
        : [],
  };
}

type DepthSteppedBaseParams = {
  totalW: number;
  D: number;
  woodThick: number;
  baseType: string;
  baseHeight: number;
  base: MutableRecord | null;
  moduleWidths: number[];
  moduleDepths: number[];
};

function adaptDepthSteppedBase(params: DepthSteppedBaseParams): void {
  const { totalW, D, woodThick, baseType, baseHeight, base, moduleWidths, moduleDepths } = params;
  if (!base) return;

  if (baseType === 'plinth' && _asObject(base)?.kind === 'plinth') {
    let internalLeft = -totalW / 2 + woodThick;
    const segments: MutableRecord[] = [];
    for (let i = 0; i < moduleWidths.length; i++) {
      const w = moduleWidths[i];
      const dm = moduleDepths[i];

      const leftBoundary = i === 0 ? -totalW / 2 : internalLeft;
      const rightBoundary = i === moduleWidths.length - 1 ? totalW / 2 : internalLeft + w + woodThick;
      const segW = Math.max(
        PLINTH_DIMENSIONS.segmentWidthEpsilonM,
        rightBoundary - leftBoundary - PLINTH_DIMENSIONS.segmentWidthEpsilonM
      );
      const segDepth = Math.max(
        PLINTH_DIMENSIONS.steppedMinSegmentDepthM,
        dm - PLINTH_DIMENSIONS.depthClearanceM
      );
      const segZ = -D / 2 + PLINTH_DIMENSIONS.steppedBackInsetM + segDepth / 2;

      segments.push({
        kind: 'plinth',
        width: segW,
        height: baseHeight,
        depth: segDepth,
        x: (leftBoundary + rightBoundary) / 2,
        y: baseHeight / 2,
        z: segZ,
      });

      internalLeft += w + (i < moduleWidths.length - 1 ? woodThick : 0);
    }
    const baseRec = _asObject(base);
    if (baseRec) {
      baseRec.segments = segments;
      baseRec.partId = 'plinth_color';
    }
    return;
  }

  if (baseType === 'legs' && _asObject(base)?.kind === 'legs') {
    let internalLeft = -totalW / 2 + woodThick;
    const spans: { left: number; right: number; depth: number }[] = [];
    for (let i = 0; i < moduleWidths.length; i++) {
      const w = moduleWidths[i];
      const dm = moduleDepths[i];
      const leftBoundary = i === 0 ? -totalW / 2 : internalLeft;
      const rightBoundary = i === moduleWidths.length - 1 ? totalW / 2 : internalLeft + w + woodThick;
      spans.push({ left: leftBoundary, right: rightBoundary, depth: dm });
      internalLeft += w + (i < moduleWidths.length - 1 ? woodThick : 0);
    }

    const eps = 1e-6;
    const depthAtX = (x: number): number => {
      let best: number | null = null;
      for (let i = 0; i < spans.length; i++) {
        const s = spans[i];
        if (x >= s.left - eps && x <= s.right + eps) {
          best = best == null ? s.depth : Math.min(best, s.depth);
        }
      }
      return best == null ? D : best;
    };

    const baseRec = _asObject(base);
    const pos = Array.isArray(baseRec?.positions) ? __asArray(baseRec.positions) : [];
    for (let i = 0; i < pos.length; i++) {
      const pRec = _asObject(pos[i]);
      if (!pRec) continue;
      const x = __asNum(pRec.x, 0);
      const z = __asNum(pRec.z, 0);
      if (z > 0) {
        const dm = depthAtX(x);
        let newZ = -D / 2 + dm - BASE_LEG_LAYOUT_DIMENSIONS.cornerInsetM;
        const backZ = -D / 2 + BASE_LEG_LAYOUT_DIMENSIONS.cornerInsetM;
        if (newZ < backZ + BASE_LEG_LAYOUT_DIMENSIONS.depthSteppedMinFrontBackGapM)
          newZ = backZ + BASE_LEG_LAYOUT_DIMENSIONS.depthSteppedMinFrontBackGapM;
        pRec.z = newZ;
      }
    }
  }
}
