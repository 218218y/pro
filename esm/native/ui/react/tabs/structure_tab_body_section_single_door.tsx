import type { ReactElement } from 'react';

import {
  getSingleDoorPositionOptions,
  getSingleDoorSelectorClassName,
  type CommitStructural,
} from './structure_tab_body_section_contracts.js';
import { StructureBodyTypeOptionButton } from './structure_tab_body_section_controls.js';

export function StructureBodySingleDoorControls(props: {
  shouldShowSingleDoor: boolean;
  doors: number;
  singleDoorPosRaw: string;
  onCommitStructural: CommitStructural;
}): ReactElement | null {
  if (!props.shouldShowSingleDoor) {
    return null;
  }

  return (
    <div className="wp-field">
      <div className="wp-field-label">מיקום דלת בודדת</div>
      <div className={getSingleDoorSelectorClassName(props.doors)}>
        {getSingleDoorPositionOptions(props.doors).map(option => (
          <StructureBodyTypeOptionButton
            key={option.value}
            selected={props.singleDoorPosRaw === option.value}
            label={option.label}
            iconClass={option.iconClass}
            onClick={() =>
              props.onCommitStructural({ singleDoorPos: option.value }, 'react:structure:singleDoorPos')
            }
          />
        ))}
      </div>
    </div>
  );
}
