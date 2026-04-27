import type { InteriorRodOpLike } from '../../../../types';
import { computeInteriorPresetOps } from './ops.js';

type SeededPresetCustomData = {
  shelves: boolean[];
  rods: boolean[];
  rodOps: InteriorRodOpLike[];
  storage: boolean;
  shelfVariants: string[];
};

function clampDivisions(value: number): number {
  return Number.isFinite(value) && value > 0 ? Math.max(1, Math.round(value)) : 6;
}

function clampGridIndex(value: number, divs: number): number {
  const rounded = Math.round(value);
  if (rounded < 1) return 1;
  if (rounded > divs) return divs;
  return rounded;
}

function mapCanonicalShelfIndexToDivisions(value: number, divs: number): number {
  if (!(divs > 1)) return 1;
  return Math.max(1, Math.min(divs - 1, clampGridIndex((Number(value) * divs) / 6, divs - 1)));
}

function mapCanonicalRodIndexToDivisions(value: number, divs: number): number {
  return clampGridIndex((Number(value) * divs) / 6, divs);
}

export function buildPresetBackedCustomData(layoutType: unknown, divsRaw: number): SeededPresetCustomData {
  const divs = clampDivisions(divsRaw);
  const ops = computeInteriorPresetOps(layoutType);
  const shelves: boolean[] = new Array(Math.max(0, divs - 1)).fill(false);
  const rods: boolean[] = new Array(Math.max(0, divs)).fill(false);
  const rodOps: InteriorRodOpLike[] = [];

  if (Array.isArray(ops.shelves)) {
    for (let i = 0; i < ops.shelves.length; i += 1) {
      const shelfIndex = mapCanonicalShelfIndexToDivisions(Number(ops.shelves[i]), divs);
      if (shelfIndex >= 1 && shelfIndex < divs) shelves[shelfIndex - 1] = true;
    }
  }

  if (Array.isArray(ops.rods)) {
    for (let i = 0; i < ops.rods.length; i += 1) {
      const raw = ops.rods[i];
      if (!raw || typeof raw !== 'object') continue;
      const yFactor = Number(raw.yFactor);
      if (!Number.isFinite(yFactor)) continue;
      const gridIndex = mapCanonicalRodIndexToDivisions(yFactor, divs);
      rods[gridIndex - 1] = true;
      const next: InteriorRodOpLike = {
        ...raw,
        gridIndex,
        yFactor,
        enableHangingClothes: raw.enableHangingClothes !== false,
        enableSingleHanger: raw.enableSingleHanger !== false,
      };
      if (!Number.isFinite(Number(next.yAdd))) delete next.yAdd;
      if (!Number.isFinite(Number(next.limitFactor))) delete next.limitFactor;
      if (!Number.isFinite(Number(next.limitAdd))) delete next.limitAdd;
      rodOps.push(next);
    }
  }

  return {
    shelves,
    rods,
    rodOps,
    storage: !!ops.storageBarrier,
    shelfVariants: new Array(Math.max(0, divs - 1)).fill(''),
  };
}
