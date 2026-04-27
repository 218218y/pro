import test from 'node:test';
import assert from 'node:assert/strict';

import { bundleSources, readSource, assertMatchesAll, assertLacksAll } from './_source_bundle.js';
import { readBuildTypesBundle } from './_build_types_bundle.js';

const mapsTypes = readSource('../types/maps.ts', import.meta.url);
const projectTypes = readSource('../types/project.ts', import.meta.url);
const buildTypes = readBuildTypesBundle(import.meta.url);
const typesIndex = readSource('../types/index.ts', import.meta.url);
const configScalarTypes = readSource('../types/config_scalar.ts', import.meta.url);
const loadHelpers = readSource('../esm/native/io/project_io_load_helpers.ts', import.meta.url);
const projectSchema = bundleSources(
  [
    '../esm/native/io/project_schema.ts',
    '../esm/native/io/project_schema_shared.ts',
    '../esm/native/io/project_schema_migrate.ts',
  ],
  import.meta.url
);
const projectSaveLoad = readSource('../esm/native/ui/interactions/project_save_load.ts', import.meta.url);
const projectSaveLoadController = readSource(
  '../esm/native/ui/interactions/project_save_load_controller_runtime.ts',
  import.meta.url
);
const projectDragDrop = readSource('../esm/native/ui/interactions/project_drag_drop.ts', import.meta.url);
const projectDragDropController = readSource(
  '../esm/native/ui/interactions/project_drag_drop_controller_runtime.ts',
  import.meta.url
);
const modes = bundleSources(
  [
    '../esm/native/ui/modes.ts',
    '../esm/native/ui/modes_shared.ts',
    '../esm/native/ui/modes_transition_policy.ts',
  ],
  import.meta.url
);

const projectBundle = bundleSources(
  [
    '../esm/native/io/project_schema.ts',
    '../esm/native/io/project_io_orchestrator.ts',
    '../esm/native/io/project_io_orchestrator_load_ops.ts',
    '../esm/native/io/project_io_orchestrator_load_file.ts',
    '../esm/native/io/project_io_orchestrator_project_load.ts',
    '../esm/native/io/project_io_orchestrator_restore.ts',
    '../esm/native/io/project_io_load_helpers.ts',
    '../esm/native/io/project_io_load_helpers_shared.ts',
    '../esm/native/io/project_io_load_helpers_maps.ts',
    '../esm/native/io/project_io_load_helpers_config.ts',
    '../esm/native/ui/interactions/project_save_load.ts',
    '../esm/native/ui/interactions/project_save_load_controller_runtime.ts',
    '../esm/native/ui/interactions/project_save_load_controller_shared.ts',
    '../esm/native/ui/interactions/project_save_load_controller_load.ts',
    '../esm/native/ui/interactions/project_save_load_controller_save.ts',
    '../esm/native/ui/interactions/project_drag_drop.ts',
    '../esm/native/ui/interactions/project_drag_drop_controller_runtime.ts',
    '../esm/native/ui/interactions/project_drag_drop_controller_shared.ts',
    '../esm/native/ui/interactions/project_drag_drop_controller_visual.ts',
    '../esm/native/ui/interactions/project_drag_drop_controller_drop.ts',
    '../esm/native/ui/project_load_runtime.ts',
    '../esm/native/ui/project_load_runtime_shared.ts',
    '../esm/native/ui/project_load_runtime_action.ts',
    '../esm/native/ui/project_save_runtime.ts',
    '../esm/native/ui/project_save_runtime_contracts.ts',
    '../esm/native/ui/project_save_runtime_prompt.ts',
    '../esm/native/ui/project_save_runtime_results.ts',
    '../esm/native/ui/project_save_runtime_action.ts',
  ],
  import.meta.url
);

test('project payload/schema contracts stay typed across types, schema normalization, and UI load boundaries', () => {
  assertMatchesAll(
    assert,
    mapsTypes,
    [
      /export type IndividualColorsMap = Record<string, string \| null \| undefined>;/,
      /export type DoorSpecialMap = Record<string, DoorSpecialValue \| undefined>;/,
      /individualColors: IndividualColorsMap;/,
      /doorSpecialMap: DoorSpecialMap;/,
    ],
    'mapsTypes'
  );

  assertMatchesAll(
    assert,
    projectTypes,
    [
      /export type ProjectJsonLike =/,
      /export type ProjectSavedNotesLike = SavedNote\[\];/,
      /export type ProjectPdfDraftLike = ProjectJsonLike;/,
      /export interface ProjectFileLoadEventLike extends UnknownRecord/,
      /export interface ProjectFileReaderEventLike extends UnknownRecord/,
      /export interface ProjectSettingsLike extends (?:AnyRecord|UnknownRecord)/,
      /export interface ProjectTogglesLike extends (?:AnyRecord|UnknownRecord)/,
      /export interface ProjectSchemaValidationResult/,
      /orderPdfEditorDraft\?: ProjectPdfDraftLike \| null;/,
    ],
    'projectTypes'
  );
  assertMatchesAll(assert, typesIndex, [/export \* from '\.\/project';/], 'typesIndex');

  assertMatchesAll(
    assert,
    buildTypes,
    [
      /settings\?: ProjectSettingsLike;/,
      /toggles\?: ProjectTogglesLike;/,
      /individualColors\?: IndividualColorsMap;/,
      /doorSpecialMap\?: DoorSpecialMap;/,
      /savedNotes\?: ProjectSavedNotesLike;/,
      /notes\?: ProjectSavedNotesLike;/,
      /preChestState\?: ProjectPreChestStateLike;/,
      /orderPdfEditorDraft\?: ProjectPdfDraftLike \| null;/,
      /export interface ProjectExportResultLike extends UnknownRecord/,
      /export type ProjectLoadInputLike = ProjectDataLike \| ProjectDataEnvelopeLike \| UnknownRecord \| object;/,
      /export interface ProjectIoServiceLike extends UnknownRecord/,
      /exportCurrentProject\?: \(meta\?: UnknownRecord\) => ProjectExportResultLike \| null \| undefined;/,
      /loadProjectData\?: \(\s*data: ProjectLoadInputLike,/s,
    ],
    'buildTypes'
  );
  assertMatchesAll(
    assert,
    configScalarTypes,
    [/individualColors: IndividualColorsMap;/],
    'configScalarTypes'
  );

  assertMatchesAll(
    assert,
    loadHelpers,
    [
      /function readSavedNotes\(value: unknown\): ProjectSavedNotesLike \{/,
      /function cloneProjectJson\(value: unknown\): ProjectPdfDraftLike \| null \{/,
      /export function buildProjectUiSnapshot\([\s\S]*savedNotes: ProjectSavedNotesLike/s,
      /orderPdfEditorDraft: hasDraft \? cloneProjectJson\(rec\.orderPdfEditorDraft\) : null/,
    ],
    'loadHelpers'
  );

  assertMatchesAll(
    assert,
    projectSchema,
    [
      /unwrapProjectEnvelope\(data: unknown\): ProjectDataLike \| null/,
      /validateProjectData\(data: ProjectDataLike\): ProjectSchemaValidationResult/,
      /normalizeProjectData\(input: unknown, nowISO\?: string\): ProjectDataLike \| null/,
      /function ensureSettingsRecord\(data: ProjectDataLike\): ProjectSettingsLike & UnknownRecord|export function ensureSettingsRecord\(data: ProjectDataLike\): ProjectSettingsLike & UnknownRecord/,
      /function ensureTogglesRecord\(data: ProjectDataLike\): ProjectTogglesLike & UnknownRecord/,
      /function readSavedNotes\(value: unknown\): ProjectSavedNotesLike \{/,
      /project_schema_shared\.js/,
      /project_schema_migrate\.js/,
      /project_schema_normalize\.js/,
      /project_schema_validation\.js/,
    ],
    'projectSchema'
  );
});

test('project payload-related bundles keep typed save/load and modes seams without legacy helper fallbacks', () => {
  assertMatchesAll(
    assert,
    projectBundle,
    [
      /normalizeProjectData\(input\)/,
      /buildProjectPdfUiPatch/,
      /export function buildProjectPdfUiPatch\(/,
      /\): Pick<ProjectPdfStateLike, 'orderPdfEditorDraft' \| 'orderPdfEditorZoom'> \{/,
      /const hasDraft = typeof rec\.orderPdfEditorDraft !== 'undefined';/,
      /orderPdfEditorDraft:/,
      /cloneProjectJson\(rec\.orderPdfEditorDraft\)/,
      /orderPdfEditorZoom: Number\.isFinite\(zoom\) && zoom > 0 \? zoom : 1,/,
      /ensureSaveProjectAction\(/,
      /setSaveProjectAction\(/,
    ],
    'projectBundle'
  );
  assertLacksAll(
    assert,
    projectBundle,
    [/function __normalizeProjectData\(/, /function __safeJsonParse\(/],
    'projectBundle'
  );

  assertMatchesAll(
    assert,
    projectSaveLoad,
    [
      /createProjectSaveLoadInteractionController\(/,
      /controller\.handleLoadInputChange\(e\)/,
      /controller\.performSave\(\)/,
    ],
    'projectSaveLoad'
  );
  assertMatchesAll(
    assert,
    projectSaveLoadController,
    [
      /asProjectFileLoadEvent/,
      /project_save_load_controller_load\.js/,
      /project_save_load_controller_save\.js/,
      /project_save_runtime\.js/,
    ],
    'projectSaveLoadController'
  );
  assertMatchesAll(
    assert,
    projectDragDrop,
    [
      /createProjectDragDropController\(App, deps\)/,
      /controller\.onDropHandle/,
      /controller\.onDragOverClass/,
    ],
    'projectDragDrop'
  );
  assertMatchesAll(
    assert,
    projectDragDropController,
    [
      /export \{[\s\S]*readDroppedProjectFile(?:,[\s\S]*readDroppedProjectFileFlightKey)?[,\s\S]*isProjectFileDrag[\s\S]*\} from '\.\/project_drag_drop_controller_shared\.js';/,
      /project_drag_drop_controller_drop\.js/,
      /const toast = typeof deps\.toast === 'function' \? deps\.toast : \(\) => undefined;/,
      /handleProjectDropLoad\(App, doc, toast, e\)/,
    ],
    'projectDragDropController'
  );

  assertMatchesAll(
    assert,
    modes,
    [
      /type ModesControllerApi = (?:\\{|Required<Pick<UiModesControllerLike,)/,
      /export function getModeState\(App: AppLike\): ModeStateLike \{/,
      /export function getHandlesTools\(App: AppLike\): HandlesToolLike \| null \{/,
      /export function asUiFeedback\(value: unknown\): UiFeedbackWithEditStateToast \| null \{/,
      /const fb = asUiFeedback\(getUiFeedback\(App\)\);/,
      /(?:let unsub: ModesControllerApi\['unsub'\] = null;|unsub: \(\(\) => void\) \| \{ unsubscribe\?: \(\) => void \} \| null;|api\.unsub = subscribe \? subscribe\(\(\) => \{ if \(typeof api\.apply === 'function'\) api\.apply\(\); \}\) : null;)/,
    ],
    'modes'
  );
  assertLacksAll(assert, modes, [/const fb: any = getUiFeedback\(App\)/, /let unsub: any = null;/], 'modes');
});
