import { normalizeSplitDoorsBottomMap, normalizeSplitDoorsMap } from './project_schema.js';

import type {
  CurtainMap,
  DoorSpecialMap,
  DoorStyleMap,
  DrawerDividersMap,
  GroovesMap,
  GrooveLinesCountMap,
  HandlesMap,
  HingeMap,
  IndividualColorsMap,
  MirrorLayoutMap,
  DoorTrimMap,
  RemovedDoorsMap,
  SplitDoorsBottomMap,
  SplitDoorsMap,
} from '../../../types/index.js';

import {
  readCurtainMap as readCurtainMapShared,
  readDoorSpecialMap as readDoorSpecialMapShared,
  readDoorStyleMap as readDoorStyleMapShared,
  readDoorTrimConfigMap as readDoorTrimConfigMapShared,
  readGrooveLinesCountMap as readGrooveLinesCountMapShared,
  readGroovesMap as readGroovesMapShared,
  readHandlesMap as readHandlesMapShared,
  readHingeMap as readHingeMapShared,
  readIndividualColorsMap as readIndividualColorsMapShared,
  readMirrorLayoutConfigMap as readMirrorLayoutConfigMapShared,
  readToggleMap as readToggleMapShared,
} from '../features/project_config/project_config_persisted_payload_shared.js';

export function readHingeMap(value: unknown): HingeMap {
  return readHingeMapShared(value);
}

export function readHandlesMap(value: unknown): HandlesMap {
  return readHandlesMapShared(value);
}

export function readGroovesMap(value: unknown): GroovesMap {
  return readGroovesMapShared(value);
}

export function readGrooveLinesCountMap(value: unknown): GrooveLinesCountMap {
  return readGrooveLinesCountMapShared(value);
}

export function readRemovedDoorsMap(value: unknown): RemovedDoorsMap {
  return readToggleMapShared(value);
}

export function readDrawerDividersMap(value: unknown): DrawerDividersMap {
  return readToggleMapShared(value);
}

export function readSplitDoorsMapValue(value: unknown): SplitDoorsMap {
  return normalizeSplitDoorsMap(value);
}

export function readSplitDoorsBottomMapValue(value: unknown): SplitDoorsBottomMap {
  return normalizeSplitDoorsBottomMap(value);
}

export function readIndividualColorsMap(value: unknown): IndividualColorsMap {
  return readIndividualColorsMapShared(value);
}

export function readDoorSpecialMap(value: unknown): DoorSpecialMap {
  return readDoorSpecialMapShared(value);
}

export function readDoorStyleMap(value: unknown): DoorStyleMap {
  return readDoorStyleMapShared(value);
}

export function readCurtainMap(value: unknown): CurtainMap {
  return readCurtainMapShared(value);
}

export function readMirrorLayoutConfigMap(value: unknown): MirrorLayoutMap {
  return readMirrorLayoutConfigMapShared(value);
}

export function readDoorTrimConfigMap(value: unknown): DoorTrimMap {
  return readDoorTrimConfigMapShared(value);
}
