import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

function readSource(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
}

test('viewer overlay exposes notes edit and visibility controls without duplicating notes logic', () => {
  const topControls = readSource('esm/native/ui/react/overlay_top_controls.tsx');
  const controls = readSource('esm/native/ui/react/overlay_notes_controls.tsx');
  const css = readSource('css/react_styles.css');

  assert.match(topControls, /<ViewerNotesControls \/>/);
  assert.match(controls, /setUiNotesEnabled/);
  assert.match(controls, /setUiShowContents/);
  assert.match(controls, /getUiNotesServiceMaybe/);
  assert.match(controls, /enterScreenDrawMode/);
  assert.match(controls, /exitScreenDrawMode/);
  assert.match(controls, /subscribeNotesDrawMode/);
  assert.match(controls, /viewer\.notes\.drawMode\.toggle/);
  assert.match(controls, /viewer\.notes\.visibility\.toggle/);
  assert.match(controls, /viewer\.contents\.visibility\.toggle/);
  assert.match(controls, /viewer\.measurement\.mode\.toggle/);
  assert.match(controls, /data-testid="viewer-note-draw-mode-button"/);
  assert.match(controls, /data-testid="viewer-notes-visibility-button"/);
  assert.match(controls, /data-testid="viewer-contents-toggle-button"/);
  assert.match(controls, /data-testid="viewer-measurement-toggle-button"/);
  assert.match(
    controls,
    /setUiShowContents\(app, next, \{ source: 'react:viewerContentsControls:visibility', immediate: true \}\)/
  );
  assert.doesNotMatch(controls, /setUiShowContents\(app, next, meta\.uiOnlyImmediate/);
  assert.ok(
    controls.indexOf('className="wp-viewer-notes-wrap"') < controls.indexOf('wp-viewer-contents-btn'),
    'notes button group must be first in the RTL row so it stays on the top-right and contents stays to its left'
  );
  assert.match(controls, /wp-viewer-contents-btn/);
  assert.match(controls, /wp-viewer-measurement-btn/);
  assert.match(controls, /fa-tshirt/);
  assert.match(controls, /fa-ruler-combined/);

  assert.match(
    css,
    /body\.wp-ui-react \.wp-viewer-notes-controls \{[\s\S]*?top:\s*20px;[\s\S]*?right:\s*20px;/
  );
  assert.match(
    css,
    /body\.wp-ui-react \.wp-viewer-notes-controls-row \{[\s\S]*?display:\s*flex;[\s\S]*?direction:\s*rtl;[\s\S]*?gap:\s*8px;/
  );
  assert.match(
    css,
    /body\.wp-ui-react \.cam-btn\.wp-viewer-note-btn,\s*body\.wp-ui-react \.cam-btn\.wp-viewer-contents-btn,\s*body\.wp-ui-react \.cam-btn\.wp-viewer-measurement-btn \{[\s\S]*?width:\s*42px;[\s\S]*?height:\s*42px;[\s\S]*?box-sizing:\s*border-box;[\s\S]*?padding:\s*0;[\s\S]*?border-radius:\s*50%;/
  );
  assert.match(css, /body\.wp-ui-react \.cam-btn\.wp-viewer-contents-btn\.is-on/);
  assert.match(css, /body\.wp-ui-react \.cam-btn\.wp-viewer-measurement-btn\.is-on/);
  assert.match(css, /background:\s*#eff6ff;/);
  assert.match(
    css,
    /body\.wp-ui-react \.wp-viewer-note-eye \{[\s\S]*?left:\s*-6px;[\s\S]*?right:\s*auto;[\s\S]*?bottom:\s*2px;[\s\S]*?width:\s*20px;[\s\S]*?height:\s*20px;[\s\S]*?box-sizing:\s*border-box;[\s\S]*?padding:\s*0;/
  );
  assert.match(css, /body\.wp-ui-react \.hint-bottom \{[\s\S]*?position:\s*relative;/);
  assert.match(
    css,
    /body\.wp-ui-react \.wp-viewer-notes-wrap > \.wp-viewer-note-eye\.hint-bottom \{[\s\S]*?position:\s*absolute;[\s\S]*?left:\s*-6px;[\s\S]*?right:\s*auto;[\s\S]*?bottom:\s*2px;[\s\S]*?top:\s*auto;/
  );
  assert.ok(
    css.indexOf('body.wp-ui-react .wp-viewer-notes-wrap > .wp-viewer-note-eye.hint-bottom') >
      css.indexOf('body.wp-ui-react .hint-bottom {'),
    'notes visibility chip must re-assert absolute positioning after the shared tooltip helper'
  );
  assert.match(
    css,
    /body\.wp-ui-react \.wp-viewer-note-eye,[\s\S]*?body\.wp-ui-react \.wp-qa-sync-pin \{[\s\S]*?z-index:\s*var\(--wp-z-quick-actions-pin\);/
  );
  assert.match(css, /body\.wp-ui-react \.wp-viewer-note-eye\.is-on/);
});
