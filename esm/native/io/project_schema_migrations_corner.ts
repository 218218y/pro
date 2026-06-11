import type { ProjectDataLike } from '../../../types/index.js';

import { asObject, asObjectRecord, readObjectArray } from './project_payload_shared.js';
import type { EnsureTogglesRecordFn } from './project_schema_migrations_shared.js';
import { readCornerConfigurationRecord } from './project_schema_migrations_shared.js';

export function normalizeCornerConfigurationShape(data: ProjectDataLike): void {
  if (!data.cornerConfiguration || typeof data.cornerConfiguration !== 'object') {
    data.cornerConfiguration = {};
  }

  try {
    const cornerConfiguration = asObject(data.cornerConfiguration);
    if (
      !cornerConfiguration ||
      typeof cornerConfiguration !== 'object' ||
      Array.isArray(cornerConfiguration)
    ) {
      data.cornerConfiguration = {};
      return;
    }

    if (
      typeof cornerConfiguration.modulesConfiguration !== 'undefined' &&
      !Array.isArray(cornerConfiguration.modulesConfiguration)
    ) {
      cornerConfiguration.modulesConfiguration = [];
    }

    if (typeof cornerConfiguration.stackSplitLower !== 'undefined') {
      if (
        !cornerConfiguration.stackSplitLower ||
        typeof cornerConfiguration.stackSplitLower !== 'object' ||
        Array.isArray(cornerConfiguration.stackSplitLower)
      ) {
        cornerConfiguration.stackSplitLower = {};
      }
      const lower = asObjectRecord(cornerConfiguration.stackSplitLower);
      if (
        lower &&
        typeof lower.modulesConfiguration !== 'undefined' &&
        !Array.isArray(lower.modulesConfiguration)
      ) {
        lower.modulesConfiguration = [];
      }
      cornerConfiguration.stackSplitLower = lower || {};
    }

    data.cornerConfiguration = cornerConfiguration;
  } catch {}
}

export function inferInternalDrawersToggle(
  data: ProjectDataLike,
  ensureTogglesRecord: EnsureTogglesRecordFn
): void {
  try {
    const toggles = ensureTogglesRecord(data);
    if (typeof toggles.internalDrawers !== 'undefined') return;

    let hasInternalDrawers = false;
    const modulesConfiguration = readObjectArray(data.modulesConfiguration);
    for (const entry of modulesConfiguration) {
      const moduleRec = asObjectRecord(entry) ?? Object.create(null);
      if (
        typeof moduleRec.intDrawersSlot !== 'undefined' &&
        String(moduleRec.intDrawersSlot) !== '0' &&
        String(moduleRec.intDrawersSlot) !== ''
      ) {
        hasInternalDrawers = true;
        break;
      }
      if (Array.isArray(moduleRec.intDrawersList) && moduleRec.intDrawersList.length) {
        hasInternalDrawers = true;
        break;
      }
      if (Array.isArray(moduleRec.internalDrawers) && moduleRec.internalDrawers.length) {
        hasInternalDrawers = true;
        break;
      }
    }

    if (!hasInternalDrawers) {
      const cornerConfiguration = readCornerConfigurationRecord(data);
      if (cornerConfiguration) {
        if (Array.isArray(cornerConfiguration.intDrawersList) && cornerConfiguration.intDrawersList.length) {
          hasInternalDrawers = true;
        }
        if (
          !hasInternalDrawers &&
          typeof cornerConfiguration.intDrawersSlot !== 'undefined' &&
          String(cornerConfiguration.intDrawersSlot) !== '0' &&
          String(cornerConfiguration.intDrawersSlot) !== ''
        ) {
          hasInternalDrawers = true;
        }
        const lower = asObjectRecord(cornerConfiguration.stackSplitLower);
        if (!hasInternalDrawers && lower) {
          if (Array.isArray(lower.intDrawersList) && lower.intDrawersList.length) {
            hasInternalDrawers = true;
          }
          if (
            !hasInternalDrawers &&
            typeof lower.intDrawersSlot !== 'undefined' &&
            String(lower.intDrawersSlot) !== '0' &&
            String(lower.intDrawersSlot) !== ''
          ) {
            hasInternalDrawers = true;
          }
        }
      }
    }

    if (hasInternalDrawers) toggles.internalDrawers = true;
  } catch {}
}
