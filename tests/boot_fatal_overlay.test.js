import test from 'node:test';
import assert from 'node:assert/strict';

import { showBootFatalOverlay } from '../dist/esm/entry_pro.js';

function makeElement(tag) {
  return {
    tag,
    id: '',
    dir: '',
    textContent: '',
    style: { cssText: '' },
    children: [],
    appendChild(child) {
      this.children.push(child);
    },
  };
}

function makeDocument() {
  const body = makeElement('body');
  return {
    body,
    createElement(tag) {
      return makeElement(tag);
    },
  };
}

function makeWindow() {
  return {
    location: { reload() {} },
    navigator: { userAgent: 'unit-test', clipboard: { writeText() {} } },
  };
}

test('boot fatal overlay does not throw when DOM is missing', () => {
  const win = makeWindow();
  const ctrl = showBootFatalOverlay({ window: win, document: null, error: new Error('boom') });
  assert.equal(ctrl, null);
});

test('boot fatal overlay builds an overlay when DOM exists', () => {
  const win = makeWindow();
  const doc = makeDocument();

  const ctrl = showBootFatalOverlay({
    window: win,
    document: doc,
    title: 'שגיאת טעינה: בדיקה',
    description: 'טסט בונה overlay',
    error: new Error('boom'),
  });

  assert.ok(ctrl);
  assert.ok(ctrl.el);
  assert.equal(ctrl.el.id, 'wpBootFatalOverlay');
  assert.equal(doc.body.children.length, 1);
  assert.equal(doc.body.children[0], ctrl.el);

  // Real overlay pattern flag is set on window.
  assert.ok(win.__WARDROBE_PRO_FATAL_OVERLAY__);
  assert.equal(win.__WARDROBE_PRO_FATAL_OVERLAY__.el, ctrl.el);
});
