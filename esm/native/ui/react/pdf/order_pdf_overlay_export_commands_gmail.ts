import { buildGmailError } from './order_pdf_overlay_export_commands_errors.js';
import type { GmailCommandArgs, GmailCommandResult } from './order_pdf_overlay_export_commands_types.js';

export async function exportOrderPdfViaGmailWithDeps(args: GmailCommandArgs): Promise<GmailCommandResult> {
  const { draft, gmailBusy, gmailAction, kind } = args;
  if (!draft) return { ok: false, kind, reason: 'not-ready' };
  if (gmailBusy) return { ok: false, kind, reason: 'busy' };

  try {
    const result = await gmailAction(draft);
    return {
      ok: true,
      kind,
      gmailOpened: !!result.opened,
      downloadStarted: typeof result.downloaded === 'boolean' ? result.downloaded : undefined,
    };
  } catch (error) {
    return buildGmailError(kind, error);
  }
}
