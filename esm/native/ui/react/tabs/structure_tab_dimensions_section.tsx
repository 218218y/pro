import type { ReactElement } from 'react';

import { StructureCellDimsControls } from './structure_tab_dimensions_section_cell_dims.js';
import type {
  StructureDimensionsContentProps,
  StructureDimensionsSectionProps,
} from './structure_tab_dimensions_section_contracts.js';
import { StructureDimensionsMainFields } from './structure_tab_dimensions_section_main.js';
import { StructureStackSplitControls } from './structure_tab_dimensions_section_stack_split.js';

export function StructureDimensionsContent(props: StructureDimensionsContentProps): ReactElement {
  const cellDimsControls = <StructureCellDimsControls {...props} />;
  const stackSplitControls = <StructureStackSplitControls {...props} />;

  return (
    <>
      <StructureDimensionsMainFields
        doors={props.doors}
        width={props.width}
        height={props.height}
        depth={props.depth}
        isManualWidth={props.isManualWidth}
        isLibraryMode={props.isLibraryMode}
        libraryUpperDoorsRemoved={props.libraryUpperDoorsRemoved}
        onSetRaw={props.onSetRaw}
        onResetAutoWidth={props.onResetAutoWidth}
        onToggleLibraryUpperDoors={props.onToggleLibraryUpperDoors}
      />

      {!props.isSliding ? (
        <>
          <div style={{ marginTop: 10 }}>{props.isLibraryMode ? stackSplitControls : cellDimsControls}</div>
          <div style={{ marginTop: 12 }}>{props.isLibraryMode ? cellDimsControls : stackSplitControls}</div>
        </>
      ) : null}
    </>
  );
}

export function StructureDimensionsSection(props: StructureDimensionsSectionProps): ReactElement | null {
  if (!props.visible) return null;

  return (
    <div className="control-section">
      <span className="section-title">מידות</span>
      <StructureDimensionsContent {...props} />
    </div>
  );
}
