import type { ReactElement } from 'react';

import { useApp, useMeta, useUiFeedback } from '../hooks.js';
import { TabPanel } from '../components/index.js';

import { TypeSelector } from './structure_tab_controls.js';
import { SavedModelsPanel } from './structure_tab_saved_models_panel.js';
import {
  StructureBodySection,
  StructureChestSection,
  StructureCornerSection,
  StructureDimensionsContent,
  StructureDimensionsSection,
  StructureLibrarySection,
} from './structure_tab_sections.js';
import {
  useStructureTabCornerChestActions,
  useStructureTabHingeActions,
} from './use_structure_tab_actions.js';
import { ProjectPanel } from '../panels/ProjectPanel.js';
import { useStructureTabViewState } from './use_structure_tab_view_state.js';
import { useStructureTabWorkflows } from './use_structure_tab_workflows.js';

export function StructureTabView(props: { active: boolean }): ReactElement {
  return <StructureTabInner active={props.active} />;
}

function StructureTabInner(props: { active: boolean }) {
  const app = useApp();
  const meta = useMeta();
  const fb = useUiFeedback();
  const state = useStructureTabViewState();

  const { enterHingeEditMode, exitHingeEditMode, setHingeDirection } = useStructureTabHingeActions({
    app,
    meta,
    fb,
    hingeModeId: String(state.hingeModeId || 'hinge'),
    hingeMap: state.hingeMap,
    primaryMode: state.primaryMode,
  });

  const workflows = useStructureTabWorkflows({
    app,
    meta,
    fb,
    state,
    setHingeDirection,
  });

  const {
    toggleCornerMode,
    toggleCornerSide,
    commitCornerDoors,
    commitCornerWidth,
    commitCornerHeight,
    commitCornerDepth,
    toggleChestMode,
    toggleChestCommode,
    setChestDrawersCount,
    setChestCommodeMirrorHeight,
    setChestCommodeMirrorWidth,
    setChestCommodeMirrorWidthManual,
  } = useStructureTabCornerChestActions({
    app,
    meta,
    cornerSide: state.cornerSide,
    cornerWidth: state.cornerWidth,
    cornerDoors: state.cornerDoors,
    cornerHeight: state.cornerHeight,
    cornerDepth: state.cornerDepth,
    depth: state.depth,
    doors: state.doors,
    width: state.width,
    height: state.height,
    isManualWidth: state.isManualWidth,
    baseType: state.baseType,
    preChestState: state.preChestState,
    chestCommodeEnabled: state.chestCommodeEnabled,
    chestCommodeMirrorHeightCm: state.chestCommodeMirrorHeightCm,
    chestCommodeMirrorWidthCm: state.chestCommodeMirrorWidthCm,
    chestCommodeMirrorWidthManual: state.chestCommodeMirrorWidthManual,
  });

  const dimensionsSectionVisible = !state.isLibraryMode && !state.isChestMode;
  const dimensionsProps = {
    isSliding: state.isSliding,
    isLibraryMode: state.isLibraryMode,
    libraryUpperDoorsHidden: state.libraryUpperDoorsHidden,
    isManualWidth: state.isManualWidth,
    width: state.width,
    height: state.height,
    depth: state.depth,
    doors: state.doors,
    cellDimsEditActive: state.cellDimsEditActive,
    hasAnyCellDimsOverrides: state.hasAnyCellDimsOverrides,
    defaultCellWidth: state.defaultCellWidth,
    cellDimsWidth: state.cellDimsWidth,
    cellDimsHeight: state.cellDimsHeight,
    cellDimsDepth: state.cellDimsDepth,
    stackSplitEnabled: state.stackSplitEnabled,
    stackSplitDecorativeSeparatorEnabled: state.stackSplitDecorativeSeparatorEnabled,
    stackSplitLowerHeight: state.stackSplitLowerHeight,
    stackSplitLowerDepth: state.stackSplitLowerDepth,
    stackSplitLowerWidth: state.stackSplitLowerWidth,
    stackSplitLowerDoors: state.stackSplitLowerDoors,
    stackSplitLowerDepthManual: state.stackSplitLowerDepthManual,
    stackSplitLowerWidthManual: state.stackSplitLowerWidthManual,
    stackSplitLowerDoorsManual: state.stackSplitLowerDoorsManual,
    onSetRaw: workflows.setRaw,
    onResetAllCellDimsOverrides: workflows.resetAllCellDimsOverrides,
    onEnterCellDimsMode: () => workflows.enterCellDimsMode('react:structure:cellDims:on'),
    onExitCellDimsMode: () => workflows.exitCellDimsMode('react:structure:cellDims:off'),
    onClearCellDimsWidth: workflows.clearCellDimsWidth,
    onClearCellDimsHeight: workflows.clearCellDimsHeight,
    onClearCellDimsDepth: workflows.clearCellDimsDepth,
    onToggleStackSplit: workflows.toggleStackSplit,
    onToggleStackSplitDecorativeSeparator: workflows.toggleStackSplitDecorativeSeparator,
    onToggleLibraryUpperDoors: workflows.toggleLibraryUpperDoors,
    onPickLibraryGlass: workflows.pickLibraryGlass,
    renderStackLinkBadge: workflows.renderStackLinkBadge,
    onResetAutoWidth: workflows.resetAutoWidth,
  };

  const dimensionsContent = <StructureDimensionsContent {...dimensionsProps} />;

  return (
    <TabPanel tabId="structure" active={props.active}>
      <ProjectPanel variant="structure" />

      <div className="control-section wp-r-section-transparent">
        <TypeSelector />
      </div>

      <SavedModelsPanel />

      <StructureDimensionsSection visible={dimensionsSectionVisible} {...dimensionsProps} />

      <StructureBodySection
        baseType={state.baseType}
        baseLegStyle={state.baseLegStyle}
        baseLegColor={state.baseLegColor}
        basePlinthHeightCm={state.basePlinthHeightCm}
        baseLegHeightCm={state.baseLegHeightCm}
        baseLegWidthCm={state.baseLegWidthCm}
        isChestMode={state.isChestMode}
        isSliding={state.isSliding}
        slidingTracksColor={state.slidingTracksColor}
        shouldShowStructureButtons={state.shouldShowStructureButtons}
        patterns={state.patterns}
        structureSelect={state.structureSelect}
        shouldShowSingleDoor={state.shouldShowSingleDoor}
        doors={state.doors}
        singleDoorPosRaw={state.singleDoorPosRaw}
        shouldShowHingeBtn={state.shouldShowHingeBtn}
        hingeDirection={state.hingeDirection}
        hingeEditActive={state.hingeEditActive}
        onSetBaseType={workflows.setBaseType}
        onSetBaseLegStyle={workflows.setBaseLegStyle}
        onSetBaseLegColor={workflows.setBaseLegColor}
        onSetBasePlinthHeightCm={workflows.setBasePlinthHeightCm}
        onSetBaseLegHeightCm={workflows.setBaseLegHeightCm}
        onSetBaseLegWidthCm={workflows.setBaseLegWidthCm}
        onSetSlidingTracksColor={workflows.setSlidingTracksColor}
        onCommitStructural={workflows.commitStructural}
        onSetHingeDirection={value => setHingeDirection(value, 'react:structure:hinge:toggle')}
        onEnterHingeEditMode={() => enterHingeEditMode('react:structure:hinge:edit')}
        onExitHingeEditMode={() => exitHingeEditMode('react:structure:hinge:finish')}
      />

      <StructureCornerSection
        cornerMode={state.cornerMode}
        cornerSide={state.cornerSide}
        cornerDoors={state.cornerDoors}
        cornerWidth={state.cornerWidth}
        cornerHeight={state.cornerHeight}
        cornerDepth={state.cornerDepth}
        onToggleCornerMode={toggleCornerMode}
        onToggleCornerSide={toggleCornerSide}
        onCommitCornerDoors={commitCornerDoors}
        onCommitCornerWidth={commitCornerWidth}
        onCommitCornerHeight={commitCornerHeight}
        onCommitCornerDepth={commitCornerDepth}
      />

      <StructureChestSection
        isChestMode={state.isChestMode}
        chestDrawersCount={state.chestDrawersCount}
        chestCommodeEnabled={state.chestCommodeEnabled}
        chestCommodeMirrorHeightCm={state.chestCommodeMirrorHeightCm}
        chestCommodeMirrorWidthCm={state.chestCommodeMirrorWidthCm}
        chestCommodeMirrorWidthManual={state.chestCommodeMirrorWidthManual}
        width={state.width}
        height={state.height}
        depth={state.depth}
        onToggleChestMode={toggleChestMode}
        onToggleChestCommode={toggleChestCommode}
        onSetRaw={workflows.setRaw}
        onSetChestDrawersCount={setChestDrawersCount}
        onSetChestCommodeMirrorHeight={setChestCommodeMirrorHeight}
        onSetChestCommodeMirrorWidth={setChestCommodeMirrorWidth}
        onSetChestCommodeMirrorWidthManual={setChestCommodeMirrorWidthManual}
      />

      <StructureLibrarySection
        isLibraryMode={state.isLibraryMode}
        isChestMode={state.isChestMode}
        dimensionsContent={dimensionsContent}
        onToggleLibraryMode={workflows.toggleLibraryMode}
      />
    </TabPanel>
  );
}
