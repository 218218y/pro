import { hasRemovedHingedDoorInRange } from './doors_state_utils.js';

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
  removedDoorsMap: Readonly<Record<string, unknown>>;
  roundedFrameSideShelvesMap: Readonly<Record<string, unknown>>;
}>;

const FRAME_SIDE_PART_ID_BY_SIDE: Readonly<Record<RemovableFrameSide, string>> = Object.freeze({
  left: 'body_left',
  right: 'body_right',
});

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
    removedDoorsMap: snapshotRecord(config?.removedDoorsMap),
    roundedFrameSideShelvesMap: snapshotRecord(config?.roundedFrameSideShelvesMap),
  });
}

function frameSidePartId(
  side: RemovableFrameSide,
  frameSidePartIdPrefix: RemovableFrameSidePartIdPrefix
): string {
  return `${frameSidePartIdPrefix}${FRAME_SIDE_PART_ID_BY_SIDE[side]}`;
}

export function createRemovedFrameSideConstructionCapabilities(
  cfg: unknown
): RemovedFrameSideConstructionCapabilities {
  const configSnapshot = createConfigSnapshot(cfg);

  return Object.freeze({
    isHingedWardrobe: configSnapshot.wardrobeType === 'hinged',
    isFrameSideRemoved(side, frameSidePartIdPrefix) {
      const partId = frameSidePartId(side, frameSidePartIdPrefix);
      return configSnapshot.removedDoorsMap[`removed_${partId}`] === true;
    },
    isFrameSideShelfRounded(side, frameSidePartIdPrefix) {
      const partId = frameSidePartId(side, frameSidePartIdPrefix);
      return configSnapshot.roundedFrameSideShelvesMap[partId] === true;
    },
    hasRemovedHingedDoorInRange(range) {
      return hasRemovedHingedDoorInRange({
        cfg: configSnapshot,
        startDoorId: range.startDoorId,
        moduleDoors: range.moduleDoors,
        frameSidePartIdPrefix: range.frameSidePartIdPrefix,
      });
    },
  });
}
