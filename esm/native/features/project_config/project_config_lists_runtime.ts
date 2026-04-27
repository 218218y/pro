import type {
  CornerConfigurationLike,
  ModulesConfigurationLike,
  ProjectSettingsLike,
  UiStateLike,
  UnknownRecord,
} from '../../../../types/index.js';

import {
  cloneModulesConfigurationSnapshot,
  materializeTopModulesConfigurationFromUiConfig,
} from '../modules_configuration/modules_config_api.js';
import {
  asProjectConfigRecord,
  buildStructureCfgSnapshot,
  buildStructureUiSnapshotFromSettings,
  buildStructureUiSnapshotFromUiState,
  cloneCanonicalCornerConfiguration,
  type ProjectConfigCornerCloneMode,
} from './project_config_lists_shared.js';

export interface ProjectConfigListsCanonicalizationOptions {
  uiSnapshot?: unknown;
  cfgSnapshot?: unknown;
  settings?: ProjectSettingsLike | UnknownRecord | null | undefined;
  cornerMode?: ProjectConfigCornerCloneMode;
  topMode?: 'clone' | 'materialize';
}

function hasOwn(obj: unknown, key: string): boolean {
  return !!obj && typeof obj === 'object' && Object.prototype.hasOwnProperty.call(obj, key);
}

function readProjectConfigSource<T extends UnknownRecord>(source: T | null | undefined): T {
  return asProjectConfigRecord(source) as T;
}

export function omitStructuralProjectConfigKeys<T extends UnknownRecord>(
  source: T
): Omit<T, ProjectConfigStructuralKey> {
  const {
    modulesConfiguration: _modulesConfiguration,
    stackSplitLowerModulesConfiguration: _stackSplitLowerModulesConfiguration,
    cornerConfiguration: _cornerConfiguration,
    ...rest
  } = source;
  return rest;
}

function resolveUiSnapshot(
  source: UnknownRecord,
  options?: ProjectConfigListsCanonicalizationOptions
): unknown {
  if (typeof options?.uiSnapshot !== 'undefined') return options.uiSnapshot;
  if (typeof options?.settings !== 'undefined') return buildStructureUiSnapshotFromSettings(options.settings);
  if (hasOwn(source, 'settings')) {
    return buildStructureUiSnapshotFromSettings(asProjectConfigRecord(source.settings));
  }
  return buildStructureUiSnapshotFromUiState(source);
}

function resolveCfgSnapshot(
  source: UnknownRecord,
  options?: ProjectConfigListsCanonicalizationOptions
): unknown {
  if (typeof options?.cfgSnapshot !== 'undefined') return options.cfgSnapshot;
  if (typeof options?.settings !== 'undefined') return buildStructureCfgSnapshot(options.settings);
  if (hasOwn(source, 'settings')) return buildStructureCfgSnapshot(asProjectConfigRecord(source.settings));
  return buildStructureCfgSnapshot(source);
}

function canonicalizeTopModulesList(
  source: UnknownRecord,
  uiSnapshot: unknown,
  cfgSnapshot: unknown,
  options?: ProjectConfigListsCanonicalizationOptions
): ModulesConfigurationLike {
  if (options?.topMode === 'materialize') {
    return materializeTopModulesConfigurationFromUiConfig(
      source.modulesConfiguration,
      uiSnapshot,
      cfgSnapshot
    );
  }
  return cloneModulesConfigurationSnapshot(source, 'modulesConfiguration', { uiSnapshot, cfgSnapshot });
}

export interface CanonicalProjectConfigLists {
  modulesConfiguration: ModulesConfigurationLike;
  stackSplitLowerModulesConfiguration: ModulesConfigurationLike;
  cornerConfiguration: CornerConfigurationLike;
}

export type ProjectConfigStructuralKey = keyof CanonicalProjectConfigLists;

export type CanonicalProjectConfigStructuralSnapshot<T extends UnknownRecord> = Omit<
  T,
  ProjectConfigStructuralKey
> &
  CanonicalProjectConfigLists;

export type CanonicalProjectConfigStructuralPatch<T extends UnknownRecord> = Partial<
  Omit<T, ProjectConfigStructuralKey>
> &
  Partial<CanonicalProjectConfigLists>;

export function pickStructuralProjectConfigLists(
  source: CanonicalProjectConfigLists
): CanonicalProjectConfigLists {
  return {
    modulesConfiguration: source.modulesConfiguration,
    stackSplitLowerModulesConfiguration: source.stackSplitLowerModulesConfiguration,
    cornerConfiguration: source.cornerConfiguration,
  };
}

export function canonicalizeProjectConfigStructuralLists(
  source: unknown,
  options?: ProjectConfigListsCanonicalizationOptions
): CanonicalProjectConfigLists {
  const src = asProjectConfigRecord(source);
  const uiSnapshot = resolveUiSnapshot(src, options);
  const cfgSnapshot = resolveCfgSnapshot(src, options);

  return {
    modulesConfiguration: canonicalizeTopModulesList(src, uiSnapshot, cfgSnapshot, options),
    stackSplitLowerModulesConfiguration: cloneModulesConfigurationSnapshot(
      src,
      'stackSplitLowerModulesConfiguration'
    ),
    cornerConfiguration: cloneCanonicalCornerConfiguration(src.cornerConfiguration, options?.cornerMode),
  };
}

export function canonicalizeProjectConfigStructuralSnapshot<T extends UnknownRecord>(
  source: T | null | undefined,
  options?: ProjectConfigListsCanonicalizationOptions
): CanonicalProjectConfigStructuralSnapshot<T> {
  const src = readProjectConfigSource(source);
  return {
    ...omitStructuralProjectConfigKeys(src),
    ...canonicalizeProjectConfigStructuralLists(src, options),
  };
}

export function canonicalizeProjectConfigStructuralPatch<T extends UnknownRecord>(
  snapshot: T | null | undefined,
  options?: ProjectConfigListsCanonicalizationOptions
): CanonicalProjectConfigStructuralPatch<T> {
  const src = readProjectConfigSource(snapshot);
  if (!Object.keys(src).length) return {};

  const structuralPatch: Partial<CanonicalProjectConfigLists> = {};
  const uiSnapshot = resolveUiSnapshot(src, options);
  const cfgSnapshot = resolveCfgSnapshot(src, options);

  if (hasOwn(src, 'modulesConfiguration')) {
    structuralPatch.modulesConfiguration = canonicalizeTopModulesList(src, uiSnapshot, cfgSnapshot, options);
  }
  if (hasOwn(src, 'stackSplitLowerModulesConfiguration')) {
    structuralPatch.stackSplitLowerModulesConfiguration = cloneModulesConfigurationSnapshot(
      src,
      'stackSplitLowerModulesConfiguration'
    );
  }
  if (hasOwn(src, 'cornerConfiguration')) {
    structuralPatch.cornerConfiguration = cloneCanonicalCornerConfiguration(
      src.cornerConfiguration,
      options?.cornerMode
    );
  }

  return {
    ...omitStructuralProjectConfigKeys(src),
    ...structuralPatch,
  };
}

export function canonicalizeProjectConfigListsForLoad(
  source: unknown,
  settings: ProjectSettingsLike | UnknownRecord | null | undefined
): CanonicalProjectConfigLists {
  return canonicalizeProjectConfigStructuralLists(source, { settings, cornerMode: 'full' });
}

export function canonicalizeProjectConfigListsForSave(
  cfg: unknown,
  ui: UiStateLike | UnknownRecord | null | undefined
): CanonicalProjectConfigLists {
  const src = asProjectConfigRecord(cfg);
  const uiSnapshot = buildStructureUiSnapshotFromUiState(ui);
  const cfgSnapshot = buildStructureCfgSnapshot(src);
  return canonicalizeProjectConfigStructuralLists(src, { uiSnapshot, cfgSnapshot, cornerMode: 'auto' });
}

export function canonicalizeProjectConfigListsForExportPayload(
  projectData: unknown
): CanonicalProjectConfigLists {
  const src = asProjectConfigRecord(projectData);
  return canonicalizeProjectConfigStructuralLists(src, {
    settings: asProjectConfigRecord(src.settings),
    cornerMode: 'auto',
  });
}
