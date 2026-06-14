import { useCallback, type ReactElement } from 'react';

import { cx, type InteriorTabViewProps } from './interior_tab_helpers.js';
import { useApp, useMeta, useStoreSelectorShallow, useUiFeedback } from '../hooks.js';
import { TabPanel } from '../components/index.js';
import { OptionButton } from '../components/OptionButton.js';
import { selectWardrobeType } from '../selectors/config_selectors.js';
import { readUiRawIntFromSnapshot } from '../selectors/ui_raw_selectors.js';
import { runPerfAction } from '../../../services/api.js';
import { InteriorLayoutSketchToolsPanel } from './interior_layout_sketch_controls.js';
import { StructureCellDimsControls } from './structure_tab_dimensions_section_cell_dims.js';
import { useStructureCellDimsControlsProps } from './use_structure_cell_dims_controls_props.js';
import { useStructureTabViewState } from './use_structure_tab_view_state.js';
import { createInteriorLayoutSectionProps } from './interior_layout_section_props.js';
import { isSketchNoMainWardrobeActive, toggleSketchNoMainWardrobe } from './sketch_tab_no_main_toggle.js';
import { useInteriorTabViewState } from './use_interior_tab_view_state.js';
import { useInteriorTabWorkflows } from './use_interior_tab_workflows.js';

const SKETCH_BOX_CELL_DIMS_TEST_IDS = {
  section: 'sketch-box-cell-dims-section',
  modeButton: 'sketch-box-cell-dims-mode-button',
  hexModeButton: 'sketch-box-cell-dims-hex-mode-button',
  resetAllButton: 'sketch-box-cell-dims-reset-button',
  resetWidthButton: 'sketch-box-cell-dims-reset-width-button',
  resetHeightButton: 'sketch-box-cell-dims-reset-height-button',
  resetDepthButton: 'sketch-box-cell-dims-reset-depth-button',
  resetHexProtrusionButton: 'sketch-box-cell-dims-reset-hex-protrusion-button',
  resetHexDoorWidthButton: 'sketch-box-cell-dims-reset-hex-door-width-button',
} as const;

export function SketchTabView(props: InteriorTabViewProps): ReactElement {
  return <SketchTabInner active={props.active} />;
}

function SketchTabInner(props: { active: boolean }): ReactElement {
  const app = useApp();
  const meta = useMeta();
  const feedback = useUiFeedback();
  const state = useInteriorTabViewState(app);
  const workflows = useInteriorTabWorkflows(app, state);
  const structureState = useStructureTabViewState();
  const sketchBoxCellDimsProps = useStructureCellDimsControlsProps({
    state: structureState,
    sourcePrefix: 'react:sketch:boxCellDims',
    editModeMessage: 'מצב עריכה: הקלד מידות ואז לחץ על קופסא חופשית כדי להחיל',
    hexModeMessage: 'מצב עריכה: לחץ על קופסא חופשית כדי להגדיר צורה משושה',
  });
  const noMainState = useStoreSelectorShallow(rootState => {
    const wardrobeType = selectWardrobeType(rootState.config);
    const doors = readUiRawIntFromSnapshot(rootState.ui, 'doors', 4);
    return {
      wardrobeType,
      active: isSketchNoMainWardrobeActive({ ui: rootState.ui, wardrobeType }),
      doors,
    };
  });
  const sketchCardActive = state.isDoorTrimMode || (!state.isChestMode && state.isSketchToolActive);

  const handleNoMainToggle = useCallback(() => {
    runPerfAction(
      app,
      'sketch.noMainWardrobe.toggle',
      () => {
        const result = toggleSketchNoMainWardrobe({ app, meta });
        feedback.toast(
          result.active ? 'הארון הראשי בוטל. אפשר לבנות סקיצה חופשית.' : 'הארון הראשי חזר למצב הקודם.',
          'success'
        );
        return result;
      },
      { detail: { nextActive: !noMainState.active, doors: noMainState.doors } }
    );
  }, [app, feedback, meta, noMainState.active, noMainState.doors]);

  return (
    <TabPanel tabId="sketch" active={props.active}>
      <div className="wp-react-inner">
        <div className="control-section">
          <span className="section-title">סקיצה</span>
          <div className="wp-sketch-no-main-row">
            <OptionButton
              selected={noMainState.active}
              density="compact"
              layout="iconRow"
              className="wp-sketch-no-main-toggle"
              testId="sketch-no-main-wardrobe-toggle-button"
              title={
                noMainState.active
                  ? 'החזר את הארון הראשי למה שהיה לפני הביטול'
                  : 'הסתר את הארון הראשי ובנה סקיצה חופשית מ־0'
              }
              preventDefault
              stopPropagation
              onClick={handleNoMainToggle}
            >
              <i className={`fas ${noMainState.active ? 'fa-undo' : 'fa-ban'}`} aria-hidden="true" />
              <strong>{noMainState.active ? 'החזרת ארון ראשי' : 'ביטול ארון ראשי'}</strong>
            </OptionButton>
          </div>
          <div className={cx('wp-tool-card', 'wp-tool-card--layout', sketchCardActive && 'is-active')}>
            <div className="wp-header-row wp-mb-10">
              <div>
                <strong>כלי חלוקה לפי סקיצה</strong>
              </div>
            </div>
            <div className="wp-sketch-row">
              <InteriorLayoutSketchToolsPanel {...createInteriorLayoutSectionProps(state, workflows)} />
            </div>
          </div>
        </div>

        <div className="control-section wp-sketch-box-cell-dims-section">
          <span className="section-title">מידות מיוחדות לקופסא</span>
          <StructureCellDimsControls
            {...sketchBoxCellDimsProps}
            hideForSliding={false}
            modeLabel="שינוי מידות מיוחדות לקופסא"
            resetAllLabel="חזרה למידות רגילות לקופסאות"
            resetAllTooltip="ביטול כל המידות המיוחדות שהוחלו על תאים וקופסאות חופשיות"
            notice="הקלד מידות ואז לחץ על קופסא חופשית כדי להחיל. שדה ריק = לא נוגעים במימד הזה. כפתור צורה משושה מפעיל בחירת קופסא לצורה משושה."
            testIds={SKETCH_BOX_CELL_DIMS_TEST_IDS}
            labels={{
              widthField: 'רוחב קופסא/(ס"מ)',
              heightField: 'גובה קופסא/(ס"מ)',
              depthField: 'עומק קופסא/(ס"מ)',
              resetWidthTitle: 'איפוס רוחב הקופסא',
              resetHeightTitle: 'איפוס גובה הקופסא',
              resetDepthTitle: 'איפוס המידה',
              hexModeButton: 'צורה משושה',
              hexProtrusionField: 'בליטה ישרה משושה',
              hexDoorWidthField: 'רוחב דלת משושה',
              resetHexProtrusionTitle: 'איפוס בליטה ישרה',
              resetHexDoorWidthTitle: 'איפוס רוחב דלת',
            }}
          />
        </div>
      </div>
    </TabPanel>
  );
}
