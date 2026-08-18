import type { Deps } from '../../../types';

import { getBrowserDocumentFromDeps, getBrowserWindowFromDeps } from './runtime_globals.js';
import { validateRuntimeConfig, validateRuntimeFlags } from './runtime_config_validation.js';
import type { RuntimeConfigIssue } from './runtime_config_validation_shared.js';

export type ReactBrowserBootEnvironment = {
  deps: Deps;
  window: Window;
  document: Document;
};

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

export function validateReactBrowserBootDeps(deps: Deps, source: string): ReactBrowserBootEnvironment {
  const validatedDeps = validateReactBootDeps(deps, source);
  const window = getBrowserWindowFromDeps(validatedDeps);
  const document = getBrowserDocumentFromDeps(validatedDeps);
  if (!window || !document) {
    throw new Error(
      `[WardrobePro][runtime-config][${source}] Injected browser window and document are required.`
    );
  }
  return { deps: validatedDeps, window, document };
}
