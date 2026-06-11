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
import { createInteriorLayoutSectionProps } from './interior_layout_section_props.js';
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

          {!state.isChestMode ? (
            <>
              <InteriorLayoutSection {...createInteriorLayoutSectionProps(state, workflows)} />

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
            </>
          ) : null}

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
