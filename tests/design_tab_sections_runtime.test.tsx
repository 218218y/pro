import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { DoorStyleSection } from '../esm/native/ui/react/tabs/design_tab_sections_door_style.js';
import { DoorFeaturesSection } from '../esm/native/ui/react/tabs/design_tab_sections_door_features.js';
import { CorniceSection } from '../esm/native/ui/react/tabs/design_tab_sections_cornice.js';
import { MultiColorPanelView } from '../esm/native/ui/react/tabs/design_tab_multicolor_panel_view.js';

test('[design-tab-sections-runtime] door-style and cornice options render as native buttons', () => {
  const noop = () => {};
  const doorStyleHtml = renderToStaticMarkup(
    React.createElement(DoorStyleSection, {
      model: {
        doorStyle: 'profile',
        setDoorStyle: noop,
      },
    })
  );
  const corniceHtml = renderToStaticMarkup(
    React.createElement(CorniceSection, {
      model: {
        isChestMode: false,
        noMainWardrobeActive: false,
        hasCornice: true,
        corniceType: 'wave',
        setHasCornice: noop,
        setCorniceType: noop,
      },
    })
  );

  assert.match(doorStyleHtml, /<button[^>]*type="button"[^>]*>פוסט<\/button>/);
  assert.match(doorStyleHtml, /<button[^>]*type="button"[^>]*>פרופיל<\/button>/);
  assert.match(doorStyleHtml, /<button[^>]*type="button"[^>]*>פרופיל כפול<\/button>/);
  assert.match(corniceHtml, /<button[^>]*type="button"[^>]*>רגיל<\/button>/);
  assert.match(corniceHtml, /<button[^>]*type="button"[^>]*>גל<\/button>/);
  assert.doesNotMatch(doorStyleHtml, /role="button"/);
  assert.doesNotMatch(corniceHtml, /role="button"/);
});

test('[design-tab-sections-runtime] door-features section keeps hinged/sliding visibility and edit controls canonical', () => {
  const noop = () => {};
  const hingedHtml = renderToStaticMarkup(
    React.createElement(DoorFeaturesSection, {
      model: {
        wardrobeType: 'hinged',
        isChestMode: false,
        groovesEnabled: true,
        grooveActive: true,
        grooveLinesCount: '8',
        grooveLinesCountIsAuto: false,
        splitDoors: true,
        splitActive: false,
        splitIsCustom: false,
        removeDoorsEnabled: true,
        removeDoorActive: false,
        roundedFrameSideShelvesVisible: true,
        roundedFrameSideShelvesActive: false,
        setFeatureToggle: noop,
        toggleGrooveEdit: noop,
        setGrooveLinesCount: noop,
        resetGrooveLinesCount: noop,
        toggleSplitEdit: noop,
        toggleSplitCustomEdit: noop,
        toggleRemoveDoorEdit: noop,
        toggleRoundedFrameSideShelves: noop,
      },
    })
  );

  const slidingHtml = renderToStaticMarkup(
    React.createElement(DoorFeaturesSection, {
      model: {
        wardrobeType: 'sliding',
        isChestMode: false,
        groovesEnabled: false,
        grooveActive: false,
        grooveLinesCount: '',
        grooveLinesCountIsAuto: true,
        splitDoors: true,
        splitActive: false,
        splitIsCustom: false,
        removeDoorsEnabled: false,
        removeDoorActive: false,
        roundedFrameSideShelvesVisible: false,
        roundedFrameSideShelvesActive: false,
        setFeatureToggle: noop,
        toggleGrooveEdit: noop,
        setGrooveLinesCount: noop,
        resetGrooveLinesCount: noop,
        toggleSplitEdit: noop,
        toggleSplitCustomEdit: noop,
        toggleRemoveDoorEdit: noop,
        toggleRoundedFrameSideShelves: noop,
      },
    })
  );

  const hiddenHtml = renderToStaticMarkup(
    React.createElement(DoorFeaturesSection, {
      model: {
        wardrobeType: 'open',
        isChestMode: false,
        groovesEnabled: false,
        grooveActive: false,
        grooveLinesCount: '',
        grooveLinesCountIsAuto: true,
        splitDoors: false,
        splitActive: false,
        splitIsCustom: false,
        removeDoorsEnabled: false,
        removeDoorActive: false,
        roundedFrameSideShelvesVisible: false,
        roundedFrameSideShelvesActive: false,
        setFeatureToggle: noop,
        toggleGrooveEdit: noop,
        setGrooveLinesCount: noop,
        resetGrooveLinesCount: noop,
        toggleSplitEdit: noop,
        toggleSplitCustomEdit: noop,
        toggleRemoveDoorEdit: noop,
        toggleRoundedFrameSideShelves: noop,
      },
    })
  );

  assert.match(hingedHtml, /מספר חריטות/);
  assert.match(hingedHtml, /ברירת מחדל/);
  assert.match(hingedHtml, /חיתוך דלתות ידני/);
  assert.match(hingedHtml, /הסר\/החזר דלת/);
  assert.match(hingedHtml, /מדפים מעוגלים/);
  assert.match(hingedHtml, /design-rounded-frame-side-shelves-button/);
  assert.match(hingedHtml, /type="number"/);
  assert.doesNotMatch(slidingHtml, /דלתות חתוכות \(Split\)/);
  assert.match(slidingHtml, /הסרת דלתות או דפנות/);
  assert.equal(hiddenHtml, '');
});

test('[design-tab-sections-runtime] chest mode keeps front engraving but hides door cuts, door removal, and cornice controls', () => {
  const noop = () => {};
  const chestDoorFeaturesHtml = renderToStaticMarkup(
    React.createElement(DoorFeaturesSection, {
      model: {
        wardrobeType: 'hinged',
        isChestMode: true,
        groovesEnabled: true,
        grooveActive: false,
        grooveLinesCount: '6',
        grooveLinesCountIsAuto: false,
        splitDoors: true,
        splitActive: true,
        splitIsCustom: false,
        removeDoorsEnabled: true,
        removeDoorActive: true,
        roundedFrameSideShelvesVisible: true,
        roundedFrameSideShelvesActive: true,
        setFeatureToggle: noop,
        toggleGrooveEdit: noop,
        setGrooveLinesCount: noop,
        resetGrooveLinesCount: noop,
        toggleSplitEdit: noop,
        toggleSplitCustomEdit: noop,
        toggleRemoveDoorEdit: noop,
        toggleRoundedFrameSideShelves: noop,
      },
    })
  );
  const chestCorniceHtml = renderToStaticMarkup(
    React.createElement(CorniceSection, {
      model: {
        isChestMode: true,
        noMainWardrobeActive: false,
        hasCornice: true,
        corniceType: 'classic',
        setHasCornice: noop,
        setCorniceType: noop,
      },
    })
  );

  assert.match(chestDoorFeaturesHtml, /חריטה \(CNC\) בחזיתות/);
  assert.match(chestDoorFeaturesHtml, /מספר חריטות/);
  assert.doesNotMatch(chestDoorFeaturesHtml, /דלתות חתוכות \(Split\)/);
  assert.doesNotMatch(chestDoorFeaturesHtml, /חיתוך דלתות ידני/);
  assert.doesNotMatch(chestDoorFeaturesHtml, /הסרת דלתות או דפנות/);
  assert.doesNotMatch(chestDoorFeaturesHtml, /הסר\/החזר דלת/);
  assert.doesNotMatch(chestDoorFeaturesHtml, /מדפים מעוגלים/);
  assert.equal(chestCorniceHtml, '');
});

test('[design-tab-sections-runtime] no-main wardrobe mode hides height additions cornice controls', () => {
  const noop = () => {};
  const html = renderToStaticMarkup(
    React.createElement(CorniceSection, {
      model: {
        isChestMode: false,
        noMainWardrobeActive: true,
        hasCornice: true,
        corniceType: 'classic',
        setHasCornice: noop,
        setCorniceType: noop,
      },
    })
  );

  assert.equal(html, '');
});

test('[design-tab-sections-runtime] mirror draft fields keep reset buttons compact and accessible', () => {
  const noop = () => {};
  const html = renderToStaticMarkup(
    React.createElement(MultiColorPanelView, {
      embedded: true,
      viewState: {
        enabled: true,
        paintActive: true,
        paintColor: 'mirror',
        curtainChoice: 'none',
        mirrorDraftHeight: '140',
        mirrorDraftWidth: '55',
        activeDoorStyleOverride: null,
        activeGlassFrameStyle: null,
        defaultSwatches: [],
        savedSwatches: [],
        specialSwatches: [],
        hintText: null,
      },
      onToggleEnabled: noop,
      onFinishPaintMode: noop,
      onPickBrush: noop,
      onPickDoorStyle: noop,
      onSetCurtainPreset: noop,
      onSetMirrorDraftField: noop,
    })
  );

  const resetButtons = html.match(/<button[^>]*wp-r-mirror-draft-reset-btn[^>]*>[\s\S]*?<\/button>/g) || [];

  assert.equal(resetButtons.length, 2);
  assert.match(html, /wp-r-mirror-draft-fields/);
  assert.match(html, /aria-label="חזרה לגובה מלא"/);
  assert.match(html, /aria-label="חזרה לרוחב מלא"/);
  assert.ok(
    resetButtons.every(button =>
      /^<button[^>]*><i class="fas fa-undo-alt" aria-hidden="true"><\/i><\/button>$/.test(button)
    )
  );
});
