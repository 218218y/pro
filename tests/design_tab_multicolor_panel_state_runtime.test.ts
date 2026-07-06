import test from 'node:test';
import assert from 'node:assert/strict';

import {
  MULTI_GLASS_HEIGHT,
  MULTI_GLASS_STYLE_OPTIONS,
  MULTI_GLASS_WIDTH,
  MULTI_SPECIAL_SWATCHES,
} from '../esm/native/ui/react/tabs/design_tab_multicolor_panel_contracts.js';
import {
  createDesignTabMulticolorViewState,
  resolveDesignTabCurtainChoice,
} from '../esm/native/ui/react/tabs/design_tab_multicolor_panel_state.js';

test('[design-tab-multicolor-state] exposes all three glass style buttons in the requested RTL order', () => {
  assert.deepEqual(
    MULTI_GLASS_STYLE_OPTIONS.map(option => option.label),
    ['זכוכית', 'זכוכית מלאה', 'זכוכית פרופיל כפול']
  );
  assert.deepEqual(
    MULTI_GLASS_STYLE_OPTIONS.map(option => option.paintId),
    ['glass', '__wp_glass_style__:flat', '__wp_glass_style__:double_profile']
  );
  assert.equal(MULTI_GLASS_STYLE_OPTIONS[0]?.curtainPreset, 'none');
});

test('[design-tab-multicolor-state] exposes black and frosted adhesive glass swatches with mirror-sized controls state', () => {
  assert.deepEqual(
    MULTI_SPECIAL_SWATCHES.map(option => option.title),
    ['מראה', 'זכוכית שחורה', 'זכוכית חלבית', 'דלת זכוכית / וילון']
  );
  assert.deepEqual(
    MULTI_SPECIAL_SWATCHES.map(option => option.paintId),
    ['mirror', 'black_glass', 'frosted_glass', 'glass']
  );
  assert.equal(
    MULTI_SPECIAL_SWATCHES.find(option => option.id === 'black_glass')?.swatchClassName,
    'special-swatch--black-glass'
  );
  assert.equal(MULTI_GLASS_HEIGHT, 'גובה זכוכית');
  assert.equal(MULTI_GLASS_WIDTH, 'רוחב זכוכית');

  const state = createDesignTabMulticolorViewState({
    enabled: true,
    primaryMode: 'paint',
    curtainChoiceRaw: 'none',
    mirrorDraftHeight: '120',
    mirrorDraftWidth: '45',
    paintColor: 'frosted_glass',
    activeDoorStyleOverride: null,
    defaultSwatches: [],
    savedSwatches: [],
  });

  assert.equal(state.activeAdhesiveGlassKind, 'frosted_glass');
  assert.equal(state.activeGlassFrameStyle, null);
  assert.equal(state.specialSwatches.find(dot => dot.id === 'frosted_glass')?.selected, true);
  assert.equal(
    state.specialSwatches.find(dot => dot.id === 'black_glass')?.swatchClassName,
    'special-swatch--black-glass'
  );
  assert.equal(state.hintText, 'כעת לחץ על דלתות כדי להחיל זכוכית מודבקת במידה שנבחרה.');
  assert.equal(state.mirrorDraftHeight, '120');
  assert.equal(state.mirrorDraftWidth, '45');
});

test('[design-tab-multicolor-state] derives curtain choice, swatch selection, and hints from one canonical state seam', () => {
  const viewState = createDesignTabMulticolorViewState({
    enabled: true,
    primaryMode: 'paint',
    curtainChoiceRaw: 'pink',
    mirrorDraftHeight: '140',
    mirrorDraftWidth: '55',
    paintColor: 'glass',
    activeDoorStyleOverride: null,
    defaultSwatches: [
      { paintId: '#ffffff', title: 'לבן', val: '#ffffff' },
      { paintId: '#000000', title: 'שחור', val: '#000000' },
    ],
    savedSwatches: [{ id: 'oak', name: 'אלון', type: 'color', value: '#a08060', textureData: null }],
  });

  assert.equal(viewState.paintActive, true);
  assert.equal(viewState.curtainChoice, 'pink');
  assert.equal(viewState.hintText, 'כעת לחץ על דלתות כדי להחיל זכוכית ואת הוילון הנבחר.');
  assert.equal(viewState.activeGlassFrameStyle, 'profile');
  assert.equal(
    viewState.defaultSwatches.some(dot => dot.selected),
    false
  );
  assert.equal(viewState.specialSwatches.find(dot => dot.id === 'glass_curtain')?.selected, false);
  assert.equal(viewState.mirrorDraftHeight, '140');
  assert.equal(viewState.mirrorDraftWidth, '55');
});

test('[design-tab-multicolor-state] keeps door-style and curtain fallback rules canonical', () => {
  const styleState = createDesignTabMulticolorViewState({
    enabled: true,
    primaryMode: 'paint',
    curtainChoiceRaw: 'not-a-curtain',
    mirrorDraftHeight: '',
    mirrorDraftWidth: '',
    paintColor: '__doorStyle:double_profile',
    activeDoorStyleOverride: 'double_profile',
    defaultSwatches: [],
    savedSwatches: [],
  });

  assert.equal(resolveDesignTabCurtainChoice('wat'), 'none');
  assert.equal(styleState.curtainChoice, 'none');
  assert.equal(styleState.hintText, 'כעת לחץ על דלתות או מגירות כדי להחיל את סגנון החזית שנבחר.');
});

test('[design-tab-multicolor-state] selects special and saved swatches canonically while mirror keeps hints quiet', () => {
  const glassState = createDesignTabMulticolorViewState({
    enabled: true,
    primaryMode: 'paint',
    curtainChoiceRaw: 'white',
    mirrorDraftHeight: '',
    mirrorDraftWidth: '',
    paintColor: 'glass',
    activeDoorStyleOverride: null,
    defaultSwatches: [{ paintId: '#ffffff', title: 'לבן', val: '#ffffff' }],
    savedSwatches: [
      { id: 'oak', name: 'אלון', type: 'texture', value: '#a08060', textureData: 'data:oak' },
      { id: 'plain', name: 'פשוט', type: 'color', value: '#202020', textureData: null },
    ],
  });

  assert.equal(glassState.hintText, 'כעת לחץ על דלתות כדי להחיל זכוכית ואת הוילון הנבחר.');
  assert.equal(glassState.specialSwatches.find(dot => dot.id === 'glass_curtain')?.selected, false);
  assert.equal(glassState.savedSwatches.find(dot => dot.paintId === 'oak')?.selected, false);
  assert.equal(glassState.savedSwatches.find(dot => dot.paintId === 'oak')?.isTexture, true);

  const doubleProfileGlassState = createDesignTabMulticolorViewState({
    enabled: true,
    primaryMode: 'paint',
    curtainChoiceRaw: 'none',
    mirrorDraftHeight: '',
    mirrorDraftWidth: '',
    paintColor: '__wp_glass_style__:double_profile',
    activeDoorStyleOverride: null,
    defaultSwatches: [],
    savedSwatches: [],
  });

  assert.equal(doubleProfileGlassState.hintText, 'כעת לחץ על דלתות כדי להחיל זכוכית ואת הוילון הנבחר.');
  assert.equal(doubleProfileGlassState.activeGlassFrameStyle, 'double_profile');
  assert.equal(
    doubleProfileGlassState.specialSwatches.find(dot => dot.id === 'glass_curtain')?.selected,
    true
  );

  const savedState = createDesignTabMulticolorViewState({
    enabled: true,
    primaryMode: 'paint',
    curtainChoiceRaw: 'none',
    mirrorDraftHeight: '',
    mirrorDraftWidth: '',
    paintColor: 'oak',
    activeDoorStyleOverride: null,
    defaultSwatches: [],
    savedSwatches: [{ id: 'oak', name: 'אלון', type: 'texture', value: '#a08060', textureData: 'data:oak' }],
  });

  assert.equal(savedState.savedSwatches.find(dot => dot.paintId === 'oak')?.selected, true);
  assert.equal(savedState.hintText, 'כעת לחץ על חלקים בארון כדי לצבוע אותם.');

  const mirrorState = createDesignTabMulticolorViewState({
    enabled: true,
    primaryMode: 'paint',
    curtainChoiceRaw: 'none',
    mirrorDraftHeight: '',
    mirrorDraftWidth: '',
    paintColor: 'mirror',
    activeDoorStyleOverride: null,
    defaultSwatches: [],
    savedSwatches: [],
  });

  assert.equal(mirrorState.hintText, null);
});
