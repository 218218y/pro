import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';

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
      return { setCfgBoardMaterial: (...args) => stubs.calls.push(['setCfgBoardMaterial', ...args]) };
    }
    if (specifier === '../actions/room_actions.js') {
      return { setWardrobeType: (...args) => stubs.calls.push(['setWardrobeType', ...args]) };
    }
    if (specifier === '../selectors/config_selectors.js') {
      return {
        selectBoardMaterial: cfg => String(cfg.boardMaterial || ''),
        selectWardrobeType: cfg => String(cfg.wardrobeType || ''),
      };
    }
    if (specifier === '../../../services/api.js') {
      return {
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
