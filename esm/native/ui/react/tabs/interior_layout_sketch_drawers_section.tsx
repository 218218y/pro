import type { ReactElement } from 'react';

import { ModeToggleButton } from '../components/index.js';
import {
  CountBtn,
  DEFAULT_SKETCH_EXTERNAL_DRAWER_HEIGHT_CM,
  DEFAULT_SKETCH_SHOE_DRAWER_HEIGHT_CM,
  DEFAULT_SKETCH_INTERNAL_DRAWER_HEIGHT_CM,
  OptionBtn,
  SKETCH_TOOL_EXT_DRAWERS_PREFIX,
  cx,
  isSketchInternalDrawersTool,
  parseSketchExternalDrawersType,
  type ExtDrawerType,
} from './interior_tab_helpers.js';
import {
  SketchDrawerHeightField,
  commitSketchDrawerHeightDraft,
  resetSketchDrawerHeightDraft,
  updateSketchDrawerHeightDraft,
  type SketchDrawerHeightDraftController,
} from './interior_tab_sketch_drawer_height_field.js';
import type { InteriorSketchDrawersSectionProps } from './interior_layout_sketch_section_types.js';
import { INTERIOR_EXT_COUNTS } from './interior_tab_local_state_shared.js';

export function InteriorSketchDrawersSection(props: InteriorSketchDrawersSectionProps): ReactElement {
  const { isSketchExtDrawersControlsOpen } = props;
  const isSketchExternalDrawersToolActive =
    props.isSketchToolActive && props.manualToolRaw.startsWith(SKETCH_TOOL_EXT_DRAWERS_PREFIX);
  const parsedSketchExternalDrawerType = isSketchExternalDrawersToolActive
    ? parseSketchExternalDrawersType(props.manualToolRaw)
    : null;
  const sketchExternalDrawerType: ExtDrawerType = parsedSketchExternalDrawerType || props.sketchExtDrawerType;
  const isSketchInternalDrawersToolActive =
    props.isSketchToolActive && isSketchInternalDrawersTool(props.manualToolRaw);
  const externalHeightController: SketchDrawerHeightDraftController = {
    heightCm: props.sketchExtDrawerHeightCm,
    heightDraft: props.sketchExtDrawerHeightDraft,
    defaultHeightCm:
      sketchExternalDrawerType === 'shoe'
        ? DEFAULT_SKETCH_SHOE_DRAWER_HEIGHT_CM
        : DEFAULT_SKETCH_EXTERNAL_DRAWER_HEIGHT_CM,
    isToolActive: isSketchExternalDrawersToolActive,
    setHeightCm: props.setSketchExtDrawerHeightCm,
    setHeightDraft: props.setSketchExtDrawerHeightDraft,
    onActiveHeightChange: next => {
      props.enterSketchExtDrawersTool(props.sketchExtDrawerCount, next, sketchExternalDrawerType);
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
  const canShowExternalDrawers = props.wardrobeType !== 'sliding';

  const selectSketchExternalDrawerType = (nextType: ExtDrawerType): void => {
    const typeChanged = sketchExternalDrawerType !== nextType;
    const nextHeightCm = typeChanged
      ? nextType === 'shoe'
        ? DEFAULT_SKETCH_SHOE_DRAWER_HEIGHT_CM
        : DEFAULT_SKETCH_EXTERNAL_DRAWER_HEIGHT_CM
      : props.sketchExtDrawerHeightCm;

    if (typeChanged) {
      props.setSketchExtDrawerType(nextType);
      props.setSketchExtDrawerHeightCm(nextHeightCm);
      props.setSketchExtDrawerHeightDraft(String(nextHeightCm));
    }
    props.setSketchExtDrawersPanelOpen(true);
    props.enterSketchExtDrawersTool(props.sketchExtDrawerCount, nextHeightCm, nextType);
  };

  return (
    <>
      {canShowExternalDrawers ? (
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
                props.enterSketchExtDrawersTool(
                  props.sketchExtDrawerCount,
                  props.sketchExtDrawerHeightCm,
                  sketchExternalDrawerType
                );
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
            className={cx('wp-row', 'wp-gap-8', isSketchExtDrawersControlsOpen ? '' : 'hidden')}
            style={{ marginTop: 8, marginBottom: 10 }}
          >
            <OptionBtn
              className="type-option--iconrow wp-flex-1"
              selected={sketchExternalDrawerType === 'shoe'}
              onClick={() => selectSketchExternalDrawerType('shoe')}
              testId="interior-sketch-external-drawers-shoe-button"
            >
              <i className="fas fa-shoe-prints" aria-hidden="true" /> נעליים
            </OptionBtn>
            <OptionBtn
              className="type-option--iconrow wp-flex-1"
              selected={sketchExternalDrawerType === 'regular'}
              onClick={() => selectSketchExternalDrawerType('regular')}
              testId="interior-sketch-external-drawers-regular-button"
            >
              <i className="fas fa-layer-group" aria-hidden="true" /> רגילות
            </OptionBtn>
          </div>

          <div
            className={cx(
              'wp-row',
              'wp-gap-5',
              'wp-r-ext-drawer-count-row',
              isSketchExtDrawersControlsOpen && sketchExternalDrawerType === 'regular' ? '' : 'hidden'
            )}
            style={{ marginTop: 8, marginBottom: 10 }}
          >
            {INTERIOR_EXT_COUNTS.map(n => (
              <CountBtn
                key={n}
                selected={isSketchExternalDrawersToolActive && props.sketchExtDrawerCount === n}
                onClick={() => {
                  props.setSketchExtDrawerCount(n);
                  props.setSketchExtDrawersPanelOpen(true);
                  props.enterSketchExtDrawersTool(n, props.sketchExtDrawerHeightCm, 'regular');
                }}
                testId={`interior-sketch-external-drawers-count-${n}-button`}
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
      ) : null}

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
              props.setSketchExtDrawersPanelOpen(false);
              if (isSketchInternalDrawersToolActive) {
                props.exitManual();
                return;
              }
              props.enterSketchIntDrawersTool(props.sketchIntDrawerHeightCm);
            }}
          >
            {isSketchInternalDrawersToolActive ? 'סיום עריכה' : 'הוסף/הסר מגירות פנימיות'}
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
