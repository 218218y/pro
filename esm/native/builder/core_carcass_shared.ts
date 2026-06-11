// Builder core carcass shared preparation and normalization helpers.

import { readBaseLegOptions } from '../features/base_leg_support.js';
import { _asObject, __asArray, __asInt, __asNum } from './core_pure_shared.js';
import type { MutableRecord } from './core_pure_shared.js';

export const CARCASS_BACK_INSET_Z = 0.0078;
export const CARCASS_FRONT_INSET_Z = 0.005;

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
  moduleWidths: number[] | null;
  moduleHeightsRaw: unknown[] | null;
  moduleDepths: number[] | null;
  hasStepData: boolean;
  hasDepthData: boolean;
  isStepped: boolean;
  isDepthStepped: boolean;
};

export function prepareCarcassInput(input: unknown): PreparedCarcassInput {
  const inp = _asObject(input) || {};
  const totalW = __asNum(inp.totalW, 0);
  const D = __asNum(inp.D, 0);
  const H = __asNum(inp.H, 0);
  const woodThick = __asNum(inp.woodThick, 0.018);
  const baseType = String(inp.baseType || '');
  const doorsCount = __asInt(inp.doorsCount, 0);
  const hasCornice = !!inp.hasCornice;
  const corniceType = String(inp.corniceType || 'classic');

  let baseHeight = 0;
  let startY = 0;
  let base: MutableRecord | null = null;

  if (baseType === 'plinth') {
    baseHeight = 0.08;
    startY = baseHeight;
    base = {
      kind: 'plinth',
      width: totalW - 0.04,
      height: baseHeight,
      depth: D - 0.05,
      x: 0,
      y: baseHeight / 2,
      z: -0.015,
      partId: 'plinth_color',
    };
  } else if (baseType === 'legs') {
    const legOptions = readBaseLegOptions(inp);
    baseHeight = legOptions.heightM;
    startY = baseHeight;
    const pos: MutableRecord[] = [
      { x: -totalW / 2 + 0.05, z: D / 2 - 0.05 },
      { x: totalW / 2 - 0.05, z: D / 2 - 0.05 },
      { x: -totalW / 2 + 0.05, z: -D / 2 + 0.05 },
      { x: totalW / 2 - 0.05, z: -D / 2 + 0.05 },
    ];
    if (doorsCount >= 5) {
      pos.push({ x: 0, z: D / 2 - 0.05 });
      pos.push({ x: 0, z: -D / 2 + 0.05 });
    }
    base = {
      kind: 'legs',
      height: baseHeight,
      style: legOptions.style,
      geo: legOptions.geometry,
      positions: pos,
    };
  }

  const cabinetBodyHeight = H - baseHeight;

  const moduleWidthsRaw = Array.isArray(inp.moduleInternalWidths)
    ? __asArray(inp.moduleInternalWidths)
    : null;
  const moduleHeightsRaw = Array.isArray(inp.moduleHeightsTotal) ? __asArray(inp.moduleHeightsTotal) : null;
  const moduleDepthsRaw = Array.isArray(inp.moduleDepthsTotal) ? __asArray(inp.moduleDepthsTotal) : null;

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
      const n = __asNum(h, H);
      return Number.isFinite(n) && Math.abs(n - H) > 1e-6;
    });

  const isDepthStepped =
    !!hasDepthData &&
    moduleDepthsRaw.some(d => {
      const n = __asNum(d, D);
      return Number.isFinite(n) && Math.abs(n - D) > 1e-6;
    });

  const moduleWidths = moduleWidthsRaw ? moduleWidthsRaw.map(v => Math.max(0, __asNum(v, 0))) : null;
  const moduleDepths =
    hasDepthData && moduleDepthsRaw
      ? moduleDepthsRaw.map(v => {
          const n = __asNum(v, D);
          return Math.max(woodThick, n);
        })
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
    moduleWidths,
    moduleHeightsRaw,
    moduleDepths,
    hasStepData,
    hasDepthData,
    isStepped,
    isDepthStepped,
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
      const segW = Math.max(0.001, rightBoundary - leftBoundary - 0.001);
      const segDepth = Math.max(0.02, dm - 0.05);
      const segZ = -D / 2 + 0.01 + segDepth / 2;

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
        let newZ = -D / 2 + dm - 0.05;
        const backZ = -D / 2 + 0.05;
        if (newZ < backZ + 0.03) newZ = backZ + 0.03;
        pRec.z = newZ;
      }
    }
  }
}
