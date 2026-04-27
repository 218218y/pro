import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ensureCanvasPickingService,
  getCanvasPickingServiceMaybe,
  ensureCanvasPickingRuntime,
  getCanvasPickingRuntime,
  getCanvasPickingClickHandler,
  getCanvasPickingHoverHandler,
} from '../esm/native/runtime/canvas_picking_access.ts';
import { installCanvasPickingService } from '../esm/native/services/canvas_picking.ts';

test('canvas_picking_access exposes canonical typed service/runtime/handler seams', () => {
  const calls: Array<[string, number, number]> = [];
  const App: Record<string, unknown> = { services: {} };

  assert.equal(getCanvasPickingServiceMaybe(App), null);
  assert.equal(getCanvasPickingRuntime(App), null);

  const service = ensureCanvasPickingService(App);
  const runtime = ensureCanvasPickingRuntime(App);

  service.handleClickNDC = (x: number, y: number) => {
    calls.push(['click', x, y]);
    return `click:${x},${y}`;
  };
  service.handleHoverNDC = (x: number, y: number) => {
    calls.push(['hover', x, y]);
    return `hover:${x},${y}`;
  };

  assert.equal(getCanvasPickingServiceMaybe(App), service);
  assert.equal(getCanvasPickingRuntime(App), runtime);
  assert.equal(ensureCanvasPickingRuntime(App), runtime);

  const click = getCanvasPickingClickHandler(App);
  const hover = getCanvasPickingHoverHandler(App);
  assert.ok(click);
  assert.ok(hover);

  assert.equal(click?.(0.25, -0.5), 'click:0.25,-0.5');
  assert.equal(hover?.(-0.75, 0.1), 'hover:-0.75,0.1');
  assert.deepEqual(calls, [
    ['click', 0.25, -0.5],
    ['hover', -0.75, 0.1],
  ]);
});

test('installCanvasPickingService preserves live handler refs across repeated installs and heals missing handlers', () => {
  const App: Record<string, unknown> = { services: {} };

  const firstInstall = installCanvasPickingService(App as any);
  assert.ok(firstInstall);
  const service = firstInstall?.service;
  assert.ok(service);

  const clickRef = service?.handleClickNDC;
  const hoverRef = service?.handleHoverNDC;
  assert.equal(typeof clickRef, 'function');
  assert.equal(typeof hoverRef, 'function');

  const secondInstall = installCanvasPickingService(App as any);
  assert.equal(secondInstall?.service, service);
  assert.equal(secondInstall?.handleCanvasClickNDC, clickRef);
  assert.equal(secondInstall?.handleCanvasHoverNDC, hoverRef);
  assert.equal(service?.handleClickNDC, clickRef);
  assert.equal(service?.handleHoverNDC, hoverRef);

  if (service) delete (service as Record<string, unknown>).handleHoverNDC;
  const healedInstall = installCanvasPickingService(App as any);
  assert.equal(healedInstall?.service, service);
  assert.equal(healedInstall?.handleCanvasClickNDC, clickRef);
  assert.equal(healedInstall?.handleCanvasHoverNDC, hoverRef);
  assert.equal(service?.handleClickNDC, clickRef);
  assert.equal(service?.handleHoverNDC, hoverRef);

  if (service)
    (service as Record<string, unknown>).handleClickNDC = (x: number, y: number) => `drift:${x},${y}`;
  const driftHealedInstall = installCanvasPickingService(App as any);
  assert.equal(driftHealedInstall?.service, service);
  assert.equal(driftHealedInstall?.handleCanvasClickNDC, clickRef);
  assert.equal(service?.handleClickNDC, clickRef);
});
