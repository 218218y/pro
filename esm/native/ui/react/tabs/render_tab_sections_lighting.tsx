import type { ReactElement } from 'react';

import { ToggleRow } from '../components/index.js';
import type { RenderTabLightingSectionModel } from './use_render_tab_controller_contracts.js';
import { LIGHT_PRESET_OPTIONS } from './render_tab_sections_contracts.js';
import { ActionTile, LightSlider } from './render_tab_sections_controls.js';

export function RenderLightingSection(props: { model: RenderTabLightingSectionModel }): ReactElement {
  const model = props.model;

  return (
    <div className="control-section">
      <ToggleRow
        label={
          <>
            <i className="fas fa-lightbulb"></i> מצבי תאורה מתקדמים
          </>
        }
        checked={model.lightingControl}
        onChange={model.setLightingControl}
      />

      {model.lightingControl ? (
        <div className="wp-r-lighting-wrapper">
          <div className="type-selector wp-r-type-selector wp-r-light-presets">
            {LIGHT_PRESET_OPTIONS.map(([id, label, icon]) => (
              <ActionTile
                key={id}
                selected={String(model.lastLightPreset) === id}
                icon={icon}
                onActivate={() => model.applyLightPreset(id)}
                className={`wp-r-light-btn wp-r-light-btn--${id}`}
              >
                {label}
              </ActionTile>
            ))}
          </div>

          <div className="wp-r-light-box">
            <LightSlider
              label="עוצמת אור סביבתי:"
              name="lightAmb"
              value={model.lightAmb}
              onChange={value => model.setLightValue('lightAmb', value)}
            />

            <LightSlider
              label="עוצמת שמש (צל):"
              name="lightDir"
              value={model.lightDir}
              onChange={value => model.setLightValue('lightDir', value)}
            />

            <div className="wp-r-light-subtitle">כיוון האור (X/Y/Z):</div>

            <LightSlider
              label="כיוון אור X"
              name="lightX"
              value={model.lightX}
              onChange={value => model.setLightValue('lightX', value)}
            />
            <LightSlider
              label="כיוון אור Y"
              name="lightY"
              value={model.lightY}
              onChange={value => model.setLightValue('lightY', value)}
            />
            <LightSlider
              label="כיוון אור Z"
              name="lightZ"
              value={model.lightZ}
              onChange={value => model.setLightValue('lightZ', value)}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
