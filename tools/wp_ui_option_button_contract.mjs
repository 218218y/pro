#!/usr/bin/env node
import { readFileSync } from 'node:fs';

const required = [
  {
    file: 'esm/native/ui/react/components/OptionButton.tsx',
    patterns: [
      /export function OptionButton\(/,
      /export function OptionButtonGroup\(/,
      /OptionButtonDensity/,
    ],
  },
  { file: 'esm/native/ui/react/components/index.ts', patterns: [/export \* from '\.\/OptionButton\.js';/] },
  {
    file: 'esm/native/ui/react/tabs/interior_tab_helpers.tsx',
    patterns: [
      /import \{ OptionButton \} from '\.\.\/components\/index\.js';/,
      /<OptionButton[\s\S]*density="compact"/,
    ],
  },
  {
    file: 'esm/native/ui/react/tabs/interior_layout_sketch_box_controls_components.tsx',
    patterns: [/OptionButtonGroup/, /columns=\{columns\}/, /density="micro"/],
  },
  {
    file: 'esm/native/ui/react/tabs/structure_tab_body_section_controls.tsx',
    patterns: [/import \{ OptionButton \}/, /<OptionButton/],
  },
  {
    file: 'esm/native/ui/react/tabs/structure_tab_body_section_base.tsx',
    patterns: [
      /OptionButtonGroup/,
      /columns=\{3\}/,
      /wp-r-base-leg-style-selector/,
      /wp-r-base-leg-color-selector/,
    ],
  },
  {
    file: 'css/react_styles.css',
    patterns: [
      /\.wp-r-option-button-group/,
      /\.wp-r-option-button-group--three/,
      /\.wp-r-option-button--micro/,
    ],
  },
];

const forbidden = [
  {
    file: 'esm/native/ui/react/tabs/structure_tab_body_section_controls.tsx',
    patterns: [/<button\b/, /className=\{props\.selected \?/],
  },
];

const errors = [];
for (const rule of required) {
  const source = readFileSync(rule.file, 'utf8');
  for (const pattern of rule.patterns)
    if (!pattern.test(source)) errors.push(`${rule.file}: missing ${pattern}`);
}
for (const rule of forbidden) {
  const source = readFileSync(rule.file, 'utf8');
  for (const pattern of rule.patterns)
    if (pattern.test(source)) errors.push(`${rule.file}: forbidden legacy pattern ${pattern}`);
}

if (errors.length) {
  console.error('[ui-option-button-contract] FAILED');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log('[ui-option-button-contract] ok');
