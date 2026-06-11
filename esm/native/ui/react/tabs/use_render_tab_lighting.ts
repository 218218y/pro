import { useMemo } from 'react';

import type { AppContainer, MetaActionsNamespaceLike } from '../../../../../types';

import type {
  LightPresetName,
  LightingScalarKey,
  RoomDesignRuntimeLike,
} from './render_tab_shared_contracts.js';
import { createRenderTabLightingController } from './render_tab_lighting_controller_runtime.js';

export type RenderTabLightingModel = {
  setLightingControl: (on: boolean) => void;
  setLightValue: (key: LightingScalarKey, value: number) => void;
  applyLightPreset: (name: LightPresetName) => void;
};

type UseRenderTabLightingArgs = {
  app: AppContainer;
  meta: MetaActionsNamespaceLike;
  roomDesignRuntime: RoomDesignRuntimeLike | null;
  defaultWall: string;
};

export function useRenderTabLighting(args: UseRenderTabLightingArgs): RenderTabLightingModel {
  const { app, meta, roomDesignRuntime, defaultWall } = args;

  const lightingController = useMemo(
    () => createRenderTabLightingController({ app, meta, roomDesignRuntime, defaultWall }),
    [app, meta, roomDesignRuntime, defaultWall]
  );

  return useMemo(
    () => ({
      setLightingControl: lightingController.setLightingControl,
      setLightValue: lightingController.setLightValue,
      applyLightPreset: lightingController.applyLightPreset,
    }),
    [
      lightingController.setLightingControl,
      lightingController.setLightValue,
      lightingController.applyLightPreset,
    ]
  );
}
