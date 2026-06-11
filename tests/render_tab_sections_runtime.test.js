import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { RenderRoomSection } from '../esm/native/ui/react/tabs/render_tab_sections_room.js';
import { RenderLightingSection } from '../esm/native/ui/react/tabs/render_tab_sections_lighting.js';
const noop = () => {};
const countMatches = (source, pattern) => [...source.matchAll(pattern)].length;
test('[render-tab-sections-runtime] room section renders canonical room-design controls and fallback notice', () => {
  const roomHtml = renderToStaticMarkup(
    React.createElement(RenderRoomSection, {
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
    React.createElement(RenderRoomSection, {
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
test('[render-tab-sections-runtime] lighting section renders presets and canonical range inputs only when enabled', () => {
  const enabledHtml = renderToStaticMarkup(
    React.createElement(RenderLightingSection, {
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
  assert.match(enabledHtml, /פרוז&#x27;קטור/);
  assert.equal(countMatches(enabledHtml, /type="range"/g), 5);
  assert.match(enabledHtml, /עוצמת אור סביבתי/);
  assert.match(enabledHtml, /כיוון אור X/);
  assert.ok(countMatches(enabledHtml, /role="button"/g) >= 4);
  const disabledHtml = renderToStaticMarkup(
    React.createElement(RenderLightingSection, {
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
