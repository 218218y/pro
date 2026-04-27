# Builder Context Policy

Builder code should stay pure relative to browser globals and legacy root probing.

The policy check is intentionally focused on high-risk regressions:

- no `window.App` / `globalThis.App` probing in builder source;
- no `window.THREE` / `globalThis.THREE` fallback in builder source;
- no direct `document` / `localStorage` access in builder source;
- no direct `setTimeout` / `setInterval` timers in builder source.

This keeps the builder compatible with store-driven runtime ownership and makes future performance work easier: fewer hidden dependencies, fewer surprise rebuild paths.

Run:

```bash
npm run check:builder-context-policy
```
