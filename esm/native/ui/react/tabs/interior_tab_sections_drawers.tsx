import type { ReactElement } from 'react';

import { InlineNotice } from '../components/InlineNotice.js';
import { ToggleRow } from '../components/ToggleRow.js';
import { ModeToggleButton } from '../components/index.js';
import {
  CountBtn,
  DEFAULT_SKETCH_EXTERNAL_DRAWER_HEIGHT_CM,
  DEFAULT_SKETCH_INTERNAL_DRAWER_HEIGHT_CM,
  OptionBtn,
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
import { InteriorToolCardHeader } from './interior_tab_sections_controls.js';
import type {
  EmbeddedSketchExternalDrawersControlsProps,
  EmbeddedSketchInternalDrawersControlsProps,
  InteriorDividerSectionProps,
  InteriorExternalDrawersSectionProps,
  InteriorInternalDrawersSectionProps,
} from './interior_tab_sections_contracts.js';

function isEmbeddedSketchExternalDrawersActive(
  sketchControls: EmbeddedSketchExternalDrawersControlsProps | undefined
): boolean {
  return !!(
    sketchControls?.isSketchToolActive &&
    sketchControls.manualToolRaw.startsWith(SKETCH_TOOL_EXT_DRAWERS_PREFIX)
  );
}

function isEmbeddedSketchInternalDrawersActive(
  sketchControls: EmbeddedSketchInternalDrawersControlsProps | undefined
): boolean {
  return !!(sketchControls?.isSketchToolActive && isSketchInternalDrawersTool(sketchControls.manualToolRaw));
}

function createEmbeddedExternalDrawerHeightController(
  sketchControls: EmbeddedSketchExternalDrawersControlsProps,
  isToolActive: boolean
): SketchDrawerHeightDraftController {
  return {
    heightCm: sketchControls.sketchExtDrawerHeightCm,
    heightDraft: sketchControls.sketchExtDrawerHeightDraft,
    defaultHeightCm: DEFAULT_SKETCH_EXTERNAL_DRAWER_HEIGHT_CM,
    isToolActive,
    setHeightCm: sketchControls.setSketchExtDrawerHeightCm,
    setHeightDraft: sketchControls.setSketchExtDrawerHeightDraft,
    onActiveHeightChange: next => {
      sketchControls.enterSketchExtDrawersTool(sketchControls.sketchExtDrawerCount, next);
    },
  };
}

function createEmbeddedInternalDrawerHeightController(
  sketchControls: EmbeddedSketchInternalDrawersControlsProps,
  isToolActive: boolean
): SketchDrawerHeightDraftController {
  return {
    heightCm: sketchControls.sketchIntDrawerHeightCm,
    heightDraft: sketchControls.sketchIntDrawerHeightDraft,
    defaultHeightCm: DEFAULT_SKETCH_INTERNAL_DRAWER_HEIGHT_CM,
    isToolActive,
    setHeightCm: sketchControls.setSketchIntDrawerHeightCm,
    setHeightDraft: sketchControls.setSketchIntDrawerHeightDraft,
    onActiveHeightChange: next => {
      sketchControls.enterSketchIntDrawersTool(next);
    },
  };
}

function EmbeddedExternalDrawerSketchControls(props: {
  regularDrawerCount: number;
  sketchControls: EmbeddedSketchExternalDrawersControlsProps;
  isSketchExternalDrawersToolActive: boolean;
}): ReactElement {
  const { sketchControls, isSketchExternalDrawersToolActive } = props;
  const heightController = createEmbeddedExternalDrawerHeightController(
    sketchControls,
    isSketchExternalDrawersToolActive
  );
  const isHeightPanelOpen = sketchControls.sketchExtDrawersPanelOpen || isSketchExternalDrawersToolActive;

  return (
    <div className="wp-r-embedded-sketch-drawers">
      <ModeToggleButton
        active={isSketchExternalDrawersToolActive}
        className="wp-r-editmode-toggle--fullrow"
        icon={
          <i
            className={isSketchExternalDrawersToolActive ? 'fas fa-check' : 'fas fa-pencil-ruler'}
            aria-hidden="true"
          />
        }
        onClick={() => {
          sketchControls.setSketchShelvesOpen(false);
          sketchControls.setSketchRowOpen(false);
          if (isSketchExternalDrawersToolActive) {
            sketchControls.setSketchExtDrawersPanelOpen(false);
            sketchControls.exitManual();
            return;
          }
          sketchControls.setSketchExtDrawerCount(props.regularDrawerCount);
          sketchControls.setSketchExtDrawersPanelOpen(true);
          sketchControls.enterSketchExtDrawersTool(
            props.regularDrawerCount,
            sketchControls.sketchExtDrawerHeightCm
          );
        }}
        data-testid="interior-external-drawers-sketch-button"
      >
        מגירות חיצוניות לפי סקיצה
        <i
          className={cx('fas', isHeightPanelOpen ? 'fa-chevron-up' : 'fa-chevron-down', 'wp-chevron')}
          aria-hidden="true"
        />
      </ModeToggleButton>

      <div className={cx(isHeightPanelOpen ? '' : 'hidden')}>
        <SketchDrawerHeightField
          label={'גובה מגירה חיצונית (ס"מ)'}
          value={sketchControls.sketchExtDrawerHeightDraft}
          onChange={raw => {
            updateSketchDrawerHeightDraft(heightController, raw);
          }}
          onBlur={() => {
            commitSketchDrawerHeightDraft(heightController);
          }}
          onReset={() => {
            resetSketchDrawerHeightDraft(heightController);
          }}
        />
      </div>
    </div>
  );
}

function EmbeddedInternalDrawerSketchControls(props: {
  sketchControls: EmbeddedSketchInternalDrawersControlsProps;
  isSketchInternalDrawersToolActive: boolean;
}): ReactElement {
  const { sketchControls, isSketchInternalDrawersToolActive } = props;
  const heightController = createEmbeddedInternalDrawerHeightController(
    sketchControls,
    isSketchInternalDrawersToolActive
  );

  return (
    <div className="wp-r-embedded-sketch-drawers">
      <ModeToggleButton
        active={isSketchInternalDrawersToolActive}
        className="wp-r-editmode-toggle--fullrow"
        icon={
          <i
            className={isSketchInternalDrawersToolActive ? 'fas fa-check' : 'fas fa-pencil-ruler'}
            aria-hidden="true"
          />
        }
        onClick={() => {
          sketchControls.setSketchShelvesOpen(false);
          sketchControls.setSketchRowOpen(false);
          if (isSketchInternalDrawersToolActive) {
            sketchControls.exitManual();
            return;
          }
          sketchControls.enterSketchIntDrawersTool(sketchControls.sketchIntDrawerHeightCm);
        }}
        data-testid="interior-internal-drawers-sketch-button"
      >
        מגירות פנימיות לפי סקיצה
      </ModeToggleButton>

      <div className={cx(isSketchInternalDrawersToolActive ? '' : 'hidden')}>
        <SketchDrawerHeightField
          label={'גובה מגירה פנימית (ס"מ)'}
          value={sketchControls.sketchIntDrawerHeightDraft}
          onChange={raw => {
            updateSketchDrawerHeightDraft(heightController, raw);
          }}
          onBlur={() => {
            commitSketchDrawerHeightDraft(heightController);
          }}
          onReset={() => {
            resetSketchDrawerHeightDraft(heightController);
          }}
        />
      </div>
    </div>
  );
}

export function InteriorExternalDrawersSection(
  props: InteriorExternalDrawersSectionProps
): ReactElement | null {
  if (props.wardrobeType === 'sliding') return null;

  const isSketchExternalDrawersToolActive = isEmbeddedSketchExternalDrawersActive(props.sketchControls);
  const countButtonsUseSketchTool = !!props.sketchControls && isSketchExternalDrawersToolActive;
  const showRegularCountButtons = props.extDrawerType === 'regular' || countButtonsUseSketchTool;

  return (
    <div
      className={cx(
        'wp-tool-card',
        'wp-tool-card--extdrawer',
        (props.isExtDrawerMode || isSketchExternalDrawersToolActive) && 'is-active'
      )}
      data-testid="interior-external-drawers-card"
    >
      <InteriorToolCardHeader
        title="🚪 מגירות חיצוניות"
        active={props.isExtDrawerMode || isSketchExternalDrawersToolActive}
        onExit={() => {
          if (isSketchExternalDrawersToolActive && props.sketchControls) {
            props.sketchControls.setSketchExtDrawersPanelOpen(false);
            props.sketchControls.exitManual();
            return;
          }
          props.exitExtDrawer();
        }}
        exitButtonTestId="interior-external-drawers-exit-button"
      />

      <div className="wp-row wp-gap-8 wp-mb-10">
        <OptionBtn
          className="type-option--iconrow wp-flex-1"
          selected={props.isExtDrawerMode && props.extDrawerType === 'shoe'}
          onClick={() => props.enterExtDrawer('shoe')}
          testId="interior-external-drawers-shoe-button"
        >
          <i className="fas fa-shoe-prints" aria-hidden="true" /> נעליים
        </OptionBtn>

        <OptionBtn
          className="type-option--iconrow wp-flex-1"
          selected={props.isExtDrawerMode && props.extDrawerType === 'regular'}
          onClick={() => props.enterExtDrawer('regular', props.extDrawerCount)}
          testId="interior-external-drawers-regular-button"
        >
          <i className="fas fa-layer-group" aria-hidden="true" /> רגילות
        </OptionBtn>
      </div>

      <div className={cx('wp-row', 'wp-gap-5', showRegularCountButtons ? '' : 'hidden')}>
        {props.extCounts.map(n => (
          <CountBtn
            key={n}
            selected={
              countButtonsUseSketchTool
                ? props.sketchControls?.sketchExtDrawerCount === n
                : props.isExtDrawerMode && props.extDrawerType === 'regular' && props.extDrawerCount === n
            }
            onClick={() => {
              if (countButtonsUseSketchTool && props.sketchControls) {
                props.sketchControls.setSketchExtDrawerCount(n);
                props.sketchControls.setSketchExtDrawersPanelOpen(true);
                props.sketchControls.enterSketchExtDrawersTool(
                  n,
                  props.sketchControls.sketchExtDrawerHeightCm
                );
                return;
              }
              props.enterExtDrawer('regular', n);
            }}
            testId={`interior-external-drawers-count-${n}-button`}
          >
            {n}
          </CountBtn>
        ))}
      </div>

      {props.sketchControls ? (
        <EmbeddedExternalDrawerSketchControls
          regularDrawerCount={props.extDrawerCount}
          sketchControls={props.sketchControls}
          isSketchExternalDrawersToolActive={isSketchExternalDrawersToolActive}
        />
      ) : null}

      {!props.isExtDrawerMode && !isSketchExternalDrawersToolActive ? (
        <InlineNotice>בחר סוג מגירות ואז לחץ על תא כדי ליישם.</InlineNotice>
      ) : null}
    </div>
  );
}

export function InteriorInternalDrawersSection(props: InteriorInternalDrawersSectionProps): ReactElement {
  const isSketchInternalDrawersToolActive = isEmbeddedSketchInternalDrawersActive(props.sketchControls);

  return (
    <>
      <ToggleRow
        className="wp-r-intdrawer-toggle"
        label={<span className="wp-r-intdrawer-label">מגירות פנימיות</span>}
        checked={props.internalDrawersEnabled}
        onChange={checked => props.setInternalDrawersEnabled(checked)}
        testId="interior-internal-drawers-toggle"
      />

      {props.internalDrawersEnabled ? (
        <div
          className={cx(
            'wp-tool-card',
            'wp-tool-card--intdrawer',
            (props.isIntDrawerMode || isSketchInternalDrawersToolActive) && 'is-active'
          )}
          data-testid="interior-internal-drawers-card"
        >
          <InteriorToolCardHeader title="📦 מיקום מגירות פנימיות" />

          <ModeToggleButton
            active={props.isIntDrawerMode}
            onClick={() => props.toggleIntDrawerMode()}
            data-testid="interior-internal-drawers-mode-button"
          >
            {props.isIntDrawerMode ? 'סיום עריכה' : 'הוסף/הסר מגירות פנימיות'}
          </ModeToggleButton>

          <div className={cx('wp-hint', 'wp-hint--intdrawer', !props.isIntDrawerMode && 'hidden')}>
            לחץ בתוך הארון בגובה הרצוי כדי למקם או להסיר מגירות.
          </div>

          {props.sketchControls ? (
            <EmbeddedInternalDrawerSketchControls
              sketchControls={props.sketchControls}
              isSketchInternalDrawersToolActive={isSketchInternalDrawersToolActive}
            />
          ) : null}
        </div>
      ) : (
        <InlineNotice>הפעל כדי לבחור מיקום מגירות פנימיות בתוך התאים.</InlineNotice>
      )}
    </>
  );
}

export function InteriorDividerSection(props: InteriorDividerSectionProps): ReactElement {
  return (
    <div className={cx('wp-tool-card', 'wp-tool-card--divider', props.isDividerMode && 'is-active')}>
      <InteriorToolCardHeader title="⛓️ מחיצה למגירה" />

      <ModeToggleButton active={props.isDividerMode} onClick={() => props.toggleDividerMode()}>
        {props.isDividerMode ? 'סיום עריכה' : 'הוסף/הסר מחיצה'}
      </ModeToggleButton>

      <div className={cx('wp-hint', 'wp-hint--divider', !props.isDividerMode && 'hidden')}>
        <i className="fas fa-info-circle" aria-hidden="true" /> לחץ על מגירה חיצונית או פנימית כדי לחלק אותה
        באמצע.
      </div>
    </div>
  );
}
