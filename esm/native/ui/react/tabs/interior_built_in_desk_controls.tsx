import { useState, type ChangeEvent, type ReactElement } from 'react';
import type { BuiltInDeskOptions } from '../../../../../types/built_in_desk.js';
import {
  BUILT_IN_DESK_DIMENSIONS,
  DEFAULT_BUILT_IN_DESK_OPTIONS,
  maxBuiltInDeskDrawers,
  readBuiltInDeskTool,
} from '../../../../shared/built_in_desk.js';
import { Button, OptionButton } from '../components/index.js';

const clearanceFields = [
  ['doorClearanceAboveCm', 'מרווח מעל השולחן (ס״מ)', 'איפוס מרווח מעל השולחן'],
  ['doorClearanceBelowCm', 'מרווח מתחת לשולחן (ס״מ)', 'איפוס מרווח מתחת לשולחן'],
] as const;
const defaultClearanceCm = BUILT_IN_DESK_DIMENSIONS.doorOpeningClearanceM * 100;

export function readActiveBuiltInDeskOptions(props: { isSketchToolActive: boolean; manualToolRaw: string }) {
  return props.isSketchToolActive ? readBuiltInDeskTool(props.manualToolRaw) : null;
}

export function BuiltInDeskToolButton(props: {
  selected: boolean;
  testId: string;
  panelId: string;
  activateBuiltInDeskTool: () => void;
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
        else props.activateBuiltInDeskTool();
      }}
    >
      שולחן מובנה
    </OptionButton>
  );
}

function BuiltInDeskNumberField(props: {
  id: string;
  testId: string;
  label: string;
  resetLabel: string;
  min: number;
  max: number;
  value: number;
  defaultValue: number;
  onValueChange: (next: number) => void;
}): ReactElement {
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <div className="wp-field">
      <label className="wp-r-label" htmlFor={props.id}>
        {props.label}
      </label>
      <div className="wp-r-input-row wp-desk-number-field">
        <input
          className="wp-r-input"
          id={props.id}
          data-testid={props.testId}
          type="number"
          min={props.min}
          max={props.max}
          step={1}
          value={draft ?? props.value}
          onChange={(event: ChangeEvent<HTMLInputElement>) => {
            const { value, valueAsNumber } = event.currentTarget;
            setDraft(value);
            if (Number.isInteger(valueAsNumber) && valueAsNumber >= props.min && valueAsNumber <= props.max) {
              props.onValueChange(valueAsNumber);
            }
          }}
          onBlur={() => setDraft(null)}
        />
        <Button
          variant="light"
          inline
          className="wp-r-groove-reset-btn wp-desk-reset-btn wp-r-styled-tooltip hint-bottom"
          aria-label={props.resetLabel}
          data-tooltip={props.resetLabel}
          onClick={() => {
            setDraft(null);
            props.onValueChange(props.defaultValue);
          }}
        >
          <i className="fas fa-undo-alt" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}

export function BuiltInDeskOptionsPanel(props: {
  id: string;
  options: BuiltInDeskOptions;
  activateBuiltInDeskTool: (options: BuiltInDeskOptions) => void;
}): ReactElement {
  const { options, id } = props;
  const { minLengthCm, maxLengthCm } = BUILT_IN_DESK_DIMENSIONS;
  const drawerLimit = maxBuiltInDeskDrawers(options.lengthCm);
  const apply = (patch: Partial<BuiltInDeskOptions>) => {
    props.activateBuiltInDeskTool({ ...options, ...patch });
  };

  return (
    <div className="wp-sketch-shelf-variant-settings" id={id} role="group" aria-label="הגדרות שולחן מובנה">
      <div className="wp-desk-option-row">
        <BuiltInDeskNumberField
          id={`${id}-length`}
          testId="sketch-built-in-desk-length"
          label="אורך קדימה מהחזית (ס״מ)"
          resetLabel="איפוס אורך השולחן"
          min={minLengthCm}
          max={maxLengthCm}
          value={options.lengthCm}
          defaultValue={DEFAULT_BUILT_IN_DESK_OPTIONS.lengthCm}
          onValueChange={lengthCm =>
            apply({ lengthCm, drawerCount: Math.min(options.drawerCount, maxBuiltInDeskDrawers(lengthCm)) })
          }
        />
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
      </div>
      <div className="wp-desk-option-row" role="group" aria-label="פתח הדלתות סביב השולחן">
        {clearanceFields.map(([key, label, resetLabel]) => (
          <BuiltInDeskNumberField
            key={key}
            id={`${id}-${key}`}
            testId={`sketch-built-in-desk-${key}`}
            label={label}
            resetLabel={resetLabel}
            min={0}
            max={BUILT_IN_DESK_DIMENSIONS.maxDoorClearanceCm}
            value={options[key] ?? defaultClearanceCm}
            defaultValue={defaultClearanceCm}
            onValueChange={next => apply({ [key]: next })}
          />
        ))}
      </div>
      <div className="wp-sketch-shelf-variant-options" role="group" aria-label="תמיכת שולחן">
        <OptionButton
          density="micro"
          selected={options.support === 'leg'}
          onClick={() => apply({ support: 'leg' })}
          testId="sketch-built-in-desk-leg"
        >
          דופן עד הרצפה
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
      <p>
        לחצו בתא או בקופסה בגובה הפלטה. לשינוי החיתוך, הגדירו מרווח ולחצו על השולחן הקיים. מרווח 0 מקרב את
        הדלת לשולחן. לחצו להסרה כשהתצוגה אדומה.
      </p>
    </div>
  );
}
