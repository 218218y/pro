import type { CSSProperties, ReactElement } from 'react';

import type { FloorStyle } from './render_tab_shared_contracts.js';
import { clamp, getLightBounds } from './render_tab_shared_lighting.js';
import type {
  ActionTileProps,
  FloorStyleSwatchProps,
  LightSliderProps,
} from './render_tab_sections_contracts.js';
import { handleSyntheticButtonKeyDown } from './render_tab_sections_shared.js';

export function ActionTile(props: ActionTileProps): ReactElement {
  return (
    <div
      role="button"
      tabIndex={0}
      className={
        (props.selected ? 'type-option selected' : 'type-option') +
        (props.className ? ` ${props.className}` : '')
      }
      onClick={props.onActivate}
      onKeyDown={(event: import('react').KeyboardEvent<HTMLDivElement>) =>
        handleSyntheticButtonKeyDown(event, props.onActivate)
      }
    >
      <i className={props.icon}></i> {props.children}
    </div>
  );
}

export function FloorStyleSwatch(props: FloorStyleSwatchProps): ReactElement {
  const style = props.styleDef;
  const swatchStyle: CSSProperties =
    style.color1 && style.color2
      ? { backgroundImage: `linear-gradient(135deg, ${style.color1} 0%, ${style.color2} 100%)` }
      : style.color
        ? { backgroundColor: style.color }
        : { backgroundColor: '#ffffff' };

  return (
    <div
      className={'color-dot-swatch' + (props.selected ? ' is-selected' : '')}
      title={style.name || style.id}
      style={swatchStyle}
      onClick={() => props.onSelect(style)}
      role="button"
      tabIndex={0}
      onKeyDown={(event: import('react').KeyboardEvent<HTMLDivElement>) =>
        handleSyntheticButtonKeyDown(event, () => props.onSelect(style))
      }
    />
  );
}

export function WallColorSwatch(props: {
  key?: string | number;
  value: string;
  title: string;
  selected: boolean;
  onSelect: (value: string) => void;
}): ReactElement {
  return (
    <div
      className={'color-dot-swatch' + (props.selected ? ' is-selected' : '')}
      title={props.title}
      style={{ backgroundColor: props.value || '#ffffff' }}
      onClick={() => props.onSelect(props.value)}
      role="button"
      tabIndex={0}
      onKeyDown={(event: import('react').KeyboardEvent<HTMLDivElement>) =>
        handleSyntheticButtonKeyDown(event, () => props.onSelect(props.value))
      }
    />
  );
}

export function LightSlider(props: LightSliderProps): ReactElement {
  const bounds = getLightBounds(props.name);
  const value = clamp(props.value, bounds.min, bounds.max);

  return (
    <>
      <label className="wp-r-light-label">{props.label}</label>
      <input
        type="range"
        className="lighting-slider"
        min={bounds.min}
        max={bounds.max}
        step={bounds.step || 0.01}
        name={props.name}
        value={value}
        onChange={(event: import('react').ChangeEvent<HTMLInputElement>) =>
          props.onChange(parseFloat(event.target.value))
        }
        aria-label={props.label.replace(/:$/, '')}
      />
    </>
  );
}

export function isFloorStyleSelected(currentId: string | null, style: FloorStyle): boolean {
  return !!(currentId && style.id && String(style.id) === String(currentId));
}
