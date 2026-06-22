import type { Deps } from '../../../types';

import { validateRuntimeConfig, validateRuntimeFlags } from './runtime_config_validation.js';
import type { RuntimeConfigIssue } from './runtime_config_validation_shared.js';

function formatRuntimeIssues(issues: RuntimeConfigIssue[]): string {
  return issues.map(issue => `${issue.path ? `${issue.path}: ` : ''}${issue.message}`).join('; ');
}

export function validateReactBootDeps(deps: Deps, source: string): Deps {
  if (!deps || typeof deps !== 'object') {
    throw new Error(`[WardrobePro][runtime-config][${source}] deps object is required.`);
  }

  const flagsResult = validateRuntimeFlags(deps.flags ?? {}, { source, failFast: true });
  const configResult = validateRuntimeConfig(deps.config ?? {}, { source, failFast: true });
  const issues = [...flagsResult.issues, ...configResult.issues];
  if (issues.length) {
    throw new Error(
      `[WardrobePro][runtime-config][${source}] Invalid runtime configuration: ${formatRuntimeIssues(issues)}`
    );
  }

  deps.flags = { ...flagsResult.flags, uiFramework: 'react' };
  deps.config = configResult.config;
  return deps;
}
