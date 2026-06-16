import type { AppContainer, MetaActionsNamespaceLike, UnknownRecord } from '../../../../../types';

import {
  getUiSnapshot,
  setUiCurrentFloorType,
  setUiLastSelectedWallColor,
} from '../actions/store_actions.js';
import type {
  FloorStyle,
  SettingsVisualFloorType,
  RoomDesignData,
  RoomDesignRuntimeLike,
} from './settings_visual_shared_contracts.js';
import { normalizeFloorStyle } from './settings_visual_shared_normalize.js';
import { DEFAULT_FLOOR_STYLES } from './settings_visual_shared_room.js';

export type SettingsVisualRoomDesignController = {
  setFloorType: (type: SettingsVisualFloorType) => void;
  pickFloorStyle: (style: FloorStyle) => void;
  pickWallColor: (value: string) => void;
};

export type CreateSettingsVisualRoomDesignControllerArgs = {
  app: AppContainer;
  meta: MetaActionsNamespaceLike;
  roomData: RoomDesignData;
  roomDesignRuntime: RoomDesignRuntimeLike | null;
  reportNonFatal?: (op: string, err: unknown) => void;
};

function asRecord(value: unknown): UnknownRecord | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return { ...value };
}

function noop(): void {}

function reportNonFatal(args: CreateSettingsVisualRoomDesignControllerArgs, op: string, err: unknown): void {
  try {
    (args.reportNonFatal || noop)(op, err);
  } catch {
    // ignore reporting failures
  }
}

function activateRoomRuntime(args: CreateSettingsVisualRoomDesignControllerArgs, source: string): void {
  const runtime = args.roomDesignRuntime;
  if (!runtime || typeof runtime.setActive !== 'function') return;

  try {
    runtime.setActive(true, args.meta.noBuild(undefined, source));
  } catch (err) {
    try {
      runtime.setActive(true);
    } catch (fallbackErr) {
      reportNonFatal(args, `${source}:setActive`, fallbackErr || err);
    }
  }
}

export function resolveSettingsVisualFloorStyle(
  args: CreateSettingsVisualRoomDesignControllerArgs,
  type: SettingsVisualFloorType
): FloorStyle | null {
  const runtime = args.roomDesignRuntime;
  if (!runtime) return (args.roomData.floorStyles[type] || DEFAULT_FLOOR_STYLES[type] || [])[0] || null;

  const uiNow = getUiSnapshot(args.app);
  const map = asRecord(uiNow.lastSelectedFloorStyleIdByType);
  const byType = map ? map[type] : undefined;
  const lastId = typeof byType === 'string' && byType ? String(byType) : null;

  const resolvedRaw =
    typeof runtime.__wp_room_resolveStyle === 'function'
      ? runtime.__wp_room_resolveStyle(type, lastId)
      : null;
  const resolved = normalizeFloorStyle(resolvedRaw);
  const defaultStyle = (args.roomData.floorStyles[type] || DEFAULT_FLOOR_STYLES[type] || [])[0] || null;
  return resolved || defaultStyle;
}

export function createSettingsVisualRoomDesignController(
  args: CreateSettingsVisualRoomDesignControllerArgs
): SettingsVisualRoomDesignController {
  return {
    setFloorType: (type: SettingsVisualFloorType) => {
      setUiCurrentFloorType(args.app, type, args.meta.uiOnlyImmediate('react:settingsVisual:floorType'));

      try {
        const runtime = args.roomDesignRuntime;
        if (!runtime || typeof runtime.updateFloorTexture !== 'function') return;
        const style = resolveSettingsVisualFloorStyle(args, type);
        if (style) runtime.updateFloorTexture(style);
      } catch (err) {
        reportNonFatal(args, 'settingsVisualRoomDesign:setFloorType', err);
      }
    },
    pickFloorStyle: (style: FloorStyle) => {
      try {
        activateRoomRuntime(args, 'react:settingsVisual:floorStyle');
        const runtime = args.roomDesignRuntime;
        if (runtime && typeof runtime.updateFloorTexture === 'function') {
          runtime.updateFloorTexture(style, { force: true });
        }
      } catch (err) {
        reportNonFatal(args, 'settingsVisualRoomDesign:pickFloorStyle', err);
      }
    },
    pickWallColor: (value: string) => {
      setUiLastSelectedWallColor(
        args.app,
        value,
        args.meta.uiOnlyImmediate('react:settingsVisual:wallColor')
      );

      try {
        activateRoomRuntime(args, 'react:settingsVisual:wallColor');
        const runtime = args.roomDesignRuntime;
        if (runtime && typeof runtime.updateRoomWall === 'function') {
          runtime.updateRoomWall(value, { force: true });
        }
      } catch (err) {
        reportNonFatal(args, 'settingsVisualRoomDesign:pickWallColor', err);
      }
    },
  };
}
