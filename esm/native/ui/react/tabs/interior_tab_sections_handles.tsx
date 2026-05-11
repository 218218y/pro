import { useRef } from 'react';
import type { ChangeEvent, ReactElement } from 'react';

import { isHandleFinishCustomColor } from '../../../features/handle_finish_shared.js';
import { InlineNotice } from '../components/InlineNotice.js';
import { ToggleRow } from '../components/ToggleRow.js';
import { OptionBtn, cx } from './interior_tab_helpers.js';
import type { HandleUiColor } from './interior_tab_helpers.js';
import { InteriorEdgeHandleVariantRow, InteriorToolCardHeader } from './interior_tab_sections_controls.js';
import { METAL_FINISH_OPTIONS, resolveMetalFinishSwatchBg } from './interior_tab_sections_shared.js';
import type { InteriorHandlesSectionProps } from './interior_tab_sections_contracts.js';

function readPickerValue(color: HandleUiColor): string {
  return resolveMetalFinishSwatchBg(color);
}

function openNativeColorPicker(input: HTMLInputElement | null): void {
  if (!input) return;
  try {
    if (typeof input.showPicker === 'function') {
      input.showPicker();
      return;
    }
  } catch {
    // ignore and use the click path
  }
  try {
    input.click();
  } catch {
    // ignore
  }
}

function HandleColorRow(props: {
  title: string;
  selectedColor: HandleUiColor;
  onSelect: (color: HandleUiColor) => void;
  className?: string;
}): ReactElement {
  const colorInputRef = useRef<HTMLInputElement | null>(null);
  const customSelected = isHandleFinishCustomColor(props.selectedColor);
  const customLabel = customSelected ? props.selectedColor.toUpperCase() : 'מיוחד';

  return (
    <div className={cx('wp-mt-8', props.className)}>
      <div className="wp-r-label wp-r-label--center" style={{ marginBottom: 8 }}>
        {props.title}
      </div>
      <div className="wp-layout-grid">
        {METAL_FINISH_OPTIONS.map(color => (
          <OptionBtn
            key={color.id}
            selected={props.selectedColor === color.id}
            onClick={() => props.onSelect(color.id)}
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
                  background: resolveMetalFinishSwatchBg(color.id),
                }}
              />
              <span style={color.style}>{color.label}</span>
            </span>
          </OptionBtn>
        ))}

        <OptionBtn
          selected={customSelected}
          onClick={() => openNativeColorPicker(colorInputRef.current)}
          className="type-option--iconrow"
          title="בחירת צבע מיוחד"
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, position: 'relative' }}>
            <span
              aria-hidden="true"
              style={{
                width: 16,
                height: 16,
                borderRadius: 999,
                border: '1px solid rgba(0,0,0,0.18)',
                background: readPickerValue(props.selectedColor),
              }}
            />
            <span>{customLabel}</span>
            <input
              ref={colorInputRef}
              type="color"
              value={readPickerValue(props.selectedColor)}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                props.onSelect(event.target.value as HandleUiColor)
              }
              className="wp-r-color-input"
              aria-label="בחירת צבע מיוחד לידית"
              style={{
                position: 'absolute',
                insetInlineStart: 0,
                top: 0,
                width: 1,
                height: 1,
                opacity: 0,
                pointerEvents: 'none',
              }}
              tabIndex={-1}
            />
          </span>
        </OptionBtn>
      </div>
    </div>
  );
}

export function InteriorHandlesSection(props: InteriorHandlesSectionProps): ReactElement {
  return (
    <div className="control-section">
      <span className="section-title">ידיות</span>

      <div className="wp-tool-card wp-tool-card--handles">
        <InteriorToolCardHeader title="🧷 ידית לכל הארון" />

        <div className="wp-row wp-gap-8 wp-wrap wp-r-handle-global">
          {props.handleTypes.map(t => (
            <OptionBtn
              key={t.id}
              className="wp-flex-1 wp-r-handle-btn"
              selected={props.globalHandleType === t.id}
              onClick={() => props.setGlobalHandle(t.id)}
            >
              {t.label}
            </OptionBtn>
          ))}
        </div>

        {props.globalHandleType === 'edge' ? (
          <InteriorEdgeHandleVariantRow
            className="wp-r-edge-variant-global wp-mt-8"
            selectedVariant={props.globalEdgeHandleVariant}
            onSelect={props.setGlobalEdgeHandleVariant}
          />
        ) : null}

        {props.globalHandleType !== 'none' ? (
          <HandleColorRow
            title="צבע ידית ברירת מחדל"
            selectedColor={props.globalHandleColor}
            onSelect={props.setGlobalHandleColor}
          />
        ) : null}

        <InlineNotice>בחירת ידית כאן מגדירה ידית ברירת מחדל לכל הארון.</InlineNotice>
      </div>

      <ToggleRow
        label="ניהול ידיות מתקדם"
        checked={props.handleControlEnabled}
        onChange={checked => props.setHandleControlEnabled(checked)}
      />

      {props.handleControlEnabled ? (
        <div
          className={cx('wp-tool-card', 'wp-tool-card--handles-advanced', props.isHandleMode && 'is-active')}
        >
          <InteriorToolCardHeader
            title="🛠️ ידית לפי דלת/מגירה"
            active={props.isHandleMode}
            onExit={() => props.toggleHandleMode()}
          />

          <div className="wp-row wp-gap-8 wp-wrap wp-r-handle-advanced">
            {props.handleTypes.map(t => (
              <OptionBtn
                key={t.id}
                className="wp-flex-1 wp-r-handle-btn"
                selected={props.isHandleMode && props.handleToolType === t.id}
                onClick={() => props.toggleHandleMode(t.id)}
              >
                {t.label}
              </OptionBtn>
            ))}
          </div>

          {props.isHandleMode && props.handleToolType === 'edge' ? (
            <InteriorEdgeHandleVariantRow
              className="wp-r-edge-variant-advanced wp-mt-8"
              selectedVariant={props.handleToolEdgeVariant}
              onSelect={props.setHandleModeEdgeVariant}
            />
          ) : null}

          {props.isHandleMode && props.handleToolType !== 'none' ? (
            <HandleColorRow
              title="צבע לידית שתשויך"
              selectedColor={props.handleToolColor}
              onSelect={props.setHandleModeColor}
            />
          ) : null}

          <div className="wp-mt-8">
            <OptionBtn
              className="wp-r-handle-btn wp-r-handle-manual-position-btn"
              selected={props.isManualHandlePositionMode}
              onClick={props.enterManualHandlePositionMode}
            >
              מיקום ידיות ידני
            </OptionBtn>
          </div>

          {props.isHandleMode ? (
            <div className="wp-hint wp-hint--handle wp-mt-8">
              <i className="fas fa-info-circle" aria-hidden="true" />{' '}
              {props.isManualHandlePositionMode
                ? 'רחף על דלת, כוון גובה ורוחב, ולחץ כדי לקבע מיקום ידית ידני.'
                : 'לחץ על דלת או מגירה כדי לשנות ידית, ואז לחץ "סיום עריכה".'}
            </div>
          ) : (
            <InlineNotice>בחר סוג ידית כדי להיכנס למצב עריכה, או לחץ "מיקום ידיות ידני".</InlineNotice>
          )}
        </div>
      ) : (
        <InlineNotice>הפעל "ניהול ידיות מתקדם" כדי לבחור ידית נפרדת לדלת/מגירה.</InlineNotice>
      )}
    </div>
  );
}
