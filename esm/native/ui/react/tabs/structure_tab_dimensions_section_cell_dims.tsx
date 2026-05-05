import type { ReactElement } from 'react';

import { InlineNotice, ModeToggleButton } from '../components/index.js';
import { OptionalDimField } from './structure_tab_controls.js';
import { readStructureDimensionBounds } from './structure_tab_dimension_constraints.js';
import {
  STRUCTURE_CELL_DIMS_MODE_BUTTON_TEST_ID,
  STRUCTURE_CELL_DIMS_RESET_BUTTON_TEST_ID,
  STRUCTURE_CELL_DIMS_SECTION_TEST_ID,
  type StructureDimensionsContentProps,
} from './structure_tab_dimensions_section_contracts.js';

export function StructureCellDimsControls(props: {
  isSliding: StructureDimensionsContentProps['isSliding'];
  cellDimsEditActive: StructureDimensionsContentProps['cellDimsEditActive'];
  hasAnyCellDimsOverrides: StructureDimensionsContentProps['hasAnyCellDimsOverrides'];
  defaultCellWidth: StructureDimensionsContentProps['defaultCellWidth'];
  width: StructureDimensionsContentProps['width'];
  cellDimsWidth: StructureDimensionsContentProps['cellDimsWidth'];
  cellDimsHeight: StructureDimensionsContentProps['cellDimsHeight'];
  cellDimsDepth: StructureDimensionsContentProps['cellDimsDepth'];
  height: StructureDimensionsContentProps['height'];
  depth: StructureDimensionsContentProps['depth'];
  onSetRaw: StructureDimensionsContentProps['onSetRaw'];
  onResetAllCellDimsOverrides: StructureDimensionsContentProps['onResetAllCellDimsOverrides'];
  onEnterCellDimsMode: StructureDimensionsContentProps['onEnterCellDimsMode'];
  onExitCellDimsMode: StructureDimensionsContentProps['onExitCellDimsMode'];
  onClearCellDimsWidth: StructureDimensionsContentProps['onClearCellDimsWidth'];
  onClearCellDimsHeight: StructureDimensionsContentProps['onClearCellDimsHeight'];
  onClearCellDimsDepth: StructureDimensionsContentProps['onClearCellDimsDepth'];
}): ReactElement | null {
  if (props.isSliding) return null;

  return (
    <div className="wp-field" data-testid={STRUCTURE_CELL_DIMS_SECTION_TEST_ID}>
      <ModeToggleButton
        active={props.cellDimsEditActive}
        onClick={() => {
          if (props.cellDimsEditActive) props.onExitCellDimsMode();
          else props.onEnterCellDimsMode();
        }}
        className="wp-r-mode-btn"
        data-testid={STRUCTURE_CELL_DIMS_MODE_BUTTON_TEST_ID}
      >
        מידות מיוחדות לפי תא
      </ModeToggleButton>

      {props.cellDimsEditActive ? (
        <div style={{ marginTop: 10 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-start',
              gap: 8,
              marginBottom: 10,
              flexWrap: 'wrap',
            }}
          >
            <button
              type="button"
              className="wp-r-link-btn"
              disabled={!props.hasAnyCellDimsOverrides}
              onClick={props.onResetAllCellDimsOverrides}
              data-testid={STRUCTURE_CELL_DIMS_RESET_BUTTON_TEST_ID}
              title="ביטול כל המידות המיוחדות וחזרה למידות הכלליות"
            >
              חזרה למידות שוות לכל התאים
            </button>
          </div>
          <div className="wp-r-cell-dims-row">
            <div className="wp-r-dims-width">
              <OptionalDimField
                label={'רוחב תא (ס"מ)'}
                activeId="cellDimsWidth"
                value={props.cellDimsWidth}
                placeholder={props.defaultCellWidth}
                onCommit={value => {
                  if (value == null) {
                    props.onClearCellDimsWidth();
                    return;
                  }
                  props.onSetRaw('cellDimsWidth', value);
                }}
                step={5}
                buttonsStep={5}
                bounds={readStructureDimensionBounds({ key: 'cellDimsWidth' })}
              />
            </div>
            <div className="wp-r-dims-height">
              <OptionalDimField
                label={'גובה תא (ס"מ)'}
                activeId="cellDimsHeight"
                value={props.cellDimsHeight}
                placeholder={props.height}
                onCommit={value => {
                  if (value == null) {
                    props.onClearCellDimsHeight();
                    return;
                  }
                  props.onSetRaw('cellDimsHeight', value);
                }}
                step={5}
                buttonsStep={5}
                bounds={readStructureDimensionBounds({ key: 'cellDimsHeight' })}
              />
            </div>
            <div className="wp-r-dims-depth">
              <OptionalDimField
                label={'עומק תא (ס"מ)'}
                activeId="cellDimsDepth"
                value={props.cellDimsDepth}
                placeholder={props.depth}
                onCommit={value => {
                  if (value == null) {
                    props.onClearCellDimsDepth();
                    return;
                  }
                  props.onSetRaw('cellDimsDepth', value);
                }}
                step={5}
                buttonsStep={5}
                bounds={readStructureDimensionBounds({ key: 'cellDimsDepth' })}
              />
            </div>
          </div>

          <InlineNotice>
            הקלד מידות ואז לחץ על תא בארון כדי להחיל. שדה ריק = לא נוגעים במימד הזה. שאר התאים לא ישתנו.
          </InlineNotice>
        </div>
      ) : null}
    </div>
  );
}
