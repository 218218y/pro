import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

function readSource(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
}

test('modern pressed states use gradient and pressed shadows without checkmark glyphs', () => {
  const css = readSource('css/react_styles.css');
  const tokens = readSource('css/react_tokens.css');
  const modeToggle = readSource('esm/native/ui/react/components/ModeToggleButton.tsx');

  assert.match(tokens, /--wp-r-shadow-pressed-control:/);
  assert.match(tokens, /--wp-r-shadow-pressed-control-compact:/);
  assert.match(tokens, /--wp-r-shadow-pdf-toggle-on:/);

  assert.match(
    css,
    /#reactSidebarRoot \.type-option\.selected \{[\s\S]*?background:\s*linear-gradient\(180deg, rgba\(239, 246, 255, 0\.98\), rgba\(219, 234, 254, 0\.8\)\);[\s\S]*?box-shadow:\s*var\(--wp-r-shadow-pressed-control\);/
  );
  assert.match(
    css,
    /#reactSidebarRoot \.wp-r-mini-link-toggle--manual \{[\s\S]*?background:\s*linear-gradient\(180deg, rgba\(239, 246, 255, 0\.98\), rgba\(219, 234, 254, 0\.86\)\);[\s\S]*?box-shadow:\s*var\(--wp-r-shadow-pressed-control-compact\);/
  );
  assert.match(
    css,
    /#reactSidebarRoot \.wp-r-mini-link-toggle--manual::after \{[\s\S]*?content:\s*'';[\s\S]*?width:\s*6px;[\s\S]*?height:\s*6px;[\s\S]*?border-radius:\s*999px;[\s\S]*?background:\s*#2563eb;/
  );
  assert.match(
    css,
    /#reactSidebarRoot \.wp-r-header \.btn-header-sketch\.wp-r-btn-active \{[\s\S]*?background:\s*linear-gradient\(180deg, #fff7ed, #ffedd5\);[\s\S]*?box-shadow:\s*var\(--wp-r-shadow-pressed-control-compact\);/
  );
  assert.match(tokens, /--wp-r-tab-hover-bg:\s*rgba\(59, 130, 246, 0\.1\);/);
  assert.match(tokens, /--wp-r-shadow-tab-hover:\s*inset 0 0 0 1px rgba\(59, 130, 246, 0\.18\);/);
  assert.match(tokens, /--wp-r-shadow-tab-active:\s*inset 0 0 0 1px rgba\(59, 130, 246, 0\.38\);/);
  assert.match(
    css,
    /#reactSidebarRoot \.tab:hover \{[\s\S]*?background:\s*var\(--wp-r-tab-hover-bg\);[\s\S]*?box-shadow:\s*var\(--wp-r-shadow-tab-hover\);/
  );
  assert.match(
    css,
    /#reactSidebarRoot \.tab\.active \{[\s\S]*?background-color:\s*rgba\(59, 130, 246, 0\.1\);[\s\S]*?box-shadow:\s*var\(--wp-r-shadow-tab-active\);/
  );
  assert.match(
    css,
    /#reactSidebarRoot \.wp-r-theme-dark \{[\s\S]*?--wp-r-tab-hover-bg:\s*rgba\(77, 182, 172, 0\.16\);[\s\S]*?--wp-r-shadow-tab-hover:\s*inset 0 0 0 1px rgba\(77, 182, 172, 0\.24\);[\s\S]*?--wp-r-shadow-tab-active:\s*inset 0 0 0 1px rgba\(77, 182, 172, 0\.42\);/
  );
  assert.match(
    css,
    /#reactSidebarRoot \.wp-r-theme-dark \.tab:hover \{[\s\S]*?background:\s*var\(--wp-r-tab-hover-bg\);/
  );
  assert.doesNotMatch(
    css,
    /#reactSidebarRoot \.tab\.active \{[^}]*box-shadow:\s*var\(--wp-r-shadow-ring-primary-3-inset\);/s
  );
  assert.match(css, /#reactSidebarRoot \.tab:focus \{\s*outline:\s*none;\s*\}/);
  assert.doesNotMatch(css, /#reactSidebarRoot \.tab:focus,\s*#reactSidebarRoot \.type-option:focus-visible/);
  assert.match(
    css,
    /body\.wp-ui-react \.wp-pdf-editor-toggle\.is-on \{[\s\S]*?box-shadow:\s*var\(--wp-r-shadow-pdf-toggle-on\);/
  );
  assert.match(modeToggle, /aria-pressed=\{active\}/);

  assert.doesNotMatch(css, new RegExp('content:\\s*[\'"]\\u2713[\'"];'));
  assert.doesNotMatch(css, /\.type-option\.selected::before/);
  assert.doesNotMatch(css, /\.wp-pdf-editor-toggle(?:\.is-on)?::after/);
  assert.doesNotMatch(css, /\.header-btn-small\.wp-r-btn-active::after/);
});
