import type { ReactElement } from 'react';

import { Button, ToggleRow } from '../components/index.js';
import { DimField } from './structure_tab_controls.js';
import {
  readStructureCornerDimensionBounds,
  readStructureCornerDoorsBounds,
} from './structure_tab_dimension_constraints.js';
import {
  STRUCTURE_CORNER_MODE_TOGGLE_TEST_ID,
  STRUCTURE_CORNER_SECTION_TEST_ID,
  STRUCTURE_CORNER_SIDE_BUTTON_TEST_ID,
  STRUCTURE_CORNER_DIMENSION_FIELDS,
  type StructureCornerDimensionId,
  type StructureCornerSectionProps,
} from './structure_tab_aux_sections_contracts.js';

const CORNER_DIMENSION_COMMITS: Record<
  StructureCornerDimensionId,
  (props: StructureCornerSectionProps) => (value: number) => void
> = {
  cornerWidth: props => props.onCommitCornerWidth,
  cornerHeight: props => props.onCommitCornerHeight,
  cornerDepth: props => props.onCommitCornerDepth,
};

const CORNER_DIMENSION_VALUES: Record<
  StructureCornerDimensionId,
  (props: StructureCornerSectionProps) => number
> = {
  cornerWidth: props => props.cornerWidth,
  cornerHeight: props => props.cornerHeight,
  cornerDepth: props => props.cornerDepth,
};

export function StructureCornerSection(props: StructureCornerSectionProps): ReactElement {
  return (
    <div className="control-section" data-testid={STRUCTURE_CORNER_SECTION_TEST_ID}>
      <div className="wp-field">
        <ToggleRow
          label={'ארון פינתי'}
          checked={props.cornerMode}
          onChange={value => props.onToggleCornerMode(!!value)}
          testId={STRUCTURE_CORNER_MODE_TOGGLE_TEST_ID}
        />

        {props.cornerMode ? (
          <div className="wp-field-sub">
            <div className="wp-r-field">
              <Button
                size="sm"
                variant="light"
                className="wp-r-corner-side-toggle"
                onClick={props.onToggleCornerSide}
                data-testid={STRUCTURE_CORNER_SIDE_BUTTON_TEST_ID}
                data-corner-side={props.cornerSide}
              >
                {props.cornerSide === 'left' ? 'ארון פינה בצד ימין' : 'ארון פינה בצד שמאל'}
              </Button>
            </div>

            <div className="wp-r-dims-grid">
              <div className="wp-r-dims-doors">
                <DimField
                  label={'דלתות פינה'}
                  activeId="cornerDoors"
                  value={props.cornerDoors}
                  onCommit={props.onCommitCornerDoors}
                  step={1}
                  buttonsStep={1}
                  bounds={readStructureCornerDoorsBounds()}
                />
              </div>

              {STRUCTURE_CORNER_DIMENSION_FIELDS.map(field => {
                const value = CORNER_DIMENSION_VALUES[field.activeId](props);
                const onCommit = CORNER_DIMENSION_COMMITS[field.activeId](props);
                return (
                  <div key={field.activeId} className={field.className}>
                    <DimField
                      label={field.label}
                      activeId={field.activeId}
                      value={value}
                      onCommit={onCommit}
                      step={field.step}
                      buttonsStep={field.buttonsStep}
                      bounds={readStructureCornerDimensionBounds(field.activeId, {
                        cornerDoors: props.cornerDoors,
                      })}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
