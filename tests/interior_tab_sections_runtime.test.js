import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { InteriorLayoutSection } from '../esm/native/ui/react/tabs/interior_tab_sections_layout.js';
import { InteriorLayoutManualControls } from '../esm/native/ui/react/tabs/interior_layout_manual_controls.js';
import {
  InteriorSketchShelfDepthField,
  InteriorSketchStorageHeightField,
} from '../esm/native/ui/react/tabs/interior_layout_sketch_shelves_section.js';
import { InteriorLayoutSketchToolsPanel } from '../esm/native/ui/react/tabs/interior_layout_sketch_controls.js';
import {
  InteriorExternalDrawersSection,
  InteriorInternalDrawersSection,
  InteriorDividerSection,
} from '../esm/native/ui/react/tabs/interior_tab_sections_drawers.js';
import { InteriorHandlesSection } from '../esm/native/ui/react/tabs/interior_tab_sections_handles.js';
import fs from 'node:fs';
import path from 'node:path';
const noop = () => {};
const setStateNoop = () => undefined;
function findElementByTestId(node, testId) {
  if (!node || typeof node !== 'object') return null;
  if (node.props?.['data-testid'] === testId || node.props?.testId === testId) return node;
  const children = node.props?.children;
  if (Array.isArray(children)) {
    for (const child of children) {
      const match = findElementByTestId(child, testId);
      if (match) return match;
    }
    return null;
  }
  return findElementByTestId(children, testId);
}

function createLayoutProps(overrides = {}) {
  return {
    wardrobeType: 'hinged',
    isChestMode: false,
    layoutActive: true,
    isLayoutMode: true,
    isManualLayoutMode: false,
    isBraceShelvesMode: false,
    isSketchToolActive: false,
    isSketchDivisionToolActive: false,
    layoutType: 'shelves',
    manualTool: 'shelf',
    manualToolRaw: '',
    manualUiTool: 'shelf',
    activeManualToolForUi: 'shelf',
    currentGridDivisions: 4,
    gridShelfVariant: 'glass',
    showManualRow: true,
    showGridControls: true,
    showShelfVariantControls: true,
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
    sketchBoxPlinthHeightCm: 8,
    sketchBoxPlinthHeightDraft: '8',
    sketchBoxLegStyle: 'tapered',
    sketchBoxLegColor: 'black',
    sketchBoxLegPlatformMode: 'stage',
    sketchBoxLegPlatformSideMode: 'overhang',
    sketchBoxLegPlatformSideOverhangCm: 1.5,
    sketchBoxLegPlatformFrontOverhangCm: 2,
    sketchBoxLegHeightCm: 12,
    sketchBoxLegHeightDraft: '12',
    sketchBoxLegWidthCm: 4,
    sketchBoxLegWidthDraft: '4',
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
    setSketchBoxPlinthHeightCm: setStateNoop,
    setSketchBoxPlinthHeightDraft: setStateNoop,
    setSketchBoxLegStyle: setStateNoop,
    setSketchBoxLegColor: setStateNoop,
    setSketchBoxLegPlatformMode: setStateNoop,
    setSketchBoxLegPlatformSideMode: setStateNoop,
    setSketchBoxLegPlatformSideOverhangCm: setStateNoop,
    setSketchBoxLegPlatformFrontOverhangCm: setStateNoop,
    setSketchBoxLegHeightCm: setStateNoop,
    setSketchBoxLegHeightDraft: setStateNoop,
    setSketchBoxLegWidthCm: setStateNoop,
    setSketchBoxLegWidthDraft: setStateNoop,
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
    enterSketchDivision: noop,
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

test('[interior-tab-sections-runtime] SketchTabView marks the sketch tool card active only from real edit modes', () => {
  const src = fs.readFileSync(path.resolve('esm/native/ui/react/tabs/SketchTab.view.tsx'), 'utf8');
  assert.doesNotMatch(src, /wp-tool-card wp-tool-card--layout is-active/);
  assert.match(src, /state\.isDoorTrimMode \|\| \(!state\.isChestMode && state\.isSketchToolActive\)/);
});
test('[interior-tab-sections-runtime] SketchTabView keeps box cell-dims after sketch tools and hides it in chest mode', () => {
  const src = fs.readFileSync(path.resolve('esm/native/ui/react/tabs/SketchTab.view.tsx'), 'utf8');
  const toolsIndex = src.indexOf('<InteriorLayoutSketchToolsPanel');
  const chestGuardIndex = src.indexOf('{!state.isChestMode && (');
  const cellDimsIndex = src.indexOf('className="control-section wp-sketch-box-cell-dims-section"');

  assert.ok(toolsIndex >= 0, 'expected sketch tools panel in SketchTabView');
  assert.ok(chestGuardIndex > toolsIndex, 'expected chest guard after the sketch tools');
  assert.ok(cellDimsIndex > chestGuardIndex, 'expected the box cell-dims action inside the non-chest guard');
  assert.match(src, /modeLabel="שינוי מידות מיוחדות לקופסא"/);
  assert.match(src, /hideForSliding=\{false\}/);
  assert.match(src, /useStructureCellDimsControlsProps/);
});

test('[interior-tab-sections-runtime] InteriorTab hides layout and drawer sections in chest mode but keeps divider and handles', () => {
  const src = fs.readFileSync(path.resolve('esm/native/ui/react/tabs/InteriorTab.view.tsx'), 'utf8');

  assert.match(src, /!state\.isChestMode \? \(/);
  assert.match(src, /<InteriorLayoutSection/);
  assert.match(src, /<InteriorExternalDrawersSection/);
  assert.match(src, /<InteriorInternalDrawersSection/);
  assert.match(src, /<InteriorDividerSection/);
  assert.match(src, /<InteriorHandlesSection/);
});
test('[interior-tab-sections-runtime] layout section renders canonical layout/manual controls with the sketch-division toggle', () => {
  const html = renderToStaticMarkup(React.createElement(InteriorLayoutSection, createLayoutProps()));
  assert.match(html, /חלוקות פנים/);
  assert.match(html, /חלוקה ידנית/);
  assert.doesNotMatch(html, /חלוקה ידנית לפי סקיצה/);
  assert.match(html, /חלוקה לפי סקיצה/);
  assert.match(html, /מספרי חלוקת תאים בארון/);
  assert.match(html, /מדף/);
  assert.match(html, /מוט/);
  assert.match(html, /אחסון/);
  assert.doesNotMatch(html, /גובה מגירה פנימית/);
});

test('[interior-tab-sections-runtime] manual controls keep tool selection while toggling sketch division mode', () => {
  const calls = [];
  const props = createLayoutProps({
    activeManualToolForUi: 'storage',
    enterSketchDivision: (...args) => calls.push(['enterSketchDivision', ...args]),
    enterManual: (...args) => calls.push(['enterManual', ...args]),
  });
  const tree = InteriorLayoutManualControls(props);
  const sketchButton = findElementByTestId(tree, 'interior-manual-layout-sketch-button');
  assert.ok(sketchButton);
  sketchButton.props.onClick();
  assert.deepEqual(calls, [['enterSketchDivision', 'storage', 'glass']]);

  calls.length = 0;
  const sketchTree = InteriorLayoutManualControls(
    createLayoutProps({
      isManualLayoutMode: true,
      isSketchToolActive: true,
      isSketchDivisionToolActive: true,
      manualTool: 'rod',
      manualToolRaw: 'sketch_rod',
      activeManualToolForUi: 'rod',
      showGridControls: false,
      showShelfVariantControls: false,
      enterSketchDivision: (...args) => calls.push(['enterSketchDivision', ...args]),
      enterManual: (...args) => calls.push(['enterManual', ...args]),
    })
  );
  const storageButton = findElementByTestId(sketchTree, 'interior-manual-tool-storage-button');
  assert.ok(storageButton);
  storageButton.props.onClick();
  assert.deepEqual(calls, [['enterSketchDivision', 'storage', 'glass']]);
});

test('[interior-tab-sections-runtime] sketch tools panel renders the moved sketch controls without the old master toggle', () => {
  const html = renderToStaticMarkup(React.createElement(InteriorLayoutSketchToolsPanel, createLayoutProps()));
  assert.doesNotMatch(html, /חלוקה ידנית לפי סקיצה/);
  assert.match(html, /מדפים ותלייה/);
  assert.match(html, /מדפים/);
  assert.match(html, /תלייה/);
  assert.match(html, /אוגר מצעים/);
  assert.match(html, /קופסא חופשית/);
  assert.match(html, /פסי עיטור לדלת/);
  assert.match(html, /מגירות חיצוניות לפי סקיצה/);
  assert.match(html, /מגירות פנימיות לפי סקיצה/);
  assert.match(html, /גובה מגירה פנימית/);
  assert.match(html, /עומק מדף/);
  assert.match(html, /גובה אוגר מצעים/);
  assert.match(html, /fa-box-open/);
  assert.match(html, /wp-r-sketch-drawer-height-reset-btn/);
  assert.match(html, /interior-sketch-shelf-depth-reset-button/);
  assert.match(html, /interior-sketch-storage-height-reset-button/);
  assert.ok((html.match(/wp-r-sketch-drawer-height-reset-btn/g) || []).length >= 4);
  assert.ok((html.match(/type="button"/g) || []).length >= 11);
});

test('[interior-tab-sections-runtime] free box legs expose the same platform controls as regular cabinet legs', () => {
  const html = renderToStaticMarkup(
    React.createElement(
      InteriorLayoutSketchToolsPanel,
      createLayoutProps({
        isSketchToolActive: true,
        manualToolRaw: 'sketch_box_base:legs',
        sketchBoxBasePanelOpen: true,
        sketchBoxBaseType: 'legs',
      })
    )
  );

  assert.match(html, /במת רגליים/);
  assert.match(html, /עם במה/);
  assert.match(html, /בלי במה/);
  assert.match(html, /בליטת במה צדדית/);
  assert.match(html, /במה בולטת/);
  assert.match(html, /במה אפס/);
  assert.match(html, /בליטה מהצדדים/);
  assert.match(html, /בליטה מהחזית/);
  assert.match(html, /data-tooltip="איפוס בליטה מהצדדים לברירת מחדל"/);
  assert.match(html, /step="0\.1"/);
});

test('[interior-tab-sections-runtime] free box flush platform keeps only the front overhang field', () => {
  const html = renderToStaticMarkup(
    React.createElement(
      InteriorLayoutSketchToolsPanel,
      createLayoutProps({
        isSketchToolActive: true,
        manualToolRaw: 'sketch_box_base:legs@tapered@black@12@4@stage@flush@1.5@2',
        sketchBoxBasePanelOpen: true,
        sketchBoxBaseType: 'legs',
        sketchBoxLegPlatformMode: 'stage',
        sketchBoxLegPlatformSideMode: 'flush',
      })
    )
  );

  assert.doesNotMatch(html, /בליטה מהצדדים/);
  assert.match(html, /בליטה מהחזית/);
});

test('[interior-tab-sections-runtime] sliding wardrobe hides sketch external drawer controls', () => {
  const html = renderToStaticMarkup(
    React.createElement(InteriorLayoutSketchToolsPanel, createLayoutProps({ wardrobeType: 'sliding' }))
  );

  assert.doesNotMatch(html, /מגירות חיצוניות לפי סקיצה/);
  assert.doesNotMatch(html, /הוסף\/הסר מגירות חיצוניות/);
  assert.doesNotMatch(html, /גובה מגירה חיצונית/);
  assert.match(html, /מגירות פנימיות לפי סקיצה/);
  assert.match(html, /הוסף\/הסר מגירות פנימיות/);
});

test('[interior-tab-sections-runtime] chest sketch tab keeps only door trim tools', () => {
  const html = renderToStaticMarkup(
    React.createElement(InteriorLayoutSketchToolsPanel, createLayoutProps({ isChestMode: true }))
  );

  assert.match(html, /פסי עיטור לדלת/);
  assert.doesNotMatch(html, /מדפים ותלייה/);
  assert.doesNotMatch(html, /קופסא חופשית/);
  assert.doesNotMatch(html, /מגירות חיצוניות לפי סקיצה/);
  assert.doesNotMatch(html, /מגירות פנימיות לפי סקיצה/);
});

test('[interior-tab-sections-runtime] sketch shelf and storage reset buttons restore canonical defaults', () => {
  const calls = [];
  const shelfProps = createLayoutProps({
    isSketchToolActive: true,
    manualToolRaw: 'sketch_shelf:glass@28',
    sketchShelfDepthByVariant: { regular: 30, double: 30, glass: 28, brace: 45 },
    sketchShelfDepthDraftByVariant: { regular: '30', double: '30', glass: '28', brace: '45' },
    setSketchShelfDepthByVariant: updater => {
      calls.push(['setShelfDepth', updater({ regular: 30, double: 30, glass: 28, brace: 45 })]);
    },
    setSketchShelfDepthDraftByVariant: updater => {
      calls.push(['setShelfDepthDraft', updater({ regular: '30', double: '30', glass: '28', brace: '45' })]);
    },
    activateManualToolId: toolId => calls.push(['activateManualToolId', toolId]),
  });
  const shelfTree = InteriorSketchShelfDepthField(shelfProps);
  const shelfReset = findElementByTestId(shelfTree, 'interior-sketch-shelf-depth-reset-button');
  assert.ok(shelfReset);
  shelfReset.props.onClick();
  assert.deepEqual(calls, [
    ['setShelfDepth', { regular: 30, double: 30, glass: '', brace: 45 }],
    ['setShelfDepthDraft', { regular: '30', double: '30', glass: '', brace: '45' }],
    ['activateManualToolId', 'sketch_shelf:glass'],
  ]);

  calls.length = 0;
  const storageProps = createLayoutProps({
    isSketchToolActive: true,
    manualToolRaw: 'sketch_storage:85',
    sketchStorageHeightCm: 85,
    sketchStorageHeightDraft: '85',
    setSketchStorageHeightCm: next => calls.push(['setStorageHeightCm', next]),
    setSketchStorageHeightDraft: next => calls.push(['setStorageHeightDraft', next]),
    activateManualToolId: toolId => calls.push(['activateManualToolId', toolId]),
  });
  const storageTree = InteriorSketchStorageHeightField(storageProps);
  const storageReset = findElementByTestId(storageTree, 'interior-sketch-storage-height-reset-button');
  assert.ok(storageReset);
  storageReset.props.onClick();
  assert.deepEqual(calls, [
    ['setStorageHeightCm', 50],
    ['setStorageHeightDraft', '50'],
    ['activateManualToolId', 'sketch_storage:50'],
  ]);
});

test('[interior-tab-sections-runtime] sketch shelf depth edits start from 45 in 5 cm steps without creating a focus-only override', () => {
  const calls = [];
  let depthByVariant = { regular: '', double: '', glass: '', brace: '' };
  let draftByVariant = { regular: '', double: '', glass: '', brace: '' };
  const makeProps = (manualToolRaw = 'sketch_shelf:regular') =>
    createLayoutProps({
      isSketchToolActive: true,
      manualToolRaw,
      sketchShelfDepthByVariant: depthByVariant,
      sketchShelfDepthDraftByVariant: draftByVariant,
      setSketchShelfDepthByVariant: updater => {
        depthByVariant = updater(depthByVariant);
        calls.push(['setShelfDepth', depthByVariant]);
      },
      setSketchShelfDepthDraftByVariant: updater => {
        draftByVariant = updater(draftByVariant);
        calls.push(['setShelfDepthDraft', draftByVariant]);
      },
      activateManualToolId: toolId => calls.push(['activateManualToolId', toolId]),
    });

  let tree = InteriorSketchShelfDepthField(makeProps());
  let input = findElementByTestId(tree, 'interior-sketch-shelf-depth-input');
  assert.ok(input);
  assert.equal(input.props.step, 5);
  assert.equal(input.props.placeholder, '45');

  input.props.onFocus({ target: { select: () => calls.push(['select']) } });
  assert.deepEqual(draftByVariant, { regular: '45', double: '', glass: '', brace: '' });
  assert.deepEqual(depthByVariant, { regular: '', double: '', glass: '', brace: '' });
  assert.equal(
    calls.some(call => call[0] === 'activateManualToolId'),
    false
  );

  calls.length = 0;
  tree = InteriorSketchShelfDepthField(makeProps());
  input = findElementByTestId(tree, 'interior-sketch-shelf-depth-input');
  input.props.onBlur();
  assert.deepEqual(draftByVariant, { regular: '', double: '', glass: '', brace: '' });
  assert.deepEqual(depthByVariant, { regular: '', double: '', glass: '', brace: '' });
  assert.equal(
    calls.some(call => call[0] === 'activateManualToolId'),
    false
  );

  calls.length = 0;
  tree = InteriorSketchShelfDepthField(makeProps());
  input = findElementByTestId(tree, 'interior-sketch-shelf-depth-input');
  input.props.onChange({ target: { value: '5' } });
  assert.deepEqual(draftByVariant, { regular: '45', double: '', glass: '', brace: '' });
  assert.deepEqual(depthByVariant, { regular: 45, double: '', glass: '', brace: '' });
  assert.ok(calls.some(call => call[0] === 'activateManualToolId' && call[1] === 'sketch_shelf:regular@45'));

  tree = InteriorSketchShelfDepthField(makeProps('sketch_shelf:brace'));
  input = findElementByTestId(tree, 'interior-sketch-shelf-depth-input');
  assert.equal(input.props.step, 5);
  assert.equal(input.props.placeholder, 'מלא');
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
  assert.doesNotMatch(internalHtml, /מגירות פנימיות לפי סקיצה/);
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

test('interior handles section keeps advanced controls open when handle editing has ended', () => {
  const html = renderToStaticMarkup(
    React.createElement(InteriorHandlesSection, {
      handleControlEnabled: true,
      isHandleMode: false,
      isManualHandlePositionMode: false,
      globalHandleType: 'standard',
      handleToolType: 'edge',
      globalHandleColor: 'nickel',
      handleToolColor: 'black',
      globalEdgeHandleVariant: 'short',
      handleToolEdgeVariant: 'long',
      handleTypes: [
        { id: 'standard', label: 'סטנדרטי' },
        { id: 'edge', label: 'רוכבת' },
        { id: 'none', label: 'ללא' },
      ],
      setGlobalHandle: noop,
      setGlobalHandleColor: noop,
      setGlobalEdgeHandleVariant: noop,
      setHandleControlEnabled: noop,
      toggleHandleMode: noop,
      setHandleModeColor: noop,
      setHandleModeEdgeVariant: noop,
      enterManualHandlePositionMode: noop,
    })
  );
  assert.match(html, /ידית לפי דלת\/מגירה/);
  assert.match(html, /רוכבת קצרה/);
  assert.match(html, /רוכבת ארוכה/);
  assert.match(html, /צבע לידית שתשויך/);
  assert.match(html, /בחר סוג ידית כדי להיכנס למצב עריכה/);
  assert.doesNotMatch(html, /סיום עריכה/);
});
