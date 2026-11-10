import { useId, useRef } from 'react';
import type { ChangeEvent, KeyboardEvent, ReactElement } from 'react';
import { HANDLE_CATALOG, isHandleType, supportsHandleHost } from '../../../../shared/handle_catalog.js';
import type { HandleType } from '../../../../shared/handle_catalog.js';
import { OptionBtn } from './interior_tab_helpers.js';

const quickTypes = ['standard', 'edge', 'knob_round', 'none'] as const;
const families = {
  bars: 'מוטות וקשתות',
  knobs: 'כפתורים',
  edge: 'קצה חזית',
  classic: 'קלאסיות',
  none: 'ללא ידית',
} as const;

const previews: Record<HandleType, string> = {
  standard: 'M13 20h38v6H13z',
  bar_slim: 'M8 12h48v5H8z M13 17v9h5v-9 M46 17v9h5v-9',
  bar_round: 'M10 12h44a4 4 0 0 1 0 8H10a4 4 0 0 1 0-8z M16 20v8 M48 20v8',
  bow: 'M9 26Q32 0 55 26h-5Q32 10 14 26z',
  knob_round: 'M32 5a12 12 0 1 0 .01 0z M25 11a9 9 0 0 1 9-3',
  knob_t: 'M19 10h26a4 4 0 0 1 0 8H19a4 4 0 0 1 0-8z M29 18v10h6V18',
  cup: 'M8 25a24 18 0 0 1 48 0z M15 24q17-13 34 0',
  edge: 'M11 10h42v7H17v10h-6z M17 20h34',
  none: 'M22 7h20v20H22z M19 30L45 4',
};

function HandlePreview({ type }: { type: HandleType }): ReactElement {
  return (
    <svg aria-hidden="true" viewBox="0 0 64 34" className="wp-handle-preview">
      <path
        d={previews[type]}
        fill="currentColor"
        fillOpacity=".16"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function InteriorHandlePicker(props: {
  type: HandleType;
  size: number | undefined;
  variant: 'short' | 'long';
  finish: string;
  scope: 'global' | 'part';
  sliding: boolean;
  onSelect: (type: HandleType) => void;
  onSize: (size: number) => void;
}): ReactElement {
  const id = useId();
  const details = useRef<HTMLDetailsElement>(null);
  const summary = useRef<HTMLElement>(null);
  const model = HANDLE_CATALOG[props.type];
  const dimensions =
    props.size !== undefined
      ? `${props.size} מ״מ בין חורים`
      : props.type === 'edge'
        ? props.variant === 'short'
          ? 'קצרה'
          : 'ארוכה'
        : '';
  const selectedDetails = [props.finish, dimensions].filter(Boolean).join(' · ');

  function closeCatalog(): void {
    if (details.current) details.current.open = false;
    summary.current?.focus();
  }

  return (
    <div className="wp-handle-picker" dir="rtl" data-testid={`handle-picker-${props.scope}`}>
      <div className="wp-handle-picker-current" aria-live="polite">
        <HandlePreview type={props.type} />
        <div>
          <strong>{model.label}</strong>
          {props.type !== 'none' && <small>{selectedDetails}</small>}
        </div>
      </div>

      <div
        className={`wp-row wp-gap-8 wp-wrap wp-r-handle-${props.scope === 'global' ? 'global' : 'advanced'}`}
        role="group"
        aria-label="בחירה מהירה"
      >
        {quickTypes.map(type => (
          <OptionBtn
            key={type}
            className="wp-flex-1 wp-r-handle-btn"
            selected={type === props.type}
            onClick={() => props.onSelect(type)}
          >
            {type === 'none' ? 'ללא' : type === 'knob_round' ? 'כפתור' : HANDLE_CATALOG[type].label}
          </OptionBtn>
        ))}
      </div>

      <details
        className="wp-handle-catalog"
        ref={details}
        onKeyDown={(event: KeyboardEvent<HTMLDetailsElement>) => {
          if (event.key === 'Escape' && details.current?.open) {
            event.stopPropagation();
            closeCatalog();
          }
        }}
      >
        <summary ref={summary}>כל סוגי הידיות</summary>
        {Object.entries(families).map(([family, label]) => (
          <div key={family} role="group" aria-label={label} className="wp-handle-family">
            <h4>{label}</h4>
            <div className="wp-handle-catalog-grid">
              {Object.keys(HANDLE_CATALOG)
                .filter(isHandleType)
                .filter(type => HANDLE_CATALOG[type].family === family)
                .map(type => {
                  const item = HANDLE_CATALOG[type];
                  return (
                    <button
                      key={type}
                      type="button"
                      className="wp-handle-catalog-tile"
                      data-testid={`handle-${props.scope}-${type}`}
                      aria-pressed={type === props.type}
                      onClick={() => props.onSelect(type)}
                    >
                      <HandlePreview type={type} />
                      <strong>{item.label}</strong>
                      <small>{item.description}</small>
                      {props.sliding && !supportsHandleHost(type, 'sliding') && (
                        <small>לדלתות ציר ולמגירות</small>
                      )}
                      {type === props.type && (
                        <span aria-hidden="true" className="wp-handle-tile-selected">
                          ✓
                        </span>
                      )}
                    </button>
                  );
                })}
            </div>
          </div>
        ))}
      </details>

      {model.sizesMm.length > 0 && (
        <div className="wp-handle-size">
          <label htmlFor={id}>מרחק בין חורים</label>
          <select
            id={id}
            value={props.size}
            onChange={(event: ChangeEvent<HTMLSelectElement>) => props.onSize(Number(event.target.value))}
          >
            {model.sizesMm.map(size => (
              <option key={size} value={size}>
                {size} מ״מ
              </option>
            ))}
          </select>
        </div>
      )}
      {props.sliding && !supportsHandleHost(props.type, 'sliding') && (
        <p className="wp-handle-host-note" role="status">
          הדגם מתאים לדלתות ציר ולמגירות. מרווח המסילה אינו מספיק לידית זו בדלת הזזה.
        </p>
      )}
    </div>
  );
}
