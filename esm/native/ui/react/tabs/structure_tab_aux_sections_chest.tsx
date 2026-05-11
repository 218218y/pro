import type { ReactElement } from 'react';

import { ModeToggleButton, ToggleRow } from '../components/index.js';
import { DimField } from './structure_tab_controls.js';
import {
  readStructureChestCommodeMirrorBounds,
  readStructureChestDrawersBounds,
  readStructureDimensionBounds,
} from './structure_tab_dimension_constraints.js';
import {
  STRUCTURE_CHEST_COMMODE_BUTTON_TEST_ID,
  STRUCTURE_CHEST_COMMODE_WIDTH_MODE_BUTTON_TEST_ID,
  STRUCTURE_CHEST_MODE_TOGGLE_TEST_ID,
  STRUCTURE_CHEST_SECTION_TEST_ID,
  STRUCTURE_CHEST_DIMENSION_FIELDS,
  type StructureChestSectionProps,
} from './structure_tab_aux_sections_contracts.js';

function StructureChestDimsGrid(props: StructureChestSectionProps): ReactElement {
  return (
    <div className="wp-r-dims-grid wp-r-dims-grid--chest">
      <div className="wp-r-dims-drawers">
        <DimField
          label={'מספר מגירות'}
          activeId="chestDrawersCount"
          value={props.chestDrawersCount}
          onCommit={props.onSetChestDrawersCount}
          step={1}
          buttonsStep={1}
          bounds={readStructureChestDrawersBounds()}
        />
      </div>

      {STRUCTURE_CHEST_DIMENSION_FIELDS.map(field => {
        const value =
          field.activeId === 'height' ? props.height : field.activeId === 'width' ? props.width : props.depth;
        return (
          <div key={field.activeId} className={field.className}>
            <DimField
              label={field.label}
              activeId={field.activeId}
              value={value}
              onCommit={nextValue =>
                props.onSetRaw(field.activeId as 'height' | 'width' | 'depth', nextValue)
              }
              step={field.step}
              buttonsStep={field.buttonsStep}
              bounds={readStructureDimensionBounds({
                key: field.activeId as 'height' | 'width' | 'depth',
                isChestMode: true,
              })}
            />
          </div>
        );
      })}
    </div>
  );
}

function StructureChestCommodeWidthModeButton(props: StructureChestSectionProps): ReactElement {
  const isManual = !!props.chestCommodeMirrorWidthManual;
  const isAuto = !isManual;
  return (
    <button
      type="button"
      className={
        isAuto
          ? 'wp-r-mini-link-toggle wp-r-mini-link-toggle--auto'
          : 'wp-r-mini-link-toggle wp-r-mini-link-toggle--manual'
      }
      aria-pressed={isManual}
      title={isAuto ? 'אוטומטי: רוחב המראה מסונכרן לרוחב השידה' : 'ידני: רוחב מראה נפרד'}
      tabIndex={-1}
      onClick={() => props.onSetChestCommodeMirrorWidthManual(!isManual)}
      data-testid={STRUCTURE_CHEST_COMMODE_WIDTH_MODE_BUTTON_TEST_ID}
    >
      <i className={isAuto ? 'fas fa-link' : 'fas fa-unlink'} aria-hidden="true" />
      <span>{isAuto ? 'אוטומטי' : 'ידני'}</span>
    </button>
  );
}

function StructureChestCommodeControls(props: StructureChestSectionProps): ReactElement {
  return (
    <div className="wp-r-chest-commode-block">
      <ModeToggleButton
        active={props.chestCommodeEnabled}
        className="wp-r-editmode-toggle--fullrow wp-r-chest-commode-toggle"
        icon={
          <i
            className={props.chestCommodeEnabled ? 'fas fa-check' : 'fas fa-border-all'}
            aria-hidden="true"
          />
        }
        onClick={() => props.onToggleChestCommode(!props.chestCommodeEnabled)}
        data-testid={STRUCTURE_CHEST_COMMODE_BUTTON_TEST_ID}
      >
        קומודה
      </ModeToggleButton>

      {props.chestCommodeEnabled ? (
        <div className="wp-r-dims-grid wp-r-dims-grid--commode">
          <div className="wp-r-commode-mirror-height">
            <DimField
              label={'גובה מראה (ס״מ)'}
              activeId="chestCommodeMirrorHeightCm"
              value={props.chestCommodeMirrorHeightCm}
              onCommit={props.onSetChestCommodeMirrorHeight}
              step={5}
              buttonsStep={5}
              bounds={readStructureChestCommodeMirrorBounds('height')}
            />
          </div>
          <div className="wp-r-commode-mirror-width">
            <DimField
              label={'רוחב מראה (ס״מ)'}
              activeId="chestCommodeMirrorWidthCm"
              value={props.chestCommodeMirrorWidthCm}
              onCommit={props.onSetChestCommodeMirrorWidth}
              step={5}
              buttonsStep={5}
              bounds={readStructureChestCommodeMirrorBounds('width')}
              inputAddon={<StructureChestCommodeWidthModeButton {...props} />}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function StructureChestSection(props: StructureChestSectionProps): ReactElement {
  return (
    <div className="control-section" data-testid={STRUCTURE_CHEST_SECTION_TEST_ID}>
      <div className="wp-field">
        <ToggleRow
          label={'מצב שידה'}
          checked={props.isChestMode}
          onChange={value => props.onToggleChestMode(!!value)}
          testId={STRUCTURE_CHEST_MODE_TOGGLE_TEST_ID}
        />

        {props.isChestMode ? (
          <div className="wp-field-sub" style={{ marginTop: 12 }}>
            <StructureChestDimsGrid {...props} />
            <StructureChestCommodeControls {...props} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
