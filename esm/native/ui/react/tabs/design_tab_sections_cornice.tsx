import type { ReactElement } from 'react';

import { ToggleRow } from '../components/index.js';
import { DesignTabTypeOption } from './design_tab_sections_controls.js';
import type { CorniceSectionProps } from './design_tab_sections_contracts.js';

export function CorniceSection(props: CorniceSectionProps): ReactElement {
  const model = props.model;

  return (
    <div className="control-section">
      <span className="section-title">תוספות גובה</span>

      <ToggleRow label="הוסף קרניז עליון (כתר)" checked={model.hasCornice} onChange={model.setHasCornice} />

      {model.hasCornice ? (
        <div className="wp-r-mt-2">
          <div className="type-selector wp-r-type-selector">
            <DesignTabTypeOption
              selected={model.corniceType === 'classic'}
              onClick={() => model.setCorniceType('classic')}
            >
              רגיל
            </DesignTabTypeOption>
            <DesignTabTypeOption
              selected={model.corniceType === 'wave'}
              onClick={() => model.setCorniceType('wave')}
            >
              גל
            </DesignTabTypeOption>
          </div>
        </div>
      ) : null}
    </div>
  );
}
