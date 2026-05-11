import type { ActionMetaLike, UnknownRecord } from '../../../../../types';
import { setManualWidth } from '../actions/room_actions.js';
import {
  setCfgPreChestState,
  setUiBaseType,
  setUiChestCommodeEnabled,
  setUiChestCommodeMirrorHeightCm,
  setUiChestCommodeMirrorWidthCm,
  setUiChestCommodeMirrorWidthManual,
  setUiChestDrawersCount,
  setUiChestMode,
  setUiDepth,
  setUiDoors,
  setUiHeight,
  setUiWidth,
} from '../actions/store_actions.js';
import {
  CHEST_MODE_DIMENSIONS,
  DEFAULT_HEIGHT,
  DEFAULT_HINGED_DOORS,
  DEFAULT_WIDTH,
  HINGED_DEFAULT_DEPTH,
  WARDROBE_CHEST_DRAWERS_MIN,
  adjustCameraForChest,
  resetCameraPreset,
} from '../../../services/api.js';
import { asFiniteInt, asFiniteNumber, structureTabReportNonFatal } from './structure_tab_shared.js';
import {
  commitStructureStatePatchWithRecompute,
  readPreChestState,
} from './structure_tab_actions_controller_shared.js';
import type { StructureTabCornerChestActionsArgs } from './structure_tab_corner_chest_actions_controller_contracts.js';
import {
  normalizeStructureDimensionValue,
  readStructureChestCommodeMirrorBounds,
  readStructureChestDrawersBounds,
} from './structure_tab_dimension_constraints.js';

function readDefaultCommodeMirrorWidthCm(width: unknown): number {
  return (
    normalizeStructureDimensionValue(width, readStructureChestCommodeMirrorBounds('width')) ??
    CHEST_MODE_DIMENSIONS.activeDefaults.widthCm
  );
}

function readDefaultCommodeMirrorHeightCm(value: unknown): number {
  return (
    normalizeStructureDimensionValue(value, readStructureChestCommodeMirrorBounds('height')) ??
    CHEST_MODE_DIMENSIONS.commode.defaultMirrorHeightCm
  );
}

export function createStructureTabChestActionsController(args: StructureTabCornerChestActionsArgs) {
  const toggleChestMode = (next: boolean) => {
    const app = args.app;

    if (next) {
      const metaOn: ActionMetaLike = { source: 'react:structure:chest:on', immediate: true, noBuild: true };
      const chestRawPatch: UnknownRecord = {
        doors: CHEST_MODE_DIMENSIONS.activeDefaults.doorsCount,
        width: CHEST_MODE_DIMENSIONS.activeDefaults.widthCm,
        height: CHEST_MODE_DIMENSIONS.activeDefaults.heightCm,
        depth: CHEST_MODE_DIMENSIONS.activeDefaults.depthCm,
        chestDrawersCount: CHEST_MODE_DIMENSIONS.activeDefaults.drawersCount,
      };
      if (args.chestCommodeEnabled && !args.chestCommodeMirrorWidthManual) {
        chestRawPatch.chestCommodeMirrorWidthCm = CHEST_MODE_DIMENSIONS.activeDefaults.widthCm;
      }

      const uiPatch: UnknownRecord = {
        isChestMode: true,
        baseType: 'legs',
        raw: chestRawPatch,
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
          setUiBaseType(args.app, CHEST_MODE_DIMENSIONS.activeDefaults.baseType, metaOn);
          setUiDoors(args.app, CHEST_MODE_DIMENSIONS.activeDefaults.doorsCount, metaOn);
          setUiWidth(args.app, CHEST_MODE_DIMENSIONS.activeDefaults.widthCm, metaOn);
          setUiHeight(args.app, CHEST_MODE_DIMENSIONS.activeDefaults.heightCm, metaOn);
          setUiDepth(args.app, CHEST_MODE_DIMENSIONS.activeDefaults.depthCm, metaOn);
          setUiChestDrawersCount(args.app, CHEST_MODE_DIMENSIONS.activeDefaults.drawersCount, metaOn);
          if (args.chestCommodeEnabled && !args.chestCommodeMirrorWidthManual) {
            setUiChestCommodeMirrorWidthCm(args.app, CHEST_MODE_DIMENSIONS.activeDefaults.widthCm, metaOn);
          }
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
    const doorsR = pre
      ? asFiniteInt(pre.doors, DEFAULT_HINGED_DOORS)
      : Math.max(1, asFiniteInt(args.doors, DEFAULT_HINGED_DOORS));
    const widthR = pre ? asFiniteNumber(pre.width, DEFAULT_WIDTH) : asFiniteNumber(args.width, DEFAULT_WIDTH);
    const heightR = pre
      ? asFiniteNumber(pre.height, DEFAULT_HEIGHT)
      : asFiniteNumber(args.height, DEFAULT_HEIGHT);
    const depthR = pre
      ? asFiniteNumber(pre.depth, HINGED_DEFAULT_DEPTH)
      : asFiniteNumber(args.depth, HINGED_DEFAULT_DEPTH);
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
    const next =
      normalizeStructureDimensionValue(nn, readStructureChestDrawersBounds()) ??
      readStructureChestDrawersBounds().min ??
      WARDROBE_CHEST_DRAWERS_MIN;
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

  const toggleChestCommode = (nextOn: boolean) => {
    const actionMeta: ActionMetaLike = {
      source: nextOn ? 'react:structure:chest:commode:on' : 'react:structure:chest:commode:off',
      immediate: true,
      noBuild: true,
    };
    const mirrorHeight = readDefaultCommodeMirrorHeightCm(args.chestCommodeMirrorHeightCm);
    const mirrorWidthManual = !!args.chestCommodeMirrorWidthManual;
    const mirrorWidth = readDefaultCommodeMirrorWidthCm(
      nextOn && !mirrorWidthManual
        ? args.width
        : args.chestCommodeMirrorWidthCm || args.width || CHEST_MODE_DIMENSIONS.activeDefaults.widthCm
    );
    const uiPatch: UnknownRecord = nextOn
      ? {
          chestCommodeEnabled: true,
          raw: {
            chestCommodeMirrorHeightCm: mirrorHeight,
            chestCommodeMirrorWidthCm: mirrorWidth,
            chestCommodeMirrorWidthManual: mirrorWidthManual,
          },
        }
      : { chestCommodeEnabled: false };

    commitStructureStatePatchWithRecompute({
      app: args.app,
      source: actionMeta.source || 'react:structure:chest:commode',
      meta: actionMeta,
      uiPatch,
      statePatch: { ui: uiPatch },
      mutate: () => {
        setUiChestCommodeEnabled(args.app, nextOn, actionMeta);
        if (!nextOn) return;
        setUiChestCommodeMirrorHeightCm(args.app, mirrorHeight, actionMeta);
        setUiChestCommodeMirrorWidthCm(args.app, mirrorWidth, actionMeta);
        setUiChestCommodeMirrorWidthManual(args.app, mirrorWidthManual, actionMeta);
      },
      errorLine: 'L3424',
    });
  };

  const setChestCommodeMirrorHeight = (nn: number) => {
    const next = readDefaultCommodeMirrorHeightCm(nn);
    const actionMeta: ActionMetaLike = {
      source: 'react:structure:chest:commode:mirror-height',
      immediate: true,
      noBuild: true,
    };
    const uiPatch: UnknownRecord = { raw: { chestCommodeMirrorHeightCm: next } };
    commitStructureStatePatchWithRecompute({
      app: args.app,
      source: 'react:structure:chest:commode:mirror-height',
      meta: actionMeta,
      uiPatch,
      statePatch: { ui: uiPatch },
      mutate: () => {
        setUiChestCommodeMirrorHeightCm(args.app, next, actionMeta);
      },
      errorLine: 'L3447',
    });
  };

  const setChestCommodeMirrorWidth = (nn: number) => {
    const next = readDefaultCommodeMirrorWidthCm(nn);
    const actionMeta: ActionMetaLike = {
      source: 'react:structure:chest:commode:mirror-width',
      immediate: true,
      noBuild: true,
    };
    const uiPatch: UnknownRecord = {
      raw: { chestCommodeMirrorWidthCm: next, chestCommodeMirrorWidthManual: true },
    };
    commitStructureStatePatchWithRecompute({
      app: args.app,
      source: 'react:structure:chest:commode:mirror-width',
      meta: actionMeta,
      uiPatch,
      statePatch: { ui: uiPatch },
      mutate: () => {
        setUiChestCommodeMirrorWidthCm(args.app, next, actionMeta);
        setUiChestCommodeMirrorWidthManual(args.app, true, actionMeta);
      },
      errorLine: 'L3469',
    });
  };

  const setChestCommodeMirrorWidthManual = (nextManual: boolean) => {
    const manual = !!nextManual;
    const actionMeta: ActionMetaLike = {
      source: manual
        ? 'react:structure:chest:commode:mirror-width:manual'
        : 'react:structure:chest:commode:mirror-width:auto',
      immediate: true,
      noBuild: true,
    };
    const autoWidth = readDefaultCommodeMirrorWidthCm(
      args.width || CHEST_MODE_DIMENSIONS.activeDefaults.widthCm
    );
    const rawPatch: UnknownRecord = manual
      ? { chestCommodeMirrorWidthManual: true }
      : { chestCommodeMirrorWidthManual: false, chestCommodeMirrorWidthCm: autoWidth };
    const uiPatch: UnknownRecord = { raw: rawPatch };
    commitStructureStatePatchWithRecompute({
      app: args.app,
      source: actionMeta.source || 'react:structure:chest:commode:mirror-width-mode',
      meta: actionMeta,
      uiPatch,
      statePatch: { ui: uiPatch },
      mutate: () => {
        setUiChestCommodeMirrorWidthManual(args.app, manual, actionMeta);
        if (!manual) setUiChestCommodeMirrorWidthCm(args.app, autoWidth, actionMeta);
      },
      errorLine: 'L3487',
    });
  };

  return {
    toggleChestMode,
    toggleChestCommode,
    setChestDrawersCount,
    setChestCommodeMirrorHeight,
    setChestCommodeMirrorWidth,
    setChestCommodeMirrorWidthManual,
  };
}
