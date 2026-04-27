import type { AppContainer, ToolsNamespaceLike, UnknownRecord } from '../../../../../types';

import { MODES, getTools, setUiScalarSoft } from '../../../services/api.js';
import { enterPrimaryMode } from '../actions/modes_actions.js';
import { exitPaintMode, setCurtainChoice, setMultiEnabled } from '../../multicolor_service.js';
import {
  __designTabReportNonFatal,
  buildDesignTabDefaultSwatches,
  buildDesignTabDefaultSwatchesFromUi,
  type CurtainPreset,
  type DefaultSwatch,
  isRecord,
} from './design_tab_multicolor_shared.js';
import {
  encodeDoorStyleOverridePaintToken,
  type DoorStyleOverrideValue,
} from '../../../features/door_style_overrides.js';

export type DesignTabMirrorDraftKey = 'currentMirrorDraftHeightCm' | 'currentMirrorDraftWidthCm';

export type DesignTabMulticolorControllerArgs = {
  app: AppContainer;
  getPaintActive: () => boolean;
  setPaintColor: (next: string | null) => void;
  reportNonFatal?: (op: string, err: unknown, throttleMs?: number) => void;
  setCurtainChoice?: typeof setCurtainChoice;
  setMultiEnabled?: typeof setMultiEnabled;
  exitPaintMode?: typeof exitPaintMode;
  enterPrimaryMode?: typeof enterPrimaryMode;
  getTools?: typeof getTools;
  setUiScalarSoft?: typeof setUiScalarSoft;
};

export type DesignTabMulticolorController = {
  syncPaintColorFromTools: () => string | null;
  toggleEnabled: (checked: boolean) => void;
  setCurtain: (next: CurtainPreset) => void;
  setMirrorDraftField: (key: DesignTabMirrorDraftKey, value: string) => void;
  finishPaintMode: () => void;
  enterPaintMode: (paintId: string, curtainPreset?: CurtainPreset) => void;
  enterDoorStyleMode: (style: DoorStyleOverrideValue) => void;
  pickBrush: (paintId: string, curtainPreset?: CurtainPreset) => void;
  readDefaultSwatches: () => DefaultSwatch[];
};

function getPaintModeId(): string {
  const paint = isRecord(MODES) ? MODES.PAINT : null;
  return typeof paint === 'string' && paint ? paint : 'paint';
}

function getPaintTools(app: AppContainer, reader: typeof getTools = getTools): ToolsNamespaceLike {
  return reader(app);
}

function setPaintToolColor(
  app: AppContainer,
  paintId: string,
  reportNonFatal: (op: string, err: unknown, throttleMs?: number) => void,
  reader: typeof getTools = getTools
): void {
  try {
    const tools = getPaintTools(app, reader);
    const fn = typeof tools.setPaintColor === 'function' ? tools.setPaintColor : null;
    if (!fn) throw new TypeError('tools.setPaintColor is not available');
    fn(paintId);
  } catch (err) {
    reportNonFatal('multicolor:paintColor', err);
  }
}

export function createDesignTabMulticolorController(
  args: DesignTabMulticolorControllerArgs
): DesignTabMulticolorController {
  const reportNonFatal = args.reportNonFatal || __designTabReportNonFatal;
  const setCurtainChoiceImpl = args.setCurtainChoice || setCurtainChoice;
  const setMultiEnabledImpl = args.setMultiEnabled || setMultiEnabled;
  const exitPaintModeImpl = args.exitPaintMode || exitPaintMode;
  const enterPrimaryModeImpl = args.enterPrimaryMode || enterPrimaryMode;
  const getToolsImpl = args.getTools || getTools;
  const setUiScalarSoftImpl = args.setUiScalarSoft || setUiScalarSoft;

  const setCurtain = (next: CurtainPreset) => {
    try {
      setCurtainChoiceImpl(args.app, next);
    } catch (err) {
      reportNonFatal('multicolor:curtainChoice', err);
    }
  };

  const finishPaintMode = () => {
    try {
      exitPaintModeImpl(args.app);
    } catch (err) {
      reportNonFatal('multicolor:finishPaint', err);
    }
    args.setPaintColor(null);
  };

  const enterPaintModeWithColor = (paintId: string, curtainPreset?: CurtainPreset) => {
    try {
      const opts: UnknownRecord = {
        cursor: 'crosshair',
        toast: 'מצב צביעה פעיל - לחץ על חלקים',
      };
      enterPrimaryModeImpl(args.app, getPaintModeId(), opts);
    } catch (err) {
      reportNonFatal('multicolor:enterPaint', err);
    }

    setPaintToolColor(args.app, paintId, reportNonFatal, getToolsImpl);
    if (paintId === 'glass' && curtainPreset) setCurtain(curtainPreset);
    args.setPaintColor(paintId);
  };

  const pickBrush = (paintId: string, curtainPreset?: CurtainPreset) => {
    if (!args.getPaintActive()) {
      enterPaintModeWithColor(paintId, curtainPreset);
      return;
    }
    setPaintToolColor(args.app, paintId, reportNonFatal, getToolsImpl);
    if (paintId === 'glass' && curtainPreset) setCurtain(curtainPreset);
    args.setPaintColor(paintId);
  };

  return {
    syncPaintColorFromTools() {
      if (!args.getPaintActive()) {
        args.setPaintColor(null);
        return null;
      }

      try {
        const tools = getPaintTools(args.app, getToolsImpl);
        const cur = typeof tools.getPaintColor === 'function' ? tools.getPaintColor() : null;
        const next = typeof cur === 'string' ? cur : null;
        args.setPaintColor(next);
        return next;
      } catch {
        args.setPaintColor(null);
        return null;
      }
    },
    toggleEnabled(checked: boolean) {
      try {
        setMultiEnabledImpl(args.app, !!checked, {
          source: 'react:multiColorToggle',
          immediate: true,
        });
      } catch (err) {
        reportNonFatal('multicolor:toggleEnabled', err);
      }

      if (!checked) finishPaintMode();
    },
    setCurtain,
    setMirrorDraftField(key: DesignTabMirrorDraftKey, value: string) {
      try {
        setUiScalarSoftImpl(args.app, key, value, {
          source: 'react:designTab:mirrorDraft',
        });
      } catch (err) {
        reportNonFatal('multicolor:mirrorDraft', err);
      }
    },
    finishPaintMode,
    enterPaintMode: enterPaintModeWithColor,
    enterDoorStyleMode(style: DoorStyleOverrideValue) {
      enterPaintModeWithColor(encodeDoorStyleOverridePaintToken(style));
    },
    pickBrush,
    readDefaultSwatches() {
      try {
        return buildDesignTabDefaultSwatches(args.app);
      } catch (err) {
        reportNonFatal('multicolor:defaultSwatches', err);
        return buildDesignTabDefaultSwatchesFromUi({});
      }
    },
  };
}
