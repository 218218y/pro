import type { CloudSyncShareLinkCommandResult } from '../../../types';

import { writeClipboardTextResultViaBrowser } from './api.js';
import { normalizeUnknownError } from '../runtime/error_normalization.js';

import { readRoomString, type CloudSyncCopyShareLinkCommandDeps } from './cloud_sync_room_commands_shared.js';

export async function runCloudSyncCopyShareLinkCommand(
  deps: CloudSyncCopyShareLinkCommandDeps
): Promise<CloudSyncShareLinkCommandResult> {
  const text = readRoomString(deps.getShareLink());
  if (!text) return { ok: false, reason: 'missing-link' };

  const clipboard = deps.readClipboard();
  const clipboardResult = await writeClipboardTextResultViaBrowser({ clipboardMaybe: clipboard }, text, {
    allowExecCommand: false,
  });
  if (clipboardResult.ok) {
    return { ok: true, copied: true, link: text };
  }
  const clipboardFailure = 'reason' in clipboardResult ? clipboardResult : null;
  if (clipboardFailure?.reason === 'error') {
    deps.reportNonFatal(
      deps.App,
      'services/cloud_sync.ts:copyShareLink.clipboard',
      new Error(clipboardFailure.message || 'clipboard write failed'),
      { throttleMs: 4000 }
    );
  }

  const promptSink = deps.readPromptSink();
  if (promptSink && typeof promptSink.prompt === 'function') {
    try {
      promptSink.prompt('העתק את הקישור:', text);
      return { ok: true, prompted: true, link: text };
    } catch (err) {
      deps.reportNonFatal(deps.App, 'services/cloud_sync.ts:copyShareLink.prompt', err, { throttleMs: 4000 });
      return {
        ok: false,
        reason: 'prompt',
        link: text,
        message: normalizeUnknownError(err, 'הצגת חלון ההעתקה נכשלה').message,
      };
    }
  }

  if (clipboardFailure?.reason === 'error') {
    return { ok: false, reason: 'error', link: text, message: clipboardFailure.message };
  }

  return { ok: false, reason: clipboard ? 'clipboard' : 'unavailable', link: text };
}
