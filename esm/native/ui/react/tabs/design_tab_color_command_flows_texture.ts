import { readFileDataUrlResultViaBrowser } from '../../../services/api.js';

import type { DesignTabColorActionResult } from './design_tab_color_action_result.js';
import {
  buildDesignTabColorActionFailure,
  buildDesignTabColorActionSuccess,
} from './design_tab_color_action_result.js';
import { readTextureFileName } from './design_tab_color_command_shared.js';
import type { ReadTextureFileOptions } from './design_tab_color_command_flows_contracts.js';

export async function readTextureFileAsDataUrl(
  file: Blob | File | null,
  options: ReadTextureFileOptions = {}
): Promise<DesignTabColorActionResult> {
  if (!file) return buildDesignTabColorActionFailure('upload-texture', 'missing-file');

  const result = await readFileDataUrlResultViaBrowser(file, {
    createReader: options.createReader,
    unavailableMessage: 'טעינת תמונה לא זמינה כרגע',
    readFailureMessage: 'טעינת תמונה נכשלה',
  });

  if (result.ok === false) {
    return buildDesignTabColorActionFailure(
      'upload-texture',
      result.reason === 'unavailable' ? 'unavailable' : 'read-failed',
      {},
      result.message
    );
  }

  const textureName = readTextureFileName(file);
  return buildDesignTabColorActionSuccess('upload-texture', {
    textureName,
    dataUrl: result.value,
  });
}
