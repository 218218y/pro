// Builder core pure layout computations.
import { MATERIAL_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';

import { getActiveWidthCmFromConfig } from '../features/special_dims/index.js';
import {
  _asObject,
  __asArray,
  __asInt,
  __asNum,
  __defaultModuleCfg,
  __normalizeModulesStructure,
  __sumDoors,
} from './core_pure_shared.js';
import type { ModuleConfig } from './core_pure_shared.js';

export function normalizeModulesConfiguration(
  modulesConfiguration: unknown,
  modulesStructure: unknown
): ModuleConfig[] {
  const ms = __normalizeModulesStructure(modulesStructure);
  const cfgArr = __asArray(modulesConfiguration);

  const out: ModuleConfig[] = new Array(ms.length);
  for (let i = 0; i < ms.length; i++) {
    let doors = __asInt(ms[i].doors, 1);
    const prev = cfgArr[i];
    if (!prev || typeof prev !== 'object') {
      out[i] = __defaultModuleCfg(doors);
    } else {
      // Preserve existing settings, but ensure doors is consistent.
      const next = __defaultModuleCfg(doors);
      Object.assign(next, _asObject(prev) ?? {}, { doors: doors });
      out[i] = next;
    }
  }

  return out;
}

// Compute stable layout numbers for the builder loop.
// This lets the render code focus on THREE calls only.

export function computeModuleLayout(input: unknown) {
  const inp = _asObject(input) || {};
  const totalW = __asNum(inp.totalW, 0);
  const woodThick = __asNum(inp.woodThick, MATERIAL_DIMENSIONS.wood.thicknessM);

  const modules = __normalizeModulesStructure(inp.modulesStructure);
  const totalDividersWidth = Math.max(0, modules.length - 1) * woodThick;
  const netInternalWidth = totalW - 2 * woodThick - totalDividersWidth;

  const doorUnits = __sumDoors(modules);
  const singleUnitWidth = doorUnits > 0 ? netInternalWidth / doorUnits : 0;

  const moduleConfigs = normalizeModulesConfiguration(inp.modulesConfiguration, modules);

  // Per-module internal opening widths (meters).
  //
  // `moduleConfigs[i].specialDims.widthCm` is treated as the module segment width in cm
  // in the same measurement system as ui.raw['width'] (segment widths tile the full wardrobe width).
  //
  // Geometry needs *clear internal openings*; we compute them deterministically by subtracting
  // wall/divider thickness. Outer walls are fully subtracted on the edges; internal dividers
  // are split half/half between adjacent modules.
  //
  // IMPORTANT: Users may mix per-cell widths with GLOBAL wardrobe width changes.
  // In that case we must keep segment widths tiling the global width (otherwise only the carcass
  // frame changes while doors/shelves stay at the old module widths).
  // Policy:
  // - Modules with an ACTIVE per-cell width override are FIXED.
  // - Global width changes affect ONLY the remaining (non-fixed) modules.
  // - If everything is fixed, fall back to adjusting the rightmost module to keep tiling.
  const totalWcm = totalW * 100;
  const moduleSegWidthsCm: number[] = new Array(modules.length);
  const moduleInternalWidths: number[] = new Array(modules.length);

  // First pass: read explicit segment widths from specialDims, otherwise mark missing.
  let fixedSumCm = 0;
  let missingUnits = 0;
  const missing: boolean[] = new Array(modules.length);

  for (let i = 0; i < modules.length; i++) {
    const doors = Math.max(1, __asInt(modules[i]?.doors, 1));
    const mc = moduleConfigs[i] || __defaultModuleCfg(doors);
    const wCm = getActiveWidthCmFromConfig(mc);
    const activeWidthCm = Number(wCm);
    const isActiveOverride = Number.isFinite(activeWidthCm) && activeWidthCm > 0;

    if (isActiveOverride) {
      moduleSegWidthsCm[i] = activeWidthCm;
      fixedSumCm += activeWidthCm;
      missing[i] = false;
    } else {
      moduleSegWidthsCm[i] = NaN;
      missing[i] = true;
      missingUnits += doors;
    }
  }

  // Second pass: fill missing segment widths from the remaining space (distributed by door units).
  if (missingUnits > 0) {
    const remainingCm = totalWcm - fixedSumCm;
    const denom = missingUnits > 0 ? missingUnits : 1;

    // If remaining space is negative, we still assign something positive here and later clamp via delta distribution.
    const fallbackDenom = doorUnits > 0 ? doorUnits : modules.length || 1;

    for (let i = 0; i < modules.length; i++) {
      if (!missing[i]) continue;
      const doors = Math.max(1, __asInt(modules[i]?.doors, 1));
      let seg = (remainingCm * doors) / denom;
      if (!Number.isFinite(seg) || seg <= 0) {
        seg = (totalWcm * doors) / fallbackDenom;
      }
      moduleSegWidthsCm[i] = seg;
    }
  }

  // Third pass: enforce tiling (sum of segment widths == totalWcm).
  // Prefer adjusting non-fixed ("missing") modules; only touch fixed modules if there's no other choice.
  let sumSegCm = 0;
  for (let i = 0; i < moduleSegWidthsCm.length; i++) sumSegCm += Number(moduleSegWidthsCm[i]) || 0;
  let deltaCm = totalWcm - sumSegCm;

  if (modules.length > 0 && Number.isFinite(deltaCm) && Math.abs(deltaCm) > 1e-6) {
    const MIN_SEG_CM = 1; // tiny safety minimum (cm)
    let rem = deltaCm;

    const _adjust = (indices: number[]) => {
      for (let k = 0; k < indices.length && Math.abs(rem) > 1e-6; k++) {
        const i = indices[k];
        const cur = Number(moduleSegWidthsCm[i]) || 0;
        if (rem > 0) {
          moduleSegWidthsCm[i] = cur + rem;
          rem = 0;
        } else {
          const canReduce = Math.max(0, cur - MIN_SEG_CM);
          if (canReduce <= 0) continue;
          const take = Math.min(canReduce, -rem);
          moduleSegWidthsCm[i] = cur - take;
          rem += take;
        }
      }
    };

    // Prefer adjusting flexible modules (those that were "missing" in pass 1).
    const flexIdx: number[] = [];
    for (let i = modules.length - 1; i >= 0; i--) if (missing[i]) flexIdx.push(i);

    if (flexIdx.length > 0) {
      _adjust(flexIdx);
    }

    // If we couldn't satisfy the delta (e.g. no flex modules, or min clamp), fall back to all modules.
    if (Math.abs(rem) > 1e-6) {
      const allIdx: number[] = [];
      for (let i = modules.length - 1; i >= 0; i--) allIdx.push(i);
      _adjust(allIdx);
    }
  }

  // Final: compute clear internal openings in meters.
  for (let i = 0; i < modules.length; i++) {
    const segCm = Number(moduleSegWidthsCm[i]) || 0;

    // Clear opening width: subtract boundary thickness (cm).
    const leftBoundCm = i === 0 ? woodThick * 100 : woodThick * 50;
    const rightBoundCm = i === modules.length - 1 ? woodThick * 100 : woodThick * 50;

    const internalCm = Math.max(0, segCm - leftBoundCm - rightBoundCm);
    moduleInternalWidths[i] = internalCm / 100;
  }

  return {
    modules: modules,
    moduleConfigs: moduleConfigs,
    totalDividersWidth: totalDividersWidth,
    netInternalWidth: netInternalWidth,
    doorUnits: doorUnits,
    singleUnitWidth: singleUnitWidth,
    moduleInternalWidths: moduleInternalWidths,
  };
}

// Pre-compute deterministic hinge/pivot specs for hinged doors.
// Returns a map keyed by sequential doorId (1..N) to avoid recalculating pivot math in render loops.
