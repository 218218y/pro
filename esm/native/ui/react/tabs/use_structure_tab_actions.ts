import { useMemo, useRef } from 'react';

import type {
  AppContainer,
  MetaActionsNamespaceLike,
  UiFeedbackNamespaceLike,
  HingeMap,
  ProjectPreChestStateLike,
} from '../../../../../types';
import {
  createStructureTabCornerChestActionsController,
  createStructureTabHingeActionsController,
} from './structure_tab_actions_controller_runtime.js';

export function useStructureTabHingeActions(args: {
  app: AppContainer;
  meta: MetaActionsNamespaceLike;
  fb: UiFeedbackNamespaceLike;
  hingeModeId: string;
  hingeMap: HingeMap;
  primaryMode: string;
}) {
  const savedHingeMapRef = useRef<HingeMap | null>(null);
  const hingeDispatchRef = useRef<boolean | null>(null);

  return useMemo(
    () =>
      createStructureTabHingeActionsController({
        app: args.app,
        meta: args.meta,
        fb: args.fb,
        hingeModeId: args.hingeModeId,
        getHingeMap: () => args.hingeMap,
        getPrimaryMode: () => args.primaryMode,
        savedHingeMapRef,
        hingeDispatchRef,
      }),
    [args.app, args.meta, args.fb, args.hingeModeId, args.hingeMap, args.primaryMode]
  );
}

export function useStructureTabCornerChestActions(args: {
  app: AppContainer;
  meta: MetaActionsNamespaceLike;
  cornerSide: 'left' | 'right';
  cornerWidth: number;
  cornerDoors: number;
  cornerHeight: number;
  cornerDepth: number;
  depth: number;
  doors: number;
  width: number;
  height: number;
  isManualWidth: boolean;
  baseType: string;
  preChestState: ProjectPreChestStateLike;
}) {
  return useMemo(
    () =>
      createStructureTabCornerChestActionsController({
        app: args.app,
        meta: args.meta,
        cornerSide: args.cornerSide,
        cornerWidth: args.cornerWidth,
        cornerDoors: args.cornerDoors,
        cornerHeight: args.cornerHeight,
        cornerDepth: args.cornerDepth,
        depth: args.depth,
        doors: args.doors,
        width: args.width,
        height: args.height,
        isManualWidth: args.isManualWidth,
        baseType: args.baseType,
        preChestState: args.preChestState,
      }),
    [
      args.app,
      args.meta,
      args.cornerSide,
      args.cornerWidth,
      args.cornerDoors,
      args.cornerHeight,
      args.cornerDepth,
      args.depth,
      args.doors,
      args.width,
      args.height,
      args.isManualWidth,
      args.baseType,
      args.preChestState,
    ]
  );
}
