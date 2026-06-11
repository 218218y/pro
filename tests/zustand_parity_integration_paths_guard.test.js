import test from 'node:test';
import assert from 'node:assert/strict';

import { bundleSources, assertMatchesAll, assertLacksAll } from './_source_bundle.js';

const reactDesignBundle = bundleSources(
  [
    '../esm/native/ui/react/hooks.tsx',
    '../esm/native/ui/react/actions/store_actions.ts',
    '../esm/native/ui/react/tabs/DesignTab.view.tsx',
    '../esm/native/ui/react/tabs/use_design_tab_controller.ts',
    '../esm/native/ui/react/tabs/use_design_tab_controller_contracts.ts',
    '../esm/native/ui/react/tabs/use_design_tab_controller_state.ts',
    '../esm/native/ui/react/tabs/use_design_tab_controller_sections.ts',
    '../esm/native/ui/react/tabs/use_design_tab_color_manager.ts',
    '../esm/native/ui/react/tabs/use_design_tab_custom_color_workflow.ts',
    '../esm/native/ui/react/tabs/design_tab_custom_color_workflow_controller_runtime.ts',
    '../esm/native/ui/react/tabs/design_tab_color_command_flows.ts',
    '../esm/native/ui/react/tabs/use_design_tab_saved_swatches.ts',
  ],
  import.meta.url
);

const notesBundle = bundleSources(
  [
    '../esm/native/ui/notes_service.ts',
    '../esm/native/ui/notes_service_shared.ts',
    '../esm/native/ui/notes_service_sanitize.ts',
    '../esm/native/ui/notes_service_runtime.ts',
    '../esm/native/services/history.ts',
    '../esm/native/services/autosave.ts',
    '../esm/native/ui/interactions/project_save_load.ts',
  ],
  import.meta.url
);

const structureBundle = bundleSources(
  [
    '../esm/native/ui/react/tabs/StructureTab.view.tsx',
    '../esm/native/ui/react/tabs/use_structure_tab_view_state.ts',
    '../esm/native/ui/react/tabs/use_structure_tab_workflows.tsx',
    '../esm/native/ui/react/tabs/structure_tab_shared.ts',
    '../esm/native/ui/react/tabs/structure_tab_controls.tsx',
    '../esm/native/kernel/domain_api.ts',
    '../esm/native/kernel/domain_api_modules_corner.ts',
    '../esm/native/kernel/domain_api_room_section.ts',
    '../esm/native/kernel/domain_api_room_section_shared.ts',
    '../esm/native/kernel/domain_api_room_section_wardrobe.ts',
    '../esm/native/kernel/domain_api_room_section_manual_width.ts',
    '../esm/native/kernel/domain_api_surface_sections.ts',
    '../esm/native/kernel/domain_api_surface_sections_shared.ts',
    '../esm/native/kernel/domain_api_surface_sections_state.ts',
    '../esm/native/kernel/domain_api_surface_sections_bindings.ts',
    '../esm/native/kernel/domain_api_surface_sections_bindings_root_map.ts',
    '../esm/native/kernel/domain_api_surface_sections_bindings_doors.ts',
    '../esm/native/kernel/domain_api_surface_sections_bindings_drawers_dividers.ts',
    '../esm/native/kernel/domain_api_surface_sections_bindings_view_flags_textures.ts',
    '../esm/native/kernel/domain_api_surface_sections_bindings_grooves_curtains.ts',
    '../esm/native/runtime/cfg_access_core.ts',
  ],
  import.meta.url
);

test('[parity-paths] texture/custom upload flows write config through canonical patch surfaces', () => {
  assertLacksAll(
    assert,
    reactDesignBundle,
    [/\bcfgSetCustomUploadedDataURL\b/, /_callNs\(_ns\(nsName\), fnName,/, /stateKernel\.touch\(/],
    'reactDesignBundle'
  );
  assertMatchesAll(
    assert,
    reactDesignBundle,
    [
      /from '\.\.\/actions\/store_actions\.js';/,
      /\bsetCfgCustomUploadedDataURL(?:Api)?\(/,
      /\bsetCfgCustomUploadedDataURL\(app,\s*(?:result\.dataUrl|data),\s*\{\s*source:\s*'react:design:custom:texture'\s*\}\);/,
    ],
    'reactDesignBundle'
  );
});

test('[parity-paths] notes/project bundle keeps persistence + restore paths explicit', () => {
  assertMatchesAll(
    assert,
    notesBundle,
    [
      /notesNs\.restoreFromSave = \(savedNotes: unknown\) => \{/,
      /source: 'notes:restore'/,
      /notesNs\.clear = \(\) => \{/,
      /source: 'notes:clear'/,
      /notesNs\.persist = \(meta\?: (?:ActionMetaLike \| UnknownRecord|AnyRecord)\) => \{/,
      /metaNs\.persist\(payload\)/,
      /services\/api\.js/,
    ],
    'notesBundle'
  );
  assertLacksAll(assert, notesBundle, [/cfg_access\.js/, /cfgSetMap\(/], 'notesBundle');
});

test('[parity-paths] structure/domain bundle keeps canonical width/hinge/save paths', () => {
  assertMatchesAll(
    assert,
    structureBundle,
    [
      /setCfgModulesConfiguration\(/,
      /setCfgWardrobeType\(/,
      /writeHinge\(/,
      /writeHandle\(/,
      /applyConfigPatch\(/,
    ],
    'structureBundle'
  );
  assertLacksAll(assert, structureBundle, [/stateKernel\.patch/, /cfgPatchMap\s*\(/], 'structureBundle');
});
