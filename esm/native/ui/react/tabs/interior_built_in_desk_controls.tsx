import { useState, type ChangeEvent, type ReactElement } from 'react';
import type { BuiltInDeskOptions } from '../../../../../types/built_in_desk.js';
import {
  BUILT_IN_DESK_DIMENSIONS,
  DEFAULT_BUILT_IN_DESK_OPTIONS,
  encodeBuiltInDeskTool,
  maxBuiltInDeskDrawers,
  readBuiltInDeskTool,
} from '../../../../shared/built_in_desk.js';
import { OptionButton } from '../components/index.js';

export function readActiveBuiltInDeskOptions(props: { isSketchToolActive: boolean; manualToolRaw: string }) {
  return props.isSketchToolActive ? readBuiltInDeskTool(props.manualToolRaw) : null;
}

export function BuiltInDeskToolButton(props: {
  selected: boolean;
  testId: string;
  panelId: string;
  activateManualToolId: (toolId: string) => void;
  exitManual: () => void;
}): ReactElement {
  return (
    <OptionButton
      density="micro"
      selected={props.selected}
      aria-expanded={props.selected}
      {...(props.selected ? { 'aria-controls': props.panelId } : {})}
      icon={<i className="fas fa-table" aria-hidden="true" />}
      testId={props.testId}
      onClick={() => {
        if (props.selected) props.exitManual();
        else props.activateManualToolId(encodeBuiltInDeskTool(DEFAULT_BUILT_IN_DESK_OPTIONS));
      }}
    >
      שולחן מובנה
    </OptionButton>
  );
}

export function BuiltInDeskOptionsPanel(props: {
  id: string;
  options: BuiltInDeskOptions;
  activateManualToolId: (toolId: string) => void;
}): ReactElement {
  const { options, id } = props;
  const [lengthDraft, setLengthDraft] = useState<string | null>(null);
  const { minLengthCm, maxLengthCm } = BUILT_IN_DESK_DIMENSIONS;
  const drawerLimit = maxBuiltInDeskDrawers(options.lengthCm);
  const apply = (patch: Partial<BuiltInDeskOptions>) => {
    props.activateManualToolId(encodeBuiltInDeskTool({ ...options, ...patch }));
  };

  return (
    <div className="wp-sketch-shelf-variant-settings" id={id} role="group" aria-label="הגדרות שולחן מובנה">
      <div className="wp-field">
        <label className="wp-r-label" htmlFor={`${id}-length`}>
          אורך קדימה מהחזית (ס״מ)
        </label>
        <input
          className="wp-r-input"
          id={`${id}-length`}
          type="number"
          min={minLengthCm}
          max={maxLengthCm}
          step={1}
          value={lengthDraft ?? options.lengthCm}
          data-testid="sketch-built-in-desk-length"
          onChange={(event: ChangeEvent<HTMLInputElement>) => {
            const next = event.currentTarget.valueAsNumber;
            setLengthDraft(event.currentTarget.value);
            if (!Number.isInteger(next) || next < minLengthCm || next > maxLengthCm) return;
            apply({
              lengthCm: next,
              drawerCount: Math.min(options.drawerCount, maxBuiltInDeskDrawers(next)),
            });
          }}
          onBlur={() => setLengthDraft(null)}
        />
      </div>
      <div className="wp-field">
        <label className="wp-r-label" htmlFor={`${id}-drawers`}>
          מספר מגירות
        </label>
        <select
          className="wp-r-input"
          id={`${id}-drawers`}
          data-testid="sketch-built-in-desk-drawers"
          value={options.drawerCount}
          onChange={(event: ChangeEvent<HTMLSelectElement>) =>
            apply({ drawerCount: Number(event.currentTarget.value) })
          }
        >
          {Array.from({ length: drawerLimit - 1 }, (_, index) => index + 2).map(count => (
            <option key={count} value={count}>
              {count}
            </option>
          ))}
        </select>
      </div>
      <div className="wp-sketch-shelf-variant-options" role="group" aria-label="תמיכת שולחן">
        <OptionButton
          density="micro"
          selected={options.support === 'leg'}
          onClick={() => apply({ support: 'leg' })}
          testId="sketch-built-in-desk-leg"
        >
          רגל לרצפה
        </OptionButton>
        <OptionButton
          density="micro"
          selected={options.support === 'wall'}
          onClick={() => apply({ support: 'wall' })}
          testId="sketch-built-in-desk-wall"
        >
          תלוי על הקיר
        </OptionButton>
      </div>
      <p>לחצו בתא או בקופסה בגובה הפלטה. לחצו על שולחן קיים להחלת הגדרות חדשות או להסרה כשהתצוגה אדומה.</p>
    </div>
  );
}
