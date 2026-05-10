import type { AppContainer, MetaActionsNamespaceLike, UnknownRecord } from '../../../../../types';

import {
  getUiSnapshot,
  setUiCurrentFloorType,
  setUiLastSelectedWallColor,
} from '../actions/store_actions.js';
import type {
  FloorStyle,
  RenderTabFloorType,
  RoomDesignData,
  RoomDesignRuntimeLike,
} from './render_tab_shared_contracts.js';
import { normalizeFloorStyle } from './render_tab_shared_normalize.js';
import { FALLBACK_FLOOR_STYLES } from './render_tab_shared_room.js';

export type RenderTabRoomDesignController = {
  setFloorType: (type: RenderTabFloorType) => void;
  pickFloorStyle: (style: FloorStyle) => void;
  pickWallColor: (value: string) => void;
};

export type CreateRenderTabRoomDesignControllerArgs = {
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

function reportNonFatal(args: CreateRenderTabRoomDesignControllerArgs, op: string, err: unknown): void {
  try {
    (args.reportNonFatal || noop)(op, err);
  } catch {
    // ignore reporting failures
  }
}

function activateRoomRuntime(args: CreateRenderTabRoomDesignControllerArgs, source: string): void {
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

export function resolveRenderTabFloorStyle(
  args: CreateRenderTabRoomDesignControllerArgs,
  type: RenderTabFloorType
): FloorStyle | null {
  const runtime = args.roomDesignRuntime;
  if (!runtime) return (args.roomData.floorStyles[type] || FALLBACK_FLOOR_STYLES[type] || [])[0] || null;

  const uiNow = getUiSnapshot(args.app);
  const map = asRecord(uiNow.lastSelectedFloorStyleIdByType);
  const byType = map ? map[type] : undefined;
  const lastId =
    typeof byType === 'string' && byType
      ? String(byType)
      : typeof uiNow.lastSelectedFloorStyleId === 'string' && uiNow.lastSelectedFloorStyleId
        ? String(uiNow.lastSelectedFloorStyleId)
        : null;

  const resolvedRaw =
    typeof runtime.__wp_room_resolveStyle === 'function'
      ? runtime.__wp_room_resolveStyle(type, lastId)
      : null;
  const resolved = normalizeFloorStyle(resolvedRaw);
  const defaultStyle = (args.roomData.floorStyles[type] || FALLBACK_FLOOR_STYLES[type] || [])[0] || null;
  return resolved || defaultStyle;
}

export function createRenderTabRoomDesignController(
  args: CreateRenderTabRoomDesignControllerArgs
): RenderTabRoomDesignController {
  return {
    setFloorType: (type: RenderTabFloorType) => {
      setUiCurrentFloorType(args.app, type, args.meta.uiOnlyImmediate('react:renderTab:floorType'));

      try {
        const runtime = args.roomDesignRuntime;
        if (!runtime || typeof runtime.updateFloorTexture !== 'function') return;
        const style = resolveRenderTabFloorStyle(args, type);
        if (style) runtime.updateFloorTexture(style);
      } catch (err) {
        reportNonFatal(args, 'renderTabRoomDesign:setFloorType', err);
      }
    },
    pickFloorStyle: (style: FloorStyle) => {
      try {
        activateRoomRuntime(args, 'react:renderTab:floorStyle');
        const runtime = args.roomDesignRuntime;
        if (runtime && typeof runtime.updateFloorTexture === 'function') {
          runtime.updateFloorTexture(style, { force: true });
        }
      } catch (err) {
        reportNonFatal(args, 'renderTabRoomDesign:pickFloorStyle', err);
      }
    },
    pickWallColor: (value: string) => {
      setUiLastSelectedWallColor(args.app, value, args.meta.uiOnlyImmediate('react:renderTab:wallColor'));

      try {
        activateRoomRuntime(args, 'react:renderTab:wallColor');
        const runtime = args.roomDesignRuntime;
        if (runtime && typeof runtime.updateRoomWall === 'function') {
          runtime.updateRoomWall(value, { force: true });
        }
      } catch (err) {
        reportNonFatal(args, 'renderTabRoomDesign:pickWallColor', err);
      }
    },
  };
}
