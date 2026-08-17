import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent, ReactElement } from 'react';

import { InlineNotice, ToggleRow } from '../components/index.js';
import type { SettingsVisualRoomSectionModel } from './use_settings_visual_controller_contracts.js';
import { FLOOR_TYPE_OPTIONS } from './settings_visual_sections_contracts.js';
import type { FloorStyle, SettingsVisualFloorType } from './settings_visual_shared_contracts.js';
import {
  ActionTile,
  FloorStyleSwatch,
  WallColorSwatch,
  isFloorStyleSelected,
} from './settings_visual_sections_controls.js';
import { DEFAULT_WALL_COLORS } from './settings_visual_shared_room.js';

const CUSTOM_FLOOR_COLOR_STYLE_ID_PREFIX = 'wp_custom_floor_color_';

function normalizePickerColor(value: string, fallback = '#d9d9d9'): string {
  const normalized = String(value || '')
    .trim()
    .toLowerCase();
  return /^#[0-9a-f]{6}$/u.test(normalized) ? normalized : fallback;
}

function buildCustomFloorStyle(type: SettingsVisualFloorType, value: string): FloorStyle {
  const color = normalizePickerColor(value);
  const id = `${CUSTOM_FLOOR_COLOR_STYLE_ID_PREFIX}${color.slice(1)}`;
  const base: FloorStyle = { id, name: 'מותאם', color };
  if (type === 'parquet') return { ...base, color1: color, color2: color };
  if (type === 'tiles') {
    return {
      ...base,
      color1: color,
      color2: color,
      lines: 'rgba(0,0,0,0.16)',
      size: 4,
    };
  }
  return base;
}

function readCustomFloorColor(styleId: string | null): string | null {
  if (!styleId || !styleId.startsWith(CUSTOM_FLOOR_COLOR_STYLE_ID_PREFIX)) return null;
  const hex = styleId.slice(CUSTOM_FLOOR_COLOR_STYLE_ID_PREFIX.length).toLowerCase();
  return /^[0-9a-f]{6}$/u.test(hex) ? `#${hex}` : null;
}

function resolveFloorPickerColor(model: SettingsVisualRoomSectionModel): string {
  const custom = readCustomFloorColor(model.floorStyleId);
  if (custom) return custom;
  const selectedStyle = model.floorStylesForType.find(style => style.id === model.floorStyleId);
  return normalizePickerColor(selectedStyle?.color || selectedStyle?.color1 || '#d9d9d9');
}

function InlineCustomColorButton(props: {
  id: string;
  value: string;
  selected: boolean;
  title: string;
  onChange: (value: string) => void;
}): ReactElement {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const color = normalizePickerColor(props.value);

  return (
    <span className="wp-r-room-custom-color-control">
      <button
        type="button"
        className={'wp-r-room-custom-color-btn' + (props.selected ? ' is-selected' : '')}
        onClick={() => inputRef.current?.click()}
        title={props.title}
        aria-label={props.title}
      >
        <span
          className="wp-r-room-custom-color-preview"
          aria-hidden="true"
          style={{ backgroundColor: color }}
        />
        <span>מותאם</span>
      </button>
      <input
        ref={inputRef}
        id={props.id}
        name={props.id}
        type="color"
        value={color}
        onChange={(event: ChangeEvent<HTMLInputElement>) => props.onChange(event.target.value)}
        aria-label={props.title}
        className="wp-r-room-custom-color-input"
        tabIndex={-1}
      />
    </span>
  );
}

type ArchitectureNumberFieldProps = {
  id: string;
  label: string;
  value: number;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
};

function ArchitectureNumberField(props: ArchitectureNumberFieldProps): ReactElement {
  const [draft, setDraft] = useState(String(props.value));

  useEffect(() => {
    setDraft(String(props.value));
  }, [props.value]);

  const commitDraft = (raw: string): boolean => {
    if (!raw.trim()) return false;
    const value = Number(raw);
    if (!Number.isFinite(value)) return false;
    props.onChange(value);
    return true;
  };

  return (
    <div className="wp-r-field wp-r-room-architecture-field">
      <div className="wp-r-label-row">
        <label htmlFor={props.id}>{props.label}</label>
      </div>
      <div className="wp-r-input-row">
        <input
          id={props.id}
          name={props.id}
          type="number"
          className="wp-r-input"
          value={draft}
          min={props.min ?? 0}
          max={props.max}
          step="5"
          onChange={(event: ChangeEvent<HTMLInputElement>) => {
            const raw = event.target.value;
            setDraft(raw);
            commitDraft(raw);
          }}
          onBlur={() => {
            if (!commitDraft(draft)) setDraft(String(props.value));
          }}
          onKeyDown={(event: import('react').KeyboardEvent<HTMLInputElement>) => {
            if (event.key === 'Enter') event.currentTarget.blur();
          }}
          onWheel={(event: import('react').WheelEvent<HTMLInputElement>) => event.currentTarget.blur()}
        />
        <span className="wp-r-room-architecture-unit" aria-hidden="true">
          ס״מ
        </span>
      </div>
    </div>
  );
}

function SideWallControls(props: {
  model: SettingsVisualRoomSectionModel;
  side: 'leftWall' | 'rightWall';
  title: string;
  testId: string;
}): ReactElement {
  const wall = props.model.roomArchitecture[props.side];
  const idPrefix = props.side === 'leftWall' ? 'left' : 'right';

  return (
    <div className="wp-r-room-column-block">
      <ToggleRow
        label={props.title}
        checked={wall.enabled}
        onChange={enabled => props.model.setSideWallEnabled(props.side, enabled)}
        testId={props.testId}
      />
      {wall.enabled ? (
        <div className="wp-r-room-dimension-grid">
          <ArchitectureNumberField
            id={`wp-room-${idPrefix}-wall-depth`}
            label="אורך הקיר לתוך החדר"
            value={wall.depthCm}
            min={20}
            max={2000}
            onChange={value => props.model.setSideWallDimension(props.side, 'depthCm', value)}
          />
          <ArchitectureNumberField
            id={`wp-room-${idPrefix}-wall-height`}
            label="גובה הקיר"
            value={wall.heightCm}
            min={50}
            max={1000}
            onChange={value => props.model.setSideWallDimension(props.side, 'heightCm', value)}
          />
        </div>
      ) : null}
    </div>
  );
}

function ArchitectureWallColorPicker(props: { model: SettingsVisualRoomSectionModel }): ReactElement {
  const selectedColor = props.model.roomArchitecture.wallColor.toLowerCase();
  const customSelected = !DEFAULT_WALL_COLORS.some(color => color.val.toLowerCase() === selectedColor);

  return (
    <div className="wp-r-mt-8">
      <div className="wp-r-label">צבע הקירות:</div>
      <div className="color-picker-row wp-r-room-color-picker-row">
        {DEFAULT_WALL_COLORS.map(color => (
          <WallColorSwatch
            key={`architecture-${color.id}`}
            value={color.val}
            title={String(color.name || color.id)}
            selected={selectedColor === color.val.toLowerCase()}
            onSelect={props.model.setArchitectureWallColor}
          />
        ))}
        <InlineCustomColorButton
          id="wp-r-room-custom-wall-color"
          value={props.model.roomArchitecture.wallColor}
          selected={customSelected}
          title="בחירת צבע קיר מותאם"
          onChange={props.model.setArchitectureWallColor}
        />
      </div>
    </div>
  );
}

function RoomOpeningsControls(props: { model: SettingsVisualRoomSectionModel }): ReactElement {
  const { model } = props;
  const [kind, setKind] = useState<'window' | 'door'>('window');
  const [widthCm, setWidthCm] = useState(120);
  const [heightCm, setHeightCm] = useState(100);
  const [placementArmed, setPlacementArmed] = useState(false);
  const openingCountRef = useRef(model.roomArchitecture.openings.length);

  useEffect(() => {
    const nextCount = model.roomArchitecture.openings.length;
    if (nextCount > openingCountRef.current) setPlacementArmed(false);
    openingCountRef.current = nextCount;
  }, [model.roomArchitecture.openings.length]);

  const selectKind = (nextKind: 'window' | 'door') => {
    setKind(nextKind);
    setWidthCm(nextKind === 'door' ? 90 : 120);
    setHeightCm(nextKind === 'door' ? 210 : 100);
    setPlacementArmed(false);
    model.cancelOpeningPlacement();
  };

  const wallLabel = (wall: 'back' | 'left' | 'right') =>
    wall === 'back' ? 'קיר אחורי' : wall === 'left' ? 'קיר שמאלי' : 'קיר ימני';

  return (
    <div className="wp-r-room-openings-block" data-testid="settings-room-openings">
      <div className="wp-r-label">חלונות ודלתות:</div>
      <div className="wp-r-room-opening-kind-actions" role="group" aria-label="סוג הפתח להוספה">
        <button
          type="button"
          className={`btn${kind === 'window' ? ' is-selected' : ''}`}
          onClick={() => selectKind('window')}
          aria-pressed={kind === 'window'}
        >
          <i className="fas fa-border-all" aria-hidden="true"></i> חלון
        </button>
        <button
          type="button"
          className={`btn${kind === 'door' ? ' is-selected' : ''}`}
          onClick={() => selectKind('door')}
          aria-pressed={kind === 'door'}
        >
          <i className="fas fa-door-open" aria-hidden="true"></i> דלת
        </button>
      </div>

      <div className="wp-r-room-dimension-grid wp-r-room-opening-size-grid">
        <ArchitectureNumberField
          id="wp-room-opening-width"
          label={kind === 'door' ? 'רוחב הדלת' : 'רוחב החלון'}
          value={widthCm}
          min={20}
          max={1000}
          onChange={setWidthCm}
        />
        <ArchitectureNumberField
          id="wp-room-opening-height"
          label={kind === 'door' ? 'גובה הדלת' : 'גובה החלון'}
          value={heightCm}
          min={20}
          max={1000}
          onChange={setHeightCm}
        />
      </div>

      <div className="wp-r-room-opening-placement-actions">
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => setPlacementArmed(model.beginOpeningPlacement(kind, widthCm, heightCm))}
          data-testid="settings-room-opening-place"
        >
          <i className="fas fa-crosshairs" aria-hidden="true"></i>{' '}
          {kind === 'door' ? 'מקם דלת על קיר' : 'מקם חלון על קיר'}
        </button>
        {placementArmed ? (
          <button
            type="button"
            className="btn"
            onClick={() => {
              model.cancelOpeningPlacement();
              setPlacementArmed(false);
            }}
          >
            ביטול מיקום
          </button>
        ) : null}
      </div>

      {placementArmed ? (
        <InlineNotice className="wp-r-mt-8">
          העבר את העכבר על הקיר האחורי, הימני או השמאלי. התצוגה המקדימה והמידות יתעדכנו לפי הקיר; לחיצה תקבע
          את {kind === 'door' ? 'הדלת' : 'החלון'} במקום.
        </InlineNotice>
      ) : null}

      {model.roomArchitecture.openings.length ? (
        <div className="wp-r-room-opening-list" aria-label="פתחים קיימים">
          {model.roomArchitecture.openings.map(opening => (
            <div className="wp-r-room-opening-list-item" key={opening.id}>
              <div>
                <strong>{opening.kind === 'door' ? 'דלת' : 'חלון'}</strong>
                <span>
                  {wallLabel(opening.wall)} · {opening.widthCm}×{opening.heightCm} ס״מ
                </span>
              </div>
              <button
                type="button"
                className="btn wp-r-room-opening-remove"
                onClick={() => model.removeOpening(opening.id)}
                aria-label={`הסר ${opening.kind === 'door' ? 'דלת' : 'חלון'}`}
                title="הסרת הפתח"
              >
                <i className="fas fa-trash-alt" aria-hidden="true"></i>
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function RoomArchitectureControls(props: { model: SettingsVisualRoomSectionModel }): ReactElement {
  const model = props.model;
  const architecture = model.roomArchitecture;
  const wall = architecture.backWall;
  const column = architecture.column;
  const wallMax = Math.max(50, wall.widthCm);
  const wallHeightMax = Math.max(50, wall.heightCm);

  return (
    <div className="wp-r-room-architecture" data-testid="settings-room-architecture">
      <div className="wp-r-room-architecture-heading">
        <div>
          <div className="wp-r-room-architecture-title">קירות ומבנה החדר</div>
          <div className="wp-r-room-architecture-subtitle">
            הקירות והעמוד הם חלק מההדמיה; עמוד פעיל גם מתאים את בניית הארון סביבו.
          </div>
        </div>
      </div>

      <ToggleRow
        label="הוספת קירות"
        checked={wall.enabled}
        onChange={model.setBackWallEnabled}
        testId="settings-room-back-wall-toggle"
      />

      {wall.enabled ? (
        <div className="wp-r-room-architecture-body">
          <div className="wp-r-room-dimension-grid">
            <ArchitectureNumberField
              id="wp-room-wall-width"
              label="רוחב הקיר"
              value={wall.widthCm}
              min={50}
              max={2000}
              onChange={value => model.setBackWallDimension('widthCm', value)}
            />
            <ArchitectureNumberField
              id="wp-room-wall-height"
              label="גובה הקיר"
              value={wall.heightCm}
              min={50}
              max={1000}
              onChange={value => model.setBackWallDimension('heightCm', value)}
            />
          </div>

          <div className="wp-r-room-position-block">
            <div className="wp-r-label">מיקום הארון על הקיר:</div>
            <div className="wp-r-room-align-actions" role="group" aria-label="יישור הארון על הקיר">
              <button type="button" className="btn" onClick={() => model.alignWardrobeOnWall('left')}>
                צמוד שמאל
              </button>
              <button type="button" className="btn" onClick={() => model.alignWardrobeOnWall('center')}>
                מרכז
              </button>
              <button type="button" className="btn" onClick={() => model.alignWardrobeOnWall('right')}>
                צמוד ימין
              </button>
            </div>
            <div className="wp-r-room-dimension-grid wp-r-room-offset-grid">
              <ArchitectureNumberField
                id="wp-room-wardrobe-left-offset"
                label="מרחק משמאל"
                value={wall.wardrobeOffsetLeftCm}
                min={0}
                max={wallMax}
                onChange={value => model.setBackWallDimension('wardrobeOffsetLeftCm', value)}
              />
              <ArchitectureNumberField
                id="wp-room-wardrobe-right-offset"
                label="מרחק מימין"
                value={model.wardrobeOffsetRightCm}
                min={0}
                max={wallMax}
                onChange={model.setWardrobeOffsetRightCm}
              />
            </div>
            {model.wardrobeOffsetRightCm < 0 ? (
              <InlineNotice className="wp-r-mt-8">
                רוחב הקיר קטן מרוחב הארון ב־{Math.abs(model.wardrobeOffsetRightCm).toFixed(1)} ס״מ. הגדל את
                רוחב הקיר כדי למקם את הארון כולו בתוכו.
              </InlineNotice>
            ) : null}
          </div>

          <SideWallControls
            model={model}
            side="leftWall"
            title="קיר צד שמאל"
            testId="settings-room-left-wall-toggle"
          />
          <SideWallControls
            model={model}
            side="rightWall"
            title="קיר צד ימין"
            testId="settings-room-right-wall-toggle"
          />

          <div className="wp-r-room-column-block">
            <ToggleRow
              label="עמוד בולט מהקיר"
              checked={column.enabled}
              onChange={model.setColumnEnabled}
              testId="settings-room-column-toggle"
            />

            {column.enabled ? (
              <div className="wp-r-room-dimension-grid wp-r-room-column-grid">
                <ArchitectureNumberField
                  id="wp-room-column-offset"
                  label="מיקום משמאל"
                  value={column.offsetLeftCm}
                  min={0}
                  max={wallMax}
                  onChange={value => model.setColumnDimension('offsetLeftCm', value)}
                />
                <ArchitectureNumberField
                  id="wp-room-column-width"
                  label="רוחב העמוד"
                  value={column.widthCm}
                  min={1}
                  max={wallMax}
                  onChange={value => model.setColumnDimension('widthCm', value)}
                />
                <ArchitectureNumberField
                  id="wp-room-column-depth"
                  label="עומק הבליטה"
                  value={column.depthCm}
                  min={1}
                  max={300}
                  onChange={value => model.setColumnDimension('depthCm', value)}
                />
                <ArchitectureNumberField
                  id="wp-room-column-height"
                  label="גובה העמוד"
                  value={column.heightCm}
                  min={1}
                  max={wallHeightMax}
                  onChange={value => model.setColumnDimension('heightCm', value)}
                />
                <ArchitectureNumberField
                  id="wp-room-column-bottom"
                  label="התחלה מהרצפה"
                  value={column.bottomOffsetCm}
                  min={0}
                  max={wallHeightMax}
                  onChange={value => model.setColumnDimension('bottomOffsetCm', value)}
                />
              </div>
            ) : null}
          </div>

          <RoomOpeningsControls model={model} />

          <button
            type="button"
            className="btn wp-r-room-visibility-btn"
            onClick={model.toggleArchitectureVisibility}
            data-testid="settings-room-architecture-visibility"
          >
            <i className={architecture.surfacesHidden ? 'fas fa-eye' : 'fas fa-eye-slash'}></i>{' '}
            {architecture.surfacesHidden ? 'הצג קירות ועמוד' : 'הסתר קירות ועמוד'}
          </button>
          {architecture.surfacesHidden && column.enabled ? (
            <div className="wp-r-room-architecture-hidden-note">
              הקירות והעמוד מוסתרים רק בתצוגה. החיתוכים וההתאמות של הארון לעמוד נשארים פעילים.
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function SettingsVisualRoomSection(props: { model: SettingsVisualRoomSectionModel }): ReactElement {
  const model = props.model;

  return (
    <div className="control-section">
      <span className="section-title">עיצוב סביבה</span>
      {!model.roomData.hasRoomDesign ? (
        <InlineNotice className="wp-r-mt-8">
          לא מצאתי את מודול עיצוב החדר (roomDesign) באפליקציה. אם זה קורה רק אצלך — תשלח לי את הלוג/ה-build
          ונחבר אותו.
        </InlineNotice>
      ) : null}

      <RoomArchitectureControls model={model} />

      <div className="wp-r-mt-8">
        <div className="wp-r-label">סגנון ריצוף:</div>
        <div className="type-selector wp-r-type-selector wp-r-floor-type-selector">
          {FLOOR_TYPE_OPTIONS.map(option => (
            <ActionTile
              key={option.id}
              selected={model.floorType === option.id}
              icon={option.icon}
              onActivate={() => model.setFloorType(option.id)}
            >
              {option.label}
            </ActionTile>
          ))}
        </div>
      </div>

      <div className="wp-r-mt-8">
        <div className="wp-r-label">גוון רצפה:</div>
        <div className="color-picker-row wp-r-room-color-picker-row">
          {model.floorStylesForType.map(style => (
            <FloorStyleSwatch
              key={style.id}
              styleDef={style}
              selected={isFloorStyleSelected(model.floorStyleId, style)}
              onSelect={model.pickFloorStyle}
            />
          ))}
          <InlineCustomColorButton
            id="wp-r-room-custom-floor-color"
            value={resolveFloorPickerColor(model)}
            selected={readCustomFloorColor(model.floorStyleId) !== null}
            title="בחירת צבע רצפה מותאם"
            onChange={value => model.pickFloorStyle(buildCustomFloorStyle(model.floorType, value))}
          />
        </div>
      </div>

      <ArchitectureWallColorPicker model={model} />

      <div className="wp-r-mt-8">
        <div className="wp-r-label">צבע מעטפת החדר (360°):</div>
        <div className="color-picker-row wp-r-room-color-picker-row">
          {model.roomData.wallColors.map(color => {
            const value = String(color.val || '');
            const selected = value && String(model.wallColor || '').toLowerCase() === value.toLowerCase();
            return (
              <WallColorSwatch
                key={String(color.id || value)}
                value={value}
                title={String(color.name || '')}
                selected={!!selected}
                onSelect={model.pickWallColor}
              />
            );
          })}
          <InlineCustomColorButton
            id="wp-r-room-custom-envelope-color"
            value={normalizePickerColor(model.wallColor, model.roomData.defaultWall || '#37474f')}
            selected={
              !model.roomData.wallColors.some(
                color => String(color.val || '').toLowerCase() === String(model.wallColor || '').toLowerCase()
              )
            }
            title="בחירת צבע מעטפת חדר מותאם"
            onChange={model.pickWallColor}
          />
        </div>
      </div>
    </div>
  );
}
