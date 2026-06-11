import type { ReactElement } from 'react';

import { InlineNotice, ModeToggleButton } from '../components/index.js';
import { DimField } from './structure_tab_controls.js';
import {
  STRUCTURE_STACK_SPLIT_MODE_BUTTON_TEST_ID,
  STRUCTURE_STACK_SPLIT_SECTION_TEST_ID,
  type StructureDimensionsContentProps,
} from './structure_tab_dimensions_section_contracts.js';

export function StructureStackSplitControls(props: {
  isSliding: StructureDimensionsContentProps['isSliding'];
  stackSplitEnabled: StructureDimensionsContentProps['stackSplitEnabled'];
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
  renderStackLinkBadge: StructureDimensionsContentProps['renderStackLinkBadge'];
}): ReactElement | null {
  if (props.isSliding) return null;

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
          <div className="wp-r-cell-dims-row">
            <div className="wp-r-dims-height">
              <DimField
                label={'גובה חלק תחתון (ס"מ)'}
                activeId="stackSplitLowerHeight"
                value={props.stackSplitLowerHeight}
                onCommit={value => props.onSetRaw('stackSplitLowerHeight', value)}
                step={5}
                buttonsStep={5}
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
                inputAddon={props.renderStackLinkBadge('depth', props.stackSplitLowerDepthManual)}
              />
            </div>
          </div>

          <div className="wp-r-cell-dims-row">
            <div className="wp-r-dims-doors">
              <DimField
                label="דלתות חלק תחתון"
                ariaLabel="דלתות חלק תחתון"
                activeId="stackSplitLowerDoors"
                value={props.stackSplitLowerDoors}
                onCommit={value => props.onSetRaw('stackSplitLowerDoors', value)}
                step={1}
                buttonsStep={1}
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
