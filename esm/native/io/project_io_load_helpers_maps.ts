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
  RoundedFrameSideShelvesMap,
  SplitDoorsBottomMap,
  SplitDoorsMap,
  ToggleValue,
} from '../../../types/index.js';

import {
  isHingeMapEntry as isHingeMapEntryShared,
  isToggleValue as isToggleValueShared,
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
  readRemovedDoorsMap as readRemovedDoorsMapShared,
  readRoundedFrameSideShelvesMap as readRoundedFrameSideShelvesMapShared,
  readStringMap as readStringMapShared,
  readSplitDoorsBottomMapValue as readSplitDoorsBottomMapValueShared,
  readSplitDoorsMapValue as readSplitDoorsMapValueShared,
  readToggleMap as readToggleMapShared,
} from '../features/project_config/project_config_map_readers.js';

export function readStringMap(value: unknown): Record<string, string | null | undefined> {
  return readStringMapShared(value);
}

export function isToggleValue(value: unknown): value is ToggleValue | undefined {
  return isToggleValueShared(value);
}

export function readToggleMap(value: unknown): Record<string, ToggleValue | undefined> {
  return readToggleMapShared(value);
}

export function readHingeMap(value: unknown): HingeMap {
  return readHingeMapShared(value);
}

export function isHingeMapEntry(value: unknown): value is HingeMap[string] {
  return isHingeMapEntryShared(value);
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
  return readRemovedDoorsMapShared(value);
}

export function readRoundedFrameSideShelvesMap(value: unknown): RoundedFrameSideShelvesMap {
  return readRoundedFrameSideShelvesMapShared(value);
}

export function readDrawerDividersMap(value: unknown): DrawerDividersMap {
  return readToggleMapShared(value);
}

export function readSplitDoorsMapValue(value: unknown): SplitDoorsMap {
  return readSplitDoorsMapValueShared(value);
}

export function readSplitDoorsBottomMapValue(value: unknown): SplitDoorsBottomMap {
  return readSplitDoorsBottomMapValueShared(value);
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
