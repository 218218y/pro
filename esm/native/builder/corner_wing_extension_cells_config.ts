import { getModulesActions } from '../runtime/actions_access_domains.js';
import { readModulesConfigurationListFromConfigSnapshot } from '../features/modules_configuration/modules_config_api.js';
import { cloneMaybe, isRecord } from './corner_geometry_plan.js';

import type { CornerCellCfg, CornerCellCustomData } from './corner_geometry_plan.js';
import type {
  CornerWingCellCfgResolver,
  CornerWingCellDerivationArgs,
} from './corner_wing_extension_cells_contracts.js';

type RecordBag = Record<string, unknown>;

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
      const ensureCell =
        args.__stackSplitEnabled && args.__stackKey === 'bottom'
          ? readEnsureLowerCornerCellAt(modulesRec)
          : readEnsureCornerCellAt(modulesRec);
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
      intDrawersList: [],
      isCustom: false,
      gridDivisions: 6,
      customData: readCornerCellCustomData(cfgBase.customData),
    };

    const isBottomStack = args.__stackSplitEnabled && args.__stackKey === 'bottom';
    const rawRec = isValueRecord(raw) ? raw : null;
    const rawLayout = rawRec && typeof rawRec.layout === 'string' ? String(rawRec.layout).trim() : '';
    const rawGridDiv =
      rawRec && rawRec.gridDivisions != null ? parseInt(String(rawRec.gridDivisions), 10) : NaN;

    if (!rawLayout) {
      if (isBottomStack) cfg.layout = 'shelves';
      else if (args.__mirrorX === -1 && cornerCellCount > 1)
        cfg.layout = idx === cornerCellCount - 1 ? 'hanging_top2' : 'shelves';
      else cfg.layout = idx === 0 ? 'hanging_top2' : 'shelves';
    } else {
      cfg.layout = rawLayout;
    }

    const extRaw = cfgBase.extDrawersCount ?? cfgBase.extDrawers;
    const ext = parseInt(String(extRaw ?? ''), 10);
    cfg.extDrawersCount = Number.isFinite(ext) ? ext : 0;
    cfg.hasShoeDrawer = !!cfgBase.hasShoeDrawer;
    cfg.intDrawersList = readUnknownArray(cfgBase.intDrawersList);
    cfg.isCustom = !!cfgBase.isCustom;
    cfg.gridDivisions = (() => {
      const gd = parseInt(String(cfgBase.gridDivisions ?? ''), 10);
      return Number.isFinite(gd) && gd > 0 ? gd : 6;
    })();

    const customData = cfg.customData;

    if (isBottomStack) {
      const looksAutoDefault =
        cfg.extDrawersCount === 0 &&
        cfg.hasShoeDrawer === false &&
        cfg.intDrawersList.length === 0 &&
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
        cfg.intDrawersList = [];
        if (!Number.isFinite(rawGridDiv) || rawGridDiv <= 0) cfg.gridDivisions = 6;
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
    const parseIntSafe = (value: unknown, fallback: number): number => {
      const parsed = parseInt(String(value ?? ''), 10);
      return Number.isFinite(parsed) ? parsed : fallback;
    };
    const layout = typeof cfg.layout === 'string' ? cfg.layout : 'shelves';
    const ext = parseIntSafe(cfg.extDrawersCount, 0);
    const shoe = !!cfg.hasShoeDrawer;
    const list = Array.isArray(cfg.intDrawersList) ? cfg.intDrawersList : [];
    const custom = !!cfg.isCustom;
    const gridDivisions = parseIntSafe(cfg.gridDivisions, 6);
    const customData = isValueRecord(cfg.customData) ? cfg.customData : {};
    const shelves = readUnknownArray(customData.shelves);
    const rods = readUnknownArray(customData.rods);
    const storage = !!customData.storage;
    const allFalse = (arr: unknown[]) => arr.every(value => !value);
    return (
      (layout === 'shelves' || layout === '' || layout == null) &&
      ext === 0 &&
      shoe === false &&
      list.length === 0 &&
      custom === false &&
      gridDivisions === 6 &&
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

type CornerCellEnsurerRecord = RecordBag & { ensureCornerCellAt: (index: number) => unknown };
type LowerCornerCellEnsurerRecord = RecordBag & { ensureLowerCellAt: (index: number) => unknown };

function isCornerCellEnsurerRecord(value: unknown): value is CornerCellEnsurerRecord {
  return isValueRecord(value) && typeof value.ensureCornerCellAt === 'function';
}

function isLowerCornerCellEnsurerRecord(value: unknown): value is LowerCornerCellEnsurerRecord {
  return isValueRecord(value) && typeof value.ensureLowerCellAt === 'function';
}

function readEnsureCornerCellAt(value: unknown): ((index: number) => unknown) | null {
  if (!isCornerCellEnsurerRecord(value)) return null;
  return index => value.ensureCornerCellAt(index);
}

function readEnsureLowerCornerCellAt(value: unknown): ((index: number) => unknown) | null {
  if (!isLowerCornerCellEnsurerRecord(value)) return null;
  return index => value.ensureLowerCellAt(index);
}
