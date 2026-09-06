import type { LinearCellDimsContext } from './canvas_picking_cell_dims_linear_shared.js';

import { readRequiredLinearDimension } from './canvas_picking_cell_dims_linear_shared.js';

export type LinearCellDoorCount = 1 | 2;

export type LinearCellDoorWidthRebase = {
  desiredWidthCm: number;
  nextBaseWidthCm: number;
  clearWidthOverride: boolean;
};

export type LinearCellDoorCountResult = {
  changed: boolean;
  nextDoorsPerModule: number[];
  nextTotalDoors: number;
  structureSelect: string;
  widthRebase: LinearCellDoorWidthRebase[];
};

function roundCm(value: number): number {
  return Math.round(value * 100) / 100;
}

function sumDoorSignature(signature: readonly number[]): number {
  return signature.reduce((sum, doors) => sum + Math.max(1, doors), 0);
}

function unchangedResult(ctx: LinearCellDimsContext): LinearCellDoorCountResult {
  const nextDoorsPerModule = ctx.doorsPerModule.slice();
  return {
    changed: false,
    nextDoorsPerModule,
    nextTotalDoors: sumDoorSignature(nextDoorsPerModule),
    structureSelect: JSON.stringify(nextDoorsPerModule),
    widthRebase: [],
  };
}

/**
 * Module `doors` historically serves two roles: actual leaf count and default
 * width weight. Changing only the leaf count therefore needs a new width base
 * for every module while preserving the widths that are currently visible.
 *
 * This helper stays pure: it calculates the canonical door signature and the
 * width-rebase plan. The existing cell-dims mutation owner applies that plan to
 * `specialDims`, keeping layer ownership unchanged.
 */
export function resolveLinearCellDoorCountPolicy(args: {
  ctx: LinearCellDimsContext;
  desiredWidthsCm: readonly number[];
  nextTotalW: number;
}): LinearCellDoorCountResult {
  const { ctx } = args;
  const requested = ctx.cellDoorCount;
  const currentDoors = ctx.doorsPerModule[ctx.idx] ?? 1;

  if (requested !== 1 && requested !== 2) return unchangedResult(ctx);
  if (requested === currentDoors) return unchangedResult(ctx);

  const nextDoorsPerModule = ctx.doorsPerModule.slice();
  nextDoorsPerModule[ctx.idx] = requested;
  const nextTotalDoors = sumDoorSignature(nextDoorsPerModule);
  if (nextTotalDoors < 1) {
    throw new RangeError('[WardrobePro][cellDims] Invalid total door count after cell door mutation.');
  }

  const totalWidth = Number.isFinite(args.nextTotalW) && args.nextTotalW > 0 ? args.nextTotalW : ctx.totalW;
  const widthRebase: LinearCellDoorWidthRebase[] = [];
  for (let i = 0; i < ctx.moduleCount; i += 1) {
    const desiredWidth = readRequiredLinearDimension(args.desiredWidthsCm, i, 'door-preserved width');
    const nextBaseWidth = (totalWidth * Math.max(1, nextDoorsPerModule[i] ?? 1)) / nextTotalDoors;
    widthRebase.push({
      desiredWidthCm: roundCm(desiredWidth),
      nextBaseWidthCm: roundCm(nextBaseWidth),
      clearWidthOverride: Math.abs(desiredWidth - nextBaseWidth) <= ctx.autoWidthMatchToleranceCm,
    });
  }

  return {
    changed: true,
    nextDoorsPerModule,
    nextTotalDoors,
    structureSelect: JSON.stringify(nextDoorsPerModule),
    widthRebase,
  };
}
