import type { ReactElement } from 'react';

import { InlineNotice, ModeToggleButton } from '../components/index.js';
import { DimField } from './structure_tab_controls.js';
import { readStructureDimensionBounds } from './structure_tab_dimension_constraints.js';
import {
  STRUCTURE_STACK_SPLIT_DECORATIVE_SEPARATOR_BUTTON_TEST_ID,
  STRUCTURE_STACK_SPLIT_MODE_BUTTON_TEST_ID,
  STRUCTURE_STACK_SPLIT_SECTION_TEST_ID,
  type StructureDimensionsContentProps,
} from './structure_tab_dimensions_section_contracts.js';
import {
  DEFAULT_STACK_SPLIT_DECORATIVE_SEPARATOR_FRONT_OVERHANG_CM,
  DEFAULT_STACK_SPLIT_DECORATIVE_SEPARATOR_SIDE_OVERHANG_CM,
  PLATFORM_OVERHANG_MAX_CM,
  PLATFORM_OVERHANG_MIN_CM,
} from '../../../features/platform_overhang_support.js';

function StackSplitSeparatorOverhangField(props: {
  label: string;
  value: number;
  defaultValue: number;
  onChange: (value: number) => void;
  resetTitle: string;
}): ReactElement {
  return (
    <div className="wp-field wp-r-leg-size-field wp-r-platform-overhang-field">
      <div className="wp-field-label">{props.label}</div>
      <div className="wp-r-sketch-drawer-height-row wp-r-platform-overhang-row">
        <button
          type="button"
          className="btn btn-light btn-inline wp-r-groove-reset-btn wp-r-platform-overhang-reset-btn"
          title={props.resetTitle}
          aria-label={props.resetTitle}
          onClick={() => props.onChange(props.defaultValue)}
        >
          <i className="fas fa-undo-alt" aria-hidden="true" />
        </button>
        <input
          type="number"
          className="wp-r-input"
          min={PLATFORM_OVERHANG_MIN_CM}
          max={PLATFORM_OVERHANG_MAX_CM}
          step={0.5}
          value={props.value}
          onFocus={(event: import('react').FocusEvent<HTMLInputElement>) => {
            event.target.select();
          }}
          onChange={(event: import('react').ChangeEvent<HTMLInputElement>) => {
            const next = Number(event.target.value);
            if (Number.isFinite(next)) props.onChange(next);
          }}
        />
      </div>
    </div>
  );
}

export function StructureStackSplitControls(props: {
  isSliding: StructureDimensionsContentProps['isSliding'];
  stackSplitEnabled: StructureDimensionsContentProps['stackSplitEnabled'];
  stackSplitDecorativeSeparatorEnabled: StructureDimensionsContentProps['stackSplitDecorativeSeparatorEnabled'];
  stackSplitDecorativeSeparatorSideOverhangCm: StructureDimensionsContentProps['stackSplitDecorativeSeparatorSideOverhangCm'];
  stackSplitDecorativeSeparatorFrontOverhangCm: StructureDimensionsContentProps['stackSplitDecorativeSeparatorFrontOverhangCm'];
  stackSplitLowerHeight: StructureDimensionsContentProps['stackSplitLowerHeight'];
  stackSplitLowerDepth: StructureDimensionsContentProps['stackSplitLowerDepth'];
  stackSplitLowerWidth: StructureDimensionsContentProps['stackSplitLowerWidth'];
  stackSplitLowerDoors: StructureDimensionsContentProps['stackSplitLowerDoors'];
  stackSplitLowerDepthManual: StructureDimensionsContentProps['stackSplitLowerDepthManual'];
  stackSplitLowerWidthManual: StructureDimensionsContentProps['stackSplitLowerWidthManual'];
  stackSplitLowerDoorsManual: StructureDimensionsContentProps['stackSplitLowerDoorsManual'];
  height: StructureDimensionsContentProps['height'];
  onSetRaw: StructureDimensionsContentProps['onSetRaw'];
  onToggleStackSplit: StructureDimensionsContentProps['onToggleStackSplit'];
  onToggleStackSplitDecorativeSeparator: StructureDimensionsContentProps['onToggleStackSplitDecorativeSeparator'];
  onSetStackSplitDecorativeSeparatorSideOverhangCm: StructureDimensionsContentProps['onSetStackSplitDecorativeSeparatorSideOverhangCm'];
  onSetStackSplitDecorativeSeparatorFrontOverhangCm: StructureDimensionsContentProps['onSetStackSplitDecorativeSeparatorFrontOverhangCm'];
  renderStackLinkBadge: StructureDimensionsContentProps['renderStackLinkBadge'];
}): ReactElement | null {
  return (
    <div className="wp-field" data-testid={STRUCTURE_STACK_SPLIT_SECTION_TEST_ID}>
      <ModeToggleButton
        active={props.stackSplitEnabled}
        onClick={props.onToggleStackSplit}
        className="wp-r-mode-btn"
        data-testid={STRUCTURE_STACK_SPLIT_MODE_BUTTON_TEST_ID}
      >
        חלוקת ארון לחלק עליון וחלק תחתון
      </ModeToggleButton>

      {props.stackSplitEnabled ? (
        <div style={{ marginTop: 10 }}>
          <ModeToggleButton
            active={props.stackSplitDecorativeSeparatorEnabled}
            onClick={props.onToggleStackSplitDecorativeSeparator}
            className="wp-r-mode-btn"
            data-testid={STRUCTURE_STACK_SPLIT_DECORATIVE_SEPARATOR_BUTTON_TEST_ID}
          >
            הפרדה מעוצבת בין ארון עליון לארון תחתון
          </ModeToggleButton>

          {props.stackSplitDecorativeSeparatorEnabled ? (
            <div className="wp-r-leg-size-fields wp-r-platform-overhang-fields" style={{ marginTop: 10 }}>
              <StackSplitSeparatorOverhangField
                label="בליטה מהצדדים (ס״מ)"
                value={props.stackSplitDecorativeSeparatorSideOverhangCm}
                defaultValue={DEFAULT_STACK_SPLIT_DECORATIVE_SEPARATOR_SIDE_OVERHANG_CM}
                resetTitle="איפוס בליטת הפרדה מהצדדים לברירת מחדל"
                onChange={props.onSetStackSplitDecorativeSeparatorSideOverhangCm}
              />
              <StackSplitSeparatorOverhangField
                label="בליטה מהחזית (ס״מ)"
                value={props.stackSplitDecorativeSeparatorFrontOverhangCm}
                defaultValue={DEFAULT_STACK_SPLIT_DECORATIVE_SEPARATOR_FRONT_OVERHANG_CM}
                resetTitle="איפוס בליטת הפרדה מהחזית לברירת מחדל"
                onChange={props.onSetStackSplitDecorativeSeparatorFrontOverhangCm}
              />
            </div>
          ) : null}

          <div className="wp-r-cell-dims-row wp-r-stack-split-dims-row" style={{ marginTop: 10 }}>
            <div className="wp-r-dims-height">
              <DimField
                label={'גובה חלק תחתון (ס"מ)'}
                activeId="stackSplitLowerHeight"
                value={props.stackSplitLowerHeight}
                onCommit={value => props.onSetRaw('stackSplitLowerHeight', value)}
                step={5}
                buttonsStep={5}
                bounds={readStructureDimensionBounds({
                  key: 'stackSplitLowerHeight',
                  height: props.height,
                })}
                reserveInputAddon={true}
              />
            </div>
            <div className="wp-r-dims-depth">
              <DimField
                label={'עומק חלק תחתון (ס"מ)'}
                ariaLabel={'עומק חלק תחתון (ס"מ)'}
                activeId="stackSplitLowerDepth"
                value={props.stackSplitLowerDepth}
                onCommit={value => props.onSetRaw('stackSplitLowerDepth', value)}
                step={5}
                buttonsStep={5}
                bounds={readStructureDimensionBounds({ key: 'stackSplitLowerDepth' })}
                inputAddon={props.renderStackLinkBadge('depth', props.stackSplitLowerDepthManual)}
              />
            </div>
          </div>

          <div className="wp-r-cell-dims-row wp-r-stack-split-dims-row">
            <div className="wp-r-dims-doors">
              <DimField
                label="דלתות חלק תחתון"
                ariaLabel="דלתות חלק תחתון"
                activeId="stackSplitLowerDoors"
                value={props.stackSplitLowerDoors}
                onCommit={value => props.onSetRaw('stackSplitLowerDoors', value)}
                step={1}
                buttonsStep={1}
                bounds={readStructureDimensionBounds({ key: 'stackSplitLowerDoors' })}
                inputAddon={props.renderStackLinkBadge('doors', props.stackSplitLowerDoorsManual)}
              />
            </div>
            <div className="wp-r-dims-width">
              <DimField
                label={'רוחב חלק תחתון (ס"מ)'}
                ariaLabel={'רוחב חלק תחתון (ס"מ)'}
                activeId="stackSplitLowerWidth"
                value={props.stackSplitLowerWidth}
                onCommit={value => props.onSetRaw('stackSplitLowerWidth', value)}
                step={5}
                buttonsStep={5}
                bounds={readStructureDimensionBounds({ key: 'stackSplitLowerWidth' })}
                inputAddon={props.renderStackLinkBadge('width', props.stackSplitLowerWidthManual)}
              />
            </div>
          </div>

          {props.height - props.stackSplitLowerHeight < 45 ? (
            <InlineNotice>המינימום האפשרי לחלק העליון הוא 40 ס"מ.</InlineNotice>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
