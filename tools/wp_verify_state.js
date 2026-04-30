// Verify args/result policy.

export function parseVerifyArgs(argv = []) {
  const args = Array.isArray(argv) ? argv : [];
  return {
    noBuild: args.includes('--no-build'),
    skipBundle:
      args.includes('--ci') ||
      args.includes('--no-bundle') ||
      args.includes('--no-bundles') ||
      args.includes('--skip-bundle'),
    gate: args.includes('--gate') || args.includes('--strict'),
    softFormat:
      args.includes('--soft-format') || args.includes('--format-warn') || args.includes('--warn-on-format'),
  };
}

export function classifyFormatCheckResult(fmt, opts = {}) {
  const gate = opts && opts.gate === true;
  const softFormat = opts && opts.softFormat === true;
  if (!fmt || typeof fmt !== 'object') {
    return {
      ok: false,
      fatal: true,
      hasFormatWarn: false,
      message: '\n❌ Verify failed at: npm run format:check',
    };
  }

  if (fmt.error) {
    return {
      ok: false,
      fatal: true,
      hasFormatWarn: false,
      message: '\n❌ Verify failed to start: npm run format:check',
      cause: fmt.error,
      exitCode: 1,
    };
  }

  if (fmt.ok) {
    return {
      ok: true,
      fatal: false,
      hasFormatWarn: false,
      message: '',
      exitCode: 0,
    };
  }

  const out = `${fmt.stdout || ''}${fmt.stderr || ''}`;
  const isFormattingDiff =
    out.includes('Code style issues found') || out.includes('Run Prettier with --write');
  if (isFormattingDiff) {
    if (gate && !softFormat) {
      return {
        ok: false,
        fatal: true,
        hasFormatWarn: false,
        message: '\n❌ Prettier check failed in gate mode (formatting differences found).',
        exitCode: typeof fmt.code === 'number' ? fmt.code : 1,
      };
    }
    return {
      ok: true,
      fatal: false,
      hasFormatWarn: true,
      message: softFormat
        ? '\n⚠️  Prettier check: formatting differences found (warning only by --soft-format).'
        : '\n⚠️  Prettier check: formatting differences found (warning only).',
      exitCode: 0,
    };
  }

  return {
    ok: false,
    fatal: true,
    hasFormatWarn: false,
    message: '\n❌ Verify failed at: npm run format:check',
    exitCode: typeof fmt.code === 'number' ? fmt.code : 1,
  };
}

export function createVerifySuccessMessage({ gate = false, hasFormatWarn = false } = {}) {
  if (hasFormatWarn) {
    return `\n✅ WardrobePro verify: passed${gate ? ' (gate mode)' : ''} (with formatting warnings).\n`;
  }
  return `\n✅ WardrobePro verify: all checks passed${gate ? ' (gate mode)' : ''}.\n`;
}
