import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { StructureBodyBaseControls } from '../esm/native/ui/react/tabs/structure_tab_body_section_base.js';

const renderBaseControls = (overrides = {}) => {
  const noop = () => {};
  return renderToStaticMarkup(
    React.createElement(StructureBodyBaseControls, {
      baseType: 'plinth',
      baseLegStyle: 'tapered',
      baseLegColor: 'black',
      basePlinthHeightCm: 10,
      baseLegHeightCm: 10,
      baseLegWidthCm: 4,
      isChestMode: false,
      isSliding: false,
      slidingTracksColor: 'nickel',
      onSetBaseType: noop,
      onSetBaseLegStyle: noop,
      onSetBaseLegColor: noop,
      onSetBasePlinthHeightCm: noop,
      onSetBaseLegHeightCm: noop,
      onSetBaseLegWidthCm: noop,
      onSetSlidingTracksColor: noop,
      ...overrides,
    })
  );
};

test('[structure-base] no-main sketch state hides main wardrobe base controls', () => {
  const html = renderBaseControls({ hideBaseTypeControls: true });

  assert.doesNotMatch(html, /סוג בסיס/);
  assert.doesNotMatch(html, /גובה צוקל/);
  assert.doesNotMatch(html, /צבע מסילות/);
});

test('[structure-base] regular main wardrobe still renders base type controls', () => {
  const html = renderBaseControls({ hideBaseTypeControls: false });

  assert.match(html, /סוג בסיס/);
  assert.match(html, /גובה צוקל/);
});
