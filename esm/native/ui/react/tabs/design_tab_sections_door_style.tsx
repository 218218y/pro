import type { ReactElement } from 'react';

import { DesignTabTypeOption } from './design_tab_sections_controls.js';
import type { DoorStyleSectionProps } from './design_tab_sections_contracts.js';

export function DoorStyleSection(props: DoorStyleSectionProps): ReactElement {
  const model = props.model;

  return (
    <div className="control-section" data-testid="design-door-style-section">
      <span className="section-title">סגנון דלת</span>

      <div className="type-selector wp-r-type-selector">
        <DesignTabTypeOption
          selected={model.doorStyle === 'flat'}
          onClick={() => model.setDoorStyle('flat')}
          testId="design-door-style-flat-button"
          optionId="flat"
        >
          פוסט
        </DesignTabTypeOption>
        <DesignTabTypeOption
          selected={model.doorStyle === 'profile'}
          onClick={() => model.setDoorStyle('profile')}
          testId="design-door-style-profile-button"
          optionId="profile"
        >
          פרופיל
        </DesignTabTypeOption>
        <DesignTabTypeOption
          selected={model.doorStyle === 'tom'}
          onClick={() => model.setDoorStyle('tom')}
          testId="design-door-style-tom-button"
          optionId="tom"
        >
          פרופיל תום
        </DesignTabTypeOption>
      </div>
    </div>
  );
}
