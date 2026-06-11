import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ts = require('typescript');

function transpileTsModule(file) {
  const source = fs.readFileSync(file, 'utf8');
  return ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
    fileName: file,
  }).outputText;
}

function resolveTsModulePath(fromFile, specifier) {
  const base = path.resolve(path.dirname(fromFile), specifier);
  if (fs.existsSync(base)) return base;
  if (base.endsWith('.js')) {
    const tsFile = `${base.slice(0, -3)}.ts`;
    if (fs.existsSync(tsFile)) return tsFile;
    const tsxFile = `${base.slice(0, -3)}.tsx`;
    if (fs.existsSync(tsxFile)) return tsxFile;
  }
  if (!path.extname(base)) {
    for (const ext of ['.ts', '.tsx', '.js']) {
      if (fs.existsSync(base + ext)) return base + ext;
    }
  }
  return base;
}

function loadTranspiledTsModule(file, createOverride, options = {}, cache = new Map()) {
  if (cache.has(file)) return cache.get(file).exports;
  const transpiled = transpileTsModule(file);
  const mod = { exports: {} };
  cache.set(file, mod);
  const localRequire = specifier => {
    const override = createOverride(specifier);
    if (override !== undefined) return override;
    if (specifier.startsWith('./') || specifier.startsWith('../')) {
      const resolved = resolveTsModulePath(file, specifier);
      if (resolved.endsWith('.ts') || resolved.endsWith('.tsx')) {
        return loadTranspiledTsModule(resolved, createOverride, options, cache);
      }
      return require(resolved);
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
    setTimeout: options.setTimeout ?? setTimeout,
    clearTimeout: options.clearTimeout ?? clearTimeout,
  };
  vm.runInNewContext(transpiled, sandbox, { filename: file });
  return mod.exports;
}

export function loadInteriorTabWorkflowControllerModule(calls, options = {}) {
  const file = path.join(
    process.cwd(),
    'esm/native/ui/react/tabs/interior_tab_workflows_controller_runtime.ts'
  );
  return loadTranspiledTsModule(
    file,
    specifier => {
      if (specifier === '../../../services/api.js') {
        return {
          MODES: {
            LAYOUT: 'layout',
            MANUAL_LAYOUT: 'manual_layout',
            BRACE_SHELVES: 'brace_shelves',
            EXT_DRAWER: 'ext_drawer',
            DOOR_TRIM: 'door_trim',
          },
          getBrowserTimers: () => ({
            setTimeout: options.timers?.setTimeout ?? options.setTimeout ?? setTimeout,
            clearTimeout: options.timers?.clearTimeout ?? options.clearTimeout ?? clearTimeout,
          }),
        };
      }
      if (specifier === '../actions/modes_actions.js') {
        return {
          enterPrimaryMode: (...args) => calls.push(['enterPrimaryMode', ...args]),
          exitPrimaryMode: (...args) => calls.push(['exitPrimaryMode', ...args]),
        };
      }
      if (specifier === '../actions/interior_actions.js') {
        return {
          enterLayoutMode: (...args) => calls.push(['enterLayoutMode', ...args]),
          enterManualLayoutMode: (...args) => calls.push(['enterManualLayoutMode', ...args]),
          toggleBraceShelvesMode: (...args) => calls.push(['toggleBraceShelvesMode', ...args]),
          setGridDivisions: (...args) => calls.push(['setGridDivisions', ...args]),
          setGridShelfVariant: (...args) => calls.push(['setGridShelfVariant', ...args]),
          enterExtDrawerMode: (...args) => calls.push(['enterExtDrawerMode', ...args]),
          toggleDividerMode: (...args) => calls.push(['toggleDividerMode', ...args]),
          toggleIntDrawerMode: (...args) => calls.push(['toggleIntDrawerMode', ...args]),
          setInternalDrawersEnabled: (...args) => calls.push(['setInternalDrawersEnabled', ...args]),
        };
      }
      if (specifier === '../actions/handles_actions.js') {
        return {
          setHandleControlEnabled: (...args) => calls.push(['setHandleControlEnabled', ...args]),
          setGlobalHandleType: (...args) => calls.push(['setGlobalHandleType', ...args]),
          setGlobalHandleColor: (...args) => calls.push(['setGlobalHandleColor', ...args]),
          setGlobalEdgeHandleVariant: (...args) => calls.push(['setGlobalEdgeHandleVariant', ...args]),
          setHandleModeEdgeVariant: (...args) => calls.push(['setHandleModeEdgeVariant', ...args]),
          toggleHandleMode: (...args) => calls.push(['toggleHandleMode', ...args]),
          setHandleModeColor: (...args) => calls.push(['setHandleModeColor', ...args]),
        };
      }
      if (specifier === './interior_tab_helpers.js') {
        return {
          SKETCH_BOX_HEIGHT_MAX_CM: 300,
          SKETCH_BOX_HEIGHT_MIN_CM: 20,
          SKETCH_BOX_OPTIONAL_DIM_MAX_CM: 300,
          SKETCH_BOX_OPTIONAL_DIM_MIN_CM: 5,
          asStr: (value, fallback) => String(value ?? fallback ?? ''),
          clampSketch: (value, min, max) => Math.min(max, Math.max(min, Number(value))),
          mkSketchBoxBaseTool: (type, style = 'tapered', color = 'black', heightCm = 12, widthCm = 4) =>
            type === 'legs' && (style !== 'tapered' || color !== 'black' || heightCm !== 12 || widthCm !== 4)
              ? `sketch_box_base:${type}@${style}@${color}@${heightCm}@${widthCm}`
              : `sketch_box_base:${type}`,
          mkSketchBoxCorniceTool: type => `sketch_box_cornice:${type === 'wave' ? 'wave' : 'classic'}`,
          mkSketchBoxTool: (h, w, d) =>
            d ? `sketch_box:${h}@${w}@${d}` : w ? `sketch_box:${h}@${w}` : `sketch_box:${h}`,
          mkSketchExternalDrawersTool: (count, height = 22) =>
            Number(height) === 22 ? `sketch_ext_drawers:${count}` : `sketch_ext_drawers:${count}@${height}`,
          mkSketchInternalDrawersTool: (height = 16.5) =>
            Number(height) === 16.5 ? 'sketch_int_drawers' : `sketch_int_drawers@${height}`,
          mkSketchShelfTool: (variant, depth) =>
            depth ? `sketch_shelf:${variant}@${depth}` : `sketch_shelf:${variant}`,
        };
      }
      if (specifier === './interior_tab_view_state_shared.js') {
        return {
          readDoorTrimAxis: (value, fallback = 'horizontal') =>
            value === 'vertical' ? 'vertical' : fallback,
          readDoorTrimSpan: (value, fallback = 'full') =>
            typeof value === 'string' && value ? value : fallback,
        };
      }
      return undefined;
    },
    options
  );
}

export function createInteriorWorkflowControllerHarness(stateOverrides = {}, options = {}) {
  const calls = [];
  const colorCalls = [];
  const mod = loadInteriorTabWorkflowControllerModule(calls, options);
  const state = {
    modeOpts: {},
    hasIntDrawerData: false,
    isLayoutMode: false,
    isManualLayoutMode: false,
    isBraceShelvesMode: false,
    isIntDrawerMode: false,
    isDoorTrimMode: false,
    internalDrawersEnabled: false,
    doorTrimColor: 'nickel',
    doorTrimHorizontalSpan: 'half',
    doorTrimHorizontalCustomCm: 12,
    doorTrimHorizontalCrossCm: 3,
    doorTrimVerticalSpan: 'quarter',
    doorTrimVerticalCustomCm: 18,
    doorTrimVerticalCrossCm: 4,
    sketchShelfDepthByVariant: { glass: 27 },
    sketchExtDrawerHeightCm: 22,
    sketchIntDrawerHeightCm: 16.5,
    setDoorTrimColor: color => colorCalls.push(color),
    ...stateOverrides,
  };
  const controller = mod.createInteriorTabWorkflowController({
    app: { id: 'app' },
    state,
  });
  return { calls, colorCalls, mod, state, controller };
}

export function loadInteriorTabViewStateControllerModule(calls, options = {}) {
  const file = path.join(
    process.cwd(),
    'esm/native/ui/react/tabs/interior_tab_view_state_controller_runtime.ts'
  );
  return loadTranspiledTsModule(
    file,
    specifier => {
      if (specifier === '../actions/modes_actions.js') {
        return {
          exitPrimaryMode: (...args) => calls.push(['exitPrimaryMode', ...args]),
        };
      }
      if (specifier === './interior_tab_helpers.js') {
        return {
          SKETCH_BOX_HEIGHT_MAX_CM: 300,
          SKETCH_BOX_HEIGHT_MIN_CM: 20,
          SKETCH_BOX_OPTIONAL_DIM_MAX_CM: 240,
          SKETCH_BOX_OPTIONAL_DIM_MIN_CM: 10,
          DEFAULT_SKETCH_EXTERNAL_DRAWER_HEIGHT_CM: 22,
          DEFAULT_SKETCH_INTERNAL_DRAWER_HEIGHT_CM: 16.5,
          SKETCH_DRAWER_HEIGHT_MAX_CM: 120,
          SKETCH_DRAWER_HEIGHT_MIN_CM: 5,
          SKETCH_TOOL_SHELF_PREFIX: 'sketch_shelf:',
          asNum: (value, fallback) => {
            const num = Number(value);
            return Number.isFinite(num) ? num : fallback;
          },
          clampSketch: (value, min, max) => Math.min(max, Math.max(min, Number(value))),
          isSketchBoxTool: value => String(value).startsWith('sketch_box:'),
          parseSketchBoxTool: value => {
            const raw = String(value);
            if (!raw.startsWith('sketch_box:')) return null;
            const [height = '', width = '', depth = ''] = raw.slice('sketch_box:'.length).split('@');
            return {
              heightCm: Number(height),
              widthCm: width ? Number(width) : undefined,
              depthCm: depth ? Number(depth) : undefined,
            };
          },
          parseSketchStorageHeightCm: value =>
            String(value).startsWith('sketch_storage:') ? Number(String(value).split(':')[1]) : null,
          readSketchBoxCorniceType: value =>
            String(value).startsWith('sketch_box_cornice:') ? String(value).split(':')[1] : null,
          readSketchBoxBaseToolSpec: value => {
            if (!String(value).startsWith('sketch_box_base:')) return null;
            const [type = '', style = '', color = '', height = '', width = ''] = String(value)
              .slice('sketch_box_base:'.length)
              .split('@');
            if (!['plinth', 'legs', 'none'].includes(type)) return null;
            const baseLegStyle = ['tapered', 'round', 'square'].includes(style) ? style : 'tapered';
            return {
              baseType: type,
              baseLegStyle,
              baseLegColor: ['black', 'nickel', 'gold'].includes(color) ? color : 'black',
              baseLegHeightCm: Number.isFinite(Number(height)) && height !== '' ? Number(height) : 12,
              baseLegWidthCm:
                Number.isFinite(Number(width)) && width !== ''
                  ? Number(width)
                  : baseLegStyle === 'tapered'
                    ? 4
                    : 3.5,
            };
          },
          readSketchBoxBaseType: value =>
            String(value).startsWith('sketch_box_base:') ? String(value).split(':')[1].split('@')[0] : null,
          parseSketchExternalDrawersCount: value =>
            String(value).startsWith('sketch_ext_drawers:')
              ? Number(String(value).slice('sketch_ext_drawers:'.length).split('@')[0])
              : null,
          parseSketchExternalDrawersHeightCm: value =>
            String(value).startsWith('sketch_ext_drawers:') && String(value).includes('@')
              ? Number(String(value).split('@')[1])
              : String(value).startsWith('sketch_ext_drawers:')
                ? 22
                : null,
          parseSketchInternalDrawersHeightCm: value =>
            String(value) === 'sketch_int_drawers'
              ? 16.5
              : String(value).startsWith('sketch_int_drawers@')
                ? Number(String(value).split('@')[1])
                : null,
          parseSketchShelfVariant: value =>
            String(value).startsWith('sketch_shelf:')
              ? String(value).slice('sketch_shelf:'.length).split('@')[0]
              : null,
          parseSketchShelfDepthCm: value =>
            String(value).startsWith('sketch_shelf:') && String(value).includes('@')
              ? Number(String(value).split('@')[1])
              : null,
        };
      }
      if (specifier === './interior_tab_view_state_shared.js') {
        return {
          readDoorTrimAxis: value => (value === 'vertical' ? 'vertical' : 'horizontal'),
          readDoorTrimColor: value => {
            const raw = String(value || 'nickel');
            return raw === 'gold' ? 'gold' : 'nickel';
          },
          readDoorTrimSpan: value => (typeof value === 'string' && value ? value : 'full'),
        };
      }
      return undefined;
    },
    options
  );
}

export function createInteriorViewStateControllerHarness(options = {}) {
  const calls = [];
  const mod = loadInteriorTabViewStateControllerModule(calls, options);
  let shelfDepthByVariant = options.shelfDepthByVariant ?? { regular: '', glass: '' };
  let shelfDepthDraftByVariant = options.shelfDepthDraftByVariant ?? { regular: '', glass: '' };
  const controller = mod.createInteriorTabViewStateController({
    app: { id: 'app' },
    setSketchShelvesOpen: value => calls.push(['setSketchShelvesOpen', value]),
    setDoorTrimPanelOpen: value => calls.push(['setDoorTrimPanelOpen', value]),
    setDoorTrimColor: value => calls.push(['setDoorTrimColor', value]),
    setDoorTrimHorizontalSpan: value => calls.push(['setDoorTrimHorizontalSpan', value]),
    setDoorTrimHorizontalCustomCm: value => calls.push(['setDoorTrimHorizontalCustomCm', value]),
    setDoorTrimHorizontalCustomDraft: value => calls.push(['setDoorTrimHorizontalCustomDraft', value]),
    setDoorTrimHorizontalCrossCm: value => calls.push(['setDoorTrimHorizontalCrossCm', value]),
    setDoorTrimHorizontalCrossDraft: value => calls.push(['setDoorTrimHorizontalCrossDraft', value]),
    setDoorTrimVerticalSpan: value => calls.push(['setDoorTrimVerticalSpan', value]),
    setDoorTrimVerticalCustomCm: value => calls.push(['setDoorTrimVerticalCustomCm', value]),
    setDoorTrimVerticalCustomDraft: value => calls.push(['setDoorTrimVerticalCustomDraft', value]),
    setDoorTrimVerticalCrossCm: value => calls.push(['setDoorTrimVerticalCrossCm', value]),
    setDoorTrimVerticalCrossDraft: value => calls.push(['setDoorTrimVerticalCrossDraft', value]),
    setSketchBoxPanelOpen: value => calls.push(['setSketchBoxPanelOpen', value]),
    setSketchBoxHeightCm: value => calls.push(['setSketchBoxHeightCm', value]),
    setSketchBoxHeightDraft: value => calls.push(['setSketchBoxHeightDraft', value]),
    setSketchBoxWidthCm: value => calls.push(['setSketchBoxWidthCm', value]),
    setSketchBoxWidthDraft: value => calls.push(['setSketchBoxWidthDraft', value]),
    setSketchBoxDepthCm: value => calls.push(['setSketchBoxDepthCm', value]),
    setSketchBoxDepthDraft: value => calls.push(['setSketchBoxDepthDraft', value]),
    setSketchStorageHeightCm: value => calls.push(['setSketchStorageHeightCm', value]),
    setSketchStorageHeightDraft: value => calls.push(['setSketchStorageHeightDraft', value]),
    setSketchBoxCorniceType: value => calls.push(['setSketchBoxCorniceType', value]),
    setSketchBoxCornicePanelOpen: value => calls.push(['setSketchBoxCornicePanelOpen', value]),
    setSketchBoxBaseType: value => calls.push(['setSketchBoxBaseType', value]),
    setSketchBoxBasePanelOpen: value => calls.push(['setSketchBoxBasePanelOpen', value]),
    setSketchBoxLegStyle: value => calls.push(['setSketchBoxLegStyle', value]),
    setSketchBoxLegColor: value => calls.push(['setSketchBoxLegColor', value]),
    setSketchBoxLegHeightCm: value => calls.push(['setSketchBoxLegHeightCm', value]),
    setSketchBoxLegHeightDraft: value => calls.push(['setSketchBoxLegHeightDraft', value]),
    setSketchBoxLegWidthCm: value => calls.push(['setSketchBoxLegWidthCm', value]),
    setSketchBoxLegWidthDraft: value => calls.push(['setSketchBoxLegWidthDraft', value]),
    setSketchExtDrawerCount: value => calls.push(['setSketchExtDrawerCount', value]),
    setSketchExtDrawerHeightCm: value => calls.push(['setSketchExtDrawerHeightCm', value]),
    setSketchExtDrawerHeightDraft: value => calls.push(['setSketchExtDrawerHeightDraft', value]),
    setSketchIntDrawerHeightCm: value => calls.push(['setSketchIntDrawerHeightCm', value]),
    setSketchIntDrawerHeightDraft: value => calls.push(['setSketchIntDrawerHeightDraft', value]),
    setSketchExtDrawersPanelOpen: value => calls.push(['setSketchExtDrawersPanelOpen', value]),
    setSketchShelfDepthByVariant: updater => {
      const next = updater(shelfDepthByVariant);
      calls.push(['setSketchShelfDepthByVariant', next]);
      shelfDepthByVariant = next;
    },
    setSketchShelfDepthDraftByVariant: updater => {
      const next = updater(shelfDepthDraftByVariant);
      calls.push(['setSketchShelfDepthDraftByVariant', next]);
      shelfDepthDraftByVariant = next;
    },
    setManualUiTool: value => calls.push(['setManualUiTool', value]),
  });
  return {
    calls,
    mod,
    controller,
    getShelfDepthByVariant: () => shelfDepthByVariant,
    getShelfDepthDraftByVariant: () => shelfDepthDraftByVariant,
  };
}
