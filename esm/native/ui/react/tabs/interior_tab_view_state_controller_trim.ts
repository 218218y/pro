import type { UnknownRecord } from '../../../../../types';

import { asNum } from './interior_tab_helpers.js';
import { readDoorTrimAxis, readDoorTrimColor, readDoorTrimSpan } from './interior_tab_view_state_shared.js';
import type {
  CreateInteriorTabViewStateControllerArgs,
  InteriorTabViewStateController,
} from './interior_tab_view_state_controller_contracts.js';

export type InteriorTabDoorTrimViewStateController = Pick<
  InteriorTabViewStateController,
  'syncDoorTrimPanelState' | 'syncDoorTrimDraftState'
>;

export function createInteriorTabDoorTrimViewStateController(
  args: Pick<
    CreateInteriorTabViewStateControllerArgs,
    | 'setDoorTrimPanelOpen'
    | 'setDoorTrimColor'
    | 'setDoorTrimHorizontalSpan'
    | 'setDoorTrimHorizontalCustomCm'
    | 'setDoorTrimHorizontalCustomDraft'
    | 'setDoorTrimHorizontalCrossCm'
    | 'setDoorTrimHorizontalCrossDraft'
    | 'setDoorTrimVerticalSpan'
    | 'setDoorTrimVerticalCustomCm'
    | 'setDoorTrimVerticalCustomDraft'
    | 'setDoorTrimVerticalCrossCm'
    | 'setDoorTrimVerticalCrossDraft'
  >
): InteriorTabDoorTrimViewStateController {
  const {
    setDoorTrimPanelOpen,
    setDoorTrimColor,
    setDoorTrimHorizontalSpan,
    setDoorTrimHorizontalCustomCm,
    setDoorTrimHorizontalCustomDraft,
    setDoorTrimHorizontalCrossCm,
    setDoorTrimHorizontalCrossDraft,
    setDoorTrimVerticalSpan,
    setDoorTrimVerticalCustomCm,
    setDoorTrimVerticalCustomDraft,
    setDoorTrimVerticalCrossCm,
    setDoorTrimVerticalCrossDraft,
  } = args;

  return {
    syncDoorTrimPanelState(isDoorTrimMode) {
      if (isDoorTrimMode) setDoorTrimPanelOpen(true);
    },

    syncDoorTrimDraftState(isDoorTrimMode, modeOpts: UnknownRecord) {
      if (!isDoorTrimMode) return;
      const axis = readDoorTrimAxis(modeOpts.trimAxis, 'horizontal');
      const color = readDoorTrimColor(modeOpts.trimColor, 'nickel');
      const span = readDoorTrimSpan(modeOpts.trimSpan, 'full');
      const sizeCmRaw = asNum(modeOpts.trimSizeCm, NaN);
      const crossSizeCmRaw = asNum(modeOpts.trimCrossSizeCm, NaN);
      const sizeCm = Number.isFinite(sizeCmRaw) && sizeCmRaw > 0 ? sizeCmRaw : '';
      const crossSizeCm = Number.isFinite(crossSizeCmRaw) && crossSizeCmRaw > 0 ? crossSizeCmRaw : '';
      setDoorTrimColor(color);
      if (axis === 'vertical') {
        setDoorTrimVerticalSpan(span);
        setDoorTrimVerticalCustomCm(sizeCm);
        setDoorTrimVerticalCustomDraft(typeof sizeCm === 'number' ? String(sizeCm) : '');
        setDoorTrimVerticalCrossCm(crossSizeCm);
        setDoorTrimVerticalCrossDraft(typeof crossSizeCm === 'number' ? String(crossSizeCm) : '');
        return;
      }
      setDoorTrimHorizontalSpan(span);
      setDoorTrimHorizontalCustomCm(sizeCm);
      setDoorTrimHorizontalCustomDraft(typeof sizeCm === 'number' ? String(sizeCm) : '');
      setDoorTrimHorizontalCrossCm(crossSizeCm);
      setDoorTrimHorizontalCrossDraft(typeof crossSizeCm === 'number' ? String(crossSizeCm) : '');
    },
  };
}
