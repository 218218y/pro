import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import {
  StructureDimensionsContent,
  StructureDimensionsSection,
} from '../esm/native/ui/react/tabs/structure_tab_dimensions_section.js';
import { StructureStackSplitControls } from '../esm/native/ui/react/tabs/structure_tab_dimensions_section_stack_split.js';

const renderStackSplitControls = (overrides = {}) => {
  const noop = () => {};
  return renderToStaticMarkup(
    React.createElement(StructureStackSplitControls, {
      isSliding: false,
      stackSplitEnabled: true,
      stackSplitDecorativeSeparatorEnabled: false,
      stackSplitDecorativeSeparatorSideOverhangCm: 1.5,
      stackSplitDecorativeSeparatorFrontOverhangCm: 2,
      stackSplitLowerHeight: 100,
      stackSplitLowerDepth: 55,
      stackSplitLowerWidth: 160,
      stackSplitLowerDoors: 2,
      stackSplitLowerDepthManual: false,
      stackSplitLowerWidthManual: false,
      stackSplitLowerDoorsManual: false,
      height: 240,
      onSetRaw: noop,
      onToggleStackSplit: noop,
      onToggleStackSplitDecorativeSeparator: noop,
      onSetStackSplitDecorativeSeparatorSideOverhangCm: noop,
      onSetStackSplitDecorativeSeparatorFrontOverhangCm: noop,
      renderStackLinkBadge: (_field: string, isManual: boolean) =>
        React.createElement(
          'button',
          {
            type: 'button',
            className: isManual
              ? 'wp-r-mini-link-toggle wp-r-mini-link-toggle--manual'
              : 'wp-r-mini-link-toggle wp-r-mini-link-toggle--auto',
          },
          React.createElement('i', {
            className: isManual ? 'fas fa-unlink' : 'fas fa-link',
            'aria-hidden': true,
          }),
          React.createElement('span', null, isManual ? 'ידני' : 'אוטומטי')
        ),
      ...overrides,
    })
  );
};

const renderDimensionsContent = (overrides = {}) => {
  const noop = () => {};
  return renderToStaticMarkup(
    React.createElement(StructureDimensionsContent, {
      isSliding: false,
      isLibraryMode: false,
      libraryUpperDoorsHidden: false,
      isManualWidth: false,
      width: 0,
      height: 240,
      depth: 60,
      doors: 0,
      cellDimsEditActive: false,
      hasAnyCellDimsOverrides: false,
      defaultCellWidth: 60,
      cellDimsWidth: '',
      cellDimsHeight: '',
      cellDimsDepth: '',
      cellDimsHexMode: false,
      cellDimsHexProtrusion: '',
      cellDimsHexDoorWidth: '',
      stackSplitEnabled: false,
      stackSplitDecorativeSeparatorEnabled: false,
      stackSplitDecorativeSeparatorSideOverhangCm: 1.5,
      stackSplitDecorativeSeparatorFrontOverhangCm: 2,
      stackSplitLowerHeight: 100,
      stackSplitLowerDepth: 55,
      stackSplitLowerWidth: 160,
      stackSplitLowerDoors: 2,
      stackSplitLowerDepthManual: false,
      stackSplitLowerWidthManual: false,
      stackSplitLowerDoorsManual: false,
      onSetRaw: noop,
      onResetAllCellDimsOverrides: noop,
      onEnterCellDimsMode: noop,
      onExitCellDimsMode: noop,
      onEnterHexCellDimsMode: noop,
      onExitHexCellDimsMode: noop,
      onClearCellDimsWidth: noop,
      onClearCellDimsHeight: noop,
      onClearCellDimsDepth: noop,
      onClearCellDimsHexProtrusion: noop,
      onClearCellDimsHexDoorWidth: noop,
      onToggleStackSplit: noop,
      onToggleStackSplitDecorativeSeparator: noop,
      onSetStackSplitDecorativeSeparatorSideOverhangCm: noop,
      onSetStackSplitDecorativeSeparatorFrontOverhangCm: noop,
      onToggleLibraryUpperDoors: noop,
      onPickLibraryGlass: noop,
      renderStackLinkBadge: (_field: string, isManual: boolean) =>
        React.createElement('span', null, isManual ? 'ידני' : 'אוטומטי'),
      onResetAutoWidth: noop,
      ...overrides,
    })
  );
};

const renderDimensionsSection = (overrides = {}) => {
  const noop = () => {};
  return renderToStaticMarkup(
    React.createElement(StructureDimensionsSection, {
      visible: true,
      isSliding: false,
      isLibraryMode: false,
      libraryUpperDoorsHidden: false,
      isManualWidth: false,
      width: 0,
      height: 240,
      depth: 60,
      doors: 0,
      cellDimsEditActive: false,
      hasAnyCellDimsOverrides: false,
      defaultCellWidth: 60,
      cellDimsWidth: '',
      cellDimsHeight: '',
      cellDimsDepth: '',
      cellDimsHexMode: false,
      cellDimsHexProtrusion: '',
      cellDimsHexDoorWidth: '',
      stackSplitEnabled: false,
      stackSplitDecorativeSeparatorEnabled: false,
      stackSplitDecorativeSeparatorSideOverhangCm: 1.5,
      stackSplitDecorativeSeparatorFrontOverhangCm: 2,
      stackSplitLowerHeight: 100,
      stackSplitLowerDepth: 55,
      stackSplitLowerWidth: 160,
      stackSplitLowerDoors: 2,
      stackSplitLowerDepthManual: false,
      stackSplitLowerWidthManual: false,
      stackSplitLowerDoorsManual: false,
      onSetRaw: noop,
      onResetAllCellDimsOverrides: noop,
      onEnterCellDimsMode: noop,
      onExitCellDimsMode: noop,
      onEnterHexCellDimsMode: noop,
      onExitHexCellDimsMode: noop,
      onClearCellDimsWidth: noop,
      onClearCellDimsHeight: noop,
      onClearCellDimsDepth: noop,
      onClearCellDimsHexProtrusion: noop,
      onClearCellDimsHexDoorWidth: noop,
      onToggleStackSplit: noop,
      onToggleStackSplitDecorativeSeparator: noop,
      onSetStackSplitDecorativeSeparatorSideOverhangCm: noop,
      onSetStackSplitDecorativeSeparatorFrontOverhangCm: noop,
      onToggleLibraryUpperDoors: noop,
      onPickLibraryGlass: noop,
      renderStackLinkBadge: (_field: string, isManual: boolean) =>
        React.createElement('span', null, isManual ? 'ידני' : 'אוטומטי'),
      onResetAutoWidth: noop,
      ...overrides,
    })
  );
};

test('[structure-stack-split] lower cabinet fields use a compact row layout for auto/manual badges', () => {
  const html = renderStackSplitControls();
  const css = readFileSync(new URL('../css/react_styles.css', import.meta.url), 'utf8');

  assert.equal((html.match(/wp-r-stack-split-dims-row/g) || []).length, 2);
  assert.match(html, /wp-r-mini-link-toggle--auto/);
  assert.match(css, /#reactSidebarRoot \.wp-r-stack-split-dims-row \{[\s\S]*?gap:\s*8px/);
  assert.match(
    css,
    /#reactSidebarRoot \.wp-r-stack-split-dims-row \.wp-r-input-row--with-addon \{[\s\S]*?--wp-r-link-badge-width:\s*72px/
  );
  assert.match(
    css,
    /#reactSidebarRoot \.wp-r-stack-split-dims-row \.wp-r-mini-link-toggle \{[\s\S]*?font-size:\s*0\.68rem/
  );
});

test('[structure-stack-split] sliding wardrobes render the upper/lower split control', () => {
  const html = renderStackSplitControls({ isSliding: true, stackSplitEnabled: false });

  assert.match(html, /חלוקת ארון לחלק עליון וחלק תחתון/);
});

test('[structure-dimensions] no-main sketch state shows only restore-main action and hides cell dimensions controls', () => {
  const html = renderDimensionsContent({ isSliding: false, doors: 0 });

  assert.doesNotMatch(html, /חלוקת ארון לחלק עליון וחלק תחתון/);
  assert.doesNotMatch(html, /דלתות/);
  assert.doesNotMatch(html, /רוחב \(ס\&quot;מ\)/);
  assert.doesNotMatch(html, /גובה \(ס\&quot;מ\)/);
  assert.doesNotMatch(html, /עומק \(ס\&quot;מ\)/);
  assert.match(html, /החזרת ארון ראשי/);
  assert.match(html, /structure-restore-main-wardrobe-button/);
  assert.doesNotMatch(html, /מידות מיוחדות לפי תא/);
  assert.doesNotMatch(html, /structure-cell-dims-mode-button/);
});

test('[structure-dimensions] no-main restore action does not keep the dimensions title shell', () => {
  const html = renderDimensionsSection({ isSliding: false, doors: 0, noMainWardrobeActive: true });
  const css = readFileSync(new URL('../css/react_styles.css', import.meta.url), 'utf8');

  assert.doesNotMatch(html, /section-title[^>]*>מידות/);
  assert.match(html, /wp-r-no-main-restore-section/);
  assert.match(html, /wp-r-no-main-restore-button/);
  assert.match(html, /selected active/);
  assert.match(
    css,
    /\.tab-content\[data-tab='structure'\] \.wp-r-no-main-restore-button \{[\s\S]*?width:\s*100%/
  );
});

test('[structure-stack-split] decorative separator exposes side and front overhang controls only when enabled', () => {
  const disabledHtml = renderStackSplitControls({ stackSplitDecorativeSeparatorEnabled: false });
  assert.doesNotMatch(disabledHtml, /בליטה מהצדדים/);
  assert.doesNotMatch(disabledHtml, /בליטה מהחזית/);

  const enabledHtml = renderStackSplitControls({ stackSplitDecorativeSeparatorEnabled: true });
  assert.match(enabledHtml, /בליטה מהצדדים/);
  assert.match(enabledHtml, /בליטה מהחזית/);
  assert.match(enabledHtml, /איפוס בליטת הפרדה מהצדדים לברירת מחדל/);
  assert.match(enabledHtml, /איפוס בליטת הפרדה מהחזית לברירת מחדל/);
  assert.match(enabledHtml, /data-tooltip="איפוס בליטת הפרדה מהצדדים לברירת מחדל"/);
  assert.match(enabledHtml, /wp-r-styled-tooltip hint-bottom/);
  assert.match(enabledHtml, /step="0\.1"/);
  assert.match(
    enabledHtml,
    /wp-r-platform-overhang-input-row"><input[^>]*class="wp-r-door-thickness-input wp-r-platform-overhang-input"[^>]*step="0\.1"[^>]*\/><button/
  );
});
