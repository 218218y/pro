import { INTERIOR_FITTINGS_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';
import { _asObject, __asArray } from './core_pure_shared.js';
import type { InteriorCustomOpsLike, InteriorRodOpLike } from './core_pure_shared.js';
import { readCorePureNumber, readCorePurePositiveInteger } from './core_pure_number_contracts.js';

function readCustomGridDivisions(value: unknown): number {
  return readCorePurePositiveInteger(value, INTERIOR_FITTINGS_DIMENSIONS.storage.gridDivisionsDefault);
}

function readOptionalCustomNumber(value: unknown): number | null {
  const n = readCorePureNumber(value, NaN);
  return Number.isFinite(n) ? n : null;
}

function writeOptionalCustomNumber(
  target: InteriorRodOpLike,
  key: 'yAdd' | 'limitFactor' | 'limitAdd',
  value: unknown
): void {
  const n = readOptionalCustomNumber(value);
  if (n == null) delete target[key];
  else target[key] = n;
}

export function computeInteriorCustomOps(customData: unknown, gridDivisions: unknown): InteriorCustomOpsLike {
  const cd = _asObject(customData) || {};
  const gd = readCustomGridDivisions(gridDivisions);

  const shelvesArr = __asArray(cd.shelves);
  const rodsArr = __asArray(cd.rods);
  const explicitRodOpsArr = __asArray(cd.rodOps);
  const hasStorage = !!cd.storage;
  const shelfVariantsArr = __asArray(cd.shelfVariants);

  const ops: InteriorCustomOpsLike = { shelves: [], rods: [] };

  const shelfVariantsByIndex: Record<number, string> = Object.create(null);
  const explicitRodOpsByIndex: Record<number, InteriorRodOpLike> = Object.create(null);
  const deriveExplicitRodIndex = (rod: unknown): number | null => {
    const rec = _asObject(rod) || {};
    const rawGridIndex = readOptionalCustomNumber(rec.gridIndex);
    if (rawGridIndex != null && rawGridIndex >= 1) {
      const gi = Math.max(1, Math.min(gd, Math.round(rawGridIndex)));
      return gi;
    }
    const rawYFactor = readOptionalCustomNumber(rec.yFactor);
    if (rawYFactor == null) return null;
    const mapped = Math.round((rawYFactor * gd) / INTERIOR_FITTINGS_DIMENSIONS.storage.gridDivisionsDefault);
    return Math.max(1, Math.min(gd, mapped));
  };

  for (let i = 0; i < explicitRodOpsArr.length; i += 1) {
    const rec = _asObject(explicitRodOpsArr[i]) || null;
    if (!rec) continue;
    const gridIndex = deriveExplicitRodIndex(rec);
    if (!(gridIndex && gridIndex >= 1 && gridIndex <= gd)) continue;
    const yFactor = readOptionalCustomNumber(rec.yFactor);
    if (yFactor == null) continue;
    const next: InteriorRodOpLike = {
      ...rec,
      gridIndex,
      yFactor,
      enableHangingClothes: rec.enableHangingClothes !== false,
      enableSingleHanger: rec.enableSingleHanger !== false,
    };
    writeOptionalCustomNumber(next, 'yAdd', rec.yAdd);
    writeOptionalCustomNumber(next, 'limitFactor', rec.limitFactor);
    writeOptionalCustomNumber(next, 'limitAdd', rec.limitAdd);
    explicitRodOpsByIndex[gridIndex] = next;
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
      const rodOp: InteriorRodOpLike = {
        gridIndex: i,
        yFactor: i,
        yAdd: INTERIOR_FITTINGS_DIMENSIONS.rods.defaultYOffsetM,
        enableHangingClothes: true,
        enableSingleHanger: true,
      };

      let limitFactor: number | null = null;
      let limitAdd: number | null = null;

      for (let k = i - 1; k >= 1; k--) {
        if (!!shelvesArr[k - 1]) {
          limitFactor = i - k;
          limitAdd = INTERIOR_FITTINGS_DIMENSIONS.rods.defaultYOffsetM;
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
        limitAdd = -(
          Math.abs(INTERIOR_FITTINGS_DIMENSIONS.rods.defaultYOffsetM) +
          INTERIOR_FITTINGS_DIMENSIONS.storage.barrierHeightM
        );
      }

      if (limitFactor !== null) rodOp.limitFactor = limitFactor;
      if (limitAdd !== null) rodOp.limitAdd = limitAdd;

      ops.rods.push(rodOp);
    }
  }

  if (hasStorage) {
    ops.storageBarrier = {
      barrierH: INTERIOR_FITTINGS_DIMENSIONS.storage.barrierHeightM,
      zFrontOffset: INTERIOR_FITTINGS_DIMENSIONS.storage.barrierFrontZOffsetM,
    };
  }

  try {
    const keys = Object.keys(shelfVariantsByIndex);
    if (keys.length) ops.shelfVariants = shelfVariantsByIndex;
  } catch {}

  return ops;
}
