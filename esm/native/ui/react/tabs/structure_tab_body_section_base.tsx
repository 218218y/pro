import type { ReactElement } from 'react';

import {
  BASE_LEG_COLOR_OPTIONS,
  BASE_LEG_STYLE_OPTIONS,
  BASE_TYPE_OPTIONS,
  SLIDING_TRACKS_OPTIONS,
  type BaseType,
  type StructureBaseLegColor,
  type StructureBaseLegStyle,
  type SlidingTracksColor,
} from './structure_tab_body_section_contracts.js';
import { OptionButtonGroup } from '../components/index.js';
import { StructureBodyTypeOptionButton } from './structure_tab_body_section_controls.js';
import {
  BASE_LEG_HEIGHT_MAX_CM,
  BASE_LEG_HEIGHT_MIN_CM,
  BASE_LEG_WIDTH_MAX_CM,
  BASE_LEG_WIDTH_MIN_CM,
} from '../../../features/base_leg_support.js';

const LEG_COLOR_SWATCH_BY_COLOR: Record<StructureBaseLegColor, string> = {
  black: '#111111',
  nickel: '#b8bec6',
  gold: '#d4af37',
};

export function StructureBodyBaseControls(props: {
  baseType: BaseType;
  baseLegStyle: StructureBaseLegStyle;
  baseLegColor: StructureBaseLegColor;
  baseLegHeightCm: number;
  baseLegWidthCm: number;
  isChestMode: boolean;
  isSliding: boolean;
  slidingTracksColor: SlidingTracksColor;
  onSetBaseType: (value: BaseType) => void;
  onSetBaseLegStyle: (value: StructureBaseLegStyle) => void;
  onSetBaseLegColor: (value: StructureBaseLegColor) => void;
  onSetBaseLegHeightCm: (value: number) => void;
  onSetBaseLegWidthCm: (value: number) => void;
  onSetSlidingTracksColor: (value: SlidingTracksColor) => void;
}): ReactElement {
  return (
    <>
      <div className="wp-field">
        <div className="wp-field-label">סוג בסיס</div>
        <OptionButtonGroup columns={3} density="compact" className="wp-r-wardrobe-type-selector">
          {BASE_TYPE_OPTIONS.map(option => (
            <StructureBodyTypeOptionButton
              key={option.value}
              selected={props.baseType === option.value}
              label={option.label}
              iconClass={option.iconClass}
              onClick={() =>
                props.onSetBaseType(option.value === 'none' && props.isChestMode ? 'legs' : option.value)
              }
            />
          ))}
        </OptionButtonGroup>
      </div>

      {props.baseType === 'legs' ? (
        <>
          <div className="wp-field">
            <div className="wp-field-label">סוג רגליים</div>
            <OptionButtonGroup
              columns={3}
              density="micro"
              className="wp-r-wardrobe-type-selector wp-r-base-leg-style-selector"
            >
              {BASE_LEG_STYLE_OPTIONS.map(option => (
                <StructureBodyTypeOptionButton
                  key={option.value}
                  selected={props.baseLegStyle === option.value}
                  label={option.label}
                  iconClass={option.iconClass}
                  onClick={() => props.onSetBaseLegStyle(option.value)}
                />
              ))}
            </OptionButtonGroup>
          </div>

          <div className="wp-field">
            <div className="wp-field-label">צבע רגליים</div>
            <OptionButtonGroup
              columns={3}
              density="micro"
              className="wp-r-wardrobe-type-selector wp-r-base-leg-color-selector"
            >
              {BASE_LEG_COLOR_OPTIONS.map(option => (
                <StructureBodyTypeOptionButton
                  key={option.value}
                  selected={props.baseLegColor === option.value}
                  label={
                    <>
                      <span
                        aria-hidden="true"
                        style={{
                          display: 'inline-block',
                          width: 12,
                          height: 12,
                          borderRadius: '50%',
                          background: LEG_COLOR_SWATCH_BY_COLOR[option.value],
                          border: option.value === 'nickel' ? '1px solid rgba(0,0,0,0.25)' : undefined,
                          marginInlineEnd: 6,
                          verticalAlign: '-1px',
                        }}
                      />
                      {option.label}
                    </>
                  }
                  onClick={() => props.onSetBaseLegColor(option.value)}
                />
              ))}
            </OptionButtonGroup>
          </div>

          <div className="wp-r-leg-size-fields">
            <div className="wp-field wp-r-leg-size-field">
              <div className="wp-field-label">גובה רגליים (ס"מ)</div>
              <input
                type="number"
                className="wp-r-input"
                min={BASE_LEG_HEIGHT_MIN_CM}
                max={BASE_LEG_HEIGHT_MAX_CM}
                step={1}
                value={props.baseLegHeightCm}
                onChange={(event: import('react').ChangeEvent<HTMLInputElement>) => {
                  const next = Number(event.target.value);
                  if (Number.isFinite(next)) props.onSetBaseLegHeightCm(next);
                }}
              />
            </div>

            <div className="wp-field wp-r-leg-size-field">
              <div className="wp-field-label">רוחב רגליים (ס"מ)</div>
              <input
                type="number"
                className="wp-r-input"
                min={BASE_LEG_WIDTH_MIN_CM}
                max={BASE_LEG_WIDTH_MAX_CM}
                step={0.5}
                value={props.baseLegWidthCm}
                onChange={(event: import('react').ChangeEvent<HTMLInputElement>) => {
                  const next = Number(event.target.value);
                  if (Number.isFinite(next)) props.onSetBaseLegWidthCm(next);
                }}
              />
            </div>
          </div>
        </>
      ) : null}

      {props.isSliding ? (
        <div className="wp-field">
          <div className="wp-field-label">צבע מסילות</div>
          <OptionButtonGroup columns={2} density="compact" className="wp-r-wardrobe-type-selector">
            {SLIDING_TRACKS_OPTIONS.map(option => (
              <StructureBodyTypeOptionButton
                key={option.value}
                selected={props.slidingTracksColor === option.value}
                label={option.label}
                onClick={() => props.onSetSlidingTracksColor(option.value)}
              />
            ))}
          </OptionButtonGroup>
        </div>
      ) : null}
    </>
  );
}
