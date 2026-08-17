import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { SettingsVisualDisplaySection } from '../esm/native/ui/react/tabs/settings_visual_sections_display.js';
import { SettingsVisualRoomSection } from '../esm/native/ui/react/tabs/settings_visual_sections_room.js';
import { SettingsVisualLightingSection } from '../esm/native/ui/react/tabs/settings_visual_sections_lighting.js';
const noop = () => {};
const countMatches = (source, pattern) => [...source.matchAll(pattern)].length;
const roomArchitectureModel = {
  roomArchitecture: {
    backWall: { enabled: true, widthCm: 400, heightCm: 280, wardrobeOffsetLeftCm: 50 },
    leftWall: { enabled: true, depthCm: 320, heightCm: 270 },
    rightWall: { enabled: true, depthCm: 280, heightCm: 260 },
    column: { enabled: true, offsetLeftCm: 180, widthCm: 30, depthCm: 20, heightCm: 260, bottomOffsetCm: 20 },
    wallColor: '#f2efe6',
    surfacesHidden: false,
  },
  wardrobeWidthCm: 240,
  wardrobeOffsetRightCm: 110,
  setBackWallEnabled: noop,
  setBackWallDimension: noop,
  setSideWallEnabled: noop,
  setSideWallDimension: noop,
  setArchitectureWallColor: noop,
  setWardrobeOffsetRightCm: noop,
  alignWardrobeOnWall: noop,
  setColumnEnabled: noop,
  setColumnDimension: noop,
  toggleArchitectureVisibility: noop,
};
test('[settings-visual-sections-runtime] display section renders dark mode first', () => {
  const html = renderToStaticMarkup(
    React.createElement(SettingsVisualDisplaySection, {
      model: {
        showDimensions: true,
        mirrorReflectorEnabled: true,
        showContents: false,
        showHanger: true,
        globalClickUi: true,
        darkMode: false,
        onToggleShowDimensions: noop,
        onToggleMirrorReflector: noop,
        onToggleShowHanger: noop,
        onToggleGlobalClick: noop,
        onToggleDarkMode: noop,
      },
    })
  );
  assert.match(html, /toggle-show-dimensions/);
  assert.match(html, /toggle-mirror-reflector/);
  assert.match(html, /toggle-global-click/);
  assert.match(html, /toggle-dark-mode/);
  assert.ok(html.indexOf('toggle-dark-mode') < html.indexOf('toggle-show-dimensions'));
  assert.ok(html.indexOf('toggle-dark-mode') < html.indexOf('toggle-global-click'));
  assert.match(html, /מצב כהה/);
  assert.match(html, /מראה ממשית/);
});
test('[settings-visual-sections-runtime] room section renders canonical room-design controls and fallback notice', () => {
  const roomHtml = renderToStaticMarkup(
    React.createElement(SettingsVisualRoomSection, {
      model: {
        roomData: {
          hasRoomDesign: true,
          defaultWall: '#37474f',
          wallColors: [
            { id: 'wall-white', name: 'לבן', val: '#ffffff' },
            { id: 'wall-sand', name: 'חול', val: '#d9c7a6' },
          ],
        },
        floorType: 'parquet',
        floorStyleId: 'oak',
        wallColor: '#ffffff',
        floorStylesForType: [
          { id: 'oak', name: 'אלון', color: '#a87b4f' },
          { id: 'smoke', name: 'מעושן', color1: '#3a3a3a', color2: '#8c8c8c' },
        ],
        setFloorType: noop,
        pickFloorStyle: noop,
        pickWallColor: noop,
        ...roomArchitectureModel,
      },
    })
  );
  assert.match(roomHtml, /עיצוב סביבה/);
  assert.match(roomHtml, /סגנון ריצוף/);
  assert.match(roomHtml, /קירות ומבנה החדר/);
  assert.match(roomHtml, /קיר אחורי מאחורי הארון/);
  assert.match(roomHtml, /קיר צד שמאל/);
  assert.match(roomHtml, /קיר צד ימין/);
  assert.match(roomHtml, /עמוד בולט מהקיר/);
  assert.match(roomHtml, /הסתר קירות ועמוד/);
  assert.equal(countMatches(roomHtml, /step="5"/g), 13);
  assert.doesNotMatch(roomHtml, /step="0\.1"/);
  assert.match(roomHtml, /פרקט/);
  assert.match(roomHtml, /אריחים/);
  assert.match(roomHtml, /צבע הקירות/);
  assert.match(roomHtml, /בחירת צבע קיר מותאם/);
  assert.match(roomHtml, /בחירת צבע רצפה מותאם/);
  assert.match(roomHtml, /צבע מעטפת החדר \(360°\)/);
  assert.match(roomHtml, /בחירת צבע מעטפת חדר מותאם/);
  assert.equal(countMatches(roomHtml, /wp-r-room-custom-color-btn/g), 3);
  assert.equal(countMatches(roomHtml, /wp-r-room-color-picker-row/g), 3);
  assert.ok(countMatches(roomHtml, /role="button"/g) >= 7);
  const fallbackHtml = renderToStaticMarkup(
    React.createElement(SettingsVisualRoomSection, {
      model: {
        roomData: { hasRoomDesign: false, wallColors: [], defaultWall: '#37474f' },
        floorType: 'none',
        floorStyleId: null,
        wallColor: '',
        floorStylesForType: [],
        setFloorType: noop,
        pickFloorStyle: noop,
        pickWallColor: noop,
        ...roomArchitectureModel,
        roomArchitecture: {
          ...roomArchitectureModel.roomArchitecture,
          backWall: { ...roomArchitectureModel.roomArchitecture.backWall, enabled: false },
        },
      },
    })
  );
  assert.match(fallbackHtml, /לא מצאתי את מודול עיצוב החדר/);
});
test('[settings-visual-sections-runtime] lighting section renders presets and canonical range inputs only when enabled', () => {
  const enabledHtml = renderToStaticMarkup(
    React.createElement(SettingsVisualLightingSection, {
      model: {
        lightingControl: true,
        lastLightPreset: 'natural',
        lightAmb: 0.5,
        lightDir: 0.7,
        lightX: 0.25,
        lightY: 0.4,
        lightZ: 0.6,
        setLightingControl: noop,
        applyLightPreset: noop,
        setLightValue: noop,
      },
    })
  );
  assert.match(enabledHtml, /מצבי תאורה מתקדמים/);
  assert.match(enabledHtml, /רגיל/);
  assert.match(enabledHtml, /יום/);
  assert.match(enabledHtml, /ערב/);
  assert.match(enabledHtml, /חזק/);
  assert.equal(countMatches(enabledHtml, /type="range"/g), 5);
  assert.match(enabledHtml, /עוצמת אור סביבתי/);
  assert.match(enabledHtml, /כיוון אור X/);
  assert.ok(countMatches(enabledHtml, /role="button"/g) >= 4);
  const disabledHtml = renderToStaticMarkup(
    React.createElement(SettingsVisualLightingSection, {
      model: {
        lightingControl: false,
        lastLightPreset: 'default',
        lightAmb: 0.5,
        lightDir: 0.5,
        lightX: 0,
        lightY: 0,
        lightZ: 0,
        setLightingControl: noop,
        applyLightPreset: noop,
        setLightValue: noop,
      },
    })
  );
  assert.doesNotMatch(disabledHtml, /type="range"/);
  assert.doesNotMatch(disabledHtml, /עוצמת אור סביבתי/);
});

test('[settings-visual-sections-runtime] room color rows reserve real scroll-content guards for selected swatch scaling', () => {
  const css = readFileSync(new URL('../css/react_styles.css', import.meta.url), 'utf8');
  const roomRowRule =
    css.match(
      /#reactSidebarRoot \.control-section \.color-picker-row\.wp-r-room-color-picker-row \{[\s\S]*?\n\}/u
    )?.[0] || '';
  const guardRule =
    css.match(
      /#reactSidebarRoot \.control-section \.color-picker-row\.wp-r-room-color-picker-row::before,[\s\S]*?#reactSidebarRoot \.control-section \.color-picker-row\.wp-r-room-color-picker-row::after \{[\s\S]*?\n\}/u
    )?.[0] || '';
  assert.match(roomRowRule, /--wp-r-room-swatch-edge-guard:\s*8px;/u);
  assert.match(roomRowRule, /flex-wrap:\s*nowrap;/u);
  assert.match(roomRowRule, /padding-inline:\s*0;/u);
  assert.match(roomRowRule, /box-sizing:\s*border-box;/u);
  assert.match(roomRowRule, /scroll-padding-inline:\s*var\(--wp-r-room-swatch-edge-guard\);/u);
  assert.match(guardRule, /content:\s*'';/u);
  assert.match(guardRule, /flex:\s*0 0 var\(--wp-r-room-swatch-edge-guard\);/u);
});
