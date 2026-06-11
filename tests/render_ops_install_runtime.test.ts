import test from 'node:test';
import assert from 'node:assert/strict';

import { createBuilderRenderOpsInstall } from '../esm/native/builder/render_ops_install.ts';

type AnyMap = Record<string, any>;

type FakeApp = {
  id: string;
  services?: {
    builder?: AnyMap;
  };
};

function asObject<T extends object = AnyMap>(value: unknown): T | null {
  return value && typeof value === 'object' ? (value as T) : null;
}

function createDeps() {
  const builderRenderOps = {
    getCommonMats(args?: AnyMap) {
      return ['mats', args?.App?.id || null];
    },
    getMirrorMaterial(args?: AnyMap) {
      return `mirror:${args?.App?.id || 'missing'}`;
    },
    ensureSplitHoverMarker(args?: AnyMap) {
      return `split:${args?.App?.id || 'missing'}`;
    },
    ensureDoorActionHoverMarker(args?: AnyMap) {
      return `door-action:${args?.App?.id || 'missing'}`;
    },
    ensureDoorCutHoverMarker(args?: AnyMap) {
      return `door-cut:${args?.App?.id || 'missing'}`;
    },
    ensureInteriorLayoutHoverPreview(args?: AnyMap) {
      return `interior:${args?.App?.id || 'missing'}`;
    },
    setInteriorLayoutHoverPreview(args?: AnyMap) {
      return `set-interior:${args?.App?.id || 'missing'}`;
    },
    ensureSketchPlacementPreview(args?: AnyMap) {
      return `ensure-sketch:${args?.App?.id || 'missing'}`;
    },
    setSketchPlacementPreview(args?: AnyMap) {
      return `set-sketch:${args?.App?.id || 'missing'}`;
    },
    hideInteriorLayoutHoverPreview(args?: AnyMap) {
      return `hide-interior:${args?.App?.id || 'missing'}`;
    },
    hideSketchPlacementPreview(args?: AnyMap) {
      return `hide-sketch:${args?.App?.id || 'missing'}`;
    },
    createBoard(args?: AnyMap) {
      return `board:${args?.App?.id || 'missing'}`;
    },
    createModuleHitBox(args?: AnyMap) {
      return `hitbox:${args?.App?.id || 'missing'}`;
    },
    createDrawerShadowPlane(args?: AnyMap) {
      return `shadow:${args?.App?.id || 'missing'}`;
    },
    applyDimensions(args?: AnyMap) {
      return `dimensions:${args?.App?.id || 'missing'}`;
    },
    applySlidingDoorsOps(args?: AnyMap) {
      return `sliding:${args?.App?.id || 'missing'}`;
    },
    applyHingedDoorsOps(args?: AnyMap) {
      return `hinged:${args?.App?.id || 'missing'}`;
    },
    applyExternalDrawersOps(args?: AnyMap) {
      return `external:${args?.App?.id || 'missing'}`;
    },
    applyInternalDrawersOps(args?: AnyMap) {
      return `internal:${args?.App?.id || 'missing'}`;
    },
    applyInteriorPresetOps(args?: AnyMap) {
      return `preset:${args?.App?.id || 'missing'}`;
    },
    applyInteriorCustomOps(args?: AnyMap) {
      return `custom:${args?.App?.id || 'missing'}`;
    },
    applyInteriorSketchExtras(args?: AnyMap) {
      return `extras:${args?.App?.id || 'missing'}`;
    },
    createRodWithContents(args?: AnyMap) {
      return `rod:${args?.App?.id || 'missing'}`;
    },
    createHandleMesh(_type: string, _w: number, _h: number, _isLeftHinge: boolean, opts?: AnyMap) {
      return `handle:${opts?.App?.id || 'missing'}`;
    },
    applyCarcassOps(_ops: unknown, ctx?: AnyMap) {
      return `carcass:${ctx?.App?.id || 'missing'}`;
    },
  };

  return createBuilderRenderOpsInstall({
    assertApp(value: unknown) {
      return value as FakeApp;
    },
    assertBrowserWindow() {
      return {};
    },
    ensureBuilderService(app: FakeApp) {
      const services = (app.services ||= {});
      return (services.builder ||= {});
    },
    getBuilderService(app: unknown) {
      return (asObject<FakeApp>(app)?.services?.builder as AnyMap | undefined) || null;
    },
    asMap: asObject,
    asObject,
    builderRenderOps,
  });
}

test('render ops install keeps stable refs live across root replacement installs', () => {
  const install = createDeps();
  const AppA: FakeApp = { id: 'A', services: { builder: {} } };
  const installed = install.installBuilderRenderOps(AppA as never) as AnyMap;

  const heldMirror = installed.getMirrorMaterial;
  const heldBoard = installed.createBoard;
  const heldHandle = installed.createHandleMesh;
  const heldCarcass = installed.applyCarcassOps;

  assert.equal(heldMirror({}), 'mirror:A');
  assert.equal(heldBoard({}), 'board:A');
  assert.equal(heldHandle('bar', 1, 1, false, {}), 'handle:A');
  assert.equal(heldCarcass({}, {}), 'carcass:A');

  const AppB: FakeApp = { id: 'B', services: { builder: { renderOps: installed } } };
  const reinstalled = install.installBuilderRenderOps(AppB as never) as AnyMap;

  assert.equal(reinstalled, installed);
  assert.equal(reinstalled.getMirrorMaterial, heldMirror);
  assert.equal(reinstalled.createBoard, heldBoard);
  assert.equal(reinstalled.createHandleMesh, heldHandle);
  assert.equal(reinstalled.applyCarcassOps, heldCarcass);

  assert.equal(heldMirror({}), 'mirror:B');
  assert.equal(heldBoard({}), 'board:B');
  assert.equal(heldHandle('bar', 1, 1, false, {}), 'handle:B');
  assert.equal(heldCarcass({}, {}), 'carcass:B');
});

test('render ops install heals drift even when the installed marker is already set', () => {
  const install = createDeps();
  const driftedBoard = () => 'drifted-board';
  const App: FakeApp = {
    id: 'A',
    services: {
      builder: {
        renderOps: {
          __esm_v1: true,
          createBoard: driftedBoard,
        },
      },
    },
  };

  const installed = install.installBuilderRenderOps(App as never) as AnyMap;
  const canonicalBoard = installed.createBoard;
  const canonicalMirror = installed.getMirrorMaterial;

  assert.notEqual(canonicalBoard, driftedBoard);
  assert.equal(canonicalBoard({}), 'board:A');
  assert.equal(canonicalMirror({}), 'mirror:A');

  installed.createBoard = () => 'drifted-again';
  installed.getMirrorMaterial = () => 'mirror-drifted-again';
  install.installBuilderRenderOps(App as never);

  assert.equal(installed.createBoard, canonicalBoard);
  assert.equal(installed.getMirrorMaterial, canonicalMirror);
});
