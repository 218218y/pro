import type {
  AppContainer,
  MetaActionsNamespaceLike,
  RoomArchitectureConfigLike,
  RoomArchitecturePatch,
  RoomColumnConfigLike,
  RoomOpeningKind,
  UnknownRecord,
} from '../../../../../types';

import {
  applyStructuralConfigMutation,
  constrainProjectRoomArchitectureToWardrobeWidth,
  patchProjectRoomArchitecture,
} from '../actions/structural_build_refresh_actions.js';
import { beginRoomOpeningPlacement, removeRoomOpening, getModeId } from '../../../services/api.js';
import {
  getUiSnapshot,
  getConfigSnapshot,
  setCfgScalar,
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

export const ROOM_OPENING_MODE_ID = getModeId('ROOM_OPENING') || 'room_opening';

export type SettingsVisualRoomDesignController = {
  setFloorType: (type: SettingsVisualFloorType) => void;
  pickFloorStyle: (style: FloorStyle) => void;
  pickWallColor: (value: string) => void;
  setArchitectureWallColor: (value: string) => void;
  setBackWallEnabled: (enabled: boolean) => void;
  setBackWallDimension: (key: 'widthCm' | 'heightCm' | 'wardrobeOffsetLeftCm', value: number) => void;
  setSideWallEnabled: (side: 'leftWall' | 'rightWall', enabled: boolean) => void;
  setSideWallDimension: (side: 'leftWall' | 'rightWall', key: 'depthCm' | 'heightCm', value: number) => void;
  setWardrobeOffsetRightCm: (value: number) => void;
  alignWardrobeOnWall: (mode: 'left' | 'center' | 'right') => void;
  addColumn: () => void;
  removeColumn: (columnId: string) => void;
  setColumnDimension: (
    columnId: string,
    key: 'offsetLeftCm' | 'widthCm' | 'depthCm' | 'heightCm' | 'bottomOffsetCm',
    value: number
  ) => void;
  toggleArchitectureVisibility: () => void;
  beginOpeningPlacement: (kind: RoomOpeningKind, widthCm: number, heightCm: number) => boolean;
  removeOpening: (openingId: string) => boolean;
};

export type CreateSettingsVisualRoomDesignControllerArgs = {
  app: AppContainer;
  meta: MetaActionsNamespaceLike;
  roomData: RoomDesignData;
  roomDesignRuntime: RoomDesignRuntimeLike | null;
  roomArchitecture: RoomArchitectureConfigLike;
  wardrobeWidthCm: number;
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

function refreshRoomArchitectureRuntime(args: CreateSettingsVisualRoomDesignControllerArgs): void {
  try {
    args.roomDesignRuntime?.updateRoomArchitecture?.();
  } catch (err) {
    reportNonFatal(args, 'settingsVisualRoomDesign:updateRoomArchitecture', err);
  }
}

function readCurrentRoomArchitecture(
  args: CreateSettingsVisualRoomDesignControllerArgs
): RoomArchitectureConfigLike {
  const liveConfig = getConfigSnapshot(args.app);
  return constrainProjectRoomArchitectureToWardrobeWidth(
    patchProjectRoomArchitecture(liveConfig.roomArchitecture ?? args.roomArchitecture, {}),
    args.wardrobeWidthCm
  );
}

function commitRoomArchitecture(
  args: CreateSettingsVisualRoomDesignControllerArgs,
  patch: RoomArchitecturePatch,
  source: string,
  buildTiming: 'immediate' | 'coalesced' | 'none'
): void {
  const next = constrainProjectRoomArchitectureToWardrobeWidth(
    patchProjectRoomArchitecture(readCurrentRoomArchitecture(args), patch),
    args.wardrobeWidthCm
  );
  applyStructuralConfigMutation(
    args.app,
    source,
    { roomArchitecture: next },
    meta => setCfgScalar(args.app, 'roomArchitecture', next, meta),
    { buildTiming }
  );
  refreshRoomArchitectureRuntime(args);
}

function normalizeInputNumber(value: number): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function nextRoomColumnId(columns: readonly RoomColumnConfigLike[]): string {
  const ids = new Set(columns.map(column => column.id));
  let index = 1;
  while (ids.has(`room-column-${index}`)) index += 1;
  return `room-column-${index}`;
}

function createRoomColumnDraft(current: RoomArchitectureConfigLike): RoomColumnConfigLike {
  const wallWidthCm = current.backWall.widthCm;
  const widthCm = Math.min(30, wallWidthCm);
  const maxOffset = Math.max(0, wallWidthCm - widthCm);
  const occupied = current.columns
    .map(column => ({
      start: Math.max(0, Math.min(wallWidthCm, column.offsetLeftCm)),
      end: Math.max(0, Math.min(wallWidthCm, column.offsetLeftCm + column.widthCm)),
    }))
    .filter(interval => interval.end > interval.start)
    .sort((a, b) => a.start - b.start);

  const merged: Array<{ start: number; end: number }> = [];
  for (const interval of occupied) {
    const previous = merged.at(-1);
    if (previous && interval.start <= previous.end) previous.end = Math.max(previous.end, interval.end);
    else merged.push({ ...interval });
  }

  const free: Array<{ start: number; end: number }> = [];
  let cursor = 0;
  for (const interval of merged) {
    if (interval.start > cursor) free.push({ start: cursor, end: interval.start });
    cursor = Math.max(cursor, interval.end);
  }
  if (cursor < wallWidthCm) free.push({ start: cursor, end: wallWidthCm });

  const preferred = Math.min(maxOffset, 180 + current.columns.length * 40);
  let offsetLeftCm: number | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const span of free) {
    if (span.end - span.start < widthCm) continue;
    const candidate = Math.min(span.end - widthCm, Math.max(span.start, preferred));
    const distance = Math.abs(candidate - preferred);
    if (distance < bestDistance) {
      offsetLeftCm = candidate;
      bestDistance = distance;
    }
  }

  return {
    id: nextRoomColumnId(current.columns),
    offsetLeftCm: offsetLeftCm ?? maxOffset,
    widthCm,
    depthCm: 20,
    heightCm: current.backWall.heightCm,
    bottomOffsetCm: 0,
  };
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
    setArchitectureWallColor: (value: string) => {
      commitRoomArchitecture(
        args,
        { wallColor: value },
        'react:settingsVisual:roomArchitecture:wallColor',
        'none'
      );
    },
    setBackWallEnabled: (enabled: boolean) => {
      commitRoomArchitecture(
        args,
        { backWall: { enabled } },
        'react:settingsVisual:roomBackWallEnabled',
        'immediate'
      );
    },
    setBackWallDimension: (key, value) => {
      const nextValue = normalizeInputNumber(value);
      if (nextValue == null) return;
      commitRoomArchitecture(
        args,
        { backWall: { [key]: nextValue } },
        `react:settingsVisual:roomBackWall:${key}`,
        'coalesced'
      );
    },
    setSideWallEnabled: (side, enabled) => {
      commitRoomArchitecture(
        args,
        { [side]: { enabled } },
        `react:settingsVisual:roomArchitecture:${side}:enabled`,
        'none'
      );
    },
    setSideWallDimension: (side, key, value) => {
      const nextValue = normalizeInputNumber(value);
      if (nextValue == null) return;
      commitRoomArchitecture(
        args,
        { [side]: { [key]: nextValue } },
        `react:settingsVisual:roomArchitecture:${side}:${key}`,
        'none'
      );
    },
    setWardrobeOffsetRightCm: value => {
      const nextValue = normalizeInputNumber(value);
      if (nextValue == null) return;
      const current = readCurrentRoomArchitecture(args);
      const left = current.backWall.widthCm - args.wardrobeWidthCm - Math.max(0, nextValue);
      commitRoomArchitecture(
        args,
        { backWall: { wardrobeOffsetLeftCm: Math.max(0, left) } },
        'react:settingsVisual:roomBackWall:wardrobeOffsetRightCm',
        'coalesced'
      );
    },
    alignWardrobeOnWall: mode => {
      const current = readCurrentRoomArchitecture(args);
      const available = Math.max(0, current.backWall.widthCm - args.wardrobeWidthCm);
      const wardrobeOffsetLeftCm = mode === 'right' ? available : mode === 'center' ? available / 2 : 0;
      commitRoomArchitecture(
        args,
        { backWall: { wardrobeOffsetLeftCm } },
        `react:settingsVisual:roomBackWall:align:${mode}`,
        'immediate'
      );
    },
    addColumn: () => {
      const current = readCurrentRoomArchitecture(args);
      commitRoomArchitecture(
        args,
        { columns: [...current.columns, createRoomColumnDraft(current)] },
        'react:settingsVisual:roomColumn:add',
        'immediate'
      );
    },
    removeColumn: columnId => {
      const current = readCurrentRoomArchitecture(args);
      if (!current.columns.some(column => column.id === columnId)) return;
      commitRoomArchitecture(
        args,
        { columns: current.columns.filter(column => column.id !== columnId) },
        `react:settingsVisual:roomColumn:${columnId}:remove`,
        'immediate'
      );
    },
    setColumnDimension: (columnId, key, value) => {
      const nextValue = normalizeInputNumber(value);
      if (nextValue == null) return;
      const current = readCurrentRoomArchitecture(args);
      if (!current.columns.some(column => column.id === columnId)) return;
      commitRoomArchitecture(
        args,
        {
          columns: current.columns.map(column =>
            column.id === columnId ? { ...column, [key]: nextValue } : column
          ),
        },
        `react:settingsVisual:roomColumn:${columnId}:${key}`,
        'coalesced'
      );
    },
    toggleArchitectureVisibility: () => {
      commitRoomArchitecture(
        args,
        { surfacesHidden: !readCurrentRoomArchitecture(args).surfacesHidden },
        'react:settingsVisual:roomArchitectureVisibility',
        'none'
      );
    },
    beginOpeningPlacement: (kind, widthCm, heightCm) =>
      beginRoomOpeningPlacement(args.app, { kind, widthCm, heightCm }),
    removeOpening: openingId => removeRoomOpening(args.app, openingId),
  };
}
