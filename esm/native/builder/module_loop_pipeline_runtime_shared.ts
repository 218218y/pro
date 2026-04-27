import { asPivotEntry, asPivotEntryMap, type PivotEntryLike } from './module_loop_pipeline_shared.js';

import type { BuilderCreateBoardArgsLike, BuilderCreateBoardFn } from '../../../types/index.js';

import type { ModuleDoorSpan } from './module_loop_pipeline_runtime_contracts.js';

type UnknownRuntimeFn<TResult = unknown> = (...args: readonly unknown[]) => TResult;

function isRuntimeFn<TResult = unknown>(value: unknown): value is UnknownRuntimeFn<TResult> {
  return typeof value === 'function';
}

export function readCreateBoard(value: unknown): BuilderCreateBoardFn | undefined {
  if (!isRuntimeFn<ReturnType<BuilderCreateBoardFn>>(value)) return undefined;
  type CreateBoardCompat = {
    (args: BuilderCreateBoardArgsLike): ReturnType<BuilderCreateBoardFn>;
    (
      w: number,
      h: number,
      d: number,
      x: number,
      y: number,
      z: number,
      mat: unknown,
      partId?: unknown,
      sketchMode?: boolean
    ): ReturnType<BuilderCreateBoardFn>;
  };
  const createBoard: CreateBoardCompat = (...args: readonly unknown[]) =>
    Reflect.apply(value, undefined, args);
  return createBoard;
}

export function reqNumber(value: unknown, name: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`[builder/module_loop] Missing numeric ${name}`);
  }
  return value;
}

export function createModuleDoorSpanResolver(hingedDoorPivotMap: unknown) {
  return (
    startDoorId: number,
    doorsCount: number,
    fallbackCenterX: number,
    fallbackW: number
  ): ModuleDoorSpan => {
    const defMin = fallbackCenterX - fallbackW / 2;
    const defMax = fallbackCenterX + fallbackW / 2;

    let minX = defMin;
    let maxX = defMax;
    let found = false;

    const map = asPivotEntryMap(hingedDoorPivotMap);
    const n = typeof doorsCount === 'number' && doorsCount > 0 ? Math.floor(doorsCount) : 1;

    for (let di = 0; di < n; di++) {
      const doorId = startDoorId + di;
      const sp = map && map[doorId];
      if (!sp) continue;

      const spRec: PivotEntryLike | null = asPivotEntry(sp);
      if (!spRec) continue;
      const w = Number(spRec.doorWidth);
      const pivotX = Number(spRec.pivotX);
      const hingeLeft = !!spRec.isLeftHinge;

      if (!Number.isFinite(w) || !Number.isFinite(pivotX) || w <= 0) continue;

      const xLeft = hingeLeft ? pivotX : pivotX - w;
      const xRight = hingeLeft ? pivotX + w : pivotX;

      if (!Number.isFinite(xLeft) || !Number.isFinite(xRight)) continue;

      minX = found ? Math.min(minX, xLeft) : xLeft;
      maxX = found ? Math.max(maxX, xRight) : xRight;
      found = true;
    }

    if (!found) return { spanW: fallbackW, centerX: fallbackCenterX };

    const spanW = maxX - minX;
    const centerX = (minX + maxX) / 2;
    return {
      spanW: Number.isFinite(spanW) && spanW > 0 ? spanW : fallbackW,
      centerX: Number.isFinite(centerX) ? centerX : fallbackCenterX,
    };
  };
}
