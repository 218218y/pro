import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { DoorStyleSection } from '../esm/native/ui/react/tabs/design_tab_sections_door_style.js';
import { DoorFeaturesSection } from '../esm/native/ui/react/tabs/design_tab_sections_door_features.js';
import { CorniceSection } from '../esm/native/ui/react/tabs/design_tab_sections_cornice.js';

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
        hasCornice: true,
        corniceType: 'wave',
        setHasCornice: noop,
        setCorniceType: noop,
      },
    })
  );

  assert.match(doorStyleHtml, /<button[^>]*type="button"[^>]*>פוסט<\/button>/);
  assert.match(doorStyleHtml, /<button[^>]*type="button"[^>]*>פרופיל<\/button>/);
  assert.match(doorStyleHtml, /<button[^>]*type="button"[^>]*>פרופיל תום<\/button>/);
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
        groovesEnabled: true,
        grooveActive: true,
        grooveLinesCount: '8',
        grooveLinesCountIsAuto: false,
        splitDoors: true,
        splitActive: false,
        splitIsCustom: false,
        removeDoorsEnabled: true,
        removeDoorActive: false,
        setFeatureToggle: noop,
        toggleGrooveEdit: noop,
        setGrooveLinesCount: noop,
        resetGrooveLinesCount: noop,
        toggleSplitEdit: noop,
        toggleSplitCustomEdit: noop,
        toggleRemoveDoorEdit: noop,
      },
    })
  );

  const slidingHtml = renderToStaticMarkup(
    React.createElement(DoorFeaturesSection, {
      model: {
        wardrobeType: 'sliding',
        groovesEnabled: false,
        grooveActive: false,
        grooveLinesCount: '',
        grooveLinesCountIsAuto: true,
        splitDoors: true,
        splitActive: false,
        splitIsCustom: false,
        removeDoorsEnabled: false,
        removeDoorActive: false,
        setFeatureToggle: noop,
        toggleGrooveEdit: noop,
        setGrooveLinesCount: noop,
        resetGrooveLinesCount: noop,
        toggleSplitEdit: noop,
        toggleSplitCustomEdit: noop,
        toggleRemoveDoorEdit: noop,
      },
    })
  );

  const hiddenHtml = renderToStaticMarkup(
    React.createElement(DoorFeaturesSection, {
      model: {
        wardrobeType: 'open',
        groovesEnabled: false,
        grooveActive: false,
        grooveLinesCount: '',
        grooveLinesCountIsAuto: true,
        splitDoors: false,
        splitActive: false,
        splitIsCustom: false,
        removeDoorsEnabled: false,
        removeDoorActive: false,
        setFeatureToggle: noop,
        toggleGrooveEdit: noop,
        setGrooveLinesCount: noop,
        resetGrooveLinesCount: noop,
        toggleSplitEdit: noop,
        toggleSplitCustomEdit: noop,
        toggleRemoveDoorEdit: noop,
      },
    })
  );

  assert.match(hingedHtml, /מספר חריטות/);
  assert.match(hingedHtml, /ברירת מחדל/);
  assert.match(hingedHtml, /חיתוך דלתות ידני/);
  assert.match(hingedHtml, /הסר\/החזר דלת/);
  assert.match(hingedHtml, /type="number"/);
  assert.doesNotMatch(slidingHtml, /דלתות חתוכות \(Split\)/);
  assert.doesNotMatch(slidingHtml, /הסרת דלתות \(נישה פתוחה\)/);
  assert.equal(hiddenHtml, '');
});
