# HTML Sink Policy

HTML sinks are allowed only inside UI/runtime owners that sanitize, escape, or intentionally mount trusted UI fragments.

Rules:

1. No raw `innerHTML`, `outerHTML`, or `insertAdjacentHTML` writes from builder/services/kernel/platform code.
2. Rich text owners must centralize sanitization through the existing UI sanitizer/runtime helpers.
3. New sinks must be added deliberately to the audit allowlist with a reason, not as a casual inline assignment.
4. Tests and generated distribution artifacts are excluded from the policy audit.

Run:

```bash
npm run check:html-sinks
```
