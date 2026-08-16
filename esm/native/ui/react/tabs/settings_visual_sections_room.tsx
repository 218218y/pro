import { useEffect, useState } from 'react';
import type { ReactElement } from 'react';

import { InlineNotice, ToggleRow } from '../components/index.js';
import type { SettingsVisualRoomSectionModel } from './use_settings_visual_controller_contracts.js';
import { FLOOR_TYPE_OPTIONS } from './settings_visual_sections_contracts.js';
import {
  ActionTile,
  FloorStyleSwatch,
  WallColorSwatch,
  isFloorStyleSelected,
} from './settings_visual_sections_controls.js';

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
          onChange={(event: import('react').ChangeEvent<HTMLInputElement>) => {
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
            הקיר והעמוד הם חלק מההדמיה; עמוד פעיל גם מתאים את בניית הארון סביבו.
          </div>
        </div>
      </div>

      <ToggleRow
        label="קיר אחורי מאחורי הארון"
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

          <button
            type="button"
            className="btn wp-r-room-visibility-btn"
            onClick={model.toggleArchitectureVisibility}
            data-testid="settings-room-architecture-visibility"
          >
            <i className={architecture.surfacesHidden ? 'fas fa-eye' : 'fas fa-eye-slash'}></i>{' '}
            {architecture.surfacesHidden ? 'הצג קיר ועמוד' : 'הסתר קיר ועמוד'}
          </button>
          {architecture.surfacesHidden && column.enabled ? (
            <div className="wp-r-room-architecture-hidden-note">
              הקיר והעמוד מוסתרים רק בתצוגה. החיתוכים וההתאמות של הארון לעמוד נשארים פעילים.
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
        <div className="color-picker-row">
          {model.floorStylesForType.map(style => (
            <FloorStyleSwatch
              key={style.id}
              styleDef={style}
              selected={isFloorStyleSelected(model.floorStyleId, style)}
              onSelect={model.pickFloorStyle}
            />
          ))}
        </div>
      </div>

      <div className="wp-r-mt-8">
        <div className="wp-r-label">צבע מעטפת החדר (360°):</div>
        <div className="color-picker-row">
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
        </div>
      </div>
    </div>
  );
}
