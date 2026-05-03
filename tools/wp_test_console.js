const NODE_TEST_SUMMARY_FIELDS = new Set([
  'tests',
  'suites',
  'pass',
  'fail',
  'cancelled',
  'skipped',
  'todo',
  'duration_ms',
]);

const ANSI_RE = /\u001b\[[0-9;]*m/g;

function stripAnsi(value) {
  return String(value ?? '').replace(ANSI_RE, '');
}

function isColorEnabled(stream = process.stdout) {
  return Boolean(stream?.isTTY) && process.env.NO_COLOR == null && process.env.FORCE_COLOR !== '0';
}

function colorize(value, code, stream) {
  const text = String(value ?? '');
  if (!isColorEnabled(stream)) return text;
  return `\u001b[${code}m${text}\u001b[0m`;
}

export function formatStatusLine(kind, text, stream = process.stdout) {
  const isFail = kind === 'fail';
  const icon = isFail ? '✖' : '✔';
  const code = isFail ? 31 : 32;
  return `${colorize(icon, code, stream)} ${text}`;
}

export function isNodeTestSummaryDiagnosticLine(line) {
  const clean = stripAnsi(line).trim();
  if (!clean) return false;

  const specMatch = clean.match(/^ℹ\s+([a-z_]+)\b/i);
  if (specMatch) return NODE_TEST_SUMMARY_FIELDS.has(specMatch[1].toLowerCase());

  const tapMatch = clean.match(/^#\s+([a-z_]+)\b/i);
  if (tapMatch) return NODE_TEST_SUMMARY_FIELDS.has(tapMatch[1].toLowerCase());

  return false;
}

export function formatNodeTestOutputForConsole(output) {
  const text = String(output ?? '');
  if (!text) return '';

  const hasTrailingNewline = /\r?\n$/.test(text);
  const lines = text.split(/\r?\n/);
  if (hasTrailingNewline) lines.pop();

  const kept = lines.filter(line => !isNodeTestSummaryDiagnosticLine(line));
  if (!kept.length) return '';
  return `${kept.join('\n')}${hasTrailingNewline ? '\n' : ''}`;
}

export function writeNodeTestOutput(stream, output) {
  const formatted = formatNodeTestOutputForConsole(output);
  if (formatted) stream.write(formatted);
}
