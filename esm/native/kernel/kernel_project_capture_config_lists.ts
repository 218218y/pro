import type { UnknownRecord } from '../../../types';

import { cloneModulesConfigurationSnapshot } from '../features/modules_configuration/modules_config_api.js';
import { buildStructureCfgSnapshot, buildStructureUiSnapshot } from './kernel_project_capture_shared.js';
import { cloneCanonicalCornerConfiguration } from '../features/project_config/project_config_lists_canonical.js';

export interface KernelProjectCaptureCanonicalConfigLists {
  modulesConfiguration: unknown;
  stackSplitLowerModulesConfiguration: unknown;
  cornerConfiguration: unknown;
}

export function buildKernelProjectCaptureCanonicalConfigLists(
  cfgRec: UnknownRecord,
  uiRec: UnknownRecord,
  rawAny: UnknownRecord
): KernelProjectCaptureCanonicalConfigLists {
  const canonicalUiSnapshot = buildStructureUiSnapshot(uiRec, rawAny);
  const canonicalCfgSnapshot = buildStructureCfgSnapshot(cfgRec);
  return {
    modulesConfiguration: cloneModulesConfigurationSnapshot(cfgRec, 'modulesConfiguration', {
      uiSnapshot: canonicalUiSnapshot,
      cfgSnapshot: canonicalCfgSnapshot,
    }),
    stackSplitLowerModulesConfiguration: cloneModulesConfigurationSnapshot(
      cfgRec,
      'stackSplitLowerModulesConfiguration'
    ),
    cornerConfiguration: cloneCanonicalCornerConfiguration(cfgRec.cornerConfiguration, 'auto'),
  };
}
