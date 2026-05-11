import type { ReactElement } from 'react';

import { ModeToggleButton } from '../components/index.js';
import {
  CountBtn,
  DEFAULT_SKETCH_EXTERNAL_DRAWER_HEIGHT_CM,
  DEFAULT_SKETCH_INTERNAL_DRAWER_HEIGHT_CM,
  SKETCH_TOOL_EXT_DRAWERS_PREFIX,
  cx,
  isSketchInternalDrawersTool,
} from './interior_tab_helpers.js';
import {
  SketchDrawerHeightField,
  commitSketchDrawerHeightDraft,
  resetSketchDrawerHeightDraft,
  updateSketchDrawerHeightDraft,
  type SketchDrawerHeightDraftController,
} from './interior_tab_sketch_drawer_height_field.js';
import type { InteriorSketchDrawersSectionProps } from './interior_layout_sketch_section_types.js';

export function InteriorSketchDrawersSection(props: InteriorSketchDrawersSectionProps): ReactElement {
  const { isSketchExtDrawersControlsOpen } = props;
  const isSketchExternalDrawersToolActive =
    props.isSketchToolActive && props.manualToolRaw.startsWith(SKETCH_TOOL_EXT_DRAWERS_PREFIX);
  const isSketchInternalDrawersToolActive =
    props.isSketchToolActive && isSketchInternalDrawersTool(props.manualToolRaw);
  const externalHeightController: SketchDrawerHeightDraftController = {
    heightCm: props.sketchExtDrawerHeightCm,
    heightDraft: props.sketchExtDrawerHeightDraft,
    defaultHeightCm: DEFAULT_SKETCH_EXTERNAL_DRAWER_HEIGHT_CM,
    isToolActive: isSketchExternalDrawersToolActive,
    setHeightCm: props.setSketchExtDrawerHeightCm,
    setHeightDraft: props.setSketchExtDrawerHeightDraft,
    onActiveHeightChange: next => {
      props.enterSketchExtDrawersTool(props.sketchExtDrawerCount, next);
    },
  };
  const internalHeightController: SketchDrawerHeightDraftController = {
    heightCm: props.sketchIntDrawerHeightCm,
    heightDraft: props.sketchIntDrawerHeightDraft,
    defaultHeightCm: DEFAULT_SKETCH_INTERNAL_DRAWER_HEIGHT_CM,
    isToolActive: isSketchInternalDrawersToolActive,
    setHeightCm: props.setSketchIntDrawerHeightCm,
    setHeightDraft: props.setSketchIntDrawerHeightDraft,
    onActiveHeightChange: next => {
      props.enterSketchIntDrawersTool(next);
    },
  };

  return (
    <>
      <div className="wp-field">
        <div className="wp-r-label wp-r-label--center">מגירות חיצוניות לפי סקיצה</div>
        <div className="wp-r-type-selector type-selector" style={{ direction: 'rtl' }}>
          <ModeToggleButton
            active={isSketchExternalDrawersToolActive}
            icon={
              <i
                className={isSketchExternalDrawersToolActive ? 'fas fa-check' : 'fas fa-layer-group'}
                aria-hidden="true"
              />
            }
            onClick={() => {
              props.setSketchShelvesOpen(false);
              if (isSketchExternalDrawersToolActive) {
                props.setSketchExtDrawersPanelOpen(false);
                props.exitManual();
                return;
              }
              props.setSketchExtDrawersPanelOpen(true);
              props.enterSketchExtDrawersTool(props.sketchExtDrawerCount, props.sketchExtDrawerHeightCm);
            }}
          >
            הוסף/הסר מגירות חיצוניות
            <i
              className={cx(
                'fas',
                props.sketchExtDrawersPanelOpen ? 'fa-chevron-up' : 'fa-chevron-down',
                'wp-chevron'
              )}
              aria-hidden="true"
            />
          </ModeToggleButton>
        </div>

        <div
          className={cx('wp-row', 'wp-gap-5', isSketchExtDrawersControlsOpen ? '' : 'hidden')}
          style={{ marginTop: 8, marginBottom: 10 }}
        >
          {[1, 2, 3, 4, 5].map(n => (
            <CountBtn
              key={n}
              selected={isSketchExternalDrawersToolActive && props.sketchExtDrawerCount === n}
              onClick={() => {
                props.setSketchExtDrawerCount(n);
                props.setSketchExtDrawersPanelOpen(true);
                props.enterSketchExtDrawersTool(n, props.sketchExtDrawerHeightCm);
              }}
            >
              {n}
            </CountBtn>
          ))}
        </div>
        <div className={cx(isSketchExtDrawersControlsOpen ? '' : 'hidden')}>
          <SketchDrawerHeightField
            label={'גובה מגירה חיצונית (ס"מ)'}
            value={props.sketchExtDrawerHeightDraft}
            onChange={raw => {
              updateSketchDrawerHeightDraft(externalHeightController, raw);
            }}
            onBlur={() => {
              commitSketchDrawerHeightDraft(externalHeightController);
            }}
            onReset={() => {
              resetSketchDrawerHeightDraft(externalHeightController);
            }}
          />
        </div>
      </div>

      <div className="wp-field">
        <div className="wp-r-label wp-r-label--center">מגירות פנימיות לפי סקיצה</div>
        <div className="wp-r-type-selector type-selector" style={{ direction: 'rtl' }}>
          <ModeToggleButton
            active={isSketchInternalDrawersToolActive}
            icon={
              <i
                className={isSketchInternalDrawersToolActive ? 'fas fa-check' : 'fas fa-box-open'}
                aria-hidden="true"
              />
            }
            onClick={() => {
              props.setSketchShelvesOpen(false);
              if (isSketchInternalDrawersToolActive) props.exitManual();
              else props.enterSketchIntDrawersTool(props.sketchIntDrawerHeightCm);
            }}
          >
            הוסף/הסר מגירות פנימיות
          </ModeToggleButton>
        </div>
        <SketchDrawerHeightField
          label={'גובה מגירה פנימית (ס"מ)'}
          value={props.sketchIntDrawerHeightDraft}
          onChange={raw => {
            updateSketchDrawerHeightDraft(internalHeightController, raw);
          }}
          onBlur={() => {
            commitSketchDrawerHeightDraft(internalHeightController);
          }}
          onReset={() => {
            resetSketchDrawerHeightDraft(internalHeightController);
          }}
        />
      </div>

      {props.isSketchToolActive ? (
        <ModeToggleButton
          active={true}
          className="wp-r-editmode-toggle--fullrow"
          icon={<i className="fas fa-times" aria-hidden="true" />}
          onClick={() => {
            props.setSketchShelvesOpen(false);
            props.exitManual();
          }}
        >
          סיים מצב עריכה
        </ModeToggleButton>
      ) : null}
    </>
  );
}
