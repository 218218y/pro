import type { CSSProperties, ReactElement } from 'react';

import { ToggleRow } from '../components/index.js';
import { CURTAIN_OPTIONS, type CurtainPreset } from './design_tab_multicolor_shared.js';
import {
  MULTI_BTN_FINISH_EDIT,
  MULTI_CURTAIN_TITLE,
  MULTI_DOOR_STYLE_HEADER,
  MULTI_DOOR_STYLE_OPTIONS,
  MULTI_MIRROR_AUTO,
  MULTI_MIRROR_HEIGHT,
  MULTI_MIRROR_WIDTH,
  MULTI_SECTION_TITLE,
  MULTI_SPECIAL_HEADER,
  MULTI_SUBTITLE_CHOOSE,
  MULTI_TITLE_BRUSH,
  type MultiColorPanelViewState,
  type MultiColorSwatchDot,
} from './design_tab_multicolor_panel_contracts.js';
import type { DoorStyleOverrideValue } from '../../../features/door_style_overrides.js';

export type MultiColorPanelViewProps = {
  embedded?: boolean;
  viewState: MultiColorPanelViewState;
  onToggleEnabled: (checked: boolean) => void;
  onFinishPaintMode: () => void;
  onPickBrush: (paintId: string, curtainPreset?: CurtainPreset) => void;
  onPickDoorStyle: (style: DoorStyleOverrideValue) => void;
  onSetCurtainPreset: (curtainPreset: CurtainPreset) => void;
  onSetMirrorDraftField: (
    key: 'currentMirrorDraftHeightCm' | 'currentMirrorDraftWidthCm',
    value: string
  ) => void;
};

function MultiColorSwatchDotButton(props: {
  key?: string | number;
  dot: MultiColorSwatchDot;
  onPickBrush: (paintId: string, curtainPreset?: CurtainPreset) => void;
}): ReactElement {
  const dot = props.dot;
  const className =
    'color-dot-swatch wp-r-color-swatch' +
    (dot.isSpecial ? ' special-swatch' : '') +
    (dot.selected ? ' is-selected' : '');

  const style: CSSProperties =
    dot.isTexture && dot.textureData
      ? { backgroundImage: `url(${dot.textureData})` }
      : dot.val
        ? { backgroundColor: dot.val }
        : {};

  const pick = () => props.onPickBrush(dot.paintId, dot.curtainPreset);

  return (
    <div
      key={dot.key}
      className={className}
      title={dot.title}
      style={style}
      onClick={pick}
      role="button"
      tabIndex={0}
      onKeyDown={(event: import('react').KeyboardEvent<HTMLDivElement>) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          event.stopPropagation();
          pick();
        }
      }}
    >
      {dot.isSpecial ? <span className="swatch-icon">{dot.icon || ''}</span> : null}
      {dot.isSpecial && dot.badge ? <span className="swatch-badge">{dot.badge}</span> : null}
    </div>
  );
}

function MultiColorSwatchRow(props: {
  dots: ReadonlyArray<MultiColorSwatchDot>;
  onPickBrush: (paintId: string, curtainPreset?: CurtainPreset) => void;
}): ReactElement {
  return (
    <div className="wp-swatch-row">
      {props.dots.map(dot => (
        <MultiColorSwatchDotButton key={dot.key} dot={dot} onPickBrush={props.onPickBrush} />
      ))}
    </div>
  );
}

function MultiColorMirrorDraftCard(props: {
  heightDraft: string;
  widthDraft: string;
  onSetMirrorDraftField: (
    key: 'currentMirrorDraftHeightCm' | 'currentMirrorDraftWidthCm',
    value: string
  ) => void;
}): ReactElement {
  return (
    <div className="wp-tool-card wp-tool-card--curtain">
      <div className="wp-section-title">מידות מראה</div>

      <div className="wp-row wp-gap-10">
        <label style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span>{MULTI_MIRROR_HEIGHT}</span>
          <input
            type="text"
            inputMode="decimal"
            className="form-control"
            placeholder={MULTI_MIRROR_AUTO}
            value={props.heightDraft}
            onChange={(event: import('react').ChangeEvent<HTMLInputElement>) =>
              props.onSetMirrorDraftField('currentMirrorDraftHeightCm', event.target.value)
            }
          />
        </label>

        <label style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span>{MULTI_MIRROR_WIDTH}</span>
          <input
            type="text"
            inputMode="decimal"
            className="form-control"
            placeholder={MULTI_MIRROR_AUTO}
            value={props.widthDraft}
            onChange={(event: import('react').ChangeEvent<HTMLInputElement>) =>
              props.onSetMirrorDraftField('currentMirrorDraftWidthCm', event.target.value)
            }
          />
        </label>
      </div>
    </div>
  );
}

function MultiColorDoorStyleSection(props: {
  activeDoorStyleOverride: DoorStyleOverrideValue | null;
  onPickDoorStyle: (style: DoorStyleOverrideValue) => void;
}): ReactElement {
  return (
    <div className="multi-special-section">
      <div className="multi-special-header">{MULTI_DOOR_STYLE_HEADER}</div>
      <div className="wp-row wp-gap-8">
        {MULTI_DOOR_STYLE_OPTIONS.map(option => {
          const selected = props.activeDoorStyleOverride === option.id;
          return (
            <button
              key={option.id}
              type="button"
              className={
                'type-option type-option--compact type-option--iconrow wp-flex-1' +
                (selected ? ' selected' : '')
              }
              data-door-style={option.id}
              onClick={() => props.onPickDoorStyle(option.id)}
              title={option.label}
              aria-pressed={selected}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function MultiColorCurtainSection(props: {
  curtainChoice: CurtainPreset;
  onSetCurtainPreset: (curtainPreset: CurtainPreset) => void;
}): ReactElement {
  return (
    <div className="wp-tool-card wp-tool-card--curtain">
      <div className="wp-section-title">{MULTI_CURTAIN_TITLE}</div>

      <div className="wp-row wp-gap-10 wp-wrap">
        {CURTAIN_OPTIONS.map(curtain => (
          <div
            key={curtain.id}
            className={'curtain-btn' + (props.curtainChoice === curtain.id ? ' is-selected' : '')}
            data-curtain={curtain.id}
            onClick={() => props.onSetCurtainPreset(curtain.id)}
            role="button"
            tabIndex={0}
            onKeyDown={(event: import('react').KeyboardEvent<HTMLDivElement>) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                event.stopPropagation();
                props.onSetCurtainPreset(curtain.id);
              }
            }}
          >
            {curtain.label}
          </div>
        ))}
      </div>
    </div>
  );
}

function MultiColorPanelBody(props: Omit<MultiColorPanelViewProps, 'embedded'>): ReactElement {
  const { viewState } = props;

  return (
    <>
      <ToggleRow
        label="צביעה ותוסף לכל חלק בנפרד"
        checked={viewState.enabled}
        onChange={props.onToggleEnabled}
      />

      {viewState.enabled ? (
        <div className="wp-r-mt-3">
          <div className={'wp-tool-card wp-tool-card--paint' + (viewState.paintActive ? ' is-active' : '')}>
            <div className="wp-header-row wp-mb-10">
              <div>
                <strong>{MULTI_TITLE_BRUSH}</strong> <small>{MULTI_SUBTITLE_CHOOSE}</small>
              </div>

              {viewState.paintActive ? (
                <button
                  type="button"
                  className="btn btn-danger btn-inline btn-sm"
                  onClick={(event: import('react').MouseEvent<HTMLButtonElement>) => {
                    event.preventDefault();
                    event.stopPropagation();
                    props.onFinishPaintMode();
                  }}
                >
                  {MULTI_BTN_FINISH_EDIT}
                </button>
              ) : null}
            </div>

            <MultiColorSwatchRow
              dots={[...viewState.defaultSwatches, ...viewState.savedSwatches]}
              onPickBrush={props.onPickBrush}
            />

            <div className="multi-special-section">
              <div className="multi-special-header">{MULTI_SPECIAL_HEADER}</div>
              <div className="multi-special-row">
                {viewState.specialSwatches.map(dot => (
                  <MultiColorSwatchDotButton key={dot.key} dot={dot} onPickBrush={props.onPickBrush} />
                ))}
              </div>
            </div>

            {viewState.paintActive && viewState.paintColor === 'glass' ? (
              <MultiColorCurtainSection
                curtainChoice={viewState.curtainChoice}
                onSetCurtainPreset={props.onSetCurtainPreset}
              />
            ) : null}

            {viewState.paintActive && viewState.paintColor === 'mirror' ? (
              <MultiColorMirrorDraftCard
                heightDraft={viewState.mirrorDraftHeight}
                widthDraft={viewState.mirrorDraftWidth}
                onSetMirrorDraftField={props.onSetMirrorDraftField}
              />
            ) : null}

            <MultiColorDoorStyleSection
              activeDoorStyleOverride={viewState.activeDoorStyleOverride}
              onPickDoorStyle={props.onPickDoorStyle}
            />

            {viewState.hintText ? (
              <div className="wp-hint wp-hint--paint">
                <i className="fas fa-info-circle" /> {viewState.hintText}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}

export function MultiColorPanelView(props: MultiColorPanelViewProps): ReactElement {
  const body = <MultiColorPanelBody {...props} />;

  if (!props.embedded) {
    return (
      <div className="control-section">
        <span className="section-title wp-r-section-title-upgrade">{MULTI_SECTION_TITLE}</span>
        {body}
      </div>
    );
  }

  return (
    <>
      <div className="wp-r-subsection-title wp-r-section-title-upgrade">{MULTI_SECTION_TITLE}</div>
      {body}
    </>
  );
}
