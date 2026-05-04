import { useCallback, useEffect, useMemo, useState } from 'react';

import { useApp, useCfgSelector, useModeSelector, useUiSelector } from '../hooks.js';
import {
  __designTabReportNonFatal,
  normalizeSavedColors,
  type CurtainPreset,
} from './design_tab_multicolor_shared.js';
import { createDesignTabMulticolorController } from './design_tab_multicolor_controller_runtime.js';
import { MultiColorPanelView } from './design_tab_multicolor_panel_view.js';
import { createDesignTabMulticolorViewState } from './design_tab_multicolor_panel_state.js';
import {
  isGlassPaintSelection,
  parseDoorStyleOverridePaintToken,
  type DoorStyleOverrideValue,
} from '../../../features/door_style_overrides.js';
import { selectIsMultiColorMode, selectSavedColors } from '../selectors/config_selectors.js';

export {
  __designTabReportNonFatal,
  DEFAULT_COLOR_SWATCHES,
  normalizeSavedColors,
  readDefaultColorsFromApp,
} from './design_tab_multicolor_shared.js';
export type {
  CurtainPreset,
  DefaultColorLike,
  DefaultSwatch,
  SavedColor,
} from './design_tab_multicolor_shared.js';

export function MultiColorPanel(props: { embedded?: boolean } = {}) {
  const app = useApp();
  const enabled = useCfgSelector(selectIsMultiColorMode);
  const savedRaw = useCfgSelector(selectSavedColors);
  const curtainChoiceRaw = useUiSelector(ui => String(ui.currentCurtainChoice || 'none'));
  const mirrorDraftHeight = useUiSelector(ui => String(ui.currentMirrorDraftHeightCm || ''));
  const mirrorDraftWidth = useUiSelector(ui => String(ui.currentMirrorDraftWidthCm || ''));
  const primaryMode = useModeSelector(mode => String(mode.primary || 'none'));
  const saved = useMemo(() => normalizeSavedColors(savedRaw), [savedRaw]);

  // Tool-level state (paintColor) isn't in the store, so keep a small local mirror.
  const [paintColor, setPaintColor] = useState<string | null>(null);
  const activeDoorStyleOverride = parseDoorStyleOverridePaintToken(paintColor);

  const multicolorController = useMemo(
    () =>
      createDesignTabMulticolorController({
        app,
        getPaintActive: () => String(primaryMode || 'none').toLowerCase() === 'paint',
        setPaintColor,
        reportNonFatal: __designTabReportNonFatal,
      }),
    [app, primaryMode]
  );

  useEffect(() => {
    multicolorController.syncPaintColorFromTools();
  }, [multicolorController]);

  useEffect(() => {
    const paintActive = String(primaryMode || 'none').toLowerCase() === 'paint';
    if (!enabled && paintActive) multicolorController.finishPaintMode();
  }, [enabled, primaryMode, multicolorController]);

  const setMirrorDraftField = useCallback(
    (key: 'currentMirrorDraftHeightCm' | 'currentMirrorDraftWidthCm', value: string) =>
      multicolorController.setMirrorDraftField(key, value),
    [multicolorController]
  );

  const pickBrush = useCallback(
    (paintId: string, curtainPreset?: CurtainPreset) =>
      multicolorController.pickBrush(paintId, curtainPreset),
    [multicolorController]
  );

  const pickDoorStyle = useCallback(
    (style: DoorStyleOverrideValue) => multicolorController.enterDoorStyleMode(style),
    [multicolorController]
  );

  const setCurtainPreset = useCallback(
    (curtainPreset: CurtainPreset) => {
      multicolorController.setCurtain(curtainPreset);
      setPaintColor(current => (isGlassPaintSelection(current) ? current : 'glass'));
    },
    [multicolorController]
  );

  const defaultSwatches = useMemo(() => multicolorController.readDefaultSwatches(), [multicolorController]);
  const viewState = useMemo(
    () =>
      createDesignTabMulticolorViewState({
        enabled,
        primaryMode,
        curtainChoiceRaw,
        mirrorDraftHeight,
        mirrorDraftWidth,
        paintColor,
        activeDoorStyleOverride,
        defaultSwatches,
        savedSwatches: saved,
      }),
    [
      activeDoorStyleOverride,
      curtainChoiceRaw,
      defaultSwatches,
      enabled,
      mirrorDraftHeight,
      mirrorDraftWidth,
      paintColor,
      primaryMode,
      saved,
    ]
  );

  return (
    <MultiColorPanelView
      embedded={!!props.embedded}
      viewState={viewState}
      onToggleEnabled={checked => multicolorController.toggleEnabled(checked)}
      onFinishPaintMode={() => multicolorController.finishPaintMode()}
      onPickBrush={pickBrush}
      onPickDoorStyle={pickDoorStyle}
      onSetCurtainPreset={setCurtainPreset}
      onSetMirrorDraftField={setMirrorDraftField}
    />
  );
}
