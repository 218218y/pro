import type { ReactElement, ReactNode } from 'react';

import { InlineNotice, ModeToggleButton } from '../components/index.js';
import { OptionalDimField } from './structure_tab_controls.js';
import {
  DEFAULT_HEIGHT,
  HINGED_DEFAULT_DEPTH,
  HINGED_DEFAULT_PER_DOOR_WIDTH,
} from '../../../services/api.js';
import { readStructureDimensionBounds } from './structure_tab_dimension_constraints.js';
import {
  STRUCTURE_CELL_DIMS_HEX_MODE_BUTTON_TEST_ID,
  STRUCTURE_CELL_DIMS_MODE_BUTTON_TEST_ID,
  STRUCTURE_CELL_DIMS_RESET_DEPTH_BUTTON_TEST_ID,
  STRUCTURE_CELL_DIMS_RESET_HEX_DOOR_WIDTH_BUTTON_TEST_ID,
  STRUCTURE_CELL_DIMS_RESET_HEX_PROTRUSION_BUTTON_TEST_ID,
  STRUCTURE_CELL_DIMS_RESET_HEIGHT_BUTTON_TEST_ID,
  STRUCTURE_CELL_DIMS_RESET_BUTTON_TEST_ID,
  STRUCTURE_CELL_DIMS_RESET_WIDTH_BUTTON_TEST_ID,
  STRUCTURE_CELL_DIMS_SECTION_TEST_ID,
  type StructureDimensionsContentProps,
} from './structure_tab_dimensions_section_contracts.js';
import {
  HEX_CELL_DEFAULT_PROTRUSION_CM,
  resolveDefaultHexDoorWidthCm,
} from '../../../features/hex_cell/index.js';

const STRUCTURE_CELL_DIMS_PLACEHOLDER_TEXT = '';
const STRUCTURE_CELL_DIMS_DEFAULT_WIDTH_STEP_BASE = HINGED_DEFAULT_PER_DOOR_WIDTH * 2;

function CellDimResetButton(props: {
  title: string;
  disabled: boolean;
  onClick: () => void;
  testId: string;
}): ReactElement {
  return (
    <button
      type="button"
      className="btn btn-light btn-inline wp-r-groove-reset-btn wp-r-cell-dims-reset-dim-btn wp-r-styled-tooltip hint-bottom"
      disabled={props.disabled}
      data-tooltip={props.title}
      aria-label={props.title}
      onClick={props.onClick}
      data-testid={props.testId}
    >
      <i className="fas fa-undo-alt" aria-hidden="true" />
    </button>
  );
}

export type StructureCellDimsControlsTestIds = {
  section: string;
  modeButton: string;
  hexModeButton: string;
  resetAllButton: string;
  resetWidthButton: string;
  resetHeightButton: string;
  resetDepthButton: string;
  resetHexProtrusionButton: string;
  resetHexDoorWidthButton: string;
};

export type StructureCellDimsControlsLabels = Partial<{
  widthField: string;
  heightField: string;
  depthField: string;
  resetWidthTitle: string;
  resetHeightTitle: string;
  resetDepthTitle: string;
  hexModeButton: ReactNode;
  hexProtrusionField: string;
  hexDoorWidthField: string;
  resetHexProtrusionTitle: string;
  resetHexDoorWidthTitle: string;
}>;

export type StructureCellDimsControlsProps = {
  isSliding: StructureDimensionsContentProps['isSliding'];
  cellDimsEditActive: StructureDimensionsContentProps['cellDimsEditActive'];
  cellDimsPanelOpen: StructureDimensionsContentProps['cellDimsPanelOpen'];
  cellDimsHexPanelOpen: StructureDimensionsContentProps['cellDimsHexPanelOpen'];
  hasAnyCellDimsOverrides: StructureDimensionsContentProps['hasAnyCellDimsOverrides'];
  defaultCellWidth: StructureDimensionsContentProps['defaultCellWidth'];
  width: StructureDimensionsContentProps['width'];
  cellDimsWidth: StructureDimensionsContentProps['cellDimsWidth'];
  cellDimsHeight: StructureDimensionsContentProps['cellDimsHeight'];
  cellDimsDepth: StructureDimensionsContentProps['cellDimsDepth'];
  cellDimsHexMode: StructureDimensionsContentProps['cellDimsHexMode'];
  cellDimsHexProtrusion: StructureDimensionsContentProps['cellDimsHexProtrusion'];
  cellDimsHexDoorWidth: StructureDimensionsContentProps['cellDimsHexDoorWidth'];
  height: StructureDimensionsContentProps['height'];
  depth: StructureDimensionsContentProps['depth'];
  onSetRaw: StructureDimensionsContentProps['onSetRaw'];
  onResetAllCellDimsOverrides: StructureDimensionsContentProps['onResetAllCellDimsOverrides'];
  onEnterCellDimsMode: StructureDimensionsContentProps['onEnterCellDimsMode'];
  onExitCellDimsMode: StructureDimensionsContentProps['onExitCellDimsMode'];
  onEnterHexCellDimsMode: StructureDimensionsContentProps['onEnterHexCellDimsMode'];
  onExitHexCellDimsMode: StructureDimensionsContentProps['onExitHexCellDimsMode'];
  onClearCellDimsWidth: StructureDimensionsContentProps['onClearCellDimsWidth'];
  onClearCellDimsHeight: StructureDimensionsContentProps['onClearCellDimsHeight'];
  onClearCellDimsDepth: StructureDimensionsContentProps['onClearCellDimsDepth'];
  onClearCellDimsHexProtrusion: StructureDimensionsContentProps['onClearCellDimsHexProtrusion'];
  onClearCellDimsHexDoorWidth: StructureDimensionsContentProps['onClearCellDimsHexDoorWidth'];
  modeLabel?: ReactNode;
  resetAllLabel?: ReactNode;
  resetAllTooltip?: string;
  notice?: ReactNode;
  testIds?: Partial<StructureCellDimsControlsTestIds>;
  labels?: StructureCellDimsControlsLabels;
  hideForSliding?: boolean;
};

const DEFAULT_STRUCTURE_CELL_DIMS_TEST_IDS: StructureCellDimsControlsTestIds = {
  section: STRUCTURE_CELL_DIMS_SECTION_TEST_ID,
  modeButton: STRUCTURE_CELL_DIMS_MODE_BUTTON_TEST_ID,
  hexModeButton: STRUCTURE_CELL_DIMS_HEX_MODE_BUTTON_TEST_ID,
  resetAllButton: STRUCTURE_CELL_DIMS_RESET_BUTTON_TEST_ID,
  resetWidthButton: STRUCTURE_CELL_DIMS_RESET_WIDTH_BUTTON_TEST_ID,
  resetHeightButton: STRUCTURE_CELL_DIMS_RESET_HEIGHT_BUTTON_TEST_ID,
  resetDepthButton: STRUCTURE_CELL_DIMS_RESET_DEPTH_BUTTON_TEST_ID,
  resetHexProtrusionButton: STRUCTURE_CELL_DIMS_RESET_HEX_PROTRUSION_BUTTON_TEST_ID,
  resetHexDoorWidthButton: STRUCTURE_CELL_DIMS_RESET_HEX_DOOR_WIDTH_BUTTON_TEST_ID,
};

export function StructureCellDimsControls(props: StructureCellDimsControlsProps): ReactElement | null {
  if (props.isSliding && props.hideForSliding !== false) return null;

  const labels = props.labels || {};
  const defaultHexDoorWidth = resolveDefaultHexDoorWidthCm(props.defaultCellWidth);
  const testIds = { ...DEFAULT_STRUCTURE_CELL_DIMS_TEST_IDS, ...(props.testIds || {}) };
  const cellDimsPanelOpen = props.cellDimsPanelOpen || props.cellDimsEditActive;
  const hexCellPanelOpen = props.cellDimsHexPanelOpen || props.cellDimsHexMode;

  const ensureCellDimsEditMode = () => {
    if (!props.cellDimsEditActive || props.cellDimsHexMode) props.onEnterCellDimsMode();
  };
  const ensureHexCellDimsEditMode = () => {
    if (!props.cellDimsEditActive || !props.cellDimsHexMode) props.onEnterHexCellDimsMode();
  };
  const commitCellDim = (key: 'cellDimsWidth' | 'cellDimsHeight' | 'cellDimsDepth', value: number) => {
    ensureCellDimsEditMode();
    props.onSetRaw(key, value);
  };
  const clearCellDim = (clear: () => void) => {
    ensureCellDimsEditMode();
    clear();
  };
  const commitHexCellDim = (key: 'cellDimsHexProtrusion' | 'cellDimsHexDoorWidth', value: number) => {
    ensureHexCellDimsEditMode();
    props.onSetRaw(key, value);
  };
  const clearHexCellDim = (clear: () => void) => {
    ensureHexCellDimsEditMode();
    clear();
  };

  return (
    <div className="wp-field" data-testid={testIds.section}>
      <ModeToggleButton
        active={cellDimsPanelOpen}
        onClick={() => {
          if (cellDimsPanelOpen) props.onExitCellDimsMode();
          else props.onEnterCellDimsMode();
        }}
        className="wp-r-mode-btn"
        iconPosition="end"
        icon={
          <i
            className={cellDimsPanelOpen ? 'fas fa-chevron-up wp-chevron' : 'fas fa-chevron-down wp-chevron'}
            aria-hidden="true"
          />
        }
        aria-expanded={cellDimsPanelOpen}
        data-testid={testIds.modeButton}
      >
        {props.modeLabel || 'מידות מיוחדות לפי תא'}
      </ModeToggleButton>

      {cellDimsPanelOpen ? (
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
              className="wp-r-link-btn wp-r-styled-tooltip hint-bottom"
              disabled={!props.hasAnyCellDimsOverrides}
              onClick={props.onResetAllCellDimsOverrides}
              data-testid={testIds.resetAllButton}
              data-tooltip={props.resetAllTooltip || 'ביטול כל המידות המיוחדות וחזרה למידות הכלליות'}
            >
              {props.resetAllLabel || 'חזרה למידות שוות לכל התאים'}
            </button>
          </div>
          <div className="wp-r-cell-dims-row">
            <div className="wp-r-dims-width">
              <OptionalDimField
                label={labels.widthField || 'רוחב תא (ס"מ)'}
                activeId="cellDimsWidth"
                value={props.cellDimsWidth}
                placeholder={STRUCTURE_CELL_DIMS_DEFAULT_WIDTH_STEP_BASE}
                placeholderText={STRUCTURE_CELL_DIMS_PLACEHOLDER_TEXT}
                onCommit={value => {
                  if (value == null) {
                    clearCellDim(props.onClearCellDimsWidth);
                    return;
                  }
                  commitCellDim('cellDimsWidth', value);
                }}
                inputAddon={
                  <CellDimResetButton
                    title={labels.resetWidthTitle || 'איפוס רוחב התא'}
                    disabled={props.cellDimsWidth === ''}
                    onClick={() => clearCellDim(props.onClearCellDimsWidth)}
                    testId={testIds.resetWidthButton}
                  />
                }
                step={5}
                buttonsStep={5}
                bounds={readStructureDimensionBounds({ key: 'cellDimsWidth' })}
              />
            </div>
            <div className="wp-r-dims-height">
              <OptionalDimField
                label={labels.heightField || 'גובה תא (ס"מ)'}
                activeId="cellDimsHeight"
                value={props.cellDimsHeight}
                placeholder={DEFAULT_HEIGHT}
                placeholderText={STRUCTURE_CELL_DIMS_PLACEHOLDER_TEXT}
                onCommit={value => {
                  if (value == null) {
                    clearCellDim(props.onClearCellDimsHeight);
                    return;
                  }
                  commitCellDim('cellDimsHeight', value);
                }}
                inputAddon={
                  <CellDimResetButton
                    title={labels.resetHeightTitle || 'איפוס גובה התא'}
                    disabled={props.cellDimsHeight === ''}
                    onClick={() => clearCellDim(props.onClearCellDimsHeight)}
                    testId={testIds.resetHeightButton}
                  />
                }
                step={5}
                buttonsStep={5}
                bounds={readStructureDimensionBounds({ key: 'cellDimsHeight' })}
              />
            </div>
            <div className="wp-r-dims-depth">
              <OptionalDimField
                label={labels.depthField || 'עומק תא (ס"מ)'}
                activeId="cellDimsDepth"
                value={props.cellDimsDepth}
                placeholder={HINGED_DEFAULT_DEPTH}
                placeholderText={STRUCTURE_CELL_DIMS_PLACEHOLDER_TEXT}
                onCommit={value => {
                  if (value == null) {
                    clearCellDim(props.onClearCellDimsDepth);
                    return;
                  }
                  commitCellDim('cellDimsDepth', value);
                }}
                inputAddon={
                  <CellDimResetButton
                    title={labels.resetDepthTitle || 'איפוס עומק התא'}
                    disabled={props.cellDimsDepth === ''}
                    onClick={() => clearCellDim(props.onClearCellDimsDepth)}
                    testId={testIds.resetDepthButton}
                  />
                }
                step={5}
                buttonsStep={5}
                bounds={readStructureDimensionBounds({ key: 'cellDimsDepth' })}
              />
            </div>
          </div>

          <div className="wp-r-cell-dims-hex-toolbar">
            <ModeToggleButton
              active={hexCellPanelOpen}
              onClick={() => {
                if (hexCellPanelOpen) props.onExitHexCellDimsMode();
                else props.onEnterHexCellDimsMode();
              }}
              className="wp-r-mode-btn wp-r-hex-cell-mode-btn"
              iconPosition="end"
              icon={
                <i
                  className={
                    hexCellPanelOpen ? 'fas fa-chevron-up wp-chevron' : 'fas fa-chevron-down wp-chevron'
                  }
                  aria-hidden="true"
                />
              }
              aria-expanded={hexCellPanelOpen}
              data-testid={testIds.hexModeButton}
            >
              {labels.hexModeButton || 'תא משושה'}
            </ModeToggleButton>
          </div>

          {hexCellPanelOpen ? (
            <div className="wp-r-cell-dims-row wp-r-cell-dims-hex-row">
              <div className="wp-r-dims-depth">
                <OptionalDimField
                  label={labels.hexProtrusionField || 'בליטה ישרה תא משושה '}
                  activeId="cellDimsHexProtrusion"
                  value={props.cellDimsHexProtrusion}
                  placeholder={HEX_CELL_DEFAULT_PROTRUSION_CM}
                  placeholderText={STRUCTURE_CELL_DIMS_PLACEHOLDER_TEXT}
                  onCommit={value => {
                    if (value == null) {
                      clearHexCellDim(props.onClearCellDimsHexProtrusion);
                      return;
                    }
                    commitHexCellDim('cellDimsHexProtrusion', value);
                  }}
                  inputAddon={
                    <CellDimResetButton
                      title={labels.resetHexProtrusionTitle || 'איפוס בליטה ישרה'}
                      disabled={props.cellDimsHexProtrusion === ''}
                      onClick={() => clearHexCellDim(props.onClearCellDimsHexProtrusion)}
                      testId={testIds.resetHexProtrusionButton}
                    />
                  }
                  step={1}
                  buttonsStep={1}
                  bounds={readStructureDimensionBounds({ key: 'cellDimsHexProtrusion' })}
                />
              </div>
              <div className="wp-r-dims-width">
                <OptionalDimField
                  label={labels.hexDoorWidthField || 'רוחב דלת תא משושה '}
                  activeId="cellDimsHexDoorWidth"
                  value={props.cellDimsHexDoorWidth}
                  placeholder={defaultHexDoorWidth}
                  placeholderText={STRUCTURE_CELL_DIMS_PLACEHOLDER_TEXT}
                  onCommit={value => {
                    if (value == null) {
                      clearHexCellDim(props.onClearCellDimsHexDoorWidth);
                      return;
                    }
                    commitHexCellDim('cellDimsHexDoorWidth', value);
                  }}
                  inputAddon={
                    <CellDimResetButton
                      title={labels.resetHexDoorWidthTitle || 'איפוס רוחב דלת'}
                      disabled={props.cellDimsHexDoorWidth === ''}
                      onClick={() => clearHexCellDim(props.onClearCellDimsHexDoorWidth)}
                      testId={testIds.resetHexDoorWidthButton}
                    />
                  }
                  step={5}
                  buttonsStep={5}
                  bounds={readStructureDimensionBounds({ key: 'cellDimsHexDoorWidth' })}
                />
              </div>
            </div>
          ) : null}

          <InlineNotice>
            {props.notice ||
              'הקלד מידות ואז לחץ על תא בארון או על קופסא חופשית כדי להחיל. כפתור תא משושה מפעיל בחירת תא או קופסא לצורה משושה. שדה ריק = לא נוגעים במימד הזה.'}
          </InlineNotice>
        </div>
      ) : null}
    </div>
  );
}
