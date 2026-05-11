import type { ReactElement } from 'react';

import type { InteriorTabViewProps } from './interior_tab_helpers.js';
import { useApp } from '../hooks.js';
import { TabPanel } from '../components/index.js';
import {
  InteriorDividerSection,
  InteriorExternalDrawersSection,
  InteriorHandlesSection,
  InteriorInternalDrawersSection,
  InteriorLayoutSection,
} from './interior_tab_sections.js';
import { useInteriorTabViewState } from './use_interior_tab_view_state.js';
import { useInteriorTabWorkflows } from './use_interior_tab_workflows.js';

export function InteriorTabView(props: InteriorTabViewProps): ReactElement {
  return <InteriorTabInner active={props.active} />;
}

function InteriorTabInner(props: { active: boolean }) {
  const app = useApp();
  const state = useInteriorTabViewState(app);
  const workflows = useInteriorTabWorkflows(app, state);

  return (
    <TabPanel tabId="interior" active={props.active}>
      <div className="wp-react-inner">
        <div className="control-section">
          <span className="section-title">סידור פנימי ומגירות</span>

          <InteriorLayoutSection
            layoutActive={state.layoutActive}
            isLayoutMode={state.isLayoutMode}
            isManualLayoutMode={state.isManualLayoutMode}
            isBraceShelvesMode={state.isBraceShelvesMode}
            isSketchToolActive={state.isSketchToolActive}
            layoutType={state.layoutType}
            manualTool={state.manualTool}
            manualToolRaw={state.manualToolRaw}
            manualUiTool={state.manualUiTool}
            activeManualToolForUi={state.activeManualToolForUi}
            currentGridDivisions={state.currentGridDivisions}
            gridShelfVariant={state.gridShelfVariant}
            showManualRow={state.showManualRow}
            showGridControls={state.showGridControls}
            sketchShelvesOpen={state.sketchShelvesOpen}
            sketchRowOpen={state.sketchRowOpen}
            sketchBoxHeightCm={state.sketchBoxHeightCm}
            sketchBoxHeightDraft={state.sketchBoxHeightDraft}
            sketchBoxWidthCm={state.sketchBoxWidthCm}
            sketchBoxWidthDraft={state.sketchBoxWidthDraft}
            sketchBoxDepthCm={state.sketchBoxDepthCm}
            sketchBoxDepthDraft={state.sketchBoxDepthDraft}
            sketchStorageHeightCm={state.sketchStorageHeightCm}
            sketchStorageHeightDraft={state.sketchStorageHeightDraft}
            sketchBoxPanelOpen={state.sketchBoxPanelOpen}
            sketchBoxCornicePanelOpen={state.sketchBoxCornicePanelOpen}
            sketchBoxCorniceType={state.sketchBoxCorniceType}
            sketchBoxBasePanelOpen={state.sketchBoxBasePanelOpen}
            sketchBoxBaseType={state.sketchBoxBaseType}
            sketchBoxLegStyle={state.sketchBoxLegStyle}
            sketchBoxLegColor={state.sketchBoxLegColor}
            sketchBoxLegHeightCm={state.sketchBoxLegHeightCm}
            sketchBoxLegHeightDraft={state.sketchBoxLegHeightDraft}
            sketchBoxLegWidthCm={state.sketchBoxLegWidthCm}
            sketchBoxLegWidthDraft={state.sketchBoxLegWidthDraft}
            sketchExtDrawersPanelOpen={state.sketchExtDrawersPanelOpen}
            sketchExtDrawerCount={state.sketchExtDrawerCount}
            sketchExtDrawerHeightCm={state.sketchExtDrawerHeightCm}
            sketchExtDrawerHeightDraft={state.sketchExtDrawerHeightDraft}
            sketchIntDrawerHeightCm={state.sketchIntDrawerHeightCm}
            sketchIntDrawerHeightDraft={state.sketchIntDrawerHeightDraft}
            sketchShelfDepthByVariant={state.sketchShelfDepthByVariant}
            sketchShelfDepthDraftByVariant={state.sketchShelfDepthDraftByVariant}
            isDoorTrimMode={state.isDoorTrimMode}
            doorTrimPanelOpen={state.doorTrimPanelOpen}
            doorTrimColor={state.doorTrimColor}
            doorTrimHorizontalSpan={state.doorTrimHorizontalSpan}
            doorTrimHorizontalCustomCm={state.doorTrimHorizontalCustomCm}
            doorTrimHorizontalCustomDraft={state.doorTrimHorizontalCustomDraft}
            doorTrimHorizontalCrossCm={state.doorTrimHorizontalCrossCm}
            doorTrimHorizontalCrossDraft={state.doorTrimHorizontalCrossDraft}
            doorTrimVerticalSpan={state.doorTrimVerticalSpan}
            doorTrimVerticalCustomCm={state.doorTrimVerticalCustomCm}
            doorTrimVerticalCustomDraft={state.doorTrimVerticalCustomDraft}
            doorTrimVerticalCrossCm={state.doorTrimVerticalCrossCm}
            doorTrimVerticalCrossDraft={state.doorTrimVerticalCrossDraft}
            layoutTypes={state.layoutTypes}
            manualTools={state.manualTools}
            gridDivs={state.gridDivs}
            setManualRowOpen={state.setManualRowOpen}
            setManualUiTool={state.setManualUiTool}
            setSketchShelvesOpen={state.setSketchShelvesOpen}
            setSketchRowOpen={state.setSketchRowOpen}
            setSketchBoxHeightCm={state.setSketchBoxHeightCm}
            setSketchBoxHeightDraft={state.setSketchBoxHeightDraft}
            setSketchBoxWidthCm={state.setSketchBoxWidthCm}
            setSketchBoxWidthDraft={state.setSketchBoxWidthDraft}
            setSketchBoxDepthCm={state.setSketchBoxDepthCm}
            setSketchBoxDepthDraft={state.setSketchBoxDepthDraft}
            setSketchStorageHeightCm={state.setSketchStorageHeightCm}
            setSketchStorageHeightDraft={state.setSketchStorageHeightDraft}
            setSketchBoxPanelOpen={state.setSketchBoxPanelOpen}
            setSketchBoxCornicePanelOpen={state.setSketchBoxCornicePanelOpen}
            setSketchBoxCorniceType={state.setSketchBoxCorniceType}
            setSketchBoxBasePanelOpen={state.setSketchBoxBasePanelOpen}
            setSketchBoxBaseType={state.setSketchBoxBaseType}
            setSketchBoxLegWidthCm={state.setSketchBoxLegWidthCm}
            setSketchBoxLegWidthDraft={state.setSketchBoxLegWidthDraft}
            setSketchBoxLegStyle={state.setSketchBoxLegStyle}
            setSketchBoxLegColor={state.setSketchBoxLegColor}
            setSketchBoxLegHeightCm={state.setSketchBoxLegHeightCm}
            setSketchBoxLegHeightDraft={state.setSketchBoxLegHeightDraft}
            setSketchExtDrawersPanelOpen={state.setSketchExtDrawersPanelOpen}
            setSketchExtDrawerCount={state.setSketchExtDrawerCount}
            setSketchExtDrawerHeightCm={state.setSketchExtDrawerHeightCm}
            setSketchExtDrawerHeightDraft={state.setSketchExtDrawerHeightDraft}
            setSketchIntDrawerHeightCm={state.setSketchIntDrawerHeightCm}
            setSketchIntDrawerHeightDraft={state.setSketchIntDrawerHeightDraft}
            setSketchShelfDepthByVariant={state.setSketchShelfDepthByVariant}
            setSketchShelfDepthDraftByVariant={state.setSketchShelfDepthDraftByVariant}
            setDoorTrimPanelOpen={state.setDoorTrimPanelOpen}
            setDoorTrimColor={workflows.setDoorTrimColorAndMaybeRefresh}
            setDoorTrimHorizontalSpan={state.setDoorTrimHorizontalSpan}
            setDoorTrimHorizontalCustomCm={state.setDoorTrimHorizontalCustomCm}
            setDoorTrimHorizontalCustomDraft={state.setDoorTrimHorizontalCustomDraft}
            setDoorTrimHorizontalCrossCm={state.setDoorTrimHorizontalCrossCm}
            setDoorTrimHorizontalCrossDraft={state.setDoorTrimHorizontalCrossDraft}
            setDoorTrimVerticalSpan={state.setDoorTrimVerticalSpan}
            setDoorTrimVerticalCustomCm={state.setDoorTrimVerticalCustomCm}
            setDoorTrimVerticalCustomDraft={state.setDoorTrimVerticalCustomDraft}
            setDoorTrimVerticalCrossCm={state.setDoorTrimVerticalCrossCm}
            setDoorTrimVerticalCrossDraft={state.setDoorTrimVerticalCrossDraft}
            enterLayout={workflows.enterLayout}
            exitLayoutOrManual={workflows.exitLayoutOrManual}
            enterManual={workflows.enterManual}
            exitManual={workflows.exitManual}
            setGridDivisions={workflows.setGridDivisions}
            setGridShelfVariant={workflows.setGridShelfVariant}
            activateManualToolId={workflows.activateManualToolId}
            activateDoorTrimMode={workflows.activateDoorTrimMode}
            enterSketchShelfTool={workflows.enterSketchShelfTool}
            enterSketchBoxTool={workflows.enterSketchBoxTool}
            enterSketchBoxCorniceTool={workflows.enterSketchBoxCorniceTool}
            enterSketchBoxBaseTool={workflows.enterSketchBoxBaseTool}
            enterSketchExtDrawersTool={workflows.enterSketchExtDrawersTool}
            enterSketchIntDrawersTool={workflows.enterSketchIntDrawersTool}
          />

          <InteriorExternalDrawersSection
            wardrobeType={state.wardrobeType}
            isExtDrawerMode={state.isExtDrawerMode}
            extDrawerType={state.extDrawerType}
            extDrawerCount={state.extDrawerCount}
            extCounts={state.extCounts}
            enterExtDrawer={workflows.enterExtDrawer}
            exitExtDrawer={workflows.exitExtDrawer}
            sketchControls={{
              isSketchToolActive: state.isSketchToolActive,
              manualToolRaw: state.manualToolRaw,
              sketchExtDrawersPanelOpen: state.sketchExtDrawersPanelOpen,
              sketchExtDrawerCount: state.sketchExtDrawerCount,
              sketchExtDrawerHeightCm: state.sketchExtDrawerHeightCm,
              sketchExtDrawerHeightDraft: state.sketchExtDrawerHeightDraft,
              setSketchShelvesOpen: state.setSketchShelvesOpen,
              setSketchRowOpen: state.setSketchRowOpen,
              setSketchExtDrawersPanelOpen: state.setSketchExtDrawersPanelOpen,
              setSketchExtDrawerCount: state.setSketchExtDrawerCount,
              setSketchExtDrawerHeightCm: state.setSketchExtDrawerHeightCm,
              setSketchExtDrawerHeightDraft: state.setSketchExtDrawerHeightDraft,
              enterSketchExtDrawersTool: workflows.enterSketchExtDrawersTool,
              exitManual: workflows.exitManual,
            }}
          />

          <InteriorInternalDrawersSection
            internalDrawersEnabled={state.internalDrawersEnabled}
            isIntDrawerMode={state.isIntDrawerMode}
            setInternalDrawersEnabled={workflows.setInternalDrawersEnabled}
            toggleIntDrawerMode={workflows.toggleIntDrawerMode}
            sketchControls={{
              isSketchToolActive: state.isSketchToolActive,
              manualToolRaw: state.manualToolRaw,
              sketchIntDrawerHeightCm: state.sketchIntDrawerHeightCm,
              sketchIntDrawerHeightDraft: state.sketchIntDrawerHeightDraft,
              setSketchShelvesOpen: state.setSketchShelvesOpen,
              setSketchRowOpen: state.setSketchRowOpen,
              setSketchIntDrawerHeightCm: state.setSketchIntDrawerHeightCm,
              setSketchIntDrawerHeightDraft: state.setSketchIntDrawerHeightDraft,
              enterSketchIntDrawersTool: workflows.enterSketchIntDrawersTool,
              exitManual: workflows.exitManual,
            }}
          />

          <InteriorDividerSection
            isDividerMode={state.isDividerMode}
            toggleDividerMode={workflows.toggleDividerMode}
          />
        </div>

        <InteriorHandlesSection
          handleControlEnabled={state.handleControlEnabled}
          isHandleMode={state.isHandleMode}
          isManualHandlePositionMode={state.isManualHandlePositionMode}
          globalHandleType={state.globalHandleType}
          handleToolType={state.handleToolType}
          globalHandleColor={state.globalHandleColor}
          handleToolColor={state.handleToolColor}
          globalEdgeHandleVariant={state.globalEdgeHandleVariant}
          handleToolEdgeVariant={state.handleToolEdgeVariant}
          handleTypes={state.handleTypes}
          setGlobalHandle={workflows.setGlobalHandle}
          setGlobalHandleColor={workflows.setGlobalHandleColor}
          setGlobalEdgeHandleVariant={workflows.setGlobalEdgeHandleVariant}
          setHandleControlEnabled={workflows.setHandleControlEnabled}
          toggleHandleMode={workflows.toggleHandleMode}
          setHandleModeColor={workflows.setHandleModeColor}
          setHandleModeEdgeVariant={workflows.setHandleModeEdgeVariant}
          enterManualHandlePositionMode={workflows.enterManualHandlePositionMode}
        />
      </div>
    </TabPanel>
  );
}
