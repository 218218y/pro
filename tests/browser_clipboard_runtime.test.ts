import test from 'node:test';
import assert from 'node:assert/strict';

import {
  writeClipboardItemsResultViaBrowser,
  writeClipboardTextResultViaBrowser,
} from '../esm/native/runtime/browser_clipboard.ts';

test('writeClipboardTextResultViaBrowser succeeds via clipboard.writeText when available', async () => {
  const seen: string[] = [];
  const result = await writeClipboardTextResultViaBrowser(
    {
      clipboardMaybe: {
        writeText(text: string) {
          seen.push(text);
        },
      },
    },
    'hello world',
    { allowExecCommand: false }
  );

  assert.deepEqual(result, { ok: true });
  assert.deepEqual(seen, ['hello world']);
});

test('writeClipboardTextResultViaBrowser falls back to execCommand copy when allowed', async () => {
  let selected = false;
  const body = {
    appendChild() {
      return undefined;
    },
  };
  const doc = {
    body,
    createElement() {
      return {
        value: '',
        style: {},
        setAttribute() {
          return undefined;
        },
        select() {
          selected = true;
        },
        remove() {
          return undefined;
        },
      };
    },
    execCommand(command: string) {
      assert.equal(command, 'copy');
      return true;
    },
  };

  const result = await writeClipboardTextResultViaBrowser({ docMaybe: doc }, 'copied text');

  assert.deepEqual(result, { ok: true });
  assert.equal(selected, true);
});

test('writeClipboardTextResultViaBrowser returns unavailable when no clipboard surface exists', async () => {
  const result = await writeClipboardTextResultViaBrowser({}, 'missing clipboard', {
    allowExecCommand: false,
  });
  assert.deepEqual(result, {
    ok: false,
    reason: 'unavailable',
    message: 'browser clipboard text unavailable',
  });
});

test('writeClipboardItemsResultViaBrowser preserves thrown clipboard messages', async () => {
  const result = await writeClipboardItemsResultViaBrowser(
    {
      clipboardMaybe: {
        async write() {
          throw new Error('clipboard write exploded');
        },
      },
    },
    [{ kind: 'image/png' } as unknown] as ClipboardItems
  );

  assert.deepEqual(result, { ok: false, reason: 'error', message: 'clipboard write exploded' });
});

test('writeClipboardTextResultViaBrowser reports clipboard owner failures through diagnostics without changing result', async () => {
  const reports: Array<{ error: unknown; ctx: unknown }> = [];
  const result = await writeClipboardTextResultViaBrowser(
    {
      services: {
        errors: {
          report(error: unknown, ctx: unknown) {
            reports.push({ error, ctx });
          },
        },
      },
      clipboardMaybe: {
        async writeText() {
          throw new Error('clipboard diagnostic exploded');
        },
      },
    },
    'hello',
    { allowExecCommand: false }
  );

  assert.deepEqual(result, { ok: false, reason: 'error', message: 'clipboard diagnostic exploded' });
  assert.equal(reports.length, 1);
  assert.equal((reports[0]!.error as Error).message, 'clipboard diagnostic exploded');
  assert.deepEqual(reports[0]!.ctx, {
    where: 'native/runtime/browser_clipboard',
    op: 'writeClipboardText',
    fatal: false,
  });
});
