# Toolchain Version Policy

<!-- Tool-owned report target. Regenerate with: npm run toolchain:version-policy:report -->

Most core toolchain manifests use bounded compatibility ranges, while `package-lock.json` still records one exact resolved version for reproducible installs. TypeScript and `oxlint-tsgolint` remain deliberately exact because the offline repair vendor and declaration snapshots are version-coupled. The `oxlint-tsgolint` revision is lock-derived rather than hard-coded, but it is accepted only when its encoded TypeScript version still matches the pinned compiler. The active `oxc-parser` uses a narrow 0.x patch-line window derived from its package manifest; the offline vendor synchronizer adopts that same window and exact lockfile graph. This permits routine Oxc minor refreshes without leaving stale hard-coded policy behind, while compatibility is still enforced by the AST adapter and offline vendor contracts. `@types/node` follows the sole supported Node 24 runtime. The exact runtime pin is also the minimum accepted patch level; engines, CI and the offline Node archive must advance together. Declaration caret ranges may advance within the reviewed Node 24 window; the resolved lock version must satisfy the declared minimum. Runtime-boundary tests derive their cases from the pin so routine patch upgrades do not require rewriting test expectations.

## Bounded toolchain ranges

| Package           | Approved manifest range | package.json | package-lock root | resolved lock package | Allowed resolved window | Role                                                                              | Update policy                                                                                                                                                                                                                |
| ----------------- | ----------------------- | ------------ | ----------------- | --------------------- | ----------------------- | --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `typescript`      | `7.0.2`                 | `7.0.2`      | `7.0.2`           | `7.0.2`               | `=7.0.2`                | Type correctness gate and TS7 compiler lane.                                      | Keep the compiler exact because the offline repair vendor and declaration snapshots are built against this version.                                                                                                          |
| `@types/node`     | `^24.19.2`              | `^24.19.2`   | `^24.19.2`        | `24.19.2`             | `>=24.19.2 <25.0.0`     | Node tool/test type surface aligned to the supported Node 24 runtime.             | Allow Node 24 declaration updates; changing the runtime major requires an explicit policy review.                                                                                                                            |
| `eslint`          | `^10.8.0`               | `^10.8.0`    | `^10.8.0`         | `10.14.0`             | `>=10.8.0 <11.0.0`      | Strict JS/tools/tests/config lint gate.                                           | Allow ESLint 10 patch/minor releases; major upgrades require a lint policy review.                                                                                                                                           |
| `oxlint`          | `^1.79.0`               | `^1.79.0`    | `^1.79.0`         | `1.93.0`              | `>=1.75.0 <2.0.0`       | Blocking TS/TSX syntax lint gate.                                                 | Allow Oxlint 1.x patch/minor releases while the syntax and type-aware lanes remain at zero diagnostics.                                                                                                                      |
| `oxlint-tsgolint` | `7.0.2006`              | `7.0.2006`   | `7.0.2006`        | `7.0.2006`            | `=7.0.2006`             | Blocking type-aware lint lane.                                                    | Keep the manifest exact. The approved revision follows the resolved lockfile only when its version encoding still matches the pinned TypeScript compiler.                                                                    |
| `oxc-parser`      | `^0.158.0`              | `^0.158.0`   | `^0.158.0`        | `0.158.0`             | `>=0.158.0 <0.159.0`    | Internal AST adapter parser used by production contracts and code-analysis tools. | Allow the active Oxc 0.x patch line declared by package.json. Moving to the next Oxc minor updates the reviewed patch window during dependency synchronization, then the AST adapter and offline vendor contracts must pass. |

## Removed packages that must stay absent

- TS ESLint parser package
- TS ESLint plugin package
- TypeScript 6 compatibility package

## Dependency refresh workflow

- `npm update` may advance direct and transitive packages only inside the declared manifest ranges.
- The repository `deps:update:safe` and `deps:update:recommended` scripts regenerate this report after a successful lockfile refresh.
- The exact resolved versions remain committed in `package-lock.json`; CI uses `npm ci` and therefore remains reproducible.
- A dependency refresh must run the toolchain policy, lint, typecheck, build, and relevant runtime/contract tests.
- Major releases and versions outside the documented windows still require an explicit compatibility review.
- `oxlint-tsgolint` must encode the resolved TypeScript major, minor, and patch plus its three-digit tsgolint revision.
- Update the active parser with `npm run deps:update:oxc`; the command advances the Oxc manifest range, refreshes the exact offline Oxc lock graph, regenerates policy docs, and runs focused AST contracts.
- `vendor:offline:packages:refresh` refreshes the general npm offline vendor and the Oxc AST vendor together; CI check mode remains non-mutating and strict.

## Current status

Ready: all toolchain manifest ranges are approved, resolved lock versions are inside their compatibility windows, the offline Oxc compatibility bridge matches the active parser window, `@types/node` matches the supported Node major, `oxlint-tsgolint` is aligned with TypeScript, and removed TS ESLint packages are absent.
