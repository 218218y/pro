import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';

import { loadStructuralBuildRefreshActionsModule } from './_load_structural_build_refresh_actions.js';

const require = createRequire(import.meta.url);
const ts = require('typescript');

function flattenButtons(node, result = []) {
  if (!node || typeof node !== 'object') return result;
  if (node.type === 'button') result.push(node);
  const children = node.props?.children;
  if (Array.isArray(children)) {
    for (const child of children) flattenButtons(child, result);
  } else if (children) {
    flattenButtons(children, result);
  }
  return result;
}

function flattenInputs(node, result = []) {
  if (!node || typeof node !== 'object') return result;
  if (node.type === 'input') result.push(node);
  const children = node.props?.children;
  if (Array.isArray(children)) {
    for (const child of children) flattenInputs(child, result);
  } else if (children) {
    flattenInputs(children, result);
  }
  return result;
}

function normalizeDoorMountThicknessCm(value) {
  if (value === null || typeof value === 'undefined' || value === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.round(Math.min(8, Math.max(0.4, n)) * 10) / 10;
}

function selectDoorMountThicknessControls(cfg) {
  const mode =
    cfg.wardrobeType === 'sliding'
      ? 'overlay'
      : String(cfg.doorMountMode || 'overlay') === 'inset'
        ? 'inset'
        : 'overlay';
  const defaultThicknessCm = mode === 'inset' ? 3.6 : 1.8;
  const frameKey = mode === 'inset' ? 'insetFrameThicknessCm' : 'overlayFrameThicknessCm';
  const shelfKey = mode === 'inset' ? 'insetShelfThicknessCm' : 'overlayShelfThicknessCm';
  const frameOverrideCm = normalizeDoorMountThicknessCm(cfg[frameKey]);
  const shelfOverrideCm = normalizeDoorMountThicknessCm(cfg[shelfKey]);
  const frameThicknessCm = frameOverrideCm ?? defaultThicknessCm;
  const shelfThicknessCm = shelfOverrideCm ?? defaultThicknessCm;
  return {
    mode,
    defaultThicknessCm,
    frameKey,
    shelfKey,
    frameOverrideCm,
    shelfOverrideCm,
    frameThicknessCm,
    shelfThicknessCm,
    frameThicknessM: frameThicknessCm / 100,
    shelfThicknessM: shelfThicknessCm / 100,
  };
}

function loadStructureTabControlsModule(stubs = {}) {
  const file = path.join(process.cwd(), 'esm/native/ui/react/tabs/structure_tab_controls.tsx');
  const source = fs.readFileSync(file, 'utf8');
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      jsx: ts.JsxEmit.ReactJSX,
    },
    fileName: file,
  }).outputText;
  const mod = { exports: {} };
  let structuralBuildRefreshActions;
  const localRequire = specifier => {
    if (specifier === 'react/jsx-runtime') {
      const renderJsx = (type, props) =>
        typeof type === 'function' ? type(props || {}) : { type, props: props || {} };
      return {
        jsx: renderJsx,
        jsxs: renderJsx,
        Fragment: Symbol.for('fragment'),
      };
    }
    if (specifier === '../components/index.js') {
      return {
        OptionButton: ({ selected = false, children, icon, onClick, ...props }) => ({
          type: 'button',
          props: {
            ...props,
            children: icon ? [icon, children] : children,
            'aria-pressed': selected,
            onClick,
          },
        }),
      };
    }
    if (specifier === './structure_tab_dim_field.js')
      return {
        DimField: function DimField() {
          return null;
        },
      };
    if (specifier === './structure_tab_optional_dim_field.js')
      return {
        OptionalDimField: function OptionalDimField() {
          return null;
        },
      };
    if (specifier === '../hooks.js') {
      return { useApp: () => stubs.app, useCfgSelectorShallow: selector => selector(stubs.cfg) };
    }
    if (specifier === '../actions/store_actions.js') {
      return {
        setCfgBoardMaterial: (...args) => stubs.calls.push(['setCfgBoardMaterial', ...args]),
        setCfgDoorMountMode: (...args) => stubs.calls.push(['setCfgDoorMountMode', ...args]),
      };
    }
    if (specifier === '../actions/room_actions.js') {
      return { setWardrobeType: (...args) => stubs.calls.push(['setWardrobeType', ...args]) };
    }
    if (specifier === '../actions/structural_build_refresh_actions.js') {
      structuralBuildRefreshActions ||= loadStructuralBuildRefreshActionsModule(stubs);
      return structuralBuildRefreshActions;
    }
    if (specifier === '../selectors/config_selectors.js') {
      return {
        selectBoardMaterial: cfg => String(cfg.boardMaterial || ''),
        selectDoorMountMode: cfg =>
          String(cfg.doorMountMode || 'overlay') === 'inset' ? 'inset' : 'overlay',
        selectDoorMountThicknessControls,
        selectWardrobeType: cfg => String(cfg.wardrobeType || ''),
      };
    }
    if (specifier === '../../../../shared/wardrobe_dimension_tokens_shared.js') {
      return {
        DOOR_MOUNT_THICKNESS_DIMENSIONS: { stepCm: 0.1, minCm: 0.4, maxCm: 8 },
        normalizeDoorMountThicknessCm,
      };
    }
    if (specifier === '../../../services/api.js') {
      return {
        cfgSetScalar: (...args) => stubs.calls.push(['cfgSetScalar', ...args]),
        patchViaActions: (...args) => {
          stubs.calls.push(['patchViaActions', ...args]);
          return typeof stubs.patchViaActions === 'function' ? stubs.patchViaActions(...args) : false;
        },
        requestBuilderStructuralRefresh: (...args) =>
          stubs.calls.push(['requestBuilderStructuralRefresh', ...args]),
      };
    }
    return require(specifier);
  };
  const sandbox = {
    module: mod,
    exports: mod.exports,
    require: localRequire,
    __dirname: path.dirname(file),
    __filename: file,
    console,
    process,
  };
  vm.runInNewContext(transpiled, sandbox, { filename: file });
  return mod.exports;
}

test('[structure-tab-controls] board material writes collapse to canonical config patch plus one structural refresh', () => {
  const calls = [];
  const app = { id: 'app' };
  const mod = loadStructureTabControlsModule({
    calls,
    app,
    cfg: { wardrobeType: 'hinged', boardMaterial: 'sandwich' },
    patchViaActions: () => true,
  });
  const tree = mod.TypeSelector();
  const melamineBtn = flattenButtons(tree).find(btn => btn.props?.['data-board-material'] === 'melamine');
  const sandwichBtn = flattenButtons(tree).find(btn => btn.props?.['data-board-material'] === 'sandwich');
  melamineBtn.props.onClick();
  sandwichBtn.props.onClick();
  assert.equal(
    JSON.stringify(calls),
    JSON.stringify([
      [
        'patchViaActions',
        app,
        { config: { boardMaterial: 'melamine' } },
        { source: 'react:boardMaterial', immediate: true, noBuild: true },
      ],
      [
        'requestBuilderStructuralRefresh',
        app,
        { source: 'react:boardMaterial', immediate: false, force: false, triggerRender: false },
      ],
    ])
  );
});

test('[structure-tab-controls] hinged door mount writes use canonical config patch plus one structural refresh', () => {
  const calls = [];
  const app = { id: 'app' };
  const mod = loadStructureTabControlsModule({
    calls,
    app,
    cfg: { wardrobeType: 'hinged', boardMaterial: 'sandwich', doorMountMode: 'overlay' },
    patchViaActions: () => true,
  });
  const tree = mod.TypeSelector();
  const overlayBtn = flattenButtons(tree).find(btn => btn.props?.['data-door-mount-mode'] === 'overlay');
  const insetBtn = flattenButtons(tree).find(btn => btn.props?.['data-door-mount-mode'] === 'inset');
  assert.equal(overlayBtn?.props?.['aria-pressed'], true);
  assert.equal(insetBtn?.props?.['aria-pressed'], false);

  insetBtn.props.onClick();
  overlayBtn.props.onClick();
  assert.equal(
    JSON.stringify(calls),
    JSON.stringify([
      [
        'patchViaActions',
        app,
        { config: { doorMountMode: 'inset' } },
        { source: 'react:doorMountMode', immediate: true, noBuild: true },
      ],
      [
        'requestBuilderStructuralRefresh',
        app,
        { source: 'react:doorMountMode', immediate: false, force: false, triggerRender: false },
      ],
    ])
  );
});

test('[structure-tab-controls] door mount thickness fields render active automatic defaults and 0.1cm steps', () => {
  const calls = [];
  const mod = loadStructureTabControlsModule({
    calls,
    app: { id: 'app' },
    cfg: { wardrobeType: 'hinged', boardMaterial: 'sandwich', doorMountMode: 'overlay' },
    patchViaActions: () => true,
  });
  const tree = mod.TypeSelector();
  const inputs = flattenInputs(tree);
  const buttons = flattenButtons(tree);
  const frameInput = inputs.find(input => input.props?.['data-testid'] === 'structure-frame-thickness-input');
  const shelfInput = inputs.find(input => input.props?.['data-testid'] === 'structure-shelf-thickness-input');
  const frameReset = buttons.find(btn => btn.props?.['data-testid'] === 'structure-frame-thickness-reset');
  const shelfReset = buttons.find(btn => btn.props?.['data-testid'] === 'structure-shelf-thickness-reset');

  assert.equal(frameInput?.props?.value, '1.8');
  assert.equal(shelfInput?.props?.value, '1.8');
  assert.equal(frameInput?.props?.step, 0.1);
  assert.equal(shelfInput?.props?.step, 0.1);
  assert.equal(frameReset?.props?.disabled, true);
  assert.equal(shelfReset?.props?.disabled, true);
});

test('[structure-tab-controls] inset door mount thickness fields use inset defaults and active inset keys', () => {
  const calls = [];
  const app = { id: 'app' };
  const mod = loadStructureTabControlsModule({
    calls,
    app,
    cfg: { wardrobeType: 'hinged', boardMaterial: 'sandwich', doorMountMode: 'inset' },
    patchViaActions: () => true,
  });
  const tree = mod.TypeSelector();
  const shelfInput = flattenInputs(tree).find(
    input => input.props?.['data-testid'] === 'structure-shelf-thickness-input'
  );

  assert.equal(shelfInput?.props?.value, '3.6');
  shelfInput.props.onChange({ currentTarget: { value: '4.1' } });
  assert.equal(
    JSON.stringify(calls),
    JSON.stringify([
      [
        'patchViaActions',
        app,
        { config: { insetShelfThicknessCm: 4.1 } },
        { source: 'react:doorMountThickness:shelf', immediate: true, noBuild: true },
      ],
      [
        'requestBuilderStructuralRefresh',
        app,
        {
          source: 'react:doorMountThickness:shelf',
          immediate: false,
          force: false,
          triggerRender: false,
        },
      ],
    ])
  );
});

test('[structure-tab-controls] door mount thickness reset returns only the active construction value to automatic', () => {
  const calls = [];
  const app = { id: 'app' };
  const mod = loadStructureTabControlsModule({
    calls,
    app,
    cfg: {
      wardrobeType: 'hinged',
      boardMaterial: 'sandwich',
      doorMountMode: 'overlay',
      overlayFrameThicknessCm: 2.4,
      insetFrameThicknessCm: 4.2,
    },
    patchViaActions: () => true,
  });
  const tree = mod.TypeSelector();
  const frameInput = flattenInputs(tree).find(
    input => input.props?.['data-testid'] === 'structure-frame-thickness-input'
  );
  const frameReset = flattenButtons(tree).find(
    btn => btn.props?.['data-testid'] === 'structure-frame-thickness-reset'
  );

  assert.equal(frameInput?.props?.value, '2.4');
  assert.equal(frameReset?.props?.disabled, false);
  frameReset.props.onClick();
  assert.equal(
    JSON.stringify(calls),
    JSON.stringify([
      [
        'patchViaActions',
        app,
        { config: { overlayFrameThicknessCm: null } },
        { source: 'react:doorMountThickness:frame', immediate: true, noBuild: true },
      ],
      [
        'requestBuilderStructuralRefresh',
        app,
        {
          source: 'react:doorMountThickness:frame',
          immediate: false,
          force: false,
          triggerRender: false,
        },
      ],
    ])
  );
});

test('[structure-tab-controls] sliding wardrobes hide mount chooser but expose overlay thickness fields', () => {
  const calls = [];
  const app = { id: 'app' };
  const mod = loadStructureTabControlsModule({
    calls,
    app,
    cfg: {
      wardrobeType: 'sliding',
      boardMaterial: 'melamine',
      doorMountMode: 'inset',
      overlayFrameThicknessCm: 2.2,
      overlayShelfThicknessCm: 1.4,
      insetFrameThicknessCm: 4.2,
      insetShelfThicknessCm: 3.4,
    },
    patchViaActions: () => true,
  });
  const tree = mod.TypeSelector();
  const inputs = flattenInputs(tree);
  const doorMountButtons = flattenButtons(tree).filter(btn => btn.props?.['data-door-mount-mode']);
  const frameInput = inputs.find(input => input.props?.['data-testid'] === 'structure-frame-thickness-input');
  const shelfInput = inputs.find(input => input.props?.['data-testid'] === 'structure-shelf-thickness-input');

  assert.equal(doorMountButtons.length, 0);
  assert.equal(frameInput?.props?.value, '2.2');
  assert.equal(shelfInput?.props?.value, '1.4');

  shelfInput.props.onChange({ currentTarget: { value: '1.6' } });
  assert.equal(
    JSON.stringify(calls),
    JSON.stringify([
      [
        'patchViaActions',
        app,
        { config: { overlayShelfThicknessCm: 1.6 } },
        { source: 'react:doorMountThickness:shelf', immediate: true, noBuild: true },
      ],
      [
        'requestBuilderStructuralRefresh',
        app,
        {
          source: 'react:doorMountThickness:shelf',
          immediate: false,
          force: false,
          triggerRender: false,
        },
      ],
    ])
  );
});

test('[structure-tab-controls] chest mode hides wardrobe type buttons while leaving material and mount controls available', () => {
  const calls = [];
  const mod = loadStructureTabControlsModule({
    calls,
    app: { id: 'app' },
    cfg: { wardrobeType: 'hinged', boardMaterial: 'sandwich', doorMountMode: 'overlay' },
    patchViaActions: () => true,
  });
  const tree = mod.TypeSelector({ hideTypeOptions: true });
  const buttons = flattenButtons(tree);

  assert.equal(buttons.filter(btn => btn.props?.['data-structure-type']).length, 0);
  assert.equal(buttons.filter(btn => btn.props?.['data-board-material']).length, 2);
  assert.equal(buttons.filter(btn => btn.props?.['data-door-mount-mode']).length, 2);
});

test('[structure-tab-controls] StructureTab gates type, corner, and library controls behind invalid wardrobe modes', () => {
  const src = fs.readFileSync(path.resolve('esm/native/ui/react/tabs/StructureTab.view.tsx'), 'utf8');

  assert.match(
    src,
    /const\s+noMainWardrobeActive\s*=\s*!state\.isSliding\s*&&\s*!state\.isChestMode\s*&&\s*state\.doors\s*===\s*0;/
  );
  assert.match(src, /const\s+auxiliaryModesVisible\s*=\s*!state\.isSliding\s*&&\s*!noMainWardrobeActive;/);
  assert.match(
    src,
    /const\s+hideWardrobeTypeOptions\s*=\s*effectiveChestMode\s*\|\|\s*noMainWardrobeActive;/
  );
  assert.match(src, /<TypeSelector hideTypeOptions=\{hideWardrobeTypeOptions\} \/>/);
  assert.match(src, /!noMainWardrobeActive\s*\? \(\s*<StructureBodySection/);
  assert.match(src, /hideBaseTypeControls=\{false\}/);
  assert.match(src, /!effectiveChestMode\s*&&\s*!noMainWardrobeActive\s*\? \(\s*<StructureCornerSection/);
  assert.match(src, /!effectiveChestMode \? \(\s*<StructureLibrarySection/);
});
