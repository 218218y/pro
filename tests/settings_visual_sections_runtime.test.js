import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { SettingsVisualDisplaySection } from '../esm/native/ui/react/tabs/settings_visual_sections_display.js';
import { SettingsVisualRoomSection } from '../esm/native/ui/react/tabs/settings_visual_sections_room.js';
import { SettingsVisualLightingSection } from '../esm/native/ui/react/tabs/settings_visual_sections_lighting.js';
const noop = () => {};
const countMatches = (source, pattern) => [...source.matchAll(pattern)].length;
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
      },
    })
  );
  assert.match(roomHtml, /עיצוב סביבה/);
  assert.match(roomHtml, /סגנון ריצוף/);
  assert.match(roomHtml, /פרקט/);
  assert.match(roomHtml, /אריחים/);
  assert.match(roomHtml, /צבע קיר \(360°\)/);
  assert.ok(countMatches(roomHtml, /role="button"/g) >= 7);
  const fallbackHtml = renderToStaticMarkup(
    React.createElement(SettingsVisualRoomSection, {
      model: {
        roomData: { hasRoomDesign: false, wallColors: [] },
        floorType: 'none',
        floorStyleId: null,
        wallColor: '',
        floorStylesForType: [],
        setFloorType: noop,
        pickFloorStyle: noop,
        pickWallColor: noop,
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
