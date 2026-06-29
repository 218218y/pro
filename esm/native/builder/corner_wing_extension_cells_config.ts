import { CORNER_WING_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';
import { getModulesActions } from '../runtime/actions_access_domains.js';
import { readModulesConfigurationListFromConfigSnapshot } from '../features/modules_configuration/modules_config_api.js';
import { cloneMaybe, isRecord, readFiniteNumber } from './corner_geometry_plan.js';

import type { CornerCellCfg, CornerCellCustomData } from './corner_geometry_plan.js';
import type {
  CornerWingCellCfgResolver,
  CornerWingCellDerivationArgs,
} from './corner_wing_extension_cells_contracts.js';

type RecordBag = Record<string, unknown>;

function readFiniteInt(value: unknown): number | null {
  const n = readFiniteNumber(value);
  if (n == null) return null;
  const rounded = Math.trunc(n);
  return Number.isFinite(rounded) ? rounded : null;
}

export function createCornerWingCellCfgResolver(
  args: CornerWingCellDerivationArgs,
  cornerCellCount: number
): CornerWingCellCfgResolver {
  const normalizeModuleCfg = createCornerWingModuleCfgNormalizer(args, cornerCellCount);
  const cornerModsList = readModulesConfigurationListFromConfigSnapshot(args.config, 'modulesConfiguration');
  const hasAnyCornerCellCfg = cornerModsList.some(isValueRecord);
  const isDefaultCornerCfg = createDefaultCornerCfgDetector();

  return (idx: number): CornerCellCfg => {
    if (hasAnyCornerCellCfg) {
      const raw = cornerModsList[idx];
      if (isValueRecord(raw)) return normalizeModuleCfg(raw, idx);

      const modulesRec = getModulesActions(args.App);
      const ensureCell = readEnsureCornerCellForStack(
        modulesRec,
        args.__stackSplitEnabled && args.__stackKey === 'bottom' ? 'bottom' : 'top'
      );
      const fromCanonical = ensureCell ? ensureCell(idx) : null;
      if (isValueRecord(fromCanonical)) return normalizeModuleCfg(fromCanonical, idx);
      return normalizeModuleCfg({}, idx);
    }

    if (!isDefaultCornerCfg(args.config)) return normalizeModuleCfg(args.config, idx);
    return normalizeModuleCfg({}, idx);
  };
}

function createCornerWingModuleCfgNormalizer(args: CornerWingCellDerivationArgs, cornerCellCount: number) {
  return (raw: unknown, idx: number): CornerCellCfg => {
    const cfgBase = cloneRecord(raw);
    const cfg: CornerCellCfg = {
      ...cfgBase,
      layout: '',
      extDrawersCount: 0,
      hasShoeDrawer: false,
      isCustom: false,
      gridDivisions: CORNER_WING_DIMENSIONS.cells.defaultGridDivisions,
      customData: readCornerCellCustomData(cfgBase.customData),
    };

    const isBottomStack = args.__stackSplitEnabled && args.__stackKey === 'bottom';
    const rawRec = isValueRecord(raw) ? raw : null;
    const rawLayout = rawRec && typeof rawRec.layout === 'string' ? String(rawRec.layout).trim() : '';
    const rawGridDiv = rawRec ? readFiniteInt(rawRec.gridDivisions) : null;

    if (!rawLayout) {
      if (isBottomStack) cfg.layout = 'shelves';
      else if (args.__mirrorX === -1 && cornerCellCount > 1)
        cfg.layout = idx === cornerCellCount - 1 ? 'hanging_top2' : 'shelves';
      else cfg.layout = idx === 0 ? 'hanging_top2' : 'shelves';
    } else {
      cfg.layout = rawLayout;
    }

    const extRaw = cfgBase.extDrawersCount ?? cfgBase.extDrawers;
    const ext = readFiniteInt(extRaw);
    cfg.extDrawersCount = ext != null ? ext : 0;
    cfg.hasShoeDrawer = !!cfgBase.hasShoeDrawer;
    cfg.isCustom = !!cfgBase.isCustom;
    cfg.gridDivisions = (() => {
      const gd = readFiniteInt(cfgBase.gridDivisions);
      return gd != null && gd > 0 ? gd : CORNER_WING_DIMENSIONS.cells.defaultGridDivisions;
    })();

    const customData = cfg.customData;

    if (isBottomStack) {
      const looksAutoDefault =
        cfg.extDrawersCount === 0 &&
        cfg.hasShoeDrawer === false &&
        customData.storage === false &&
        !anyTruthy(customData.shelves) &&
        !anyTruthy(customData.rods);

      const layout = String(cfg.layout ?? '').trim();
      const layoutLooksLeaky =
        layout === 'hanging_top2' ||
        layout === 'hanging' ||
        layout === 'hanging_split' ||
        layout === 'mixed' ||
        layout === '' ||
        layout == null;

      if (looksAutoDefault && (layoutLooksLeaky || layout === 'shelves')) {
        cfg.layout = 'shelves';
        cfg.isCustom = true;
        cfg.hasShoeDrawer = false;
        cfg.extDrawersCount = 0;
        if (rawGridDiv == null || rawGridDiv <= 0) {
          cfg.gridDivisions = CORNER_WING_DIMENSIONS.cells.defaultGridDivisions;
        }
        const hasShelves = anyTruthy(customData.shelves || []);
        const hasRods = anyTruthy(customData.rods || []);
        if (!hasShelves) customData.shelves = [false, true, false, true, false, false];
        if (hasRods) customData.rods = [false, false, false, false, false, false];
        customData.storage = false;
        cfg.customData = customData;
      } else if (!cfg.isCustom && layoutLooksLeaky && !rawLayout) {
        cfg.layout = 'shelves';
      }
    }

    return cfg;
  };
}

function createDefaultCornerCfgDetector() {
  return (cfg0: unknown): boolean => {
    const cfg = isValueRecord(cfg0) ? cfg0 : {};
    const readIntOr = (value: unknown, defaultValue: number): number => readFiniteInt(value) ?? defaultValue;
    const layout = typeof cfg.layout === 'string' ? cfg.layout : 'shelves';
    const ext = readIntOr(cfg.extDrawersCount, 0);
    const shoe = !!cfg.hasShoeDrawer;
    const custom = !!cfg.isCustom;
    const gridDivisions = readIntOr(cfg.gridDivisions, CORNER_WING_DIMENSIONS.cells.defaultGridDivisions);
    const customData = isValueRecord(cfg.customData) ? cfg.customData : {};
    const shelves = readUnknownArray(customData.shelves);
    const rods = readUnknownArray(customData.rods);
    const storage = !!customData.storage;
    const allFalse = (arr: unknown[]) => arr.every(value => !value);
    return (
      (layout === 'shelves' || layout === '' || layout == null) &&
      ext === 0 &&
      shoe === false &&
      custom === false &&
      gridDivisions === CORNER_WING_DIMENSIONS.cells.defaultGridDivisions &&
      storage === false &&
      allFalse(shelves) &&
      allFalse(rods)
    );
  };
}

function isValueRecord(value: unknown): value is RecordBag {
  return isRecord(value);
}

function cloneRecord(value: unknown): RecordBag {
  const cloned = cloneMaybe(isValueRecord(value) ? value : {});
  return isValueRecord(cloned) ? cloned : {};
}

function readUnknownArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value.slice() : [];
}

function anyTruthy(values: unknown[]): boolean {
  return values.some(Boolean);
}

function readCornerCellCustomData(value: unknown): CornerCellCustomData {
  const base = cloneRecord(value);
  return {
    ...base,
    shelves: readUnknownArray(base.shelves),
    rods: readUnknownArray(base.rods),
    storage: !!base.storage,
  };
}

type CornerCellStackEnsurerRecord = RecordBag & {
  ensureForStack: (stack: 'top' | 'bottom', moduleKey: string) => unknown;
};

function isCornerCellStackEnsurerRecord(value: unknown): value is CornerCellStackEnsurerRecord {
  return isValueRecord(value) && typeof value.ensureForStack === 'function';
}

function readEnsureCornerCellForStack(
  value: unknown,
  stack: 'top' | 'bottom'
): ((index: number) => unknown) | null {
  if (!isCornerCellStackEnsurerRecord(value)) return null;
  return index => value.ensureForStack(stack, `corner:${index}`);
}
