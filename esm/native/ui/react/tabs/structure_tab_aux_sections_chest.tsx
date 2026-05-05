import type { ReactElement } from 'react';

import { ToggleRow } from '../components/index.js';
import { DimField } from './structure_tab_controls.js';
import {
  readStructureChestDrawersBounds,
  readStructureDimensionBounds,
} from './structure_tab_dimension_constraints.js';
import {
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
          </div>
        ) : null}
      </div>
    </div>
  );
}
