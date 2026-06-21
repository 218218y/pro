import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const css = readFileSync(new URL('../css/react_styles.css', import.meta.url), 'utf8');
const savedModelsView = readFileSync(
  new URL('../esm/native/ui/react/tabs/structure_tab_saved_models_view.tsx', import.meta.url),
  'utf8'
);
const compactCss = css.replace(/\s+/g, ' ');

function assertContainsSelector(selector, message) {
  assert.ok(compactCss.includes(selector.replace(/\s+/g, ' ')), message ?? `missing selector: ${selector}`);
}

test('[dark-theme-css] card-like controls do not fall back to light surfaces', () => {
  assertContainsSelector('#reactSidebarRoot .wp-r-theme-dark .control-section.wp-r-savedmodels');
  assertContainsSelector('#reactSidebarRoot .wp-r-theme-dark .wp-r-savedmodels-dndhint');
  assertContainsSelector('#reactSidebarRoot .wp-r-theme-dark .wp-r-savedmodels-toggle');
  assertContainsSelector('#reactSidebarRoot .wp-r-theme-dark .wp-r-savedmodels-toggle .section-title');
  assertContainsSelector('#reactSidebarRoot .wp-r-theme-dark .wp-tool-card');
  assertContainsSelector('#reactSidebarRoot .wp-r-theme-dark .wp-tool-card.is-active');
  assertContainsSelector('#reactSidebarRoot .wp-r-theme-dark .wp-manual-row');
  assertContainsSelector(
    "#reactSidebarRoot .wp-r-theme-dark .tab-content[data-tab='interior'] .wp-tool-card--layout .wp-manual-row"
  );
  assertContainsSelector('#reactSidebarRoot .wp-r-theme-dark .wp-sketch-row');
  assertContainsSelector('#reactSidebarRoot .wp-r-theme-dark .wp-sketch-choice-panel-inner');
  assertContainsSelector(
    "#reactSidebarRoot .wp-r-theme-dark .tab-content[data-tab='sketch'] .wp-tool-card--layout > .wp-sketch-row"
  );
  assertContainsSelector('#reactSidebarRoot .wp-r-theme-dark .wp-r-note');
});

function extractRule(selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
  const match = css.match(new RegExp(`${escaped}\\s*\\{([\\s\\S]*?)\\}`, 'm'));
  return match ? match[1] : '';
}

test('[dark-theme-css] header logo keeps its embedded shape bright without dark-mode re-boxing', () => {
  assertContainsSelector('#reactSidebarRoot .wp-r-header-logo {');
  const logoRule = extractRule('#reactSidebarRoot .wp-r-header-logo');
  assert.match(logoRule, /background:\s*var\(--wp-r-header-logo-surface,\s*transparent\);/);
  assert.match(logoRule, /border-radius:\s*10px;/);
  assert.match(logoRule, /overflow:\s*hidden;/);
  assert.doesNotMatch(logoRule, /(?:^|;)\s*padding\s*:/, 'logo image must not be shrunk by padding');
  assert.doesNotMatch(logoRule, /(?:^|;)\s*border\s*:/, 'logo image must not receive a separate border');
  assert.doesNotMatch(
    extractRule('#reactSidebarRoot .wp-r-header'),
    /--wp-r-header-logo-surface:/,
    'base header must not shadow the dark-theme logo surface token'
  );
  assert.match(
    extractRule('#reactSidebarRoot .wp-r-theme-dark'),
    /--wp-r-header-logo-surface:\s*#f8fafc;/,
    'dark mode supplies only a same-shape backing surface so translucent logo pixels keep their light appearance'
  );
  assert.doesNotMatch(
    css,
    /#reactSidebarRoot\s+\.wp-r-theme-dark\s+\.wp-r-header-logo\s*\{/,
    'dark mode must not add a separate logo box; the embedded logo asset already owns its rounded background'
  );
});

test('[dark-theme-css] saved models panel keeps its surface class-owned', () => {
  assertContainsSelector('#reactSidebarRoot .wp-r-savedmodels {');
  assert.doesNotMatch(savedModelsView, /style=\{\{[^}]*background:\s*['"]#f8fafc/i);
  assert.doesNotMatch(savedModelsView, /style=\{\{[^}]*border:\s*['"]1px solid #e2e8f0/i);
});

test('[dark-theme-css] custom color controls receive dark overrides', () => {
  assertContainsSelector('#reactSidebarRoot .wp-r-theme-dark .btn-add-color');
  assertContainsSelector('#reactSidebarRoot .wp-r-theme-dark .btn-add-color.is-open');
  assertContainsSelector('#reactSidebarRoot .wp-r-theme-dark .wp-r-custom-picker-title');
  assertContainsSelector('#reactSidebarRoot .wp-r-theme-dark .wp-r-file-btn');
  assertContainsSelector('#reactSidebarRoot .wp-r-theme-dark .wp-r-file-name');
});

test('[dark-theme-css] high-specificity interior/sketch buttons receive dark overrides', () => {
  assertContainsSelector(
    "#reactSidebarRoot .wp-r-theme-dark :is(.tab-content[data-tab='interior'], .tab-content[data-tab='sketch']) .wp-tool-card--layout .type-option"
  );
  assertContainsSelector(
    "#reactSidebarRoot .wp-r-theme-dark .tab-content[data-tab='interior'] .wp-tool-card--extdrawer .type-option"
  );
  assertContainsSelector(
    "#reactSidebarRoot .wp-r-theme-dark .tab-content[data-tab='interior'] .wp-r-handle-btn.type-option"
  );
  assertContainsSelector(
    "#reactSidebarRoot .wp-r-theme-dark .tab-content[data-tab='interior'] .wp-tool-card--extdrawer .btn.btn-count"
  );
  assertContainsSelector(
    "#reactSidebarRoot .wp-r-theme-dark :is(.tab-content[data-tab='interior'], .tab-content[data-tab='sketch']) .wp-tool-card--layout :is(.wp-sketch-box-cell, .wp-sketch-storage-input) .wp-r-input"
  );
});
