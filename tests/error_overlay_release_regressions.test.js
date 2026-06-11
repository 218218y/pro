import test from 'node:test';
import assert from 'node:assert/strict';

import { showFatalOverlay } from '../dist/esm/native/ui/error_overlay.js';

function createBody() {
  return {
    children: [],
    appendChild(child) {
      if (
        child.parentNode &&
        child.parentNode !== this &&
        typeof child.parentNode.removeChild === 'function'
      ) {
        child.parentNode.removeChild(child);
      }
      child.parentNode = this;
      if (!this.children.includes(child)) this.children.push(child);
      return child;
    },
    removeChild(child) {
      const index = this.children.indexOf(child);
      if (index >= 0) this.children.splice(index, 1);
      child.parentNode = null;
      return child;
    },
  };
}

function createOverlayElement(tag) {
  const buttons = new Map();
  return {
    tagName: String(tag || '').toUpperCase(),
    id: '',
    parentNode: null,
    style: { cssText: '', display: '' },
    _innerHTML: '',
    appendChild() {},
    remove() {
      if (this.parentNode && typeof this.parentNode.removeChild === 'function') {
        this.parentNode.removeChild(this);
      }
    },
    querySelector(selector) {
      const match = /button\[data-wp-action="([^"]+)"\]/.exec(String(selector || ''));
      return match ? buttons.get(match[1]) || null : null;
    },
    set innerHTML(value) {
      this._innerHTML = String(value || '');
      buttons.clear();
      for (const match of this._innerHTML.matchAll(/data-wp-action="([^"]+)"/g)) {
        buttons.set(match[1], { textContent: '', onclick: null });
      }
    },
    get innerHTML() {
      return this._innerHTML;
    },
  };
}

function makeDocument() {
  const body = createBody();
  return {
    body,
    __commands: [],
    createElement(tag) {
      if (String(tag || '').toLowerCase() === 'textarea') {
        return {
          tagName: 'TEXTAREA',
          value: '',
          parentNode: null,
          style: { cssText: '' },
          setAttribute() {},
          select() {},
          remove() {
            if (this.parentNode && typeof this.parentNode.removeChild === 'function') {
              this.parentNode.removeChild(this);
            }
          },
        };
      }
      return createOverlayElement(tag);
    },
    execCommand(command) {
      this.__commands.push(command);
      return true;
    },
  };
}

function makeWindow(doc) {
  return {
    document: doc,
    location: { reload() {} },
    navigator: { userAgent: 'unit-test', clipboard: { writeText() {} } },
    setTimeout(fn) {
      if (typeof fn === 'function') fn();
      return 1;
    },
  };
}

test('showFatalOverlay reuses and re-shows an existing hidden overlay instead of appending duplicates', () => {
  const doc = makeDocument();
  const win = makeWindow(doc);

  const first = showFatalOverlay({
    window: win,
    document: doc,
    allowClose: true,
    title: 'ראשון',
    description: 'בדיקה',
    error: new Error('boom'),
  });

  assert.ok(first);
  assert.equal(doc.body.children.length, 1);
  assert.equal(first.el.style.display, 'flex');

  const closeButton = first.el.querySelector('button[data-wp-action="close"]');
  assert.ok(closeButton);
  assert.equal(typeof closeButton.onclick, 'function');
  closeButton.onclick();
  assert.equal(first.el.style.display, 'none');

  const second = showFatalOverlay({
    window: win,
    document: doc,
    allowClose: true,
    title: 'שני',
    description: 'עדכון',
    error: new Error('boom again'),
  });

  assert.ok(second);
  assert.equal(second.el, first.el);
  assert.equal(doc.body.children.length, 1);
  assert.equal(second.el.style.display, 'flex');
  assert.match(second.el.innerHTML, /שני/);
});

test('showFatalOverlay keeps no-DOM fatal paths silent when requested', () => {
  const originalError = console.error;
  const calls = [];
  console.error = (...args) => calls.push(args);
  try {
    const silent = showFatalOverlay({
      document: null,
      window: null,
      silentConsole: true,
      error: new Error('quiet'),
    });
    assert.equal(silent, null);
    assert.equal(calls.length, 0);

    const noisy = showFatalOverlay({ document: null, window: null, title: 'boom', error: new Error('loud') });
    assert.equal(noisy, null);
    assert.equal(calls.length, 1);
    assert.equal(calls[0][0], '[WardrobePro][fatal]');
  } finally {
    console.error = originalError;
  }
});
