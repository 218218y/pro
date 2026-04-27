import type { ActionMetaLike, UnknownRecord } from '../../../../../types';
import { setManualWidth } from '../actions/room_actions.js';
import {
  setCfgPreChestState,
  setUiBaseType,
  setUiChestDrawersCount,
  setUiChestMode,
  setUiDepth,
  setUiDoors,
  setUiHeight,
  setUiWidth,
} from '../actions/store_actions.js';
import { adjustCameraForChest, resetCameraPreset } from '../../../services/api.js';
import { asFiniteInt, asFiniteNumber, structureTabReportNonFatal } from './structure_tab_shared.js';
import {
  commitStructureStatePatchWithRecompute,
  readPreChestState,
} from './structure_tab_actions_controller_shared.js';
import type { StructureTabCornerChestActionsArgs } from './structure_tab_corner_chest_actions_controller_contracts.js';

export function createStructureTabChestActionsController(args: StructureTabCornerChestActionsArgs) {
  const toggleChestMode = (next: boolean) => {
    const app = args.app;

    if (next) {
      const metaOn: ActionMetaLike = { source: 'react:structure:chest:on', immediate: true, noBuild: true };
      const uiPatch: UnknownRecord = {
        isChestMode: true,
        baseType: 'legs',
        raw: { doors: 0, width: 50, height: 50, depth: 40, chestDrawersCount: 2 },
      };
      commitStructureStatePatchWithRecompute({
        app: args.app,
        source: 'react:structure:chest:on',
        meta: metaOn,
        uiPatch,
        statePatch: {
          config: {
            preChestState: {
              doors: args.doors,
              width: args.width,
              height: args.height,
              depth: args.depth,
              isManual: args.isManualWidth,
              base: args.baseType,
            },
          },
          ui: uiPatch,
        },
        mutate: () => {
          setCfgPreChestState(
            args.app,
            {
              doors: args.doors,
              width: args.width,
              height: args.height,
              depth: args.depth,
              isManual: args.isManualWidth,
              base: args.baseType,
            },
            metaOn
          );
          setUiChestMode(args.app, true, metaOn);
          setUiBaseType(args.app, 'legs', metaOn);
          setUiDoors(args.app, 0, metaOn);
          setUiWidth(args.app, 50, metaOn);
          setUiHeight(args.app, 50, metaOn);
          setUiDepth(args.app, 40, metaOn);
          setUiChestDrawersCount(args.app, 2, metaOn);
        },
        errorLine: 'L3293',
      });

      try {
        adjustCameraForChest(app);
      } catch (__wpErr) {
        structureTabReportNonFatal('L3299', __wpErr);
      }

      return;
    }

    const pre = readPreChestState(args.preChestState);
    const doorsR = pre ? asFiniteInt(pre.doors, 4) : Math.max(1, asFiniteInt(args.doors, 4));
    const widthR = pre ? asFiniteNumber(pre.width, 160) : asFiniteNumber(args.width, 160);
    const heightR = pre ? asFiniteNumber(pre.height, 240) : asFiniteNumber(args.height, 240);
    const depthR = pre ? asFiniteNumber(pre.depth, 55) : asFiniteNumber(args.depth, 55);
    const baseR =
      pre && typeof pre.base === 'string' && pre.base ? pre.base : String(args.baseType || 'plinth');

    const metaOff: ActionMetaLike = { source: 'react:structure:chest:off', immediate: true, noBuild: true };
    const uiPatch: UnknownRecord = {
      isChestMode: false,
      baseType: baseR,
      raw: { doors: doorsR, width: widthR, height: heightR, depth: depthR },
    };
    const configPatch: UnknownRecord = { preChestState: null };
    if (pre && typeof pre.isManual === 'boolean') configPatch.isManualWidth = !!pre.isManual;

    commitStructureStatePatchWithRecompute({
      app: args.app,
      source: 'react:structure:chest:off',
      meta: metaOff,
      uiPatch,
      statePatch: { config: configPatch, ui: uiPatch },
      mutate: () => {
        if (pre && typeof pre.isManual === 'boolean') {
          setManualWidth(args.app, !!pre.isManual, metaOff);
        }
        setUiChestMode(args.app, false, metaOff);
        setUiBaseType(args.app, baseR, metaOff);
        setUiDoors(args.app, doorsR, metaOff);
        setUiWidth(args.app, widthR, metaOff);
        setUiHeight(args.app, heightR, metaOff);
        setUiDepth(args.app, depthR, metaOff);
        setCfgPreChestState(args.app, null, metaOff);
      },
      errorLine: 'L3340',
    });

    try {
      resetCameraPreset(app);
    } catch (__wpErr) {
      structureTabReportNonFatal('L3358', __wpErr);
    }
  };

  const setChestDrawersCount = (nn: number) => {
    const next = Math.max(2, Math.round(nn));
    const actionMeta: ActionMetaLike = {
      source: 'react:structure:chest:count',
      immediate: true,
      noBuild: true,
    };
    const uiPatch: UnknownRecord = { raw: { chestDrawersCount: next } };
    commitStructureStatePatchWithRecompute({
      app: args.app,
      source: 'react:structure:chest:count',
      meta: actionMeta,
      uiPatch,
      statePatch: { ui: uiPatch },
      mutate: () => {
        setUiChestDrawersCount(args.app, next, actionMeta);
      },
      errorLine: 'L3387',
    });
  };

  return {
    toggleChestMode,
    setChestDrawersCount,
  };
}
