import type { ReactElement } from 'react';

import { InlineNotice } from '../components/InlineNotice.js';
import { ToggleRow } from '../components/ToggleRow.js';
import { ModeToggleButton } from '../components/index.js';
import { CountBtn, OptionBtn, cx } from './interior_tab_helpers.js';
import { InteriorToolCardHeader } from './interior_tab_sections_controls.js';
import type {
  InteriorDividerSectionProps,
  InteriorExternalDrawersSectionProps,
  InteriorInternalDrawersSectionProps,
} from './interior_tab_sections_contracts.js';

export function InteriorExternalDrawersSection(
  props: InteriorExternalDrawersSectionProps
): ReactElement | null {
  if (props.wardrobeType === 'sliding') return null;

  return (
    <div
      className={cx('wp-tool-card', 'wp-tool-card--extdrawer', props.isExtDrawerMode && 'is-active')}
      data-testid="interior-external-drawers-card"
    >
      <InteriorToolCardHeader
        title="🚪 מגירות חיצוניות"
        active={props.isExtDrawerMode}
        onExit={() => props.exitExtDrawer()}
        exitButtonTestId="interior-external-drawers-exit-button"
      />

      <div className="wp-row wp-gap-8 wp-mb-10">
        <OptionBtn
          className="type-option--iconrow wp-flex-1"
          selected={props.isExtDrawerMode && props.extDrawerType === 'shoe'}
          onClick={() => props.enterExtDrawer('shoe')}
          testId="interior-external-drawers-shoe-button"
        >
          <i className="fas fa-shoe-prints" aria-hidden="true" /> נעליים
        </OptionBtn>

        <OptionBtn
          className="type-option--iconrow wp-flex-1"
          selected={props.isExtDrawerMode && props.extDrawerType === 'regular'}
          onClick={() => props.enterExtDrawer('regular', props.extDrawerCount)}
          testId="interior-external-drawers-regular-button"
        >
          <i className="fas fa-layer-group" aria-hidden="true" /> רגילות
        </OptionBtn>
      </div>

      <div className={cx('wp-row', 'wp-gap-5', props.extDrawerType === 'regular' ? '' : 'hidden')}>
        {props.extCounts.map(n => (
          <CountBtn
            key={n}
            selected={
              props.isExtDrawerMode && props.extDrawerType === 'regular' && props.extDrawerCount === n
            }
            onClick={() => props.enterExtDrawer('regular', n)}
            testId={`interior-external-drawers-count-${n}-button`}
          >
            {n}
          </CountBtn>
        ))}
      </div>

      {!props.isExtDrawerMode ? <InlineNotice>בחר סוג מגירות ואז לחץ על תא כדי ליישם.</InlineNotice> : null}
    </div>
  );
}

export function InteriorInternalDrawersSection(props: InteriorInternalDrawersSectionProps): ReactElement {
  return (
    <>
      <ToggleRow
        className="wp-r-intdrawer-toggle"
        label={<span className="wp-r-intdrawer-label">מגירות פנימיות</span>}
        checked={props.internalDrawersEnabled}
        onChange={checked => props.setInternalDrawersEnabled(checked)}
        testId="interior-internal-drawers-toggle"
      />

      {props.internalDrawersEnabled ? (
        <div
          className={cx('wp-tool-card', 'wp-tool-card--intdrawer', props.isIntDrawerMode && 'is-active')}
          data-testid="interior-internal-drawers-card"
        >
          <InteriorToolCardHeader title="📦 מיקום מגירות פנימיות" />

          <ModeToggleButton
            active={props.isIntDrawerMode}
            onClick={() => props.toggleIntDrawerMode()}
            data-testid="interior-internal-drawers-mode-button"
          >
            {props.isIntDrawerMode ? 'סיום עריכה' : 'הוסף/הסר מגירות פנימיות'}
          </ModeToggleButton>

          <div className={cx('wp-hint', 'wp-hint--intdrawer', !props.isIntDrawerMode && 'hidden')}>
            לחץ בתוך הארון בגובה הרצוי כדי למקם או להסיר מגירות.
          </div>
        </div>
      ) : (
        <InlineNotice>הפעל כדי לבחור מיקום מגירות פנימיות בתוך התאים.</InlineNotice>
      )}
    </>
  );
}

export function InteriorDividerSection(props: InteriorDividerSectionProps): ReactElement {
  return (
    <div className={cx('wp-tool-card', 'wp-tool-card--divider', props.isDividerMode && 'is-active')}>
      <InteriorToolCardHeader title="⛓️ מחיצה למגירה" />

      <ModeToggleButton active={props.isDividerMode} onClick={() => props.toggleDividerMode()}>
        {props.isDividerMode ? 'סיום עריכה' : 'הוסף/הסר מחיצה'}
      </ModeToggleButton>

      <div className={cx('wp-hint', 'wp-hint--divider', !props.isDividerMode && 'hidden')}>
        <i className="fas fa-info-circle" aria-hidden="true" /> לחץ על מגירה חיצונית או פנימית כדי לחלק אותה
        באמצע.
      </div>
    </div>
  );
}
