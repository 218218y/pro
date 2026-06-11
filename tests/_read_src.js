import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

/**
 * Read the first existing file from a list of relative path candidates.
 *
 * This keeps guard tests stable across refactors like container/view splits,
 * where a stable facade file stays the same, but the implementation moves.
 */
export function readFirstExisting(relCandidates, baseUrl) {
  for (const rel of relCandidates) {
    const url = new URL(rel, baseUrl);
    const path = fileURLToPath(url);
    if (fs.existsSync(path)) return fs.readFileSync(path, 'utf8');
  }

  throw new Error(`None of the candidate paths exist:\n${relCandidates.join('\n')}`);
}
