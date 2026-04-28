#!/usr/bin/env node
import { readFileSync } from 'node:fs';

function read(file) {
  return readFileSync(file, 'utf8');
}

const errors = [];

function requirePattern(file, pattern) {
  const source = read(file);
  if (!pattern.test(source)) errors.push(`${file}: missing ${pattern}`);
}

function forbidPattern(file, pattern) {
  const source = read(file);
  if (pattern.test(source)) errors.push(`${file}: forbidden legacy pattern ${pattern}`);
}

requirePattern(
  'esm/native/ui/react/components/ColorSwatch.tsx',
  /type ColorSwatchProps = Omit<HTMLAttributes<HTMLDivElement>, 'onClick' \| 'onKeyDown' \| 'title'>/
);
requirePattern('esm/native/ui/react/components/ColorSwatch.tsx', /children\?: ReactNode/);
requirePattern('esm/native/ui/react/components/ColorSwatch.tsx', /special\?: boolean/);
requirePattern('esm/native/ui/react/components/ColorSwatch.tsx', /className=\{cx\(/);
requirePattern(
  'esm/native/ui/react/components/ColorSwatch.tsx',
  /type ColorSwatchItemProps = Omit<HTMLAttributes<HTMLDivElement>, 'onClick' \| 'onKeyDown' \| 'title'>/
);
requirePattern('esm/native/ui/react/components/ColorSwatch.tsx', /export function ColorSwatchItem/);
requirePattern('esm/native/ui/react/components/ColorSwatch.tsx', /function handleActivation/);

requirePattern(
  'esm/native/ui/react/tabs/design_tab_multicolor_panel_view.tsx',
  /import \{ ColorSwatch, OptionButton, OptionButtonGroup, ToggleRow \}/
);
requirePattern(
  'esm/native/ui/react/tabs/design_tab_multicolor_panel_view.tsx',
  /<ColorSwatch[\s\S]*special=\{dot\.isSpecial\}/
);
requirePattern(
  'esm/native/ui/react/tabs/design_tab_multicolor_panel_view.tsx',
  /<OptionButtonGroup columns="auto" density="compact" className="wp-r-design-door-style-options">/
);
requirePattern(
  'esm/native/ui/react/tabs/design_tab_multicolor_panel_view.tsx',
  /<OptionButton[\s\S]*data-door-style=\{option\.id\}/
);
requirePattern(
  'esm/native/ui/react/tabs/design_tab_multicolor_panel_view.tsx',
  /<OptionButtonGroup columns="auto" density="compact" className="wp-r-design-curtain-options">/
);
requirePattern(
  'esm/native/ui/react/tabs/design_tab_multicolor_panel_view.tsx',
  /className="curtain-btn"[\s\S]*selected=\{props\.curtainChoice === curtain\.id\}/
);

forbidPattern(
  'esm/native/ui/react/tabs/design_tab_multicolor_panel_view.tsx',
  /import type \{ CSSProperties/
);
forbidPattern(
  'esm/native/ui/react/tabs/design_tab_multicolor_panel_view.tsx',
  /className=\{\s*'color-dot-swatch wp-r-color-swatch'/
);
forbidPattern(
  'esm/native/ui/react/tabs/design_tab_multicolor_panel_view.tsx',
  /className=\{\s*'type-option type-option--compact type-option--iconrow/
);
forbidPattern(
  'esm/native/ui/react/tabs/design_tab_multicolor_panel_view.tsx',
  /className=\{'curtain-btn' \+/
);

requirePattern(
  'esm/native/ui/react/tabs/design_tab_color_section.tsx',
  /import \{ ColorSwatchItem \} from '\.\.\/components\/index\.js';/
);
requirePattern(
  'esm/native/ui/react/tabs/design_tab_color_section.tsx',
  /<ColorSwatchItem[\s\S]*data-testid="design-color-swatch-item"/
);
forbidPattern(
  'esm/native/ui/react/tabs/design_tab_color_section.tsx',
  /const className = 'color-dot-swatch'/
);
forbidPattern(
  'esm/native/ui/react/tabs/design_tab_color_section.tsx',
  /<div className=\{className\} style=\{style\} aria-hidden="true"/
);

if (errors.length) {
  console.error('[ui-design-system-contract] FAILED');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log('[ui-design-system-contract] ok');
