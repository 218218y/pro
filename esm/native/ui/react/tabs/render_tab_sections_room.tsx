import type { ReactElement } from 'react';

import { InlineNotice } from '../components/index.js';
import type { RenderTabRoomSectionModel } from './use_render_tab_controller_contracts.js';
import { FLOOR_TYPE_OPTIONS } from './render_tab_sections_contracts.js';
import {
  ActionTile,
  FloorStyleSwatch,
  WallColorSwatch,
  isFloorStyleSelected,
} from './render_tab_sections_controls.js';

export function RenderRoomSection(props: { model: RenderTabRoomSectionModel }): ReactElement {
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
        <div className="wp-r-label">צבע קיר (360°):</div>
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
