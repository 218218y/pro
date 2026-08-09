# Toolchain Version Policy

<!-- Tool-owned report target. Regenerate with: npm run toolchain:version-policy:report -->

Most core toolchain manifests use bounded compatibility ranges, while `package-lock.json` still records one exact resolved version for reproducible installs. TypeScript and `oxlint-tsgolint` remain deliberately exact because the offline repair vendor and declaration snapshots are version-coupled. The active `oxc-parser` uses a narrow reviewed patch window; its signed offline fallback is validated independently against the same AST adapter contract. This permits reviewed refreshes where safe without weakening major-version or compatibility boundaries. `@types/node` remains on the lowest supported Node runtime major so typechecking cannot silently adopt Node 24-only APIs while the Node 22 compatibility lane exists.

## Bounded toolchain ranges

| Package           | Approved manifest range | package.json         | package-lock root    | resolved lock package | Allowed resolved window | Role                                                                              | Update policy                                                                                                                                            |
| ----------------- | ----------------------- | -------------------- | -------------------- | --------------------- | ----------------------- | --------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `typescript`      | `7.0.2`                 | `7.0.2`              | `7.0.2`              | `7.0.2`               | `=7.0.2`                | Type correctness gate and TS7 compiler lane.                                      | Keep the compiler exact because the offline repair vendor and declaration snapshots are built against this version.                                      |
| `@types/node`     | `^22.20.1`              | `^22.20.1`           | `^22.20.1`           | `22.20.1`             | `>=22.20.1 <23.0.0`     | Node tool/test type surface aligned to the lowest supported Node runtime major.   | Allow newer Node 22 declaration releases while Node 22 remains the compatibility floor. Node 24 remains the primary runtime.                             |
| `eslint`          | `^10.8.0`               | `^10.8.0`            | `^10.8.0`            | `10.8.1`              | `>=10.8.0 <11.0.0`      | Strict JS/tools/tests/config lint gate.                                           | Allow ESLint 10 patch/minor releases; major upgrades require a lint policy review.                                                                       |
| `oxlint`          | `^1.75.0`               | `^1.75.0`            | `^1.75.0`            | `1.77.0`              | `>=1.75.0 <2.0.0`       | Blocking TS/TSX syntax lint gate.                                                 | Allow Oxlint 1.x patch/minor releases while the syntax and type-aware lanes remain at zero diagnostics.                                                  |
| `oxlint-tsgolint` | `7.0.2001`              | `7.0.2001`           | `7.0.2001`           | `7.0.2001`            | `=7.0.2001`             | Blocking type-aware lint lane.                                                    | Keep this exact because it is encoded for the pinned TypeScript compiler; refresh both together.                                                         |
| `oxc-parser`      | `>=0.143.0 <0.144.0`    | `>=0.143.0 <0.144.0` | `>=0.143.0 <0.144.0` | `0.143.0`             | `>=0.143.0 <0.144.0`    | Internal AST adapter parser used by production contracts and code-analysis tools. | Allow reviewed 0.143.x patch releases. The separately signed offline fallback may remain on 0.142.x while both lines pass the same AST adapter contract. |

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
- Update the active parser with `npm run deps:update:oxc`; the command refreshes the lockfile, generated policy report, and focused AST contracts.
- The signed offline AST fallback may remain on an older version only while both versions stay inside `vendor/offline/manifest.json`'s reviewed compatibility window and pass the same adapter contract.

## Current status

Ready: all toolchain manifest ranges are approved, resolved lock versions are inside their compatibility windows, `@types/node` matches the lowest supported Node major, `oxlint-tsgolint` is aligned with TypeScript, and removed TS ESLint packages are absent.
