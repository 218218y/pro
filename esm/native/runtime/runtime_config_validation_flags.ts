import type { WardrobeProRuntimeFlags } from '../../../types';

import {
  cloneRuntimeFlags,
  isPlainObject,
  toBool,
  type RuntimeConfigIssue,
  type ValidateOpts,
} from './runtime_config_validation_shared.js';

export function validateRuntimeFlags(
  flagsIn: unknown,
  _opts: ValidateOpts = {}
): {
  flags: WardrobeProRuntimeFlags;
  issues: RuntimeConfigIssue[];
} {
  const issues: RuntimeConfigIssue[] = [];
  if (!isPlainObject(flagsIn)) {
    if (typeof flagsIn !== 'undefined' && flagsIn !== null) {
      issues.push({ kind: 'warn', path: 'flags', message: 'flags must be an object (ignored)' });
    }
    return { flags: {}, issues };
  }

  const out = cloneRuntimeFlags(flagsIn);

  if (typeof out.uiFramework !== 'undefined' && out.uiFramework !== 'react') {
    issues.push({
      kind: 'warn',
      path: 'flags.uiFramework',
      message: 'uiFramework must be "react" (ignored)',
    });
    delete out.uiFramework;
  }

  if (typeof out.enableThreeGeometryCachePatch !== 'undefined') {
    const b = toBool(out.enableThreeGeometryCachePatch);
    if (b == null) {
      issues.push({
        kind: 'warn',
        path: 'flags.enableThreeGeometryCachePatch',
        message: 'enableThreeGeometryCachePatch must be boolean (ignored)',
      });
      delete out.enableThreeGeometryCachePatch;
    } else {
      out.enableThreeGeometryCachePatch = b;
    }
  }

  return { flags: out, issues };
}
