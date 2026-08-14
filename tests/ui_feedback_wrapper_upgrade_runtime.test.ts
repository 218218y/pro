import test from 'node:test';
import assert from 'node:assert/strict';

import { getUiFeedback } from '../esm/native/runtime/service_access.ts';
import { installUiFeedback } from '../esm/native/ui/feedback.ts';

test('captured uiFeedback wrappers upgrade to mounted canonical react feedback host after install', () => {
  const seen: Array<string> = [];
  let confirmed = false;
  let cancelled = false;
  let acknowledged = false;

  const App = {
    services: {
      uiFeedbackRuntime: {
        reactHost: {
          toast(message: string, kind?: string) {
            seen.push(`toast:${kind || 'success'}:${message}`);
          },
          prompt(_title: string, _defaultValue: string, callback: (value: unknown) => void) {
            callback('ok');
          },
          confirm(title: string, message: string, callback: () => void, onCancel?: (() => void) | null) {
            seen.push(`confirm:${title}:${message}`);
            callback();
            if (onCancel) seen.push('confirm:cancel-hook-ready');
          },
          acknowledge(title: string, message: string, callback?: (() => void) | null) {
            seen.push(`acknowledge:${title}:${message}`);
            callback?.();
          },
        },
      },
    },
  } as any;

  const feedbackBeforeInstall = getUiFeedback(App);
  const capturedToast = feedbackBeforeInstall.toast;
  const capturedConfirm = feedbackBeforeInstall.confirm;
  const capturedAcknowledge = feedbackBeforeInstall.acknowledge;

  installUiFeedback(App);

  capturedToast('שלום', 'info');
  capturedConfirm(
    'שמירה',
    'להמשיך?',
    () => {
      confirmed = true;
    },
    () => {
      cancelled = true;
    }
  );
  capturedAcknowledge('לתשומת לבך', 'הארון השתנה', () => {
    acknowledged = true;
  });

  assert.equal(confirmed, true);
  assert.equal(cancelled, false);
  assert.equal(acknowledged, true);
  assert.deepEqual(seen, [
    'toast:info:שלום',
    'confirm:שמירה:להמשיך?',
    'confirm:cancel-hook-ready',
    'acknowledge:לתשומת לבך:הארון השתנה',
  ]);
});

test('empty uiFeedback defaults do not recurse across aliases before install', () => {
  let promptValue: string | null = 'unset';
  let confirmed = false;
  let cancelled = false;
  let acknowledged = false;

  const App = {
    services: {},
    deps: {
      browser: {
        document: {
          createElement() {
            return {};
          },
          querySelector() {
            return null;
          },
          defaultView: {
            prompt() {
              return 'typed';
            },
            confirm() {
              return true;
            },
            alert() {},
          },
        },
        window: {
          document: {
            createElement() {
              return {};
            },
            querySelector() {
              return null;
            },
          },
          navigator: { userAgent: 'node-test' },
          location: { href: 'http://localhost/' },
          prompt() {
            return 'typed';
          },
          confirm() {
            return true;
          },
          alert() {},
        },
      },
    },
  } as any;

  const feedback = getUiFeedback(App);
  feedback.showToast('alive', 'info');
  feedback.prompt('title', 'default', value => {
    promptValue = value;
  });
  feedback.openCustomConfirm(
    'title',
    'message',
    () => {
      confirmed = true;
    },
    () => {
      cancelled = true;
    }
  );
  feedback.openCustomAcknowledge('title', 'important', () => {
    acknowledged = true;
  });

  assert.equal(promptValue, 'typed');
  assert.equal(confirmed, true);
  assert.equal(cancelled, false);
  assert.equal(acknowledged, true);
});

test('empty uiFeedback defaults forward cancel callback when confirm is declined', () => {
  let cancelled = false;

  const App = {
    services: {},
    deps: {
      browser: {
        document: {
          createElement() {
            return {};
          },
          querySelector() {
            return null;
          },
          defaultView: {
            confirm() {
              return false;
            },
          },
        },
        window: {
          document: {
            createElement() {
              return {};
            },
            querySelector() {
              return null;
            },
          },
          navigator: { userAgent: 'node-test' },
          location: { href: 'http://localhost/' },
          confirm() {
            return false;
          },
        },
      },
    },
  } as any;

  const feedback = getUiFeedback(App);
  feedback.confirm(
    'title',
    'message',
    () => undefined,
    () => {
      cancelled = true;
    }
  );

  assert.equal(cancelled, true);
});
