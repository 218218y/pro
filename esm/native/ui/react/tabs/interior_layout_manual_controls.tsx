import type { ReactElement } from 'react';

import { InlineNotice } from '../components/InlineNotice.js';
import { ModeToggleButton } from '../components/index.js';
import { OptionBtn, cx } from './interior_tab_helpers.js';
import type { InteriorLayoutSectionProps } from './interior_tab_sections_shared.js';

const GRID_SHELF_VARIANTS: ReadonlyArray<['regular' | 'double' | 'glass' | 'brace', string, string]> = [
  ['regular', 'רגיל', 'fas fa-minus'],
  ['double', 'כפול', 'fas fa-clone'],
  ['glass', 'זכוכית', 'fas fa-gem'],
  ['brace', 'קושרת', 'fas fa-link'],
];

export function InteriorLayoutManualControls(props: InteriorLayoutSectionProps): ReactElement {
  return (
    <>
      <OptionBtn
        className="wp-manual-toggle"
        selected={props.showManualRow}
        onClick={() => {
          if (props.showManualRow) {
            props.setManualRowOpen(false);
            if (props.isManualLayoutMode) props.exitManual();
            return;
          }

          props.setManualUiTool('shelf');
          props.setManualRowOpen(true);
          props.enterManual('shelf');
        }}
      >
        <strong>⚙️ חלוקה ידנית</strong>
        <i
          className={cx('fas', props.showManualRow ? 'fa-chevron-up' : 'fa-chevron-down', 'wp-chevron')}
          aria-hidden="true"
        />
      </OptionBtn>

      <div className={cx('wp-manual-row', props.showManualRow ? '' : 'hidden')}>
        {props.manualTools.map(t => (
          <OptionBtn
            key={t.id}
            className="wp-flex-1"
            selected={props.isManualLayoutMode ? props.manualTool === t.id : props.manualUiTool === t.id}
            onClick={() => {
              props.setManualRowOpen(true);
              props.setManualUiTool(t.id);
              props.enterManual(t.id);
            }}
          >
            {t.label}
          </OptionBtn>
        ))}
      </div>

      <div className={cx('wp-muted-label', props.showGridControls ? '' : 'hidden')}>
        מספרי חלוקת תאים בארון
      </div>

      <div className={cx('grid-divisions-row', 'wp-row', 'wp-gap-8', props.showGridControls ? '' : 'hidden')}>
        {props.gridDivs.map(n => (
          <OptionBtn
            key={n}
            className="wp-flex-1"
            selected={props.currentGridDivisions === n}
            onClick={() => {
              props.setManualRowOpen(true);
              props.setManualUiTool('shelf');
              if (!props.isManualLayoutMode || props.manualTool !== 'shelf') props.enterManual('shelf');
              props.setGridDivisions(n);
            }}
            title={`חלוקה ל-${n}`}
          >
            {n}
          </OptionBtn>
        ))}
      </div>

      <div
        className={cx(
          'wp-muted-label',
          props.showGridControls && props.activeManualToolForUi === 'shelf' ? '' : 'hidden'
        )}
      >
        סוג מדף
      </div>

      <div
        className={cx(
          'wp-r-type-selector',
          'type-selector',
          'wp-sketch-shelf-subrow',
          'wp-grid-shelf-variant-row',
          props.showGridControls && props.activeManualToolForUi === 'shelf' ? '' : 'hidden'
        )}
        style={{ direction: 'rtl' }}
      >
        {GRID_SHELF_VARIANTS.map(([variant, label, icon]) => (
          <ModeToggleButton
            key={variant}
            active={props.gridShelfVariant === variant}
            className="wp-sketch-shelf-btn wp-sketch-shelf-subbtn"
            icon={
              <i className={props.gridShelfVariant === variant ? 'fas fa-check' : icon} aria-hidden="true" />
            }
            onClick={() => {
              if (!props.isManualLayoutMode) props.enterManual('shelf');
              props.setGridShelfVariant(variant);
            }}
          >
            {label}
          </ModeToggleButton>
        ))}
      </div>

      {props.isBraceShelvesMode ? (
        <InlineNotice>מדפי קושרת: לחץ על מדף כדי להחליף בין רגיל (45 ס"מ) לקושרת (עומק מלא).</InlineNotice>
      ) : null}
    </>
  );
}
