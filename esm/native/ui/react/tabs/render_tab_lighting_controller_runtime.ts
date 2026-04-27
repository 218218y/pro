import type { AppContainer, MetaActionsNamespaceLike } from '../../../../../types';

import { getUiSnapshot, patchUiLightingState, setUiLightScalar } from '../actions/store_actions.js';
import type {
  LightPresetName,
  LightingScalarKey,
  RoomDesignRuntimeLike,
  UiPatch,
} from './render_tab_shared_contracts.js';
import { WALL_COLOR_EVENING } from './render_tab_shared_contracts.js';
import { clamp, getLightBounds, LIGHT_PRESETS } from './render_tab_shared_lighting.js';

export type RenderTabLightingController = {
  setLightingControl: (on: boolean) => void;
  setLightValue: (key: LightingScalarKey, value: number) => void;
  applyLightPreset: (name: LightPresetName) => void;
};

export type CreateRenderTabLightingControllerArgs = {
  app: AppContainer;
  meta: MetaActionsNamespaceLike;
  roomDesignRuntime: RoomDesignRuntimeLike | null;
  defaultWall: string;
  reportNonFatal?: (op: string, err: unknown) => void;
};

function noop(): void {}

function reportNonFatal(args: CreateRenderTabLightingControllerArgs, op: string, err: unknown): void {
  try {
    (args.reportNonFatal || noop)(op, err);
  } catch {
    // ignore reporting failures
  }
}

export function buildRenderTabLightingPatch(app: AppContainer, on: boolean): UiPatch {
  const patch: UiPatch = { lightingControl: !!on };
  if (!on) return patch;

  const uiNow = getUiSnapshot(app);
  if (typeof uiNow.lightAmb === 'undefined') patch.lightAmb = String(LIGHT_PRESETS.default.amb);
  if (typeof uiNow.lightDir === 'undefined') patch.lightDir = String(LIGHT_PRESETS.default.dir);
  if (typeof uiNow.lightX === 'undefined') patch.lightX = String(LIGHT_PRESETS.default.x);
  if (typeof uiNow.lightY === 'undefined') patch.lightY = String(LIGHT_PRESETS.default.y);
  if (typeof uiNow.lightZ === 'undefined') patch.lightZ = String(LIGHT_PRESETS.default.z);
  if (typeof uiNow.lastLightPreset === 'undefined') patch.lastLightPreset = 'default';
  return patch;
}

export function createRenderTabLightingController(
  args: CreateRenderTabLightingControllerArgs
): RenderTabLightingController {
  return {
    setLightingControl: (on: boolean) => {
      const patch = buildRenderTabLightingPatch(args.app, on);
      patchUiLightingState(args.app, patch, args.meta.uiOnlyImmediate('react:renderTab:lightingControl'));
    },
    setLightValue: (key: LightingScalarKey, value: number) => {
      const bounds = getLightBounds(key);
      const next = clamp(value, bounds.min, bounds.max);
      setUiLightScalar(args.app, key, String(next), args.meta.uiOnlyImmediate('react:renderTab:lightSlider'));
    },
    applyLightPreset: (name: LightPresetName) => {
      const preset = LIGHT_PRESETS[name];
      if (!preset) return;

      const nextWall = name === 'evening' ? WALL_COLOR_EVENING : args.defaultWall;
      const patch: UiPatch = {
        lightingControl: true,
        lastLightPreset: String(name),
        lightAmb: String(preset.amb),
        lightDir: String(preset.dir),
        lightX: String(preset.x),
        lightY: String(preset.y),
        lightZ: String(preset.z),
        lastSelectedWallColor: nextWall,
      };

      patchUiLightingState(args.app, patch, args.meta.uiOnlyImmediate('react:renderTab:lightPreset'));

      try {
        const runtime = args.roomDesignRuntime;
        if (runtime && typeof runtime.updateRoomWall === 'function') {
          runtime.updateRoomWall(nextWall);
        }
      } catch (err) {
        reportNonFatal(args, 'renderTabLighting:applyLightPreset', err);
      }
    },
  };
}
