import test from 'node:test';
import assert from 'node:assert/strict';

import {
  callRoomAction,
  callRuntimeAction,
  callStoreAction,
  callUiAction,
  getRoomActionFn,
  getRuntimeActionFn,
  getStoreActionFn,
  getUiActionFn,
  getUiActions,
  getRuntimeActions,
} from '../esm/native/runtime/actions_access_domains.ts';

test('actions_access_domains exposes canonical room/ui/runtime/store action seams', () => {
  const calls: unknown[][] = [];
  const app = {
    actions: {
      room: {
        prefix: 'room',
        setManualWidth(this: { prefix: string }, next: boolean) {
          calls.push([this.prefix, next]);
          return next;
        },
      },
      ui: {
        prefix: 'ui',
        setFlag(this: { prefix: string }, key: string, next: boolean) {
          calls.push([this.prefix, key, next]);
          return next;
        },
      },
      runtime: {
        prefix: 'runtime',
        setReady(this: { prefix: string }, next: boolean) {
          calls.push([this.prefix, next]);
          return next;
        },
      },
      store: {
        prefix: 'store',
        clear(this: { prefix: string }, key: string) {
          calls.push([this.prefix, key]);
          return key;
        },
      },
    },
  };

  assert.equal(getRoomActionFn<(next: boolean) => boolean>(app, 'setManualWidth')?.(true), true);
  assert.equal(callRoomAction<(next: boolean) => boolean>(app, 'setManualWidth', false), false);
  assert.equal(
    getUiActionFn<(key: string, next: boolean) => boolean>(app, 'setFlag')?.('drawer', true),
    true
  );
  assert.equal(callUiAction<(key: string, next: boolean) => boolean>(app, 'setFlag', 'drawer', false), false);
  assert.equal(getRuntimeActionFn<(next: boolean) => boolean>(app, 'setReady')?.(true), true);
  assert.equal(callRuntimeAction<(next: boolean) => boolean>(app, 'setReady', false), false);
  assert.equal(getStoreActionFn<(key: string) => string>(app, 'clear')?.('x'), 'x');
  assert.equal(callStoreAction<(key: string) => string>(app, 'clear', 'y'), 'y');

  assert.equal(getUiActions(app)?.prefix, 'ui');
  assert.equal(getRuntimeActions(app)?.prefix, 'runtime');
  assert.deepEqual(calls, [
    ['room', true],
    ['room', false],
    ['ui', 'drawer', true],
    ['ui', 'drawer', false],
    ['runtime', true],
    ['runtime', false],
    ['store', 'x'],
    ['store', 'y'],
  ]);
});
