import type { ReactElement } from 'react';

import { InlineNotice, ModeToggleButton, ToggleRow } from '../components/index.js';

export function StructureBodyHingeControls(props: {
  shouldShowHingeBtn: boolean;
  hingeDirection: boolean;
  hingeEditActive: boolean;
  onSetHingeDirection: (value: boolean) => void;
  onEnterHingeEditMode: () => void;
  onExitHingeEditMode: () => void;
}): ReactElement | null {
  if (!props.shouldShowHingeBtn) {
    return null;
  }

  return (
    <div className="wp-field">
      <ToggleRow
        label={'כיוון פתיחת דלת בודדת'}
        checked={props.hingeDirection}
        onChange={value => props.onSetHingeDirection(!!value)}
      />

      {props.hingeDirection ? (
        <div className="wp-field-sub">
          <ModeToggleButton
            active={props.hingeEditActive}
            className="wp-r-editmode-toggle--fullrow"
            icon={<i className={props.hingeEditActive ? 'fas fa-check' : 'fas fa-redo'} aria-hidden="true" />}
            onClick={() => {
              if (props.hingeEditActive) props.onExitHingeEditMode();
              else props.onEnterHingeEditMode();
            }}
          >
            {props.hingeEditActive ? 'סיים עריכה' : 'שנה כיוון פתיחת דלת'}
          </ModeToggleButton>

          <InlineNotice>
            {props.hingeEditActive
              ? 'מצב עריכה פעיל: לחץ על דלת כדי לשנות כיוון פתיחה, ואז סיים עריכה.'
              : 'כדי לשנות כיוון פתיחה: לחץ מצב עריכה ואז לחץ על דלת.'}
          </InlineNotice>
        </div>
      ) : null}
    </div>
  );
}
