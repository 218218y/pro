import type {
  AppContainer,
  ConfigStateLike,
  RoomArchitecturePlan,
  RoomArchitecturePlanInput,
  UnknownRecord,
} from '../../../types/index.js';

import { createRoomArchitecturePlan } from './room_architecture_geometry.js';
import {
  constrainProjectRoomArchitectureToWardrobeWidth,
  getRoomArchitectureConfig,
  getRuntime,
  getUi,
  normalizeProjectRoomArchitecture,
} from './store_access.js';

function asRecord(value: unknown): UnknownRecord | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as UnknownRecord) : null;
}

function finitePositive(value: unknown): number | null {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function readUiRawDimensionM(uiValue: unknown, key: 'width' | 'height' | 'depth', defaultM: number): number {
  const ui = asRecord(uiValue);
  const raw = asRecord(ui?.raw);
  const cm = finitePositive(raw?.[key]);
  return cm == null ? defaultM : cm / 100;
}

export function createRoomArchitecturePlanFromApp(App: AppContainer): RoomArchitecturePlan {
  const runtime = asRecord(getRuntime(App)) ?? {};
  const ui = getUi(App);
  const wardrobeWidthM = finitePositive(runtime.wardrobeWidthM) ?? readUiRawDimensionM(ui, 'width', 2.4);
  const wardrobeHeightM = finitePositive(runtime.wardrobeHeightM) ?? readUiRawDimensionM(ui, 'height', 2.4);
  const wardrobeDepthM = finitePositive(runtime.wardrobeDepthM) ?? readUiRawDimensionM(ui, 'depth', 0.6);
  return createRoomArchitecturePlan({
    config: constrainProjectRoomArchitectureToWardrobeWidth(
      getRoomArchitectureConfig(App),
      wardrobeWidthM * 100
    ),
    wardrobeWidthM,
    wardrobeHeightM,
    wardrobeDepthM,
  });
}

export function createRoomArchitecturePlanInputFromBuildSnapshot(args: {
  cfg: ConfigStateLike;
  widthCm: number;
  heightCm: number;
  depthCm: number;
}): RoomArchitecturePlanInput {
  return {
    config: constrainProjectRoomArchitectureToWardrobeWidth(
      normalizeProjectRoomArchitecture(args.cfg.roomArchitecture),
      args.widthCm
    ),
    wardrobeWidthM: args.widthCm / 100,
    wardrobeHeightM: args.heightCm / 100,
    wardrobeDepthM: args.depthCm / 100,
  };
}

export function createRoomArchitecturePlanFromBuildSnapshot(args: {
  cfg: ConfigStateLike;
  widthCm: number;
  heightCm: number;
  depthCm: number;
}): RoomArchitecturePlan {
  return createRoomArchitecturePlan(createRoomArchitecturePlanInputFromBuildSnapshot(args));
}
