import type { ReactElement } from 'react';

import { ModeToggleButton } from '../components/index.js';
import { OptionBtn, cx } from './interior_tab_helpers.js';
import { DOOR_TRIM_COLORS, METAL_FINISH_SWATCH_BG_BY_COLOR } from './interior_tab_sections_shared.js';
import { DoorTrimAxisPanel } from './interior_layout_door_trim_axis_panel.js';
import type { InteriorDoorTrimSectionProps } from './interior_layout_sketch_section_types.js';

export function InteriorDoorTrimSection(props: InteriorDoorTrimSectionProps): ReactElement {
  const { isDoorTrimControlsOpen } = props;

  return (
    <div className="wp-field" style={{ marginTop: 14 }}>
      <div
        className="wp-r-type-selector type-selector"
        style={{ direction: 'rtl', marginBottom: isDoorTrimControlsOpen ? 10 : 0 }}
      >
        <ModeToggleButton
          active={isDoorTrimControlsOpen}
          className="wp-sketch-box-btn"
          icon={
            <i className={props.isDoorTrimMode ? 'fas fa-check' : 'fas fa-grip-lines'} aria-hidden="true" />
          }
          onClick={() => {
            props.setSketchShelvesOpen(false);
            if (isDoorTrimControlsOpen) {
              props.setDoorTrimPanelOpen(false);
              if (props.isDoorTrimMode) props.exitLayoutOrManual();
              return;
            }
            props.setDoorTrimPanelOpen(true);
          }}
        >
          פסי עיטור לדלת
          <i
            className={cx('fas', isDoorTrimControlsOpen ? 'fa-chevron-up' : 'fa-chevron-down', 'wp-chevron')}
            aria-hidden="true"
          />
        </ModeToggleButton>
      </div>

      <div
        className={cx('wp-door-trim-panel', isDoorTrimControlsOpen ? '' : 'hidden')}
        style={{
          border: '1px solid rgba(0,0,0,0.08)',
          borderRadius: 10,
          padding: 10,
          background: 'rgba(255,255,255,0.55)',
        }}
      >
        <div className="wp-r-label wp-r-label--center" style={{ marginBottom: 8 }}>
          גימור פס
        </div>
        <div className="wp-layout-grid" style={{ marginBottom: 10 }}>
          {DOOR_TRIM_COLORS.map(color => (
            <OptionBtn
              key={color.id}
              selected={props.doorTrimColor === color.id}
              onClick={() => props.setDoorTrimColor(color.id)}
              className="type-option--iconrow"
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <span
                  aria-hidden="true"
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: 999,
                    border: '1px solid rgba(0,0,0,0.18)',
                    background: METAL_FINISH_SWATCH_BG_BY_COLOR[color.id],
                  }}
                />
                <span style={color.style}>{color.label}</span>
              </span>
            </OptionBtn>
          ))}
        </div>

        <DoorTrimAxisPanel
          axis="horizontal"
          title="פס שוכב לפי מידות"
          fullSpanLabel="רוחב מלא"
          customPlaceholder={'רוחב פס בס"מ'}
          crossPlaceholder={'גובה פס בס"מ'}
          span={props.doorTrimHorizontalSpan}
          customCm={props.doorTrimHorizontalCustomCm}
          customDraft={props.doorTrimHorizontalCustomDraft}
          crossCm={props.doorTrimHorizontalCrossCm}
          crossDraft={props.doorTrimHorizontalCrossDraft}
          isDoorTrimMode={props.isDoorTrimMode}
          setSpan={props.setDoorTrimHorizontalSpan}
          setCustomCm={props.setDoorTrimHorizontalCustomCm}
          setCustomDraft={props.setDoorTrimHorizontalCustomDraft}
          setCrossCm={props.setDoorTrimHorizontalCrossCm}
          setCrossDraft={props.setDoorTrimHorizontalCrossDraft}
          activateDoorTrimMode={props.activateDoorTrimMode}
        />

        <DoorTrimAxisPanel
          axis="vertical"
          title="פס עומד לפי מידות"
          fullSpanLabel="גובה מלא"
          customPlaceholder={'גובה פס בס"מ'}
          crossPlaceholder={'רוחב פס בס"מ'}
          span={props.doorTrimVerticalSpan}
          customCm={props.doorTrimVerticalCustomCm}
          customDraft={props.doorTrimVerticalCustomDraft}
          crossCm={props.doorTrimVerticalCrossCm}
          crossDraft={props.doorTrimVerticalCrossDraft}
          isDoorTrimMode={props.isDoorTrimMode}
          setSpan={props.setDoorTrimVerticalSpan}
          setCustomCm={props.setDoorTrimVerticalCustomCm}
          setCustomDraft={props.setDoorTrimVerticalCustomDraft}
          setCrossCm={props.setDoorTrimVerticalCrossCm}
          setCrossDraft={props.setDoorTrimVerticalCrossDraft}
          activateDoorTrimMode={props.activateDoorTrimMode}
        />
      </div>
    </div>
  );
}
