import type { AppContainer, ProjectFileLike, ProjectFileLoadEventLike } from '../../../types';

import { readFileTextResultViaBrowser } from '../runtime/browser_file_read.js';
import {
  buildProjectLoadActionErrorResult,
  normalizeProjectLoadActionResult,
  type ProjectLoadActionResult,
} from '../runtime/project_load_action_result.js';
import { loadProjectDataActionResultViaService } from '../runtime/project_io_access.js';
import { resolveProjectFileLoadInput } from './project_file_input_resolver.js';

function clearFileInputValue(target: { value?: string } | null): void {
  if (!target) return;
  try {
    target.value = '';
  } catch {
    // ignore
  }
}

export async function readProjectFileText(file: ProjectFileLike, App?: AppContainer | null): Promise<string> {
  const result = await readFileTextResultViaBrowser(file, {
    app: App,
    unavailableMessage: 'FileReader unavailable',
    readFailureMessage: 'FileReader failed',
  });
  if (result.ok === false) {
    throw new Error(result.message);
  }
  return result.value;
}

export async function loadProjectFileInput(
  App: AppContainer,
  eventOrFile: ProjectFileLoadEventLike | ProjectFileLike | unknown
): Promise<ProjectLoadActionResult> {
  const { file, target } = resolveProjectFileLoadInput(eventOrFile);
  try {
    if (!file) return { ok: false, reason: 'missing-file' };

    let text = '';
    try {
      text = await readProjectFileText(file, App);
    } catch (error) {
      return buildProjectLoadActionErrorResult(error, '[WardrobePro] Failed reading project file.');
    }

    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      return { ok: false, reason: 'invalid' };
    }
    if (!data || typeof data !== 'object') {
      return { ok: false, reason: 'invalid' };
    }

    return normalizeProjectLoadActionResult(
      loadProjectDataActionResultViaService(
        App,
        data,
        { toast: false, meta: { source: 'load.file' } },
        'not-installed',
        '[WardrobePro] Project file load failed.'
      ),
      'not-installed'
    );
  } finally {
    clearFileInputValue(target);
  }
}
