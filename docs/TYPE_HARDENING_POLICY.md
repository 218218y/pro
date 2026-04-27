# Type Hardening Policy

The production TypeScript surface should not use `as any` to bypass ownership or contract problems.

## Rules

- `as any` is forbidden under `esm/` and `types/`.
- Use concrete shared types at call boundaries.
- Use `unknown` plus explicit narrowing at true external boundaries.
- Do not add wrappers whose only job is to hide a type mismatch.

## Current improvement

`createCloudSyncLifecyclePullAllNow` now accepts `CloudSyncRuntimeStatus` directly and passes it to `hasCloudSyncLifecycleRecentPull` without an unsafe cast.

## Verification

Run:

```bash
npm run check:type-hardening
```
