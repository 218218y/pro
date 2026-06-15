import test from 'node:test';
import assert from 'node:assert/strict';

import { readSource, assertMatchesAll, assertLacksAll } from './_source_bundle.js';

const colorSection = readSource('../esm/native/ui/react/tabs/design_tab_color_section.tsx', import.meta.url);
const colorSwatch = readSource('../esm/native/ui/react/components/ColorSwatch.tsx', import.meta.url);
const optionButton = readSource('../esm/native/ui/react/components/OptionButton.tsx', import.meta.url);
const tooltipPlacement = readSource('../esm/native/ui/react/components/TooltipPlacement.ts', import.meta.url);
const projectPanel = readSource('../esm/native/ui/react/panels/ProjectPanel.tsx', import.meta.url);
const reactStyles = readSource('../css/react_styles.css', import.meta.url);

test('[design-tab-tooltips] design color palette uses styled tooltips without drag instructions', () => {
  assert.match(colorSection, /title=\{model\.readSavedColorName\(color\)\}/);
  assert.doesNotMatch(colorSection, /גרור לשינוי סדר/);
  assert.doesNotMatch(colorSection, /גרור לשינוי הסדר/);

  assertMatchesAll(
    assert,
    colorSwatch,
    [
      /function normalizeTooltip\(value: string\): string \| undefined/,
      /data-tooltip=\{tooltip\}/,
      /tooltip && 'wp-r-styled-tooltip hint-bottom'/,
      /clampStyledTooltipToViewport\(event\.currentTarget, tooltip\)/,
    ],
    'shared color swatch styled tooltip seam'
  );

  assertLacksAll(assert, colorSwatch, [/title=\{title\}/], 'native browser swatch titles');
});

test('[design-tab-tooltips] tab option buttons can reuse the same styled tooltip system', () => {
  assertMatchesAll(
    assert,
    optionButton,
    [
      /const tooltip = normalizeTooltip\(title\);/,
      /data-tooltip=\{tooltip\}/,
      /tooltip && 'wp-r-styled-tooltip hint-bottom'/,
      /clampStyledTooltipToViewport\(event\.currentTarget, tooltip\)/,
    ],
    'shared tab option button tooltip seam'
  );

  assertMatchesAll(
    assert,
    reactStyles,
    [
      new RegExp(
        'body\\.wp-ui-react \\.wp-r-styled-tooltip\\.hint-bottom::after \\{' +
          '[\\s\\S]*?left:\\s*50%;' +
          '[\\s\\S]*?font-weight:\\s*700;' +
          '[\\s\\S]*?box-shadow:\\s*var\\(--wp-r-shadow-tooltip\\);'
      ),
      new RegExp(
        'body\\.wp-ui-react \\.wp-r-styled-tooltip\\.hint-bottom:hover::after,' +
          '[\\s\\S]*?body\\.wp-ui-react \\.wp-r-styled-tooltip\\.hint-bottom:focus-visible::before \\{' +
          '[\\s\\S]*?transform:\\s*translateX\\(-50%\\) translateY\\(0\\);'
      ),
    ],
    'shared styled tooltip CSS'
  );
});

test('[design-tab-tooltips] styled tooltip body is viewport-clamped without moving the arrow off the button', () => {
  assertMatchesAll(
    assert,
    tooltipPlacement,
    [
      /TOOLTIP_VIEWPORT_GUTTER_PX = 8/,
      /TOOLTIP_SHIFT_ZERO = '0px'/,
      /resetStyledTooltipViewportClamp[\s\S]*?setProperty\(TOOLTIP_SHIFT_VAR, TOOLTIP_SHIFT_ZERO\)/,
      /measureTooltipWidth\(doc, viewportWidth, tooltip\)/,
      /const clampedLeft = clamp\(desiredLeft, TOOLTIP_VIEWPORT_GUTTER_PX, maxLeft\);/,
      /el\.style\.setProperty\(TOOLTIP_SHIFT_VAR, `\$\{shift\}px`\);/,
    ],
    'shared tooltip viewport clamp runtime'
  );

  assertMatchesAll(
    assert,
    reactStyles,
    [
      /--wp-r-tooltip-shift-x:\s*0px;/,
      /transform:\s*translateX\(calc\(-50% \+ var\(--wp-r-tooltip-shift-x\)\)\) translateY\(-4px\);/,
      /max-width:\s*min\(320px, calc\(100vw - 16px\)\);/,
      /overflow-wrap:\s*break-word;/,
      /body\.wp-ui-react \.wp-r-styled-tooltip\.hint-bottom:hover::before,[\s\S]*?transform:\s*translateX\(-50%\) translateY\(0\);/,
    ],
    'shared styled tooltip viewport-safe CSS'
  );
});

test('[structure-tab-dark-mode] restore-last-edit button uses styled tooltip and dark theme colors', () => {
  assertMatchesAll(
    assert,
    projectPanel,
    [
      /const restoreTooltip = canRestore \? 'טען את העריכה האחרונה שנשמרה אוטומטית' : 'אין עריכה אחרונה לשחזור';/,
      /className="wp-r-restore-pill wp-r-styled-tooltip hint-bottom"/,
      /data-tooltip=\{restoreTooltip\}/,
      /aria-label=\{restoreTooltip\}/,
    ],
    'restore button accessible styled tooltip'
  );
  assert.doesNotMatch(projectPanel, /title=\{canRestore \?/);

  assertMatchesAll(
    assert,
    reactStyles,
    [
      /#reactSidebarRoot \.wp-r-theme-dark \.wp-r-restore-pill \{[\s\S]*?background:\s*rgba\(46, 182, 125, 0\.12\);[\s\S]*?color:\s*#b9f8da;/,
      /#reactSidebarRoot \.wp-r-theme-dark \.wp-r-restore-pill:hover:not\(:disabled\) \{[\s\S]*?filter:\s*none;/,
      /#reactSidebarRoot \.wp-r-theme-dark \.wp-r-restore-pill:disabled \{[\s\S]*?background:\s*var\(--wp-r-dark-card-bg-muted\);[\s\S]*?color:\s*#7d8894;/,
    ],
    'restore button dark theme CSS'
  );
});
