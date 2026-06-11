import test from 'node:test';
import assert from 'node:assert/strict';

import { readSource, assertMatchesAll, assertLacksAll } from './_source_bundle.js';

const standardTextures = readSource('../esm/shared/standard_cabinet_textures_shared.ts', import.meta.url);
const designShared = readSource('../esm/native/ui/react/tabs/design_tab_shared.ts', import.meta.url);
const colorSwatch = readSource('../esm/native/ui/react/components/ColorSwatch.tsx', import.meta.url);

test('[design-tab-palette-textures] texture swatch URLs are CSS-safe in both palette renderers', () => {
  assertMatchesAll(
    assert,
    standardTextures,
    [
      /function encodeSvg\(svg: string\): string \{/,
      /encodeURIComponent\(svg\)\.replace\(\/\[!'\(\)\*\]\/g, ch =>/,
      /data:image\/svg\+xml;charset=UTF-8,\$\{encoded\}/,
    ],
    'standard cabinet texture data urls'
  );

  assertMatchesAll(
    assert,
    designShared,
    [
      /function cssUrl\(value: unknown\): string \{/,
      /JSON\.stringify\(String\(value \|\| ''\)\)/,
      /backgroundImage: cssUrl\(color\.textureData\)/,
    ],
    'main design palette swatch background image style'
  );

  assertMatchesAll(
    assert,
    colorSwatch,
    [
      /function cssUrl\(value: string\): string \{/,
      /JSON\.stringify\(value\)/,
      /backgroundImage: cssUrl\(backgroundImage\)/,
    ],
    'shared color swatch component background image style'
  );

  assertLacksAll(
    assert,
    `${designShared}\n${colorSwatch}`,
    [/url\(\$\{String\(color\.textureData \|\| ''\)\}\)/, /url\(\$\{backgroundImage\}\)/],
    'unquoted texture url regressions'
  );
});
