import type { ReactElement } from 'react';

import type { StructureBodySectionProps } from './structure_tab_body_section_contracts.js';
import { StructureBodyBaseControls } from './structure_tab_body_section_base.js';
import { StructureBodyStructureControls } from './structure_tab_body_section_structure.js';
import { StructureBodySingleDoorControls } from './structure_tab_body_section_single_door.js';
import { StructureBodyHingeControls } from './structure_tab_body_section_hinge.js';

export function StructureBodySection(props: StructureBodySectionProps): ReactElement {
  return (
    <div className="control-section">
      <span className="section-title">מבנה</span>

      <StructureBodyBaseControls
        baseType={props.baseType}
        baseLegStyle={props.baseLegStyle}
        baseLegColor={props.baseLegColor}
        basePlinthHeightCm={props.basePlinthHeightCm}
        baseLegHeightCm={props.baseLegHeightCm}
        baseLegWidthCm={props.baseLegWidthCm}
        isChestMode={props.isChestMode}
        isSliding={props.isSliding}
        slidingTracksColor={props.slidingTracksColor}
        onSetBaseType={props.onSetBaseType}
        onSetBaseLegStyle={props.onSetBaseLegStyle}
        onSetBaseLegColor={props.onSetBaseLegColor}
        onSetBasePlinthHeightCm={props.onSetBasePlinthHeightCm}
        onSetBaseLegHeightCm={props.onSetBaseLegHeightCm}
        onSetBaseLegWidthCm={props.onSetBaseLegWidthCm}
        onSetSlidingTracksColor={props.onSetSlidingTracksColor}
      />

      <StructureBodyStructureControls
        isSliding={props.isSliding}
        shouldShowStructureButtons={props.shouldShowStructureButtons}
        patterns={props.patterns}
        structureSelect={props.structureSelect}
        onCommitStructural={props.onCommitStructural}
      />

      <StructureBodySingleDoorControls
        shouldShowSingleDoor={props.shouldShowSingleDoor}
        doors={props.doors}
        singleDoorPosRaw={props.singleDoorPosRaw}
        onCommitStructural={props.onCommitStructural}
      />

      <StructureBodyHingeControls
        shouldShowHingeBtn={props.shouldShowHingeBtn}
        hingeDirection={props.hingeDirection}
        hingeEditActive={props.hingeEditActive}
        onSetHingeDirection={props.onSetHingeDirection}
        onEnterHingeEditMode={props.onEnterHingeEditMode}
        onExitHingeEditMode={props.onExitHingeEditMode}
      />
    </div>
  );
}
