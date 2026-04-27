import type { ReactElement } from 'react';

import {
  SKETCH_TOOL_BOX_BASE_PREFIX,
  SKETCH_TOOL_BOX_CORNICE_PREFIX,
  SKETCH_TOOL_BOX_DIVIDER,
  SKETCH_TOOL_BOX_DOOR,
  SKETCH_TOOL_BOX_DOUBLE_DOOR,
  SKETCH_TOOL_BOX_DOOR_HINGE,
  SKETCH_BOX_HEIGHT_MAX_CM,
  SKETCH_BOX_HEIGHT_MIN_CM,
  SKETCH_BOX_OPTIONAL_DIM_MAX_CM,
  SKETCH_BOX_OPTIONAL_DIM_MIN_CM,
  type SketchBoxLegColor,
  type SketchBoxLegStyle,
  cx,
  isSketchBoxTool,
} from './interior_tab_helpers.js';
import {
  BASE_LEG_HEIGHT_MAX_CM,
  BASE_LEG_HEIGHT_MIN_CM,
  BASE_LEG_WIDTH_MAX_CM,
  BASE_LEG_WIDTH_MIN_CM,
} from '../../../features/base_leg_support.js';
import {
  SketchBoxChoicePanel,
  SketchBoxNumericField,
  SketchBoxToolButton,
  SketchBoxToolRow,
} from './interior_layout_sketch_box_controls_components.js';
import {
  commitSketchBoxHeightDraft,
  commitSketchBoxLegHeightDraft,
  commitSketchBoxLegWidthDraft,
  commitSketchBoxOptionalDimensionDraft,
  selectSketchBoxLegColor,
  selectSketchBoxLegStyle,
  selectSketchBoxBaseType,
  selectSketchBoxCorniceType,
  toggleSketchBoxBasePanel,
  toggleSketchBoxControlsPanel,
  toggleSketchBoxCornicePanel,
  toggleSketchBoxTool,
  updateSketchBoxHeightDraft,
  updateSketchBoxLegHeightDraft,
  updateSketchBoxLegWidthDraft,
  updateSketchBoxOptionalDimensionDraft,
} from './interior_layout_sketch_box_controls_runtime.js';
import type { InteriorSketchBoxControlsSectionProps } from './interior_layout_sketch_section_types.js';

type SketchBoxBaseOption = Readonly<{ id: 'plinth' | 'legs' | 'none'; label: string }>;
type SketchBoxCorniceOption = Readonly<{ id: 'classic' | 'wave'; label: string }>;
type SketchBoxLegStyleOption = Readonly<{ id: SketchBoxLegStyle; label: string }>;
type SketchBoxLegColorOption = Readonly<{ id: SketchBoxLegColor; label: string }>;

const SKETCH_BOX_BASE_OPTIONS: readonly [SketchBoxBaseOption, SketchBoxBaseOption, SketchBoxBaseOption] = [
  { id: 'plinth', label: 'צוקל' },
  { id: 'legs', label: 'רגליים' },
  { id: 'none', label: 'ללא' },
];

const SKETCH_BOX_CORNICE_OPTIONS: readonly [SketchBoxCorniceOption, SketchBoxCorniceOption] = [
  { id: 'classic', label: 'קרניז רגיל' },
  { id: 'wave', label: 'קרניז גל' },
];

const SKETCH_BOX_LEG_STYLE_OPTIONS: readonly [
  SketchBoxLegStyleOption,
  SketchBoxLegStyleOption,
  SketchBoxLegStyleOption,
] = [
  { id: 'tapered', label: 'שפיץ' },
  { id: 'round', label: 'עגולות' },
  { id: 'square', label: 'מרובעות' },
];

const SKETCH_BOX_LEG_COLOR_OPTIONS: readonly [
  SketchBoxLegColorOption,
  SketchBoxLegColorOption,
  SketchBoxLegColorOption,
] = [
  { id: 'black', label: 'שחור' },
  { id: 'nickel', label: 'ניקל' },
  { id: 'gold', label: 'זהב' },
];

export function InteriorSketchBoxControlsSection(props: InteriorSketchBoxControlsSectionProps): ReactElement {
  const { isSketchBoxControlsOpen } = props;
  const isSketchBoxToolActive = props.isSketchToolActive && isSketchBoxTool(props.manualToolRaw);
  const isDividerToolActive = props.isSketchToolActive && props.manualToolRaw === SKETCH_TOOL_BOX_DIVIDER;
  const isDoorToolActive = props.isSketchToolActive && props.manualToolRaw === SKETCH_TOOL_BOX_DOOR;
  const isDoorHingeToolActive =
    props.isSketchToolActive && props.manualToolRaw === SKETCH_TOOL_BOX_DOOR_HINGE;
  const isDoubleDoorToolActive =
    props.isSketchToolActive && props.manualToolRaw === SKETCH_TOOL_BOX_DOUBLE_DOOR;
  const isBaseToolActive =
    props.isSketchToolActive && props.manualToolRaw.startsWith(SKETCH_TOOL_BOX_BASE_PREFIX);
  const isCorniceToolActive =
    props.isSketchToolActive && props.manualToolRaw.startsWith(SKETCH_TOOL_BOX_CORNICE_PREFIX);

  return (
    <div className="wp-field">
      <div className="wp-sketch-box-grid wp-sketch-box-grid--stacked">
        <SketchBoxToolButton
          label="קופסא פתוחה"
          active={isSketchBoxControlsOpen}
          iconClass="fas fa-vector-square"
          onClick={() => {
            toggleSketchBoxControlsPanel(props, isSketchBoxControlsOpen, isSketchBoxToolActive);
          }}
          buttonChildren={
            <>
              הוסף קופסא
              <i
                className={cx(
                  'fas',
                  isSketchBoxControlsOpen ? 'fa-chevron-up' : 'fa-chevron-down',
                  'wp-chevron'
                )}
                aria-hidden="true"
              />
            </>
          }
        />

        <SketchBoxNumericField
          label={'גובה קופסא (ס"מ)'}
          value={props.sketchBoxHeightDraft}
          min={SKETCH_BOX_HEIGHT_MIN_CM}
          max={SKETCH_BOX_HEIGHT_MAX_CM}
          step={5}
          onChange={raw => {
            updateSketchBoxHeightDraft(props, raw);
          }}
          onBlur={() => {
            commitSketchBoxHeightDraft(props);
          }}
        />

        {isSketchBoxControlsOpen && (
          <>
            <SketchBoxNumericField
              label={'רוחב קופסא (ס"מ)'}
              value={props.sketchBoxWidthDraft}
              min={SKETCH_BOX_OPTIONAL_DIM_MIN_CM}
              max={SKETCH_BOX_OPTIONAL_DIM_MAX_CM}
              step={1}
              placeholder="אוטומטי"
              onChange={raw => {
                updateSketchBoxOptionalDimensionDraft(props, 'width', raw);
              }}
              onBlur={() => {
                commitSketchBoxOptionalDimensionDraft(props, 'width');
              }}
            />

            <SketchBoxNumericField
              label={'עומק קופסא (ס"מ)'}
              value={props.sketchBoxDepthDraft}
              min={SKETCH_BOX_OPTIONAL_DIM_MIN_CM}
              max={SKETCH_BOX_OPTIONAL_DIM_MAX_CM}
              step={1}
              placeholder="אוטומטי"
              onChange={raw => {
                updateSketchBoxOptionalDimensionDraft(props, 'depth', raw);
              }}
              onBlur={() => {
                commitSketchBoxOptionalDimensionDraft(props, 'depth');
              }}
            />

            <SketchBoxToolButton
              label="מחיצה לקופסא"
              active={isDividerToolActive}
              iconClass="fas fa-grip-lines-vertical"
              onClick={() => {
                toggleSketchBoxTool(props, 'divider', SKETCH_TOOL_BOX_DIVIDER, isDividerToolActive);
              }}
            />

            <SketchBoxToolButton
              label="דלת לקופסא"
              active={isDoorToolActive}
              iconClass="fas fa-door-closed"
              cellClassName="wp-sketch-box-cell--door"
              onClick={() => {
                toggleSketchBoxTool(props, 'door', SKETCH_TOOL_BOX_DOOR, isDoorToolActive);
              }}
            />

            <SketchBoxToolRow>
              <SketchBoxToolButton
                label="כיוון פתיחת דלת"
                active={isDoorHingeToolActive}
                iconClass="fas fa-redo"
                cellClassName="wp-sketch-box-cell--door-hinge"
                cellStyle={{ flex: '1 1 0' }}
                buttonChildren={<>כיוון פתיחת דלת לקופסא</>}
                onClick={() => {
                  toggleSketchBoxTool(props, 'doorHinge', SKETCH_TOOL_BOX_DOOR_HINGE, isDoorHingeToolActive);
                }}
              />

              <SketchBoxToolButton
                label="2 דלתות לקופסא"
                active={isDoubleDoorToolActive}
                iconClass="fas fa-columns"
                cellClassName="wp-sketch-box-cell--door"
                cellStyle={{ flex: '1 1 0' }}
                onClick={() => {
                  toggleSketchBoxTool(
                    props,
                    'doubleDoor',
                    SKETCH_TOOL_BOX_DOUBLE_DOOR,
                    isDoubleDoorToolActive
                  );
                }}
              />
            </SketchBoxToolRow>

            <SketchBoxToolRow>
              <SketchBoxToolButton
                label="בסיס לקופסא"
                active={isBaseToolActive}
                iconClass="fas fa-shoe-prints"
                cellStyle={{ flex: '1 1 0' }}
                onClick={() => {
                  toggleSketchBoxBasePanel(props, isBaseToolActive);
                }}
              />

              <SketchBoxToolButton
                label="קרניז לקופסא"
                active={isCorniceToolActive}
                iconClass="fas fa-bezier-curve"
                cellStyle={{ flex: '1 1 0' }}
                onClick={() => {
                  toggleSketchBoxCornicePanel(props, isCorniceToolActive);
                }}
              />
            </SketchBoxToolRow>

            <SketchBoxChoicePanel
              title="סוג בסיס לקופסא"
              open={props.sketchBoxBasePanelOpen || isBaseToolActive}
              notice="לחץ על קופסא חופשית כדי להוסיף או לעדכן את הבסיס שלה."
              value={props.sketchBoxBaseType}
              options={SKETCH_BOX_BASE_OPTIONS}
              onSelect={next => {
                selectSketchBoxBaseType(props, next);
              }}
            />

            {props.sketchBoxBaseType === 'legs' && (props.sketchBoxBasePanelOpen || isBaseToolActive) ? (
              <>
                <SketchBoxChoicePanel
                  title="סוג רגליים"
                  open
                  value={props.sketchBoxLegStyle}
                  options={SKETCH_BOX_LEG_STYLE_OPTIONS}
                  onSelect={next => {
                    selectSketchBoxLegStyle(props, next);
                  }}
                />

                <SketchBoxChoicePanel
                  title="צבע רגליים"
                  open
                  value={props.sketchBoxLegColor}
                  options={SKETCH_BOX_LEG_COLOR_OPTIONS}
                  onSelect={next => {
                    selectSketchBoxLegColor(props, next);
                  }}
                />

                <div className="wp-r-leg-size-fields wp-r-sketch-box-leg-size-fields">
                  <SketchBoxNumericField
                    label={'גובה רגליים (ס"מ)'}
                    value={props.sketchBoxLegHeightDraft}
                    min={BASE_LEG_HEIGHT_MIN_CM}
                    max={BASE_LEG_HEIGHT_MAX_CM}
                    step={1}
                    onChange={raw => {
                      updateSketchBoxLegHeightDraft(props, raw);
                    }}
                    onBlur={() => {
                      commitSketchBoxLegHeightDraft(props);
                    }}
                  />

                  <SketchBoxNumericField
                    label={'רוחב רגליים (ס"מ)'}
                    value={props.sketchBoxLegWidthDraft}
                    min={BASE_LEG_WIDTH_MIN_CM}
                    max={BASE_LEG_WIDTH_MAX_CM}
                    step={0.5}
                    onChange={raw => {
                      updateSketchBoxLegWidthDraft(props, raw);
                    }}
                    onBlur={() => {
                      commitSketchBoxLegWidthDraft(props);
                    }}
                  />
                </div>
              </>
            ) : null}

            <SketchBoxChoicePanel
              title="סוג קרניז לקופסא"
              open={props.sketchBoxCornicePanelOpen || isCorniceToolActive}
              notice="לחץ על קופסא חופשית כדי להוסיף קרניז. לחיצה חוזרת על אותו סוג תסיר אותו."
              value={props.sketchBoxCorniceType}
              options={SKETCH_BOX_CORNICE_OPTIONS}
              onSelect={next => {
                selectSketchBoxCorniceType(props, next);
              }}
            />
          </>
        )}
      </div>
    </div>
  );
}
