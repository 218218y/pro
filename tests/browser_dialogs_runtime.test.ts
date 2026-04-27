import test from 'node:test';
import assert from 'node:assert/strict';

import { installBrowserDialogsAdapter } from '../esm/native/adapters/browser/dialogs.ts';

test('browser dialogs adapter installs confirm/prompt wrappers and snapshots userAgent', () => {
  const calls: Array<[string, string]> = [];
  const browserWindow = {
    document: {
      createElement() {
        return {};
      },
      querySelector() {
        return null;
      },
    },
    navigator: { userAgent: 'Agent/1.0' },
    location: { search: '' },
    confirm(message: string) {
      calls.push(['confirm', message]);
      return true;
    },
    prompt(message: string, def?: string) {
      calls.push(['prompt', `${message}|${def ?? ''}`]);
      return 'answer';
    },
  };

  const App = {
    deps: {
      browser: {
        window: browserWindow,
        navigator: { userAgent: 'Agent/1.0' },
      },
    },
  };

  installBrowserDialogsAdapter(App as never);
  const browser = App.browser || {};

  assert.equal(browser.userAgent, 'Agent/1.0');
  assert.equal(typeof browser.confirm, 'function');
  assert.equal(typeof browser.prompt, 'function');
  assert.equal(browser.confirm?.('Delete it?'), true);
  assert.equal(browser.prompt?.('Name', 12), 'answer');
  assert.deepEqual(calls, [
    ['confirm', 'Delete it?'],
    ['prompt', 'Name|12'],
  ]);
});
