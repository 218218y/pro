import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { analyzeModuleDependencies, collectNamedModuleExports } from '../tools/wp_layer_contract_support.mjs';
import { createSourceFile, walkAst } from '../tools/wp_ast_adapter.mjs';

const FACADE_SPECIFIER = 'wardrobe_dimension_tokens_shared';
const APPROVED_FACADE_RATCHET = Object.freeze({
  'static-import': Object.freeze({ importers: 274, statements: 274 }),
  'static-re-export': Object.freeze({ importers: 2, statements: 2 }),
  'dynamic-import': Object.freeze({ importers: 0, statements: 0 }),
  'type-import': Object.freeze({ importers: 1, statements: 1 }),
  'type-re-export': Object.freeze({ importers: 1, statements: 1 }),
  total: Object.freeze({ importers: 276, statements: 277 }),
});
const APPROVED_PUBLIC_DIMENSION_FACADE_EXPORTS = Object.freeze({
  value: Object.freeze([
    'BASE_LEG_DIMENSIONS',
    'CARCASS_BASE_DIMENSIONS',
    'CARCASS_CORNICE_DIMENSIONS',
    'CARCASS_INTERIOR_DIMENSIONS',
    'CARCASS_SHELL_DIMENSIONS',
    'CHEST_MODE_DIMENSIONS',
    'CM_PER_METER',
    'CONTENT_VISUAL_DIMENSIONS',
    'CORNER_CONNECTOR_INTERIOR_DIMENSIONS',
    'CORNER_WING_DIMENSIONS',
    'DEFAULT_CHEST_DRAWERS_COUNT',
    'DEFAULT_CORNER_DOORS',
    'DEFAULT_CORNER_WIDTH',
    'DEFAULT_HEIGHT',
    'DEFAULT_HINGED_DOORS',
    'DEFAULT_SLIDING_DOORS',
    'DEFAULT_STACK_SPLIT_LOWER_HEIGHT',
    'DEFAULT_WIDTH',
    'DOOR_MOUNT_THICKNESS_CONFIG_KEYS',
    'DOOR_MOUNT_THICKNESS_DIMENSIONS',
    'DOOR_SYSTEM_DIMENSIONS',
    'DOOR_TRIM_DIMENSIONS',
    'DOOR_VISUAL_DIMENSIONS',
    'DRAWER_DIMENSIONS',
    'FRONT_REVEAL_FRAME_DIMENSIONS',
    'HANDLE_DIMENSIONS',
    'HINGED_DEFAULT_DEPTH',
    'HINGED_DEFAULT_PER_DOOR_WIDTH',
    'INTERIOR_FITTINGS_DIMENSIONS',
    'LIBRARY_PRESET_DIMENSIONS',
    'MATERIAL_DIMENSIONS',
    'MM_PER_METER',
    'NO_MAIN_SKETCH_DIMENSIONS',
    'SKETCH_BOX_DIMENSIONS',
    'SLIDING_DEFAULT_DEPTH',
    'SLIDING_DEFAULT_PER_DOOR_WIDTH',
    'STACK_SPLIT_LOWER_DEPTH_MAX',
    'STACK_SPLIT_LOWER_DEPTH_MIN',
    'STACK_SPLIT_LOWER_DOORS_MAX',
    'STACK_SPLIT_LOWER_DOORS_MIN',
    'STACK_SPLIT_LOWER_HEIGHT_MIN',
    'STACK_SPLIT_LOWER_WIDTH_MAX',
    'STACK_SPLIT_LOWER_WIDTH_MIN',
    'STACK_SPLIT_MIN_TOP_HEIGHT',
    'STACK_SPLIT_SEAM_GAP_M',
    'WARDROBE_CELL_DEPTH_MAX',
    'WARDROBE_CELL_DEPTH_MIN',
    'WARDROBE_CELL_DIM_MIN',
    'WARDROBE_CELL_HEIGHT_MAX',
    'WARDROBE_CELL_HEIGHT_MIN',
    'WARDROBE_CELL_WIDTH_MAX',
    'WARDROBE_CELL_WIDTH_MIN',
    'WARDROBE_CHEST_DRAWERS_MAX',
    'WARDROBE_CHEST_DRAWERS_MIN',
    'WARDROBE_CHEST_HEIGHT_MIN',
    'WARDROBE_CHEST_WIDTH_MIN',
    'WARDROBE_DEFAULTS',
    'WARDROBE_DEPTH_MAX',
    'WARDROBE_DEPTH_MIN',
    'WARDROBE_DIMENSION_GUIDE_DIMENSIONS',
    'WARDROBE_DOORS_MAX',
    'WARDROBE_DOORS_MIN',
    'WARDROBE_HEIGHT_MAX',
    'WARDROBE_HEIGHT_MIN',
    'WARDROBE_LAYOUT_DIMENSIONS',
    'WARDROBE_LIMITS',
    'WARDROBE_SLIDING_DOORS_MIN',
    'WARDROBE_WIDTH_MAX',
    'WARDROBE_WIDTH_MIN',
    'clampDimension',
    'cmToM',
    'getDefaultChestDrawersCount',
    'getDefaultDepthForWardrobeType',
    'getDefaultDoorMountThicknessCm',
    'getDefaultDoorMountThicknessM',
    'getDefaultDoorsForWardrobeType',
    'getDefaultHeightForWardrobeType',
    'getDefaultPerDoorWidthForWardrobeType',
    'getDefaultWidthForWardrobeType',
    'getDoorMountThicknessConfigKey',
    'isAutoWidthForDoors',
    'mToCm',
    'normalizeDoorMountThicknessCm',
    'normalizeWardrobeDimensionDefaultType',
    'resolveAutoWidthForDoors',
    'resolveDefaultWardrobeDimensions',
    'resolveDoorMountThicknessesFromConfig',
    'resolveExternalDrawerGeometry',
    'resolveWardrobeTypeDefaults',
  ]),
  type: Object.freeze([
    'Centimeters',
    'DoorMountConstructionMode',
    'DoorMountThicknessConfigKey',
    'DoorMountThicknessKind',
    'ExternalDrawerGeometry',
    'Meters',
    'Millimeters',
    'Pixels',
    'WardrobeDimensionDefaultType',
    'WorldUnits',
  ]),
});
const APPROVED_STACK_SPLIT_FACADE_SYMBOLS = Object.freeze([
  'DEFAULT_STACK_SPLIT_LOWER_HEIGHT',
  'STACK_SPLIT_LOWER_DEPTH_MAX',
  'STACK_SPLIT_LOWER_DEPTH_MIN',
  'STACK_SPLIT_LOWER_DOORS_MAX',
  'STACK_SPLIT_LOWER_DOORS_MIN',
  'STACK_SPLIT_LOWER_HEIGHT_MIN',
  'STACK_SPLIT_LOWER_WIDTH_MAX',
  'STACK_SPLIT_LOWER_WIDTH_MIN',
  'STACK_SPLIT_MIN_TOP_HEIGHT',
  'STACK_SPLIT_SEAM_GAP_M',
]);
const APPROVED_STACK_SPLIT_FACADE_IMPORTS = Object.freeze({
  'esm/native/builder/build_flow_plan_inputs.ts': Object.freeze(['STACK_SPLIT_SEAM_GAP_M']),
  'esm/native/builder/build_stack_split_lower_setup.ts': Object.freeze(['DEFAULT_STACK_SPLIT_LOWER_HEIGHT']),
  'esm/native/data/preset_models_data.ts': Object.freeze(['DEFAULT_STACK_SPLIT_LOWER_HEIGHT']),
  'esm/native/features/library_preset/library_preset_flow_shared.ts': Object.freeze([
    'DEFAULT_STACK_SPLIT_LOWER_HEIGHT',
  ]),
  'esm/native/runtime/default_state.ts': Object.freeze(['DEFAULT_STACK_SPLIT_LOWER_HEIGHT']),
});
const APPROVED_STACK_SPLIT_FACADE_REEXPORTS = Object.freeze({
  'esm/native/runtime/api.ts': APPROVED_STACK_SPLIT_FACADE_SYMBOLS,
});
const APPROVED_STACK_SPLIT_FACADE_WILDCARDS = Object.freeze([
  Object.freeze({
    file: 'esm/native/features/dimensions/index.ts',
    syntax: 'static-re-export',
  }),
]);
const CARCASS_SHELL_DIRECT_CONSUMERS = Object.freeze([
  'esm/native/builder/carcass_pipeline.ts',
  'esm/native/builder/core_carcass_shell.ts',
  'esm/native/builder/corner_wing_carcass_shell_metrics.ts',
  'esm/native/builder/module_loop_pipeline_hex_cell.ts',
]);
const CARCASS_INTERIOR_DIRECT_CONSUMERS = Object.freeze(['esm/native/builder/build_flow_plan.ts']);
const APPROVED_INTERIOR_GRID_OWNER_IMPORTS = Object.freeze({
  'esm/native/builder/build_wardrobe_flow_context_carcass.ts': Object.freeze([
    'CARCASS_INTERIOR_GRID_POLICY',
  ]),
  'esm/native/builder/module_loop_pipeline_module_frame.ts': Object.freeze(['CARCASS_INTERIOR_GRID_POLICY']),
  'esm/native/services/canvas_picking_interior_hover_layout_mode.ts': Object.freeze([
    'CARCASS_INTERIOR_GRID_POLICY',
  ]),
  'esm/shared/dimensions/carcass_shell_policy.ts': Object.freeze(['CARCASS_INTERIOR_GRID_POLICY']),
});
const APPROVED_SHELL_GRID_FIELD_USAGE = Object.freeze({
  'esm/native/builder/build_stack_split_lower_setup.ts': Object.freeze([
    'drawerGridDivisions',
    'drawerSplitGridLineIndex',
  ]),
  'esm/native/builder/render_interior_rod_clearance.ts': Object.freeze(['drawerGridDivisions']),
  'esm/native/services/canvas_picking_split_hover_preview_line.ts': Object.freeze([
    'drawerGridDivisions',
    'drawerSplitGridLineIndex',
  ]),
});
const APPROVED_BASE_PLINTH_OWNER_IMPORTS = Object.freeze({
  'esm/native/features/base_plinth_support.ts': Object.freeze([
    'BASE_PLINTH_POLICY',
    'basePlinthCentimetersToMeters',
    'basePlinthMetersToCentimeters',
  ]),
  'esm/shared/wardrobe_dimension_tokens_shared.ts': Object.freeze(['BASE_PLINTH_POLICY']),
});
const APPROVED_BASE_LEG_OWNER_IMPORTS = Object.freeze({
  'esm/native/features/base_leg_support.ts': Object.freeze([
    'BASE_LEG_DIMENSIONS',
    'DEFAULT_BASE_LEG_PLATFORM_FRONT_OVERHANG_CM',
    'DEFAULT_BASE_LEG_PLATFORM_SIDE_OVERHANG_CM',
  ]),
  'esm/shared/wardrobe_dimension_tokens_shared.ts': Object.freeze([
    'BASE_LEG_DIMENSIONS',
    'BASE_LEG_LAYOUT_POLICY',
  ]),
});
const APPROVED_BASE_PLATFORM_OWNER_IMPORTS = Object.freeze({
  'esm/native/builder/render_interior_sketch_visuals_adornments_normalize.ts': Object.freeze([
    'BASE_PLATFORM_RENDER_POLICY',
  ]),
  'esm/native/services/canvas_picking_sketch_box_content_commit_adornments.ts': Object.freeze([
    'BASE_PLATFORM_RENDER_POLICY',
  ]),
  'esm/native/services/canvas_picking_sketch_free_surface_preview_adornments.ts': Object.freeze([
    'BASE_PLATFORM_RENDER_POLICY',
  ]),
  'esm/shared/dimensions/base_leg_policy.ts': Object.freeze([
    'BASE_PLATFORM_RENDER_POLICY',
    'DEFAULT_BASE_LEG_PLATFORM_FRONT_OVERHANG_CM',
    'DEFAULT_BASE_LEG_PLATFORM_SIDE_OVERHANG_CM',
  ]),
});
const APPROVED_BASE_SUPPORT_FACADE_IMPORTS = Object.freeze({
  'esm/native/builder/core_carcass_shared.ts': Object.freeze(['CARCASS_BASE_DIMENSIONS']),
  'esm/native/builder/corner_connector_emit_shell_base.ts': Object.freeze(['CARCASS_BASE_DIMENSIONS']),
  'esm/native/builder/corner_state_normalize_layout.ts': Object.freeze(['CARCASS_BASE_DIMENSIONS']),
  'esm/native/builder/corner_wing_carcass_shell_floor_base.ts': Object.freeze(['CARCASS_BASE_DIMENSIONS']),
  'esm/native/builder/visuals_chest_mode_build.ts': Object.freeze(['CARCASS_BASE_DIMENSIONS']),
  'esm/native/builder/visuals_chest_mode_inputs.ts': Object.freeze(['CARCASS_BASE_DIMENSIONS']),
  'esm/native/runtime/default_state.ts': Object.freeze(['BASE_LEG_DIMENSIONS', 'CARCASS_BASE_DIMENSIONS']),
  'esm/native/services/canvas_picking_split_hover_preview_line.ts': Object.freeze([
    'CARCASS_BASE_DIMENSIONS',
  ]),
});
const APPROVED_DIMENSION_FACADE_BROAD_DEPENDENCIES = Object.freeze([
  Object.freeze({
    file: 'esm/native/features/dimensions/index.ts',
    syntax: 'static-re-export',
  }),
]);
const APPROVED_CHEST_STRUCTURAL_OWNER_IMPORTS = Object.freeze({
  'esm/shared/wardrobe_dimension_tokens_shared.ts': Object.freeze(['CHEST_STRUCTURAL_DIMENSIONS']),
});
const APPROVED_CHEST_LEGACY_FIELD_USAGE = Object.freeze({
  'esm/native/builder/visuals_chest_mode_build.ts': Object.freeze([
    'backInsetM',
    'backPanelHeightClearanceM',
    'backPanelWidthClearanceM',
    'backThicknessM',
    'chest',
    'connectorBackInsetM',
    'connectorDepthM',
    'connectorHeightClearanceM',
    'connectorWidthClearanceM',
    'drawerBoxDepthClearanceM',
    'drawerBoxHeightClearanceM',
    'drawerBoxWidthClearanceM',
    'drawerFrontThicknessM',
    'drawerGapM',
    'drawerWidthClearanceM',
    'openOffsetZM',
    'wheels',
    'wheels.forkDepthM',
    'wheels.forkHeightM',
    'wheels.forkWidthM',
    'wheels.plateDepthM',
    'wheels.plateHeightM',
    'wheels.plateWidthM',
    'wheels.radiusM',
    'wheels.thicknessM',
  ]),
  'esm/native/builder/visuals_chest_mode_inputs.ts': Object.freeze(['chest', 'wheels', 'wheels.heightM']),
});

function read(relativePath) {
  return fs.readFileSync(relativePath, 'utf8');
}

function walkSourceFiles(directory, visit) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      walkSourceFiles(absolute, visit);
    } else if (/\.(?:js|mjs|ts|tsx)$/u.test(entry.name)) {
      visit(absolute);
    }
  }
}

function isStackSplitFacadeSymbol(symbol) {
  return symbol.startsWith('DEFAULT_STACK_SPLIT_') || symbol.startsWith('STACK_SPLIT_');
}

function normalizedSymbolUsage(usage) {
  return Object.fromEntries(
    [...usage.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([file, symbols]) => [file, [...symbols].sort()])
  );
}

function collectOwnerImports(sources, ownerSpecifier) {
  const usage = new Map();
  for (const [file, source, analyzedDependencies] of sources) {
    const relativeFile = file.replaceAll('\\', '/');
    const dependencies = analyzedDependencies || analyzeModuleDependencies(file, source).imports;
    for (const dependency of dependencies) {
      if (!dependency.specifier.endsWith(ownerSpecifier)) continue;
      if (!usage.has(relativeFile)) usage.set(relativeFile, new Set());
      for (const symbol of dependency.importedSymbols) usage.get(relativeFile).add(symbol);
    }
  }
  return normalizedSymbolUsage(usage);
}

function collectFacadeSymbolImports(sources, approvedSymbols) {
  const usage = new Map();
  const symbols = new Set(approvedSymbols);
  for (const [file, source, analyzedDependencies] of sources) {
    const dependencies = analyzedDependencies || analyzeModuleDependencies(file, source).imports;
    for (const dependency of dependencies) {
      if (dependency.syntax !== 'static-import' || !dependency.specifier.includes(FACADE_SPECIFIER)) continue;
      const matched = dependency.importedSymbols.filter(symbol => symbols.has(symbol));
      if (!matched.length) continue;
      const relativeFile = file.replaceAll('\\', '/');
      if (!usage.has(relativeFile)) usage.set(relativeFile, new Set());
      for (const symbol of matched) usage.get(relativeFile).add(symbol);
    }
  }
  return normalizedSymbolUsage(usage);
}

function readAstBindingName(node) {
  if (typeof node?.name === 'string') return node.name;
  if (typeof node?.value === 'string') return node.value;
  return null;
}

function readAstMemberPath(node) {
  const properties = [];
  let current = node;
  while (current?.type === 'MemberExpression') {
    const propertyName = readAstBindingName(current.property);
    if (!propertyName) return null;
    properties.unshift(propertyName);
    current = current.object;
  }
  const rootName = readAstBindingName(current);
  return rootName ? { rootName, properties } : null;
}

function collectVariableDeclarators(sourceFile) {
  const declarators = [];
  walkAst(sourceFile, node => {
    if (node?.type === 'VariableDeclarator') declarators.push(node);
  });
  return declarators;
}

function readObjectPatternEntries(pattern) {
  if (pattern?.type !== 'ObjectPattern') return [];
  const entries = [];
  for (const property of pattern.properties || []) {
    if (property?.type !== 'Property') continue;
    const key = readAstBindingName(property.key);
    const localName = readAstBindingName(property.value);
    if (key) entries.push({ key, localName });
  }
  return entries;
}

function collectShellGridFieldUsage(sources) {
  const usage = new Map();
  const gridFields = new Set(['drawerGridDivisions', 'drawerSplitGridLineIndex']);
  for (const [file, source, analyzedDependencies] of sources) {
    const localShellBindings = new Set();
    const dependencies = analyzedDependencies || analyzeModuleDependencies(file, source).imports;
    for (const dependency of dependencies) {
      for (const binding of dependency.bindings || []) {
        if (binding.importedName === 'CARCASS_SHELL_DIMENSIONS' && binding.localName) {
          localShellBindings.add(binding.localName);
        }
      }
    }
    if (!localShellBindings.size) continue;

    const sourceFile = createSourceFile(file, source, { label: 'dimension_grid_contract' });
    const declarators = collectVariableDeclarators(sourceFile);
    const shellAliases = new Set(localShellBindings);
    let changed = true;
    while (changed) {
      changed = false;
      for (const declaration of declarators) {
        const initName = readAstBindingName(declaration.init);
        const localName = readAstBindingName(declaration.id);
        if (initName && shellAliases.has(initName) && localName && !shellAliases.has(localName)) {
          shellAliases.add(localName);
          changed = true;
        }
      }
    }

    const fields = new Set();
    for (const declaration of declarators) {
      const initName = readAstBindingName(declaration.init);
      if (!initName || !shellAliases.has(initName)) continue;
      for (const { key } of readObjectPatternEntries(declaration.id)) {
        if (gridFields.has(key)) fields.add(key);
      }
    }
    walkAst(sourceFile, node => {
      if (node?.type !== 'MemberExpression') return;
      const objectName = readAstBindingName(node.object);
      if (!objectName || !shellAliases.has(objectName)) return;
      const propertyName = readAstBindingName(node.property);
      if (propertyName && gridFields.has(propertyName)) fields.add(propertyName);
    });
    if (fields.size) usage.set(file.replaceAll('\\', '/'), fields);
  }
  return normalizedSymbolUsage(usage);
}

function collectDimensionFacadeBroadDependencies(sources) {
  const dependencies = [];
  for (const [file, source, analyzedDependencies] of sources) {
    const analyzed = analyzedDependencies || analyzeModuleDependencies(file, source).imports;
    for (const dependency of analyzed) {
      if (!dependency.specifier.includes(FACADE_SPECIFIER)) continue;
      if (dependency.syntax !== 'dynamic-import' && !dependency.importedSymbols.includes('*')) continue;
      dependencies.push({ file: file.replaceAll('\\', '/'), syntax: dependency.syntax });
    }
  }
  return dependencies.sort((left, right) =>
    `${left.file}:${left.syntax}`.localeCompare(`${right.file}:${right.syntax}`)
  );
}

function collectChestLegacyFieldUsage(sources) {
  const usage = new Map();

  for (const [file, source, analyzedDependencies] of sources) {
    const dependencies = analyzedDependencies || analyzeModuleDependencies(file, source).imports;
    const baseAliases = new Set();
    const namespaceAliases = new Set();
    for (const dependency of dependencies) {
      if (!dependency.specifier.includes(FACADE_SPECIFIER)) continue;
      for (const binding of dependency.bindings || []) {
        if (binding.importedName === 'CARCASS_BASE_DIMENSIONS' && binding.localName) {
          baseAliases.add(binding.localName);
        }
        if (binding.importedName === '*' && binding.localName) namespaceAliases.add(binding.localName);
      }
    }
    if (!baseAliases.size && !namespaceAliases.size) continue;

    const sourceFile = createSourceFile(file, source, { label: 'chest_legacy_dimension_contract' });
    const declarators = collectVariableDeclarators(sourceFile);
    const chestAliases = new Set();
    const wheelAliases = new Set();

    const classifyPath = path => {
      if (!path) return null;
      if (baseAliases.has(path.rootName)) return { kind: 'base', properties: path.properties };
      if (namespaceAliases.has(path.rootName) && path.properties[0] === 'CARCASS_BASE_DIMENSIONS') {
        return { kind: 'base', properties: path.properties.slice(1) };
      }
      if (chestAliases.has(path.rootName)) return { kind: 'chest', properties: path.properties };
      if (wheelAliases.has(path.rootName)) return { kind: 'wheels', properties: path.properties };
      return null;
    };

    let changed = true;
    while (changed) {
      changed = false;
      for (const declaration of declarators) {
        const localName = readAstBindingName(declaration.id);
        const classified = classifyPath(readAstMemberPath(declaration.init));
        const initName = readAstBindingName(declaration.init);
        const directKind = initName
          ? baseAliases.has(initName)
            ? 'base'
            : chestAliases.has(initName)
              ? 'chest'
              : wheelAliases.has(initName)
                ? 'wheels'
                : null
          : null;
        const kind = classified?.kind || directKind;
        const properties = classified?.properties || [];

        if (localName) {
          if (kind === 'base' && properties.length === 0 && !baseAliases.has(localName)) {
            baseAliases.add(localName);
            changed = true;
          } else if (
            ((kind === 'base' && properties[0] === 'chest') ||
              (kind === 'chest' && properties.length === 0)) &&
            !chestAliases.has(localName)
          ) {
            chestAliases.add(localName);
            changed = true;
          } else if (
            ((kind === 'chest' && properties[0] === 'wheels') ||
              (kind === 'base' && properties[0] === 'chest' && properties[1] === 'wheels') ||
              (kind === 'wheels' && properties.length === 0)) &&
            !wheelAliases.has(localName)
          ) {
            wheelAliases.add(localName);
            changed = true;
          }
        }

        for (const { key, localName: destructuredLocal } of readObjectPatternEntries(declaration.id)) {
          if (kind === 'base' && properties.length === 0 && key === 'chest' && destructuredLocal) {
            if (!chestAliases.has(destructuredLocal)) {
              chestAliases.add(destructuredLocal);
              changed = true;
            }
          }
          if (kind === 'chest' && properties.length === 0 && key === 'wheels' && destructuredLocal) {
            if (!wheelAliases.has(destructuredLocal)) {
              wheelAliases.add(destructuredLocal);
              changed = true;
            }
          }
        }
      }
    }

    const fields = new Set();
    const recordClassifiedUsage = classified => {
      if (!classified) return;
      let properties = classified.properties;
      if (classified.kind === 'base') {
        if (properties[0] !== 'chest') return;
        fields.add('chest');
        properties = properties.slice(1);
      } else if (classified.kind === 'chest') {
        fields.add('chest');
      } else {
        fields.add('chest');
        fields.add('wheels');
        if (properties[0]) fields.add(`wheels.${properties[0]}`);
        return;
      }
      if (!properties[0]) return;
      fields.add(properties[0]);
      if (properties[0] === 'wheels' && properties[1]) fields.add(`wheels.${properties[1]}`);
    };

    for (const declaration of declarators) {
      const classified =
        classifyPath(readAstMemberPath(declaration.init)) ||
        (() => {
          const initName = readAstBindingName(declaration.init);
          if (initName && baseAliases.has(initName)) return { kind: 'base', properties: [] };
          if (initName && chestAliases.has(initName)) return { kind: 'chest', properties: [] };
          if (initName && wheelAliases.has(initName)) return { kind: 'wheels', properties: [] };
          return null;
        })();
      if (!classified) continue;
      for (const { key } of readObjectPatternEntries(declaration.id)) {
        if (classified.kind === 'base' && classified.properties.length === 0 && key === 'chest') {
          fields.add('chest');
        } else if (classified.kind === 'chest' && classified.properties.length === 0) {
          fields.add('chest');
          fields.add(key);
        } else if (classified.kind === 'wheels' && classified.properties.length === 0) {
          fields.add('chest');
          fields.add('wheels');
          fields.add(`wheels.${key}`);
        }
      }
    }
    walkAst(sourceFile, node => {
      if (node?.type !== 'MemberExpression') return;
      recordClassifiedUsage(classifyPath(readAstMemberPath(node)));
    });
    if (fields.size) usage.set(file.replaceAll('\\', '/'), fields);
  }

  return normalizedSymbolUsage(usage);
}

function collectDimensionFacadeExportSurface(source) {
  const byKind = { value: new Set(), type: new Set() };
  for (const entry of collectNamedModuleExports('esm/shared/wardrobe_dimension_tokens_shared.ts', source)) {
    byKind[entry.kind].add(entry.exportedName);
  }
  return {
    value: [...byKind.value].sort(),
    type: [...byKind.type].sort(),
  };
}

function assertApprovedPublicDimensionFacadeExports(actual) {
  const added = {};
  const removed = {};
  for (const kind of ['value', 'type']) {
    const approved = new Set(APPROVED_PUBLIC_DIMENSION_FACADE_EXPORTS[kind]);
    const observed = new Set(actual[kind]);
    added[kind] = actual[kind].filter(symbol => !approved.has(symbol));
    removed[kind] = APPROVED_PUBLIC_DIMENSION_FACADE_EXPORTS[kind].filter(symbol => !observed.has(symbol));
  }
  assert.deepEqual(
    actual,
    APPROVED_PUBLIC_DIMENSION_FACADE_EXPORTS,
    `public dimensions wildcard surface changed and requires explicit review:\n${JSON.stringify(
      {
        approved: APPROVED_PUBLIC_DIMENSION_FACADE_EXPORTS,
        actual,
        added,
        removed,
        proposal: added.value.length || added.type.length ? null : actual,
      },
      null,
      2
    )}`
  );
}

function collectStackSplitFacadeUsage(sources) {
  const imports = new Map();
  const reexports = new Map();
  const wildcardDependencies = [];

  for (const [file, source] of sources) {
    if (!source.includes(FACADE_SPECIFIER)) continue;
    const relativeFile = file.replaceAll('\\', '/');
    for (const dependency of analyzeModuleDependencies(file, source).imports) {
      if (!dependency.specifier.includes(FACADE_SPECIFIER)) continue;
      if (dependency.importedSymbols.includes('*')) {
        wildcardDependencies.push({ file: relativeFile, syntax: dependency.syntax });
        continue;
      }
      const stackSymbols = dependency.importedSymbols.filter(isStackSplitFacadeSymbol);
      if (!stackSymbols.length) continue;
      const target = dependency.syntax === 'static-import' ? imports : reexports;
      if (!target.has(relativeFile)) target.set(relativeFile, new Set());
      for (const symbol of stackSymbols) target.get(relativeFile).add(symbol);
    }
  }

  return {
    imports: normalizedSymbolUsage(imports),
    reexports: normalizedSymbolUsage(reexports),
    wildcardDependencies,
  };
}

function diffApprovedSymbolUsage(actual, approved) {
  const unapproved = [];
  const stale = [];
  for (const [file, symbols] of Object.entries(actual)) {
    const approvedSymbols = new Set(approved[file] || []);
    for (const symbol of symbols) {
      if (!approvedSymbols.has(symbol)) unapproved.push({ file, symbol });
    }
  }
  for (const [file, symbols] of Object.entries(approved)) {
    const actualSymbols = new Set(actual[file] || []);
    for (const symbol of symbols) {
      if (!actualSymbols.has(symbol)) stale.push({ file, symbol, action: 'remove-from-allowlist' });
    }
  }
  return { unapproved, stale };
}

function assertApprovedSymbolUsage(actual, approved, label) {
  const diff = diffApprovedSymbolUsage(actual, approved);
  const proposal = {
    contract: label,
    reviewRequired: diff.unapproved.length > 0,
    approved,
    actual,
    unapproved: diff.unapproved,
    staleAllowlistEntries: diff.stale,
    proposedAllowlist:
      diff.unapproved.length === 0 && diff.stale.length > 0 ? Object.freeze({ ...actual }) : null,
  };
  assert.deepEqual(
    actual,
    approved,
    `${label} drifted; new usage is review-blocked and stale entries must be removed:\n${JSON.stringify(proposal, null, 2)}`
  );
}

function assertApprovedDimensionFacadeBroadDependencies(actual) {
  assert.deepEqual(
    actual,
    APPROVED_DIMENSION_FACADE_BROAD_DEPENDENCIES,
    `dimension facade namespace/wildcard/dynamic dependency surface changed and requires review:\n${JSON.stringify(
      {
        approved: APPROVED_DIMENSION_FACADE_BROAD_DEPENDENCIES,
        actual,
      },
      null,
      2
    )}`
  );
}

function assertApprovedStackSplitFacadeSymbols(actual) {
  assert.deepEqual(
    actual,
    APPROVED_STACK_SPLIT_FACADE_SYMBOLS,
    `Stack Split facade symbol surface changed and requires review:\n${JSON.stringify({
      approved: APPROVED_STACK_SPLIT_FACADE_SYMBOLS,
      actual,
    })}`
  );
}

test('[dimension-foundation] focused owners hold units, defaults, limits, and stack-split policy', () => {
  const facade = read('esm/shared/wardrobe_dimension_tokens_shared.ts');
  const units = read('esm/shared/dimensions/units.ts');
  const defaults = read('esm/shared/dimensions/wardrobe_defaults.ts');
  const limits = read('esm/shared/dimensions/product_limits.ts');
  const stackSplitPolicy = read('esm/shared/dimensions/stack_split_policy.ts');
  const stackSplitRenderPolicy = read('esm/shared/dimensions/stack_split_render_policy.ts');
  const stackSplitFeature = read('esm/native/features/stack_split/stack_split.ts');
  const platformOverhang = read('esm/native/features/platform_overhang_support.ts');
  const decorativeSeparator = read('esm/native/builder/build_stack_split_decorative_separator.ts');
  const carcassShellPolicy = read('esm/shared/dimensions/carcass_shell_policy.ts');
  const carcassInteriorPolicy = read('esm/shared/dimensions/carcass_interior_policy.ts');
  const carcassInteriorGridPolicy = read('esm/shared/dimensions/carcass_interior_grid_policy.ts');
  const basePlinthPolicy = read('esm/shared/dimensions/base_plinth_policy.ts');
  const baseLegPolicy = read('esm/shared/dimensions/base_leg_policy.ts');
  const basePlatformRenderPolicy = read('esm/shared/dimensions/base_platform_render_policy.ts');
  const chestStructuralPolicy = read('esm/shared/dimensions/chest_structural_policy.ts');

  assert.match(facade, /from '\.\/dimensions\/units\.js'/u);
  assert.match(facade, /from '\.\/dimensions\/wardrobe_defaults\.js'/u);
  assert.match(facade, /from '\.\/dimensions\/product_limits\.js'/u);
  assert.match(facade, /from '\.\/dimensions\/stack_split_policy\.js'/u);
  assert.match(facade, /from '\.\/dimensions\/stack_split_render_policy\.js'/u);
  assert.match(facade, /from '\.\/dimensions\/carcass_shell_policy\.js'/u);
  assert.match(facade, /from '\.\/dimensions\/carcass_interior_policy\.js'/u);
  assert.match(facade, /from '\.\/dimensions\/base_plinth_policy\.js'/u);
  assert.match(facade, /from '\.\/dimensions\/base_leg_policy\.js'/u);
  assert.match(facade, /from '\.\/dimensions\/chest_structural_policy\.js'/u);
  assert.doesNotMatch(facade, /export const WARDROBE_DEFAULTS =/u);
  assert.doesNotMatch(facade, /export const WARDROBE_LIMITS =/u);

  assert.match(units, /export type Millimeters/u);
  assert.match(units, /export type WorldUnits/u);
  assert.match(units, /export function centimetersToMeters\(/u);
  assert.match(defaults, /export const WARDROBE_DEFAULTS = Object\.freeze/u);
  assert.match(limits, /export const WARDROBE_LIMITS = Object\.freeze/u);
  assert.match(stackSplitPolicy, /export const STACK_SPLIT_POLICY = Object\.freeze/u);
  assert.match(stackSplitPolicy, /lowerHeightCm: centimeters\(60\)/u);
  assert.match(stackSplitPolicy, /gapM: meters\(0\.002\)/u);
  assert.match(stackSplitRenderPolicy, /visibleHeightM: meters\(0\.039\)/u);
  assert.match(stackSplitRenderPolicy, /stackSplitCentimetersToMeters/u);
  assert.match(carcassShellPolicy, /export const CARCASS_SHELL_DIMENSIONS = Object\.freeze/u);
  assert.match(carcassInteriorPolicy, /export const CARCASS_INTERIOR_DIMENSIONS = Object\.freeze/u);
  assert.match(carcassInteriorPolicy, /CARCASS_SHELL_DIMENSIONS\.internalBackInsetM/u);
  assert.match(carcassInteriorGridPolicy, /export const CARCASS_INTERIOR_GRID_POLICY = Object\.freeze/u);
  assert.match(carcassShellPolicy, /CARCASS_INTERIOR_GRID_POLICY\.divisions/u);
  assert.match(carcassShellPolicy, /CARCASS_INTERIOR_GRID_POLICY\.drawerSplitLineIndex/u);
  assert.match(basePlinthPolicy, /export const BASE_PLINTH_POLICY = Object\.freeze/u);
  assert.match(baseLegPolicy, /export const BASE_LEG_DIMENSIONS = Object\.freeze/u);
  assert.match(baseLegPolicy, /export const BASE_LEG_LAYOUT_POLICY = Object\.freeze/u);
  assert.match(basePlatformRenderPolicy, /export const BASE_PLATFORM_RENDER_POLICY = Object\.freeze/u);
  assert.match(chestStructuralPolicy, /export const CHEST_SHELL_POLICY = Object\.freeze/u);
  assert.match(chestStructuralPolicy, /export const CHEST_DRAWER_GEOMETRY_POLICY = Object\.freeze/u);
  assert.match(chestStructuralPolicy, /export const CHEST_CONNECTOR_POLICY = Object\.freeze/u);
  assert.match(chestStructuralPolicy, /export const CHEST_MOTION_POLICY = Object\.freeze/u);
  assert.match(chestStructuralPolicy, /export const CHEST_CASTER_RENDER_POLICY = Object\.freeze/u);
  assert.match(chestStructuralPolicy, /export const CHEST_STRUCTURAL_DIMENSIONS = Object\.freeze/u);
  assert.match(facade, /plinth: BASE_PLINTH_DIMENSIONS/u);
  assert.match(facade, /legs: BASE_LEG_LAYOUT_DIMENSIONS/u);
  assert.match(facade, /legacyDimensionNumberView\(BASE_PLINTH_POLICY\)/u);
  assert.match(facade, /legacyDimensionNumberView\(BASE_LEG_LAYOUT_POLICY\)/u);
  assert.doesNotMatch(facade, /export const BASE_LEG_DIMENSIONS = Object\.freeze/u);
  assert.match(facade, /chest: CHEST_STRUCTURAL_DIMENSIONS/u);
  assert.doesNotMatch(facade, /chest: Object\.freeze/u);
  assert.doesNotMatch(facade, /export const CARCASS_(?:SHELL|INTERIOR)_DIMENSIONS =/u);

  assert.doesNotMatch(defaults, /stackSplit|decorativeSeparator/u);
  assert.doesNotMatch(limits, /wardrobe_defaults/u);
  assert.doesNotMatch(stackSplitFeature, /wardrobe_dimension_tokens_shared/u);
  assert.match(stackSplitFeature, /dimensions\/stack_split_policy\.js/u);
  assert.doesNotMatch(platformOverhang, /wardrobe_dimension_tokens_shared/u);
  assert.match(platformOverhang, /dimensions\/stack_split_render_policy\.js/u);
  assert.doesNotMatch(decorativeSeparator, /dimensions\/wardrobe_defaults\.js/u);
  assert.match(decorativeSeparator, /dimensions\/stack_split_render_policy\.js/u);

  assert.doesNotMatch(
    `${units}\n${defaults}\n${limits}\n${stackSplitPolicy}\n${stackSplitRenderPolicy}\n${carcassShellPolicy}\n${carcassInteriorPolicy}\n${carcassInteriorGridPolicy}\n${basePlinthPolicy}\n${baseLegPolicy}\n${basePlatformRenderPolicy}\n${chestStructuralPolicy}`,
    /wardrobe_dimension_tokens_shared/u
  );
});

test('[dimension-foundation] Stack Split facade symbols stay on an exact transition allowlist', () => {
  const sources = [];
  walkSourceFiles('esm', file => sources.push([file, read(file)]));
  const usage = collectStackSplitFacadeUsage(sources);
  const facadeExports = collectNamedModuleExports(
    'esm/shared/wardrobe_dimension_tokens_shared.ts',
    read('esm/shared/wardrobe_dimension_tokens_shared.ts')
  )
    .map(entry => entry.exportedName)
    .filter(isStackSplitFacadeSymbol)
    .sort();

  assert.deepEqual(
    usage.wildcardDependencies,
    APPROVED_STACK_SPLIT_FACADE_WILDCARDS,
    `Stack Split facade wildcard/dynamic usage changed and requires explicit public-API review: ${JSON.stringify(
      {
        approved: APPROVED_STACK_SPLIT_FACADE_WILDCARDS,
        actual: usage.wildcardDependencies,
      }
    )}`
  );
  assertApprovedSymbolUsage(
    usage.imports,
    APPROVED_STACK_SPLIT_FACADE_IMPORTS,
    'Stack Split facade consumer allowlist'
  );
  assertApprovedSymbolUsage(
    usage.reexports,
    APPROVED_STACK_SPLIT_FACADE_REEXPORTS,
    'Stack Split facade public re-export allowlist'
  );
  assertApprovedStackSplitFacadeSymbols(facadeExports);
});

test('[dimension-foundation] pure Carcass Shell and Interior consumers use focused owners', () => {
  const assertDirectOwner = (file, symbol, ownerSpecifier) => {
    const dependencies = analyzeModuleDependencies(file, read(file)).imports;
    assert.equal(
      dependencies.some(
        dependency =>
          dependency.specifier.endsWith(ownerSpecifier) && dependency.importedSymbols.includes(symbol)
      ),
      true,
      `${file} must import ${symbol} from ${ownerSpecifier}`
    );
    assert.equal(
      dependencies.some(
        dependency =>
          dependency.specifier.includes(FACADE_SPECIFIER) && dependency.importedSymbols.includes(symbol)
      ),
      false,
      `${file} must not route ${symbol} through the legacy facade`
    );
  };

  for (const file of CARCASS_SHELL_DIRECT_CONSUMERS) {
    assertDirectOwner(file, 'CARCASS_SHELL_DIMENSIONS', 'dimensions/carcass_shell_policy.js');
  }
  for (const file of CARCASS_INTERIOR_DIRECT_CONSUMERS) {
    assertDirectOwner(file, 'CARCASS_INTERIOR_DIMENSIONS', 'dimensions/carcass_interior_policy.js');
  }
});

test('[dimension-foundation] interior grid and Base Support owner consumers stay on exact allowlists', () => {
  const sources = [];
  walkSourceFiles('esm', file => sources.push([file, read(file)]));
  const analyzedSources = sources.map(([file, source]) => [
    file,
    source,
    analyzeModuleDependencies(file, source).imports,
  ]);

  assertApprovedSymbolUsage(
    collectOwnerImports(analyzedSources, 'carcass_interior_grid_policy.js'),
    APPROVED_INTERIOR_GRID_OWNER_IMPORTS,
    'Carcass interior grid owner consumer allowlist'
  );
  assertApprovedSymbolUsage(
    collectOwnerImports(analyzedSources, 'base_plinth_policy.js'),
    APPROVED_BASE_PLINTH_OWNER_IMPORTS,
    'Base plinth owner consumer allowlist'
  );
  assertApprovedSymbolUsage(
    collectOwnerImports(analyzedSources, 'base_leg_policy.js'),
    APPROVED_BASE_LEG_OWNER_IMPORTS,
    'Base leg owner consumer allowlist'
  );
  assertApprovedSymbolUsage(
    collectOwnerImports(analyzedSources, 'base_platform_render_policy.js'),
    APPROVED_BASE_PLATFORM_OWNER_IMPORTS,
    'Base platform owner consumer allowlist'
  );
  assertApprovedSymbolUsage(
    collectOwnerImports(analyzedSources, 'chest_structural_policy.js'),
    APPROVED_CHEST_STRUCTURAL_OWNER_IMPORTS,
    'Chest Structural owner consumer allowlist'
  );
  assertApprovedSymbolUsage(
    collectShellGridFieldUsage(analyzedSources),
    APPROVED_SHELL_GRID_FIELD_USAGE,
    'Carcass Shell grid-field compatibility allowlist'
  );
  assertApprovedSymbolUsage(
    collectFacadeSymbolImports(analyzedSources, ['BASE_LEG_DIMENSIONS', 'CARCASS_BASE_DIMENSIONS']),
    APPROVED_BASE_SUPPORT_FACADE_IMPORTS,
    'Base Support facade compatibility allowlist'
  );
  assertApprovedDimensionFacadeBroadDependencies(collectDimensionFacadeBroadDependencies(analyzedSources));
  assertApprovedSymbolUsage(
    collectChestLegacyFieldUsage(analyzedSources),
    APPROVED_CHEST_LEGACY_FIELD_USAGE,
    'Chest Structural legacy facade field allowlist'
  );
});

test('[dimension-foundation] Shell grid compatibility guard detects aliases, destructuring, and computed fields', () => {
  const fixtureUsage = collectShellGridFieldUsage([
    [
      'esm/native/builder/new_grid_consumer.ts',
      `
        import { CARCASS_SHELL_DIMENSIONS as shell } from '../../shared/dimensions/carcass_shell_policy.js';
        const shellAlias = shell;
        const { drawerGridDivisions } = shell;
        const { drawerSplitGridLineIndex: line } = shellAlias;
        export const divisions = shellAlias['drawerGridDivisions'];
        export { drawerGridDivisions, line };
      `,
    ],
  ]);
  assert.deepEqual(fixtureUsage, {
    'esm/native/builder/new_grid_consumer.ts': ['drawerGridDivisions', 'drawerSplitGridLineIndex'],
  });
  assert.throws(
    () =>
      assertApprovedSymbolUsage(fixtureUsage, {}, 'Carcass Shell fixture grid-field compatibility allowlist'),
    /review-blocked/u
  );

  assert.deepEqual(
    collectShellGridFieldUsage([
      [
        'esm/native/builder/safe_shell_consumer.ts',
        `
          import { CARCASS_SHELL_DIMENSIONS as shell } from '../../shared/dimensions/carcass_shell_policy.js';
          const unrelated = { drawerGridDivisions: 9 };
          export const values = [shell.backThicknessM, unrelated.drawerGridDivisions];
        `,
      ],
    ]),
    {}
  );
});

test('[dimension-foundation] facade guards reject namespace, wildcard, and dynamic dependency swaps', () => {
  const sources = [
    [
      'esm/native/builder/namespace_dimensions.ts',
      `
        import * as dimensions from '../../shared/wardrobe_dimension_tokens_shared.js';
        export const base = dimensions.CARCASS_BASE_DIMENSIONS;
      `,
    ],
    [
      'esm/native/builder/dynamic_dimensions.ts',
      `export const dimensions = import('../../shared/wardrobe_dimension_tokens_shared.js');`,
    ],
    [
      'esm/native/builder/wildcard_dimensions.ts',
      `export * from '../../shared/wardrobe_dimension_tokens_shared.js';`,
    ],
  ];
  const broadDependencies = collectDimensionFacadeBroadDependencies(sources);
  assert.deepEqual(broadDependencies, [
    { file: 'esm/native/builder/dynamic_dimensions.ts', syntax: 'dynamic-import' },
    { file: 'esm/native/builder/namespace_dimensions.ts', syntax: 'static-import' },
    { file: 'esm/native/builder/wildcard_dimensions.ts', syntax: 'static-re-export' },
  ]);
  assert.throws(() => assertApprovedDimensionFacadeBroadDependencies(broadDependencies), /requires review/u);
});

test('[dimension-foundation] Chest legacy guard detects named, aliased, namespace, destructured, and computed access', () => {
  const fixtureUsage = collectChestLegacyFieldUsage([
    [
      'esm/native/builder/named_chest_consumer.ts',
      `
        import { CARCASS_BASE_DIMENSIONS as base } from '../../shared/wardrobe_dimension_tokens_shared.js';
        const baseAlias = base;
        const { chest: structural } = baseAlias;
        const { connectorDepthM: depth } = structural;
        const wheelPolicy = structural['wheels'];
        export const values = [depth, wheelPolicy.radiusM];
      `,
    ],
    [
      'esm/native/builder/namespace_chest_consumer.ts',
      `
        import * as dimensions from '../../shared/wardrobe_dimension_tokens_shared.js';
        const base = dimensions.CARCASS_BASE_DIMENSIONS;
        export const gap = base.chest['drawerGapM'];
      `,
    ],
  ]);
  assert.deepEqual(fixtureUsage, {
    'esm/native/builder/named_chest_consumer.ts': ['chest', 'connectorDepthM', 'wheels', 'wheels.radiusM'],
    'esm/native/builder/namespace_chest_consumer.ts': ['chest', 'drawerGapM'],
  });
  assert.throws(
    () => assertApprovedSymbolUsage(fixtureUsage, {}, 'Chest fixture legacy facade field allowlist'),
    /review-blocked/u
  );
});

test('[dimension-foundation] public dimensions wildcard surface is an exact value/type snapshot', () => {
  const publicIndex = read('esm/native/features/dimensions/index.ts');
  const facade = read('esm/shared/wardrobe_dimension_tokens_shared.ts');
  const publicDependencies = analyzeModuleDependencies(
    'esm/native/features/dimensions/index.ts',
    publicIndex
  ).imports.filter(dependency => dependency.specifier.includes(FACADE_SPECIFIER));

  assert.deepEqual(
    publicDependencies.map(({ kind, syntax, importedSymbols, exportedSymbols }) => ({
      kind,
      syntax,
      importedSymbols,
      exportedSymbols,
    })),
    [
      {
        kind: 'value',
        syntax: 'static-re-export',
        importedSymbols: ['*'],
        exportedSymbols: ['*'],
      },
    ]
  );

  const actual = collectDimensionFacadeExportSurface(facade);
  assert.equal(actual.value.length, 89);
  assert.equal(actual.type.length, 10);
  assertApprovedPublicDimensionFacadeExports(actual);

  assert.throws(
    () =>
      assertApprovedPublicDimensionFacadeExports({
        value: [...actual.value, 'UNREVIEWED_PUBLIC_DIMENSION'].sort(),
        type: actual.type,
      }),
    /requires explicit review/u
  );
  assert.throws(
    () =>
      assertApprovedPublicDimensionFacadeExports({
        value: actual.value,
        type: actual.type.filter(symbol => symbol !== 'Meters'),
      }),
    /requires explicit review/u
  );
});

test('[dimension-foundation] Stack Split facade guard detects new consumers, symbols, and stale exceptions', () => {
  const usage = collectStackSplitFacadeUsage([
    [
      'esm/native/builder/new_stack_consumer.ts',
      `import { STACK_SPLIT_SEAM_GAP_M } from '../../shared/wardrobe_dimension_tokens_shared.js';`,
    ],
  ]);
  assert.throws(
    () => assertApprovedSymbolUsage(usage.imports, {}, 'Stack Split facade fixture consumer allowlist'),
    /review-blocked/u
  );

  assert.throws(
    () =>
      assertApprovedSymbolUsage(
        {},
        { 'esm/native/builder/retired_consumer.ts': ['DEFAULT_STACK_SPLIT_LOWER_HEIGHT'] },
        'Stack Split facade fixture stale allowlist'
      ),
    /stale entries must be removed/u
  );

  const fixtureExports = collectNamedModuleExports(
    'fixture.ts',
    `export const STACK_SPLIT_NEW_FACADE_SYMBOL = 1;`
  )
    .map(entry => entry.exportedName)
    .filter(isStackSplitFacadeSymbol);
  assert.throws(() => assertApprovedStackSplitFacadeSymbols(fixtureExports), /requires review/u);
});

test('[dimension-foundation] legacy facade importer budget is decrease-only', () => {
  const buckets = Object.fromEntries(
    Object.keys(APPROVED_FACADE_RATCHET)
      .filter(key => key !== 'total')
      .map(key => [key, { importers: new Set(), statements: new Set() }])
  );
  const totalImporters = new Set();
  const totalStatements = new Set();

  walkSourceFiles('esm', file => {
    const source = read(file);
    if (!source.includes(FACADE_SPECIFIER)) return;
    const relativeFile = file.replaceAll('\\', '/');
    for (const dependency of analyzeModuleDependencies(file, source).imports) {
      if (!dependency.specifier.includes(FACADE_SPECIFIER)) continue;
      const bucket = buckets[dependency.syntax];
      assert.ok(bucket, `unclassified facade dependency syntax: ${String(dependency.syntax)}`);
      const statementKey = `${relativeFile}:${dependency.statementStart}`;
      bucket.importers.add(relativeFile);
      bucket.statements.add(statementKey);
      totalImporters.add(relativeFile);
      totalStatements.add(statementKey);
    }
  });

  const actual = Object.fromEntries(
    Object.entries(buckets).map(([key, bucket]) => [
      key,
      { importers: bucket.importers.size, statements: bucket.statements.size },
    ])
  );
  actual.total = { importers: totalImporters.size, statements: totalStatements.size };

  const growth = [];
  const reductions = [];
  for (const [category, approved] of Object.entries(APPROVED_FACADE_RATCHET)) {
    for (const metric of ['importers', 'statements']) {
      if (actual[category][metric] > approved[metric]) {
        growth.push({ category, metric, approved: approved[metric], actual: actual[category][metric] });
      } else if (actual[category][metric] < approved[metric]) {
        reductions.push({ category, metric, approved: approved[metric], actual: actual[category][metric] });
      }
    }
  }

  const proposal = {
    ratchet: 'decrease-only',
    reviewRequired: growth.length > 0,
    approved: APPROVED_FACADE_RATCHET,
    actual,
    growth,
    reductions,
    proposedRatchet: reductions.length > 0 && growth.length === 0 ? actual : null,
  };
  assert.deepEqual(
    actual,
    APPROVED_FACADE_RATCHET,
    `legacy dimension facade ratchet drifted; growth is review-blocked and reductions must ratchet the approved baseline:\n${JSON.stringify(proposal, null, 2)}`
  );
});
