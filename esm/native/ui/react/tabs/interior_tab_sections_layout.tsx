import type { ReactElement } from 'react';

import { OptionBtn, cx } from './interior_tab_helpers.js';
import { InteriorLayoutManualControls } from './interior_layout_manual_controls.js';
import { InteriorLayoutSketchControls } from './interior_layout_sketch_controls.js';
import { InteriorToolCardHeader } from './interior_tab_sections_controls.js';
import type { InteriorLayoutSectionProps } from './interior_tab_sections_shared.js';

export function InteriorLayoutSection(props: InteriorLayoutSectionProps): ReactElement {
  return (
    <div className={cx('wp-tool-card', 'wp-tool-card--layout', props.layoutActive && 'is-active')}>
      <InteriorToolCardHeader
        title="🧩 חלוקות פנים"
        active={props.layoutActive}
        onExit={() => props.exitLayoutOrManual()}
      />

      <div className="wp-layout-grid">
        {props.layoutTypes.map(t => (
          <OptionBtn
            key={t.id}
            className="type-option--iconrow"
            selected={
              t.id === 'brace_shelves'
                ? props.isBraceShelvesMode
                : props.isLayoutMode && props.layoutType === t.id
            }
            onClick={() => props.enterLayout(t.id)}
          >
            <i className={t.icon} aria-hidden="true" /> {t.label}
          </OptionBtn>
        ))}
      </div>

      <InteriorLayoutManualControls {...props} />
      <InteriorLayoutSketchControls {...props} />
    </div>
  );
}
