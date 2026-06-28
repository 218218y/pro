import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { StructureCellDimsControls } from '../esm/native/ui/react/tabs/structure_tab_dimensions_section_cell_dims.js';
import {
  STRUCTURE_CELL_DIMS_RESET_DEPTH_BUTTON_TEST_ID,
  STRUCTURE_CELL_DIMS_RESET_HEIGHT_BUTTON_TEST_ID,
  STRUCTURE_CELL_DIMS_RESET_WIDTH_BUTTON_TEST_ID,
} from '../esm/native/ui/react/tabs/structure_tab_dimensions_section_contracts.js';

const renderCellDimsControls = (overrides: Record<string, unknown> = {}) => {
  const noop = () => {};
  return renderToStaticMarkup(
    React.createElement(StructureCellDimsControls, {
      isSliding: false,
      cellDimsEditActive: true,
      cellDimsPanelOpen: true,
      cellDimsHexPanelOpen: false,
      hasAnyCellDimsOverrides: true,
      defaultCellWidth: 40,
      width: 160,
      height: 240,
      depth: 55,
      cellDimsWidth: 80,
      cellDimsHeight: '',
      cellDimsDepth: 50,
      cellDimsHexMode: false,
      cellDimsHexProtrusion: '',
      cellDimsHexDoorWidth: '',
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
      ...overrides,
    })
  );
};

test('[structure-cell-dims] per-dimension reset buttons stay compact, icon-only, and inline with inputs', () => {
  const html = renderCellDimsControls();
  const resetButtons = html.match(/<button[^>]*wp-r-cell-dims-reset-dim-btn[^>]*>[\s\S]*?<\/button>/g) || [];
  const css = readFileSync(new URL('../css/react_styles.css', import.meta.url), 'utf8');
  const baseResetRuleIndex = css.indexOf('#reactSidebarRoot .wp-r-groove-reset-btn {');
  const compactCellRuleIndex = css.indexOf(
    '#reactSidebarRoot .wp-r-groove-reset-btn.wp-r-cell-dims-reset-dim-btn {'
  );

  assert.equal(resetButtons.length, 3);
  assert.match(html, /wp-r-cell-dims-row/);
  assert.match(html, new RegExp(`data-testid="${STRUCTURE_CELL_DIMS_RESET_WIDTH_BUTTON_TEST_ID}"`));
  assert.match(html, new RegExp(`data-testid="${STRUCTURE_CELL_DIMS_RESET_HEIGHT_BUTTON_TEST_ID}"`));
  assert.match(html, new RegExp(`data-testid="${STRUCTURE_CELL_DIMS_RESET_DEPTH_BUTTON_TEST_ID}"`));
  assert.match(html, /aria-label="איפוס רוחב התא"/);
  assert.match(html, /aria-label="איפוס גובה התא"/);
  assert.match(html, /aria-label="איפוס עומק התא"/);
  assert.ok(
    resetButtons.every(button =>
      /^<button[^>]*><i class="fas fa-undo-alt" aria-hidden="true"><\/i><\/button>$/.test(button)
    )
  );
  assert.ok(resetButtons.some(button => /disabled=""/.test(button)));
  assert.ok(baseResetRuleIndex >= 0, 'expected the shared reset-button rule to exist');
  assert.ok(
    compactCellRuleIndex > baseResetRuleIndex,
    'cell-dims compact override must come after the shared reset rule'
  );
  assert.match(
    css,
    /#reactSidebarRoot \.wp-r-groove-reset-btn\.wp-r-cell-dims-reset-dim-btn \{[\s\S]*?max-width:\s*var\(--wp-r-input-h\)/
  );
});

test('[structure-cell-dims] empty dimension drafts stay visually blank instead of showing guessed numbers', () => {
  const html = renderCellDimsControls({
    defaultCellWidth: 70,
    height: 230,
    depth: 62,
    cellDimsWidth: '',
    cellDimsHeight: '',
    cellDimsDepth: '',
  });

  assert.equal((html.match(/placeholder=""/g) || []).length, 3);
  assert.doesNotMatch(html, /placeholder="(?:ברירת מחדל|70|230|62)"/);
});

function flattenElements(node: unknown, out: any[] = []): any[] {
  if (node == null || typeof node === 'boolean') return out;
  if (Array.isArray(node)) {
    for (const item of node) flattenElements(item, out);
    return out;
  }
  if (typeof node !== 'object') return out;
  const element = node as any;
  if (element.props) {
    out.push(element);
    flattenElements(element.props.children, out);
    if (element.props.inputAddon) flattenElements(element.props.inputAddon, out);
  }
  return out;
}

function createCellDimsControlsTree(overrides: Record<string, unknown> = {}) {
  const calls: unknown[][] = [];
  const record =
    (name: string) =>
    (...args: unknown[]) =>
      calls.push([name, ...args]);
  const props = {
    isSliding: false,
    cellDimsEditActive: false,
    cellDimsPanelOpen: true,
    cellDimsHexPanelOpen: false,
    hasAnyCellDimsOverrides: false,
    defaultCellWidth: 40,
    width: 160,
    height: 240,
    depth: 55,
    cellDimsWidth: '',
    cellDimsHeight: '',
    cellDimsDepth: '',
    cellDimsHexMode: false,
    cellDimsHexProtrusion: '',
    cellDimsHexDoorWidth: '',
    onSetRaw: record('setRaw'),
    onResetAllCellDimsOverrides: record('resetAll'),
    onEnterCellDimsMode: record('enterCellDims'),
    onExitCellDimsMode: record('exitCellDims'),
    onEnterHexCellDimsMode: record('enterHex'),
    onExitHexCellDimsMode: record('exitHex'),
    onClearCellDimsWidth: record('clearWidth'),
    onClearCellDimsHeight: record('clearHeight'),
    onClearCellDimsDepth: record('clearDepth'),
    onClearCellDimsHexProtrusion: record('clearHexProtrusion'),
    onClearCellDimsHexDoorWidth: record('clearHexDoorWidth'),
    ...overrides,
  };
  return { tree: StructureCellDimsControls(props as any), calls };
}

test('[structure-cell-dims] disclosure chevrons render after the Hebrew labels so they sit on the left side', () => {
  const html = renderCellDimsControls({ cellDimsHexPanelOpen: true });

  assert.match(
    html,
    /<span class="wp-r-editmode-toggle__label">מידות מיוחדות לפי תא<\/span><span class="wp-r-editmode-toggle__icon"><i class="fas fa-chevron-up wp-chevron"/
  );
  assert.match(
    html,
    /<span class="wp-r-editmode-toggle__label">תא משושה<\/span><span class="wp-r-editmode-toggle__icon"><i class="fas fa-chevron-up wp-chevron"/
  );
});

test('[structure-cell-dims] panel disclosure is independent from edit mode and uses chevron state', () => {
  const closedHtml = renderCellDimsControls({ cellDimsEditActive: false, cellDimsPanelOpen: false });
  assert.match(closedHtml, /fa-chevron-down/);
  assert.doesNotMatch(closedHtml, /רוחב תא/);

  const openHtml = renderCellDimsControls({ cellDimsEditActive: false, cellDimsPanelOpen: true });
  assert.match(openHtml, /fa-chevron-up/);
  assert.match(openHtml, /רוחב תא/);
  assert.match(openHtml, /גובה תא/);
  assert.match(openHtml, /עומק תא/);
});

test('[structure-cell-dims] dimension field edits re-enter edit mode before committing the draft', () => {
  const { tree, calls } = createCellDimsControlsTree();
  const widthField = flattenElements(tree).find(el => el.props?.activeId === 'cellDimsWidth');
  assert.ok(widthField);

  widthField.props.onCommit(95);
  assert.deepEqual(calls, [['enterCellDims'], ['setRaw', 'cellDimsWidth', 95]]);

  calls.length = 0;
  widthField.props.onCommit(null);
  assert.deepEqual(calls, [['enterCellDims'], ['clearWidth']]);
});

test('[structure-cell-dims] hex disclosure stays independent and hex field edits re-enter hex edit mode', () => {
  const { tree, calls } = createCellDimsControlsTree({ cellDimsHexPanelOpen: true });
  const hexButton = flattenElements(tree).find(
    el => el.props?.['data-testid'] === 'structure-cell-dims-hex-mode-button'
  );
  assert.ok(hexButton);
  hexButton.props.onClick();
  assert.deepEqual(calls, [['exitHex']]);

  calls.length = 0;
  const hexField = flattenElements(tree).find(el => el.props?.activeId === 'cellDimsHexProtrusion');
  assert.ok(hexField);
  hexField.props.onCommit(12);
  assert.deepEqual(calls, [['enterHex'], ['setRaw', 'cellDimsHexProtrusion', 12]]);
});
