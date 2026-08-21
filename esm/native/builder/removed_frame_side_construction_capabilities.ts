import {
  builderFrameSidePartId,
  captureBuilderRemovedPartsState,
  type BuilderRemovedPartsState,
} from './removable_parts_state.js';

export type RemovableFrameSide = 'left' | 'right';
export type RemovableFrameSidePartIdPrefix = '' | 'lower_';

export type RemovedFrameSideDoorRange = Readonly<{
  startDoorId: number;
  moduleDoors: number;
  frameSidePartIdPrefix: RemovableFrameSidePartIdPrefix;
}>;

/**
 * Narrow, immutable read surface used by the removed-frame-side planner.
 *
 * Runtime/config parsing belongs in this adapter. The construction planner only
 * receives these capabilities and never reaches into the application config bag.
 */
export type RemovedFrameSideConstructionCapabilities = Readonly<{
  isHingedWardrobe: boolean;
  isFrameSideRemoved: (
    side: RemovableFrameSide,
    frameSidePartIdPrefix: RemovableFrameSidePartIdPrefix
  ) => boolean;
  isFrameSideShelfRounded: (
    side: RemovableFrameSide,
    frameSidePartIdPrefix: RemovableFrameSidePartIdPrefix
  ) => boolean;
  hasRemovedHingedDoorInRange: (range: RemovedFrameSideDoorRange) => boolean;
}>;

type RemovedFrameSideConfigSnapshot = Readonly<{
  wardrobeType?: unknown;
  removedParts: BuilderRemovedPartsState;
  roundedFrameSideShelvesMap: Readonly<Record<string, unknown>>;
}>;

function readRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function snapshotRecord(value: unknown): Readonly<Record<string, unknown>> {
  const record = readRecord(value);
  return Object.freeze(record ? { ...record } : {});
}

function createConfigSnapshot(cfg: unknown): RemovedFrameSideConfigSnapshot {
  const config = readRecord(cfg);
  return Object.freeze({
    ...(config && Object.prototype.hasOwnProperty.call(config, 'wardrobeType')
      ? { wardrobeType: config.wardrobeType }
      : {}),
    removedParts: captureBuilderRemovedPartsState(config?.removedDoorsMap),
    roundedFrameSideShelvesMap: snapshotRecord(config?.roundedFrameSideShelvesMap),
  });
}

export function createRemovedFrameSideConstructionCapabilities(
  cfg: unknown
): RemovedFrameSideConstructionCapabilities {
  const configSnapshot = createConfigSnapshot(cfg);

  return Object.freeze({
    isHingedWardrobe: configSnapshot.wardrobeType === 'hinged',
    isFrameSideRemoved(side, frameSidePartIdPrefix) {
      return configSnapshot.removedParts.isRemoved(builderFrameSidePartId(side, frameSidePartIdPrefix));
    },
    isFrameSideShelfRounded(side, frameSidePartIdPrefix) {
      const partId = builderFrameSidePartId(side, frameSidePartIdPrefix);
      return configSnapshot.roundedFrameSideShelvesMap[partId] === true;
    },
    hasRemovedHingedDoorInRange(range) {
      return configSnapshot.removedParts.hasRemovedHingedDoorInRange({
        startDoorId: range.startDoorId,
        moduleDoors: range.moduleDoors,
        frameSidePartIdPrefix: range.frameSidePartIdPrefix,
      });
    },
  });
}
