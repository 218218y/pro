import type { ReactElement } from 'react';

import { InlineNotice, ModeToggleButton } from '../components/index.js';
import { DimField } from './structure_tab_controls.js';
import { readStructureDimensionBounds } from './structure_tab_dimension_constraints.js';
import {
  STRUCTURE_LIBRARY_UPPER_DOORS_BUTTON_TEST_ID,
  type StructureDimensionsContentProps,
} from './structure_tab_dimensions_section_contracts.js';

export function StructureDimensionsMainFields(props: {
  isSliding: StructureDimensionsContentProps['isSliding'];
  doors: StructureDimensionsContentProps['doors'];
  width: StructureDimensionsContentProps['width'];
  height: StructureDimensionsContentProps['height'];
  depth: StructureDimensionsContentProps['depth'];
  isManualWidth: StructureDimensionsContentProps['isManualWidth'];
  isLibraryMode: StructureDimensionsContentProps['isLibraryMode'];
  libraryUpperDoorsHidden: StructureDimensionsContentProps['libraryUpperDoorsHidden'];
  onSetRaw: StructureDimensionsContentProps['onSetRaw'];
  onResetAutoWidth: StructureDimensionsContentProps['onResetAutoWidth'];
  onToggleLibraryUpperDoors: StructureDimensionsContentProps['onToggleLibraryUpperDoors'];
}): ReactElement {
  return (
    <>
      <div className="wp-r-dims-grid">
        <div className="wp-r-dims-doors">
          <DimField
            label="דלתות"
            activeId="doors"
            value={props.doors}
            onCommit={value => props.onSetRaw('doors', value)}
            step={1}
            buttonsStep={1}
            bounds={readStructureDimensionBounds({
              key: 'doors',
              wardrobeType: props.isSliding ? 'sliding' : 'hinged',
            })}
          />
        </div>

        <div className="wp-r-dims-width">
          <DimField
            label={'רוחב (ס"מ)'}
            activeId="width"
            value={props.width}
            onCommit={value => props.onSetRaw('width', value)}
            step={5}
            buttonsStep={5}
            bounds={readStructureDimensionBounds({
              key: 'width',
              wardrobeType: props.isSliding ? 'sliding' : 'hinged',
              doors: props.doors,
            })}
          />

          {props.isManualWidth ? (
            <button type="button" onClick={props.onResetAutoWidth} className="wp-r-link-btn">
              חזרה לרוחב אוטומטי
            </button>
          ) : null}
        </div>

        <div className="wp-r-dims-height">
          <DimField
            label={'גובה (ס"מ)'}
            activeId="height"
            value={props.height}
            onCommit={value => props.onSetRaw('height', value)}
            step={5}
            buttonsStep={5}
            bounds={readStructureDimensionBounds({ key: 'height' })}
          />
        </div>

        <div className="wp-r-dims-depth">
          <DimField
            label={'עומק (ס"מ)'}
            activeId="depth"
            value={props.depth}
            onCommit={value => props.onSetRaw('depth', value)}
            step={5}
            buttonsStep={5}
            bounds={readStructureDimensionBounds({ key: 'depth' })}
          />
        </div>
      </div>

      {props.isLibraryMode ? (
        <div style={{ marginTop: 10 }}>
          <ModeToggleButton
            active={props.libraryUpperDoorsHidden}
            onClick={props.onToggleLibraryUpperDoors}
            className="wp-r-mode-btn"
            data-testid={STRUCTURE_LIBRARY_UPPER_DOORS_BUTTON_TEST_ID}
          >
            {props.libraryUpperDoorsHidden ? 'החזר דלתות עליונות' : 'הסר דלתות עליונות'}
          </ModeToggleButton>
        </div>
      ) : null}

      <InlineNotice>טיפ: שינוי "דלתות" יעדכן גם רוחב אוטומטית (אלא אם הפעלת רוחב ידני).</InlineNotice>
    </>
  );
}
