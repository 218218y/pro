import type { ActionMetaLike } from '../../../../../types';
import {
  setUiCornerDepth,
  setUiCornerDoors,
  setUiCornerHeight,
  setUiCornerMode,
  setUiCornerSide,
  setUiCornerWidth,
} from '../actions/store_actions.js';
import { adjustCameraForCorner, resetCameraPreset } from '../../../services/api.js';
import { asFiniteInt, asFiniteNumber, structureTabReportNonFatal } from './structure_tab_shared.js';
import {
  commitStructureStatePatchWithRecompute,
  type CornerPatch,
} from './structure_tab_actions_controller_shared.js';
import type { StructureTabCornerChestActionsArgs } from './structure_tab_corner_chest_actions_controller_contracts.js';

export function createStructureTabCornerActionsController(args: StructureTabCornerChestActionsArgs) {
  const toggleCornerMode = (nextOn: boolean) => {
    const actionMeta: ActionMetaLike = { source: 'react:structure:corner', immediate: true, noBuild: true };
    const patch: CornerPatch = { cornerMode: !!nextOn };
    if (nextOn) {
      patch.cornerSide = args.cornerSide;
      patch.cornerWidth = asFiniteNumber(args.cornerWidth, 120);
      patch.cornerDoors = Math.max(0, asFiniteInt(args.cornerDoors, 3));
      patch.cornerHeight = asFiniteNumber(args.cornerHeight, 240);
      patch.cornerDepth = asFiniteNumber(args.cornerDepth, args.depth);
    }

    commitStructureStatePatchWithRecompute({
      app: args.app,
      source: 'react:structure:corner',
      meta: actionMeta,
      uiPatch: patch,
      statePatch: { ui: patch },
      mutate: () => {
        setUiCornerMode(args.app, !!nextOn, actionMeta);
        if (Object.prototype.hasOwnProperty.call(patch, 'cornerSide'))
          setUiCornerSide(args.app, patch.cornerSide, actionMeta);
        if (Object.prototype.hasOwnProperty.call(patch, 'cornerWidth'))
          setUiCornerWidth(args.app, patch.cornerWidth, actionMeta);
        if (Object.prototype.hasOwnProperty.call(patch, 'cornerDoors'))
          setUiCornerDoors(args.app, patch.cornerDoors, actionMeta);
        if (Object.prototype.hasOwnProperty.call(patch, 'cornerHeight'))
          setUiCornerHeight(args.app, patch.cornerHeight, actionMeta);
        if (Object.prototype.hasOwnProperty.call(patch, 'cornerDepth'))
          setUiCornerDepth(args.app, patch.cornerDepth, actionMeta);
      },
      errorLine: 'L3412',
    });

    try {
      if (nextOn) {
        const side: 'left' | 'right' = args.cornerSide === 'left' ? 'left' : 'right';
        adjustCameraForCorner(args.app, side);
      } else {
        resetCameraPreset(args.app);
      }
    } catch (__wpErr) {
      structureTabReportNonFatal('L3427', __wpErr);
    }
  };

  const toggleCornerSide = () => {
    const next = args.cornerSide === 'left' ? 'right' : 'left';
    const actionMeta: ActionMetaLike = {
      source: 'react:structure:cornerSide',
      immediate: true,
      noBuild: true,
    };
    commitStructureStatePatchWithRecompute({
      app: args.app,
      source: 'react:structure:cornerSide',
      meta: actionMeta,
      uiPatch: { cornerSide: next },
      statePatch: { ui: { cornerSide: next } },
      mutate: () => {
        setUiCornerSide(args.app, next, actionMeta);
      },
      errorLine: 'L3441',
    });

    try {
      adjustCameraForCorner(args.app, next === 'left' ? 'left' : 'right');
    } catch (__wpErr) {
      structureTabReportNonFatal('L3448', __wpErr);
    }
  };

  const commitCornerDoors = (nn: number) => {
    const nextDoorsRaw = Number(nn);
    const nextDoors = Number.isFinite(nextDoorsRaw) ? Math.max(0, Math.round(nextDoorsRaw)) : 3;
    if (nextDoors === Math.max(0, Math.round(Number(args.cornerDoors) || 0))) return;

    const patch: CornerPatch = { cornerDoors: nextDoors };
    const perDoor = 40;
    const curDoors = Number(args.cornerDoors);
    const curWidth = Number(args.cornerWidth);

    const widthIsAuto =
      !Number.isFinite(curWidth) ||
      curWidth <= 0 ||
      (Number.isFinite(curDoors) && curDoors >= 0 && Math.abs(curWidth - curDoors * perDoor) < 0.001);

    if (widthIsAuto) patch.cornerWidth = nextDoors * perDoor;

    const actionMeta: ActionMetaLike = {
      source: 'react:structure:cornerDoors',
      immediate: true,
      noBuild: true,
    };
    commitStructureStatePatchWithRecompute({
      app: args.app,
      source: 'react:structure:cornerDoors',
      meta: actionMeta,
      uiPatch: patch,
      statePatch: { ui: patch },
      mutate: () => {
        setUiCornerDoors(args.app, nextDoors, actionMeta);
        if (Object.prototype.hasOwnProperty.call(patch, 'cornerWidth')) {
          setUiCornerWidth(args.app, patch.cornerWidth, actionMeta);
        }
      },
      errorLine: 'L3474',
    });
  };

  const commitCornerWidth = (nn: number) => {
    if (Math.abs((Number(args.cornerWidth) || 0) - (Number(nn) || 0)) < 0.0001) return;
    const actionMeta: ActionMetaLike = {
      source: 'react:structure:cornerWidth',
      immediate: true,
      noBuild: true,
    };
    commitStructureStatePatchWithRecompute({
      app: args.app,
      source: 'react:structure:cornerWidth',
      meta: actionMeta,
      uiPatch: { cornerWidth: nn },
      statePatch: { ui: { cornerWidth: nn } },
      mutate: () => {
        setUiCornerWidth(args.app, nn, actionMeta);
      },
      errorLine: 'L3502',
    });
  };

  const commitCornerHeight = (nn: number) => {
    if (Math.abs((Number(args.cornerHeight) || 0) - (Number(nn) || 0)) < 0.0001) return;
    const actionMeta: ActionMetaLike = {
      source: 'react:structure:cornerHeight',
      immediate: true,
      noBuild: true,
    };
    commitStructureStatePatchWithRecompute({
      app: args.app,
      source: 'react:structure:cornerHeight',
      meta: actionMeta,
      uiPatch: { cornerHeight: nn },
      statePatch: { ui: { cornerHeight: nn } },
      mutate: () => {
        setUiCornerHeight(args.app, nn, actionMeta);
      },
      errorLine: 'L3523',
    });
  };

  const commitCornerDepth = (nn: number) => {
    if (Math.abs((Number(args.cornerDepth) || 0) - (Number(nn) || 0)) < 0.0001) return;
    const actionMeta: ActionMetaLike = {
      source: 'react:structure:cornerDepth',
      immediate: true,
      noBuild: true,
    };
    commitStructureStatePatchWithRecompute({
      app: args.app,
      source: 'react:structure:cornerDepth',
      meta: actionMeta,
      uiPatch: { cornerDepth: nn },
      statePatch: { ui: { cornerDepth: nn } },
      mutate: () => {
        setUiCornerDepth(args.app, nn, actionMeta);
      },
      errorLine: 'L3544',
    });
  };

  return {
    toggleCornerMode,
    toggleCornerSide,
    commitCornerDoors,
    commitCornerWidth,
    commitCornerHeight,
    commitCornerDepth,
  };
}
