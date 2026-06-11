import { _asObject, __asArray } from './core_pure_shared.js';
import type { InteriorCustomOpsLike, InteriorRodOpLike } from './core_pure_shared.js';

export function computeInteriorCustomOps(customData: unknown, gridDivisions: unknown): InteriorCustomOpsLike {
  const cd = _asObject(customData) || {};
  let gd = parseInt(typeof gridDivisions === 'string' ? gridDivisions : String(gridDivisions ?? ''), 10);
  if (!Number.isFinite(gd) || gd < 1) gd = 6;

  const shelvesArr = __asArray(cd.shelves);
  const rodsArr = __asArray(cd.rods);
  const explicitRodOpsArr = __asArray(cd.rodOps);
  const hasStorage = !!cd.storage;
  const shelfVariantsArr = __asArray(cd.shelfVariants);

  let ops: InteriorCustomOpsLike = { shelves: [], rods: [] };

  const shelfVariantsByIndex: Record<number, string> = Object.create(null);
  const explicitRodOpsByIndex: Record<number, InteriorRodOpLike> = Object.create(null);
  const deriveExplicitRodIndex = (rod: unknown): number | null => {
    const rec = _asObject(rod) || {};
    const rawGridIndex = Number(rec.gridIndex);
    if (Number.isFinite(rawGridIndex) && rawGridIndex >= 1) {
      const gi = Math.max(1, Math.min(gd, Math.round(rawGridIndex)));
      return gi;
    }
    const rawYFactor = Number(rec.yFactor);
    if (!Number.isFinite(rawYFactor)) return null;
    const mapped = Math.round((rawYFactor * gd) / 6);
    return Math.max(1, Math.min(gd, mapped));
  };

  for (let i = 0; i < explicitRodOpsArr.length; i += 1) {
    const rec = _asObject(explicitRodOpsArr[i]) || null;
    if (!rec) continue;
    const gridIndex = deriveExplicitRodIndex(rec);
    if (!(gridIndex && gridIndex >= 1 && gridIndex <= gd)) continue;
    const yFactor = Number(rec.yFactor);
    if (!Number.isFinite(yFactor)) continue;
    explicitRodOpsByIndex[gridIndex] = {
      ...rec,
      gridIndex,
      yFactor,
      enableHangingClothes: rec.enableHangingClothes !== false,
      enableSingleHanger: rec.enableSingleHanger !== false,
    };
  }

  for (let i = 1; i <= gd; i++) {
    if (i < gd && !!shelvesArr[i - 1]) {
      ops.shelves.push(i);
      const vRaw = shelfVariantsArr[i - 1];
      const v0 = typeof vRaw === 'string' ? vRaw.trim().toLowerCase() : '';
      const v = v0 === 'double' || v0 === 'glass' || v0 === 'brace' || v0 === 'regular' ? v0 : '';
      if (v && v !== 'regular') shelfVariantsByIndex[i] = v;
    }

    const explicitRodOp = explicitRodOpsByIndex[i];
    if (explicitRodOp) {
      ops.rods.push({ ...explicitRodOp });
      continue;
    }

    if (!!rodsArr[i - 1]) {
      let rodOp: InteriorRodOpLike = {
        gridIndex: i,
        yFactor: i,
        yAdd: -0.08,
        enableHangingClothes: true,
        enableSingleHanger: true,
      };

      let limitFactor: number | null = null;
      let limitAdd: number | null = null;

      for (let k = i - 1; k >= 1; k--) {
        if (!!shelvesArr[k - 1]) {
          limitFactor = i - k;
          limitAdd = -0.08;
          break;
        }
        if (!!rodsArr[k - 1]) {
          limitFactor = i - k;
          limitAdd = 0;
          break;
        }
      }

      if (limitFactor === null && hasStorage) {
        limitFactor = i;
        limitAdd = -(0.08 + 0.5);
      }

      if (Number.isFinite(Number(limitFactor))) rodOp.limitFactor = Number(limitFactor);
      if (Number.isFinite(Number(limitAdd))) rodOp.limitAdd = Number(limitAdd);

      ops.rods.push(rodOp);
    }
  }

  if (hasStorage) {
    ops.storageBarrier = { barrierH: 0.5, zFrontOffset: -0.06 };
  }

  try {
    const keys = Object.keys(shelfVariantsByIndex);
    if (keys.length) ops.shelfVariants = shelfVariantsByIndex;
  } catch {}

  return ops;
}
