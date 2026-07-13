import { expect, test } from '@playwright/test';

test.describe('HTML sanitizer browser security', () => {
  test('sanitizes descendants moved out of disallowed wrappers and drops foreign namespaces', async ({
    page,
  }) => {
    await page.goto('/index_pro.html');

    const result = await page.evaluate(async () => {
      const { sanitizeHtmlByPolicy } = await import('/esm/native/ui/html_sanitize_runtime.ts');
      const nested = sanitizeHtmlByPolicy(
        document,
        '<section><img src="x" onerror="globalThis.__xss = 1"><script>globalThis.__xss = 3</script><a href="javascript:alert(1)" onclick="globalThis.__xss = 2">bad</a><a href="https://example.com" target="_blank">safe</a></section>',
        'overlay-help'
      );
      const foreign = sanitizeHtmlByPolicy(
        document,
        '<svg><a href="javascript:alert(1)"><text>svg</text></a></svg><math><mtext>math</mtext></math><p>kept</p>',
        'overlay-help'
      );

      return {
        nested,
        foreign,
        executed: Reflect.get(globalThis, '__xss'),
      };
    });

    expect(result.nested).toBe(
      '<a>bad</a><a href="https://example.com" target="_blank" rel="noopener noreferrer">safe</a>'
    );
    expect(result.foreign).toBe('<p>kept</p>');
    expect(result.executed).toBeUndefined();
  });
});
