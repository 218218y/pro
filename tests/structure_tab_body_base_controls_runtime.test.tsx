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
      baseLegPlatformMode: 'plain',
      baseLegPlatformSideMode: 'overhang',
      baseLegPlatformSideOverhangCm: 1.5,
      baseLegPlatformFrontOverhangCm: 2,
      basePlinthHeightCm: 10,
      baseLegHeightCm: 10,
      baseLegWidthCm: 4,
      isChestMode: false,
      isSliding: false,
      slidingTracksColor: 'nickel',
      onSetBaseType: noop,
      onSetBaseLegStyle: noop,
      onSetBaseLegColor: noop,
      onSetBaseLegPlatformMode: noop,
      onSetBaseLegPlatformSideMode: noop,
      onSetBaseLegPlatformSideOverhangCm: noop,
      onSetBaseLegPlatformFrontOverhangCm: noop,
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

test('[structure-base] stage platform renders side and front overhang controls', () => {
  const html = renderBaseControls({
    baseType: 'legs',
    baseLegPlatformMode: 'stage',
    baseLegPlatformSideMode: 'overhang',
  });

  assert.match(html, /בליטה מהצדדים/);
  assert.match(html, /בליטה מהחזית/);
  assert.match(html, /איפוס בליטה מהצדדים לברירת מחדל/);
  assert.match(html, /איפוס בליטה מהחזית לברירת מחדל/);
});

test('[structure-base] flush platform keeps only the front overhang control', () => {
  const html = renderBaseControls({
    baseType: 'legs',
    baseLegPlatformMode: 'stage',
    baseLegPlatformSideMode: 'flush',
  });

  assert.doesNotMatch(html, /בליטה מהצדדים/);
  assert.match(html, /בליטה מהחזית/);
});
