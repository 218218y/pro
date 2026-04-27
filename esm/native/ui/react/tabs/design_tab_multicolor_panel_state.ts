import { isDoorStyleOverridePaintToken } from '../../../features/door_style_overrides.js';
import { isCurtainPreset, type CurtainPreset } from './design_tab_multicolor_shared.js';
import {
  MULTI_MSG_HINT_DOOR_STYLE,
  MULTI_MSG_HINT_GLASS,
  MULTI_MSG_HINT_PAINT,
  MULTI_SPECIAL_SWATCHES,
  type CreateDesignTabMulticolorViewStateArgs,
  type MultiColorPanelViewState,
  type MultiColorSwatchDot,
} from './design_tab_multicolor_panel_contracts.js';

export function resolveDesignTabCurtainChoice(raw: string): CurtainPreset {
  return isCurtainPreset(raw) ? raw : 'none';
}

function isSelectedPaintDot(
  paintActive: boolean,
  paintColor: string | null,
  curtainChoice: CurtainPreset,
  dot: Pick<MultiColorSwatchDot, 'paintId' | 'curtainPreset' | 'id'>
): boolean {
  if (!paintActive || !paintColor) return false;

  if (isDoorStyleOverridePaintToken(dot.paintId)) {
    return paintColor === dot.paintId;
  }

  if (dot.paintId === 'glass') {
    if (paintColor !== 'glass') return false;
    if (dot.curtainPreset) return curtainChoice === dot.curtainPreset;
    if (dot.id === 'glass_curtain') return curtainChoice !== 'none';
    return false;
  }

  return paintColor === dot.paintId;
}

function toSelectableDot(
  dot: Omit<MultiColorSwatchDot, 'selected'>,
  paintActive: boolean,
  paintColor: string | null,
  curtainChoice: CurtainPreset
): MultiColorSwatchDot {
  return {
    ...dot,
    selected: isSelectedPaintDot(paintActive, paintColor, curtainChoice, dot),
  };
}

function resolvePaintHint(
  paintActive: boolean,
  paintColor: string | null,
  activeDoorStyleOverride: MultiColorPanelViewState['activeDoorStyleOverride']
): string | null {
  if (!paintActive || paintColor === 'mirror') return null;
  if (paintColor === 'glass') return MULTI_MSG_HINT_GLASS;
  if (activeDoorStyleOverride) return MULTI_MSG_HINT_DOOR_STYLE;
  return MULTI_MSG_HINT_PAINT;
}

export function createDesignTabMulticolorViewState(
  args: CreateDesignTabMulticolorViewStateArgs
): MultiColorPanelViewState {
  const curtainChoice = resolveDesignTabCurtainChoice(args.curtainChoiceRaw);
  const paintActive = String(args.primaryMode || 'none').toLowerCase() === 'paint';
  const defaultSwatches = args.defaultSwatches.map(swatch =>
    toSelectableDot(
      {
        key: 'd:' + swatch.paintId,
        paintId: swatch.paintId,
        title: swatch.title,
        val: swatch.val,
      },
      paintActive,
      args.paintColor,
      curtainChoice
    )
  );
  const savedSwatches = args.savedSwatches.map(swatch =>
    toSelectableDot(
      {
        key: 's:' + swatch.id,
        paintId: swatch.id,
        title: swatch.name,
        val: swatch.value,
        isTexture: swatch.type === 'texture',
        textureData: swatch.textureData,
      },
      paintActive,
      args.paintColor,
      curtainChoice
    )
  );
  const specialSwatches = MULTI_SPECIAL_SWATCHES.map(swatch =>
    toSelectableDot(
      {
        key: 'sp:' + swatch.id,
        id: swatch.id,
        paintId: swatch.paintId,
        title: swatch.title,
        val: swatch.val,
        isSpecial: true,
        icon: swatch.icon,
        badge: swatch.badge,
        curtainPreset: swatch.curtainPreset,
      },
      paintActive,
      args.paintColor,
      curtainChoice
    )
  );

  return {
    enabled: args.enabled,
    paintActive,
    paintColor: args.paintColor,
    curtainChoice,
    mirrorDraftHeight: args.mirrorDraftHeight,
    mirrorDraftWidth: args.mirrorDraftWidth,
    activeDoorStyleOverride: args.activeDoorStyleOverride,
    defaultSwatches,
    savedSwatches,
    specialSwatches,
    hintText: resolvePaintHint(paintActive, args.paintColor, args.activeDoorStyleOverride),
  };
}
