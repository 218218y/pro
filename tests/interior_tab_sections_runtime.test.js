import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { InteriorLayoutSection } from '../esm/native/ui/react/tabs/interior_tab_sections_layout.js';
import {
  InteriorExternalDrawersSection,
  InteriorInternalDrawersSection,
  InteriorDividerSection,
} from '../esm/native/ui/react/tabs/interior_tab_sections_drawers.js';
import { InteriorHandlesSection } from '../esm/native/ui/react/tabs/interior_tab_sections_handles.js';
const noop = () => {};
const setStateNoop = () => undefined;
function createLayoutProps(overrides = {}) {
  return {
    layoutActive: true,
    isLayoutMode: true,
    isManualLayoutMode: false,
    isBraceShelvesMode: false,
    isSketchToolActive: false,
    layoutType: 'shelves',
    manualTool: 'shelf',
    manualToolRaw: '',
    manualUiTool: 'shelf',
    activeManualToolForUi: 'shelf',
    currentGridDivisions: 4,
    gridShelfVariant: 'glass',
    showManualRow: true,
    showGridControls: true,
    sketchShelvesOpen: false,
    sketchRowOpen: false,
    sketchBoxHeightCm: 120,
    sketchBoxHeightDraft: '120',
    sketchBoxWidthCm: 60,
    sketchBoxWidthDraft: '60',
    sketchBoxDepthCm: 50,
    sketchBoxDepthDraft: '50',
    sketchStorageHeightCm: 140,
    sketchStorageHeightDraft: '140',
    sketchBoxPanelOpen: false,
    sketchBoxCornicePanelOpen: false,
    sketchBoxCorniceType: 'classic',
    sketchBoxBasePanelOpen: false,
    sketchBoxBaseType: 'plinth',
    sketchExtDrawersPanelOpen: false,
    sketchExtDrawerCount: 3,
    sketchExtDrawerHeightCm: 22,
    sketchExtDrawerHeightDraft: '22',
    sketchIntDrawerHeightCm: 16.5,
    sketchIntDrawerHeightDraft: '16.5',
    sketchShelfDepthByVariant: { regular: 30, double: 30, glass: 28, brace: 45 },
    sketchShelfDepthDraftByVariant: { regular: '30', double: '30', glass: '28', brace: '45' },
    isDoorTrimMode: false,
    doorTrimPanelOpen: false,
    doorTrimColor: 'nickel',
    doorTrimHorizontalSpan: 'half',
    doorTrimHorizontalCustomCm: '',
    doorTrimHorizontalCustomDraft: '',
    doorTrimHorizontalCrossCm: '',
    doorTrimHorizontalCrossDraft: '',
    doorTrimVerticalSpan: 'third',
    doorTrimVerticalCustomCm: '',
    doorTrimVerticalCustomDraft: '',
    doorTrimVerticalCrossCm: '',
    doorTrimVerticalCrossDraft: '',
    layoutTypes: [
      { id: 'shelves', label: 'מדפים', icon: 'fas fa-minus' },
      { id: 'hanging', label: 'תליה', icon: 'fas fa-tshirt' },
      { id: 'brace_shelves', label: 'קושרת', icon: 'fas fa-link' },
    ],
    manualTools: [
      { id: 'shelf', label: 'מדף' },
      { id: 'rod', label: 'מוט' },
      { id: 'storage', label: 'אחסון' },
    ],
    gridDivs: [2, 3, 4],
    setManualRowOpen: setStateNoop,
    setManualUiTool: setStateNoop,
    setSketchShelvesOpen: setStateNoop,
    setSketchRowOpen: setStateNoop,
    setSketchBoxHeightCm: setStateNoop,
    setSketchBoxHeightDraft: setStateNoop,
    setSketchBoxWidthCm: setStateNoop,
    setSketchBoxWidthDraft: setStateNoop,
    setSketchBoxDepthCm: setStateNoop,
    setSketchBoxDepthDraft: setStateNoop,
    setSketchStorageHeightCm: setStateNoop,
    setSketchStorageHeightDraft: setStateNoop,
    setSketchBoxPanelOpen: setStateNoop,
    setSketchBoxCornicePanelOpen: setStateNoop,
    setSketchBoxCorniceType: setStateNoop,
    setSketchBoxBasePanelOpen: setStateNoop,
    setSketchBoxBaseType: setStateNoop,
    setSketchExtDrawersPanelOpen: setStateNoop,
    setSketchExtDrawerCount: setStateNoop,
    setSketchExtDrawerHeightCm: setStateNoop,
    setSketchExtDrawerHeightDraft: setStateNoop,
    setSketchIntDrawerHeightCm: setStateNoop,
    setSketchIntDrawerHeightDraft: setStateNoop,
    setSketchShelfDepthByVariant: setStateNoop,
    setSketchShelfDepthDraftByVariant: setStateNoop,
    setDoorTrimPanelOpen: setStateNoop,
    setDoorTrimColor: noop,
    setDoorTrimHorizontalSpan: setStateNoop,
    setDoorTrimHorizontalCustomCm: setStateNoop,
    setDoorTrimHorizontalCustomDraft: setStateNoop,
    setDoorTrimHorizontalCrossCm: setStateNoop,
    setDoorTrimHorizontalCrossDraft: setStateNoop,
    setDoorTrimVerticalSpan: setStateNoop,
    setDoorTrimVerticalCustomCm: setStateNoop,
    setDoorTrimVerticalCustomDraft: setStateNoop,
    setDoorTrimVerticalCrossCm: setStateNoop,
    setDoorTrimVerticalCrossDraft: setStateNoop,
    enterLayout: noop,
    exitLayoutOrManual: noop,
    enterManual: noop,
    exitManual: noop,
    setGridDivisions: noop,
    setGridShelfVariant: noop,
    activateManualToolId: noop,
    activateDoorTrimMode: noop,
    enterSketchShelfTool: noop,
    enterSketchBoxTool: noop,
    enterSketchBoxCorniceTool: noop,
    enterSketchBoxBaseTool: noop,
    enterSketchExtDrawersTool: noop,
    enterSketchIntDrawersTool: noop,
    ...overrides,
  };
}
function createSketchExternalDrawerControls(overrides = {}) {
  return {
    isSketchToolActive: false,
    manualToolRaw: '',
    sketchExtDrawersPanelOpen: false,
    sketchExtDrawerCount: 3,
    sketchExtDrawerHeightCm: 22,
    sketchExtDrawerHeightDraft: '22',
    setSketchShelvesOpen: setStateNoop,
    setSketchRowOpen: setStateNoop,
    setSketchExtDrawersPanelOpen: setStateNoop,
    setSketchExtDrawerCount: setStateNoop,
    setSketchExtDrawerHeightCm: setStateNoop,
    setSketchExtDrawerHeightDraft: setStateNoop,
    enterSketchExtDrawersTool: noop,
    exitManual: noop,
    ...overrides,
  };
}
function createSketchInternalDrawerControls(overrides = {}) {
  return {
    isSketchToolActive: false,
    manualToolRaw: '',
    sketchIntDrawerHeightCm: 16.5,
    sketchIntDrawerHeightDraft: '16.5',
    setSketchShelvesOpen: setStateNoop,
    setSketchRowOpen: setStateNoop,
    setSketchIntDrawerHeightCm: setStateNoop,
    setSketchIntDrawerHeightDraft: setStateNoop,
    enterSketchIntDrawersTool: noop,
    exitManual: noop,
    ...overrides,
  };
}
test('[interior-tab-sections-runtime] layout section renders canonical layout/manual/sketch controls', () => {
  const html = renderToStaticMarkup(React.createElement(InteriorLayoutSection, createLayoutProps()));
  assert.match(html, /חלוקות פנים/);
  assert.match(html, /חלוקה ידנית/);
  assert.match(html, /חלוקה ידנית לפי סקיצה/);
  assert.match(html, /מספרי חלוקת תאים בארון/);
  assert.match(html, /מדף/);
  assert.match(html, /מוט/);
  assert.match(html, /אחסון/);
  assert.match(html, /סוג מדף/);
  assert.match(html, /גובה מגירה חיצונית/);
  assert.match(html, /גובה מגירה פנימית/);
  assert.match(html, /wp-r-sketch-drawer-height-reset-btn/);
  assert.equal((html.match(/wp-r-sketch-drawer-height-reset-btn/g) || []).length, 2);
  assert.match(html, /type="number"/);
  assert.ok((html.match(/type="button"/g) || []).length >= 10);
});
test('[interior-tab-sections-runtime] drawers and handles sections keep canonical notices and edit controls', () => {
  const externalHtml = renderToStaticMarkup(
    React.createElement(InteriorExternalDrawersSection, {
      wardrobeType: 'hinged',
      isExtDrawerMode: false,
      extDrawerType: 'regular',
      extDrawerCount: 3,
      extCounts: [2, 3, 4],
      enterExtDrawer: noop,
      exitExtDrawer: noop,
      sketchControls: createSketchExternalDrawerControls({
        isSketchToolActive: true,
        manualToolRaw: 'sketch_ext_drawers:3@22',
        sketchExtDrawersPanelOpen: true,
      }),
    })
  );
  assert.match(externalHtml, /מגירות חיצוניות/);
  assert.match(externalHtml, /נעליים/);
  assert.match(externalHtml, /רגילות/);
  assert.match(externalHtml, /מגירות חיצוניות לפי סקיצה/);
  assert.match(externalHtml, /גובה מגירה חיצונית/);
  assert.match(externalHtml, /wp-r-sketch-drawer-height-reset-btn/);
  assert.doesNotMatch(externalHtml, /בחר סוג מגירות ואז לחץ על תא כדי ליישם/);
  const internalHtml = renderToStaticMarkup(
    React.createElement(InteriorInternalDrawersSection, {
      internalDrawersEnabled: true,
      isIntDrawerMode: true,
      setInternalDrawersEnabled: noop,
      toggleIntDrawerMode: noop,
      sketchControls: createSketchInternalDrawerControls({
        isSketchToolActive: true,
        manualToolRaw: 'sketch_int_drawers@16.5',
      }),
    })
  );
  assert.match(internalHtml, /מגירות פנימיות/);
  assert.match(internalHtml, /מיקום מגירות פנימיות/);
  assert.match(internalHtml, /סיום עריכה/);
  assert.match(internalHtml, /מגירות פנימיות לפי סקיצה/);
  assert.match(internalHtml, /גובה מגירה פנימית/);
  const dividerHtml = renderToStaticMarkup(
    React.createElement(InteriorDividerSection, { isDividerMode: false, toggleDividerMode: noop })
  );
  assert.match(dividerHtml, /מחיצה למגירה/);
  assert.match(dividerHtml, /הוסף\/הסר מחיצה/);
  const handlesHtml = renderToStaticMarkup(
    React.createElement(InteriorHandlesSection, {
      handleControlEnabled: true,
      isHandleMode: true,
      globalHandleType: 'edge',
      handleToolType: 'edge',
      globalHandleColor: 'nickel',
      handleToolColor: 'gold',
      globalEdgeHandleVariant: 'long',
      handleToolEdgeVariant: 'short',
      handleTypes: [
        { id: 'standard', label: 'רגילה' },
        { id: 'edge', label: 'קנט' },
        { id: 'none', label: 'ללא' },
      ],
      setGlobalHandle: noop,
      setGlobalHandleColor: noop,
      setGlobalEdgeHandleVariant: noop,
      setHandleControlEnabled: noop,
      toggleHandleMode: noop,
      setHandleModeColor: noop,
      setHandleModeEdgeVariant: noop,
    })
  );
  assert.match(handlesHtml, /ידיות/);
  assert.match(handlesHtml, /ידית לכל הארון/);
  assert.match(handlesHtml, /ניהול ידיות מתקדם/);
  assert.match(handlesHtml, /ידית לפי דלת\/מגירה/);
  assert.match(handlesHtml, /צבע ידית ברירת מחדל/);
  assert.match(handlesHtml, /צבע לידית שתשויך/);
  assert.match(handlesHtml, /לחץ על דלת או מגירה כדי לשנות ידית/);
});
