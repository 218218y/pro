import test from 'node:test';
import assert from 'node:assert/strict';

import { createQuickActionsDockController } from '../esm/native/ui/react/overlay_quick_actions_dock_controller_runtime.ts';

test('quick actions controller reads and subscribes pinned sync state through panel snapshot API', () => {
  const seen: boolean[] = [];
  let subscriber: ((snapshot: { floatingSync?: unknown }) => void) | null = null;
  const controller = createQuickActionsDockController({
    api: {
      getPanelSnapshot: () => ({ floatingSync: 1 }),
      subscribePanelSnapshot: fn => {
        subscriber = fn;
        return () => {
          subscriber = null;
        };
      },
    },
  });

  assert.equal(controller.readPinnedSync(), true);
  const dispose = controller.subscribePinnedSync(value => seen.push(value));
  assert.equal(typeof dispose, 'function');
  subscriber?.({ floatingSync: 0 });
  subscriber?.({ floatingSync: 'yes' });
  assert.deepEqual(seen, [false, true]);
  dispose?.();
  assert.equal(subscriber, null);
});

test('quick actions controller toggles menu and pin state while stopping button events', () => {
  const calls: string[] = [];
  let menuState = false;
  let pinnedState = false;
  const event = {
    preventDefault() {
      calls.push('preventDefault');
    },
    stopPropagation() {
      calls.push('stopPropagation');
    },
  };
  const controller = createQuickActionsDockController({ api: null });

  controller.toggleMenu({
    event,
    op: 'quick-actions:toggle-menu',
    setMenuOpen: updater => {
      menuState = typeof updater === 'function' ? updater(menuState) : updater;
    },
  });
  const nextPinned = controller.toggleMenuPinned({
    event,
    menuPinnedOpen: pinnedState,
    op: 'quick-actions:pin-menu',
    setMenuPinnedOpen: next => {
      pinnedState = next;
    },
  });

  assert.equal(menuState, true);
  assert.equal(nextPinned, true);
  assert.equal(pinnedState, true);
  assert.deepEqual(calls, ['preventDefault', 'stopPropagation', 'preventDefault', 'stopPropagation']);
});

test('quick actions controller closes menu only for outside pointer events', () => {
  let closeCount = 0;
  const insideTarget = { id: 'inside' };
  const outsideTarget = { id: 'outside' };
  const insideRef = {
    contains(value: unknown) {
      return value === insideTarget;
    },
  };
  const controller = createQuickActionsDockController({ api: null });

  controller.handleOutsidePointerDown(
    {
      composedPath() {
        return [insideRef, insideTarget];
      },
      target: insideTarget,
    },
    {
      closeMenu: () => {
        closeCount += 1;
      },
      menuPinnedOpen: false,
      refs: { anchor: insideRef },
    }
  );

  controller.handleOutsidePointerDown(
    {
      target: outsideTarget,
    },
    {
      closeMenu: () => {
        closeCount += 1;
      },
      menuPinnedOpen: false,
      refs: { anchor: insideRef },
    }
  );

  controller.handleOutsidePointerDown(
    {
      target: outsideTarget,
    },
    {
      closeMenu: () => {
        closeCount += 1;
      },
      menuPinnedOpen: true,
      refs: { anchor: insideRef },
    }
  );

  assert.equal(closeCount, 1);
});

test('quick actions controller runs actions, closes menu when needed, and reports async failures', async () => {
  const reports: Array<{ op: string; msg: string }> = [];
  let closeCount = 0;
  let runCount = 0;
  const controller = createQuickActionsDockController({
    api: null,
    reportNonFatal(op, err) {
      reports.push({ op, msg: err instanceof Error ? err.message : String(err) });
    },
  });

  controller.runAction({
    action: () => {
      runCount += 1;
    },
    closeMenu: () => {
      closeCount += 1;
    },
    event: {
      preventDefault() {},
      stopPropagation() {},
    },
    keepOpen: false,
    op: 'quick-actions:snapshot',
  });

  controller.runAction({
    action: async () => {
      throw new Error('boom');
    },
    event: {
      preventDefault() {},
      stopPropagation() {},
    },
    keepOpen: true,
    op: 'quick-actions:sync-click',
  });

  await Promise.resolve();
  await Promise.resolve();

  assert.equal(runCount, 1);
  assert.equal(closeCount, 1);
  assert.deepEqual(reports, [{ op: 'quick-actions:sync-click:action', msg: 'boom' }]);
});
