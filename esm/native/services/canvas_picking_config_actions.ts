import type {
  ActionMetaLike,
  AppContainer,
  CurtainMap,
  DoorSpecialMap,
  DoorStyleMap,
  IndividualColorsMap,
  MirrorLayoutMap,
  ModuleConfigLike,
  ModulesConfigurationLike,
  ModulesGeometrySnapshotLike,
  UnknownRecord,
} from '../../../types';

import {
  applyModulesGeometrySnapshotViaActions,
  applyPaintViaActions,
} from '../runtime/actions_access_mutations.js';
import {
  cfgBatch,
  setCfgCurtainMap,
  setCfgDepth,
  setCfgDoorSpecialMap,
  cfgSetMap,
  setCfgMirrorLayoutMap,
  setCfgHeight,
  setCfgIndividualColors,
  setCfgManualWidth,
  setCfgModulesConfiguration,
  setCfgWidth,
} from '../runtime/cfg_access.js';

function isRecord(value: unknown): value is UnknownRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function cloneModuleConfig(value: unknown): ModuleConfigLike {
  return isRecord(value) ? { ...value } : {};
}

function asModulesConfiguration(value: unknown): ModulesConfigurationLike {
  return Array.isArray(value) ? value.map(cloneModuleConfig) : [];
}

function asFiniteNumberOrUndefined(v: unknown): number | undefined {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function cloneIndividualColorsMap(src: IndividualColorsMap): IndividualColorsMap {
  const out: IndividualColorsMap = {};
  for (const [key, value] of Object.entries(src || {})) out[key] = value;
  return out;
}

function cloneCurtainMap(src: CurtainMap): CurtainMap {
  const out: CurtainMap = {};
  for (const [key, value] of Object.entries(src || {})) out[key] = value;
  return out;
}

function cloneDoorSpecialMap(src: DoorSpecialMap): DoorSpecialMap {
  const out: DoorSpecialMap = {};
  for (const [key, value] of Object.entries(src || {})) out[key] = value;
  return out;
}

function cloneDoorStyleMap(src: DoorStyleMap): DoorStyleMap {
  const out: DoorStyleMap = {};
  for (const [key, value] of Object.entries(src || {})) out[key] = value;
  return out;
}

function cloneMirrorLayoutMap(src: MirrorLayoutMap): MirrorLayoutMap {
  const out: MirrorLayoutMap = {};
  for (const [key, value] of Object.entries(src || {})) {
    if (!Array.isArray(value) || !value.length) continue;
    out[key] = value
      .filter(entry => !!entry && typeof entry === 'object' && !Array.isArray(entry))
      .map(entry => ({ ...entry }));
  }
  return out;
}

export interface CellDimsConfigSnapshotArgs {
  App: AppContainer;
  modulesConfiguration: unknown;
  manualWidth?: boolean;
  width?: unknown;
  height?: unknown;
  depth?: unknown;
  meta?: ActionMetaLike;
}

export interface PaintConfigSnapshotArgs {
  App: AppContainer;
  individualColors: IndividualColorsMap;
  curtainMap: CurtainMap;
  doorSpecialMap?: DoorSpecialMap;
  doorStyleMap?: DoorStyleMap;
  mirrorLayoutMap?: MirrorLayoutMap;
  meta?: ActionMetaLike;
}

function buildModulesGeometrySnapshot(args: CellDimsConfigSnapshotArgs): ModulesGeometrySnapshotLike {
  const snapshot: ModulesGeometrySnapshotLike = {
    modulesConfiguration: asModulesConfiguration(args.modulesConfiguration),
  };
  if (typeof args.manualWidth === 'boolean') snapshot.isManualWidth = args.manualWidth;
  const width = asFiniteNumberOrUndefined(args.width);
  const height = asFiniteNumberOrUndefined(args.height);
  const depth = asFiniteNumberOrUndefined(args.depth);
  if (typeof width === 'number') snapshot.width = width;
  if (typeof height === 'number') snapshot.height = height;
  if (typeof depth === 'number') snapshot.depth = depth;
  return snapshot;
}

export function applyCellDimsConfigSnapshot(args: CellDimsConfigSnapshotArgs): void {
  const { App, meta } = args;
  const snapshot = buildModulesGeometrySnapshot(args);
  if (applyModulesGeometrySnapshotViaActions(App, snapshot, meta)) return;

  cfgBatch(
    App,
    function () {
      setCfgModulesConfiguration(App, snapshot.modulesConfiguration, meta);
      if (typeof snapshot.isManualWidth === 'boolean') setCfgManualWidth(App, snapshot.isManualWidth, meta);
      if (typeof snapshot.width !== 'undefined') setCfgWidth(App, snapshot.width, meta);
      if (typeof snapshot.height !== 'undefined') setCfgHeight(App, snapshot.height, meta);
      if (typeof snapshot.depth !== 'undefined') setCfgDepth(App, snapshot.depth, meta);
    },
    meta
  );
}

export function applyPaintConfigSnapshot(args: PaintConfigSnapshotArgs): void {
  const { App, meta } = args;
  const individualColors = cloneIndividualColorsMap(args.individualColors);
  const curtainMap = cloneCurtainMap(args.curtainMap);
  const doorSpecialMap = cloneDoorSpecialMap(args.doorSpecialMap || {});
  const doorStyleMap = args.doorStyleMap ? cloneDoorStyleMap(args.doorStyleMap) : null;
  const mirrorLayoutMap = cloneMirrorLayoutMap(args.mirrorLayoutMap || {});

  if (applyPaintViaActions(App, individualColors, curtainMap, meta, doorSpecialMap, mirrorLayoutMap)) {
    if (doorStyleMap) cfgSetMap(App, 'doorStyleMap', doorStyleMap, meta);
    return;
  }

  setCfgIndividualColors(App, individualColors, meta);
  setCfgCurtainMap(App, curtainMap, meta);
  setCfgDoorSpecialMap(App, doorSpecialMap, meta);
  if (doorStyleMap) cfgSetMap(App, 'doorStyleMap', doorStyleMap, meta);
  setCfgMirrorLayoutMap(App, mirrorLayoutMap, meta);
}
