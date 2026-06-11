import type { ReactElement } from 'react';

import { StructureCellDimsControls } from './structure_tab_dimensions_section_cell_dims.js';
import type {
  StructureDimensionsContentProps,
  StructureDimensionsSectionProps,
} from './structure_tab_dimensions_section_contracts.js';
import { StructureDimensionsMainFields } from './structure_tab_dimensions_section_main.js';
import { StructureStackSplitControls } from './structure_tab_dimensions_section_stack_split.js';

export function StructureDimensionsContent(props: StructureDimensionsContentProps): ReactElement {
  const noMainWardrobeActive = !props.isSliding && Number(props.doors) === 0;
  const mainFields = (
    <StructureDimensionsMainFields
      isSliding={props.isSliding}
      doors={props.doors}
      width={props.width}
      height={props.height}
      depth={props.depth}
      isManualWidth={props.isManualWidth}
      isLibraryMode={props.isLibraryMode}
      libraryUpperDoorsHidden={props.libraryUpperDoorsHidden}
      onSetRaw={props.onSetRaw}
      onResetAutoWidth={props.onResetAutoWidth}
      onToggleLibraryUpperDoors={props.onToggleLibraryUpperDoors}
      onPickLibraryGlass={props.onPickLibraryGlass}
      noMainWardrobeActive={noMainWardrobeActive}
      onRestoreMainWardrobe={props.onRestoreMainWardrobe}
    />
  );

  const cellDimsControls = <StructureCellDimsControls {...props} />;

  if (noMainWardrobeActive) {
    return <>{mainFields}</>;
  }

  const stackSplitControls = <StructureStackSplitControls {...props} />;

  return (
    <>
      {mainFields}

      {props.isSliding ? (
        <div style={{ marginTop: 10 }}>{stackSplitControls}</div>
      ) : (
        <>
          <div style={{ marginTop: 10 }}>{props.isLibraryMode ? stackSplitControls : cellDimsControls}</div>
          <div style={{ marginTop: 12 }}>{props.isLibraryMode ? cellDimsControls : stackSplitControls}</div>
        </>
      )}
    </>
  );
}

export function StructureDimensionsSection(props: StructureDimensionsSectionProps): ReactElement | null {
  if (!props.visible) return null;

  if (props.noMainWardrobeActive) {
    return (
      <div className="control-section wp-r-no-main-restore-section">
        <StructureDimensionsContent {...props} />
      </div>
    );
  }

  return (
    <div className="control-section">
      <span className="section-title">מידות</span>
      <StructureDimensionsContent {...props} />
    </div>
  );
}
