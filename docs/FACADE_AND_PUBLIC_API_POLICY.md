# Facade and Public API Policy

This document updates the refactor plan after the Stage 43–69 ownership-split run.

## Decision

The current pattern of splitting hot modules into a tiny public facade plus focused owner modules is generally the right professional direction for this repository.

Do not remove facades globally. A facade is not a dirty word; it is a boundary. The problem is not the facade. The problem is a facade that starts acting like a junk drawer with a nicer label.

The next phase should keep stable public facades where they protect imports and product behavior, while adding clearer rules for when a facade is allowed, when a direct owner import is better, and when a public API should be intentionally redesigned.

## Line-count rule

Do not continue splitting only because a file is over 200 or 300 lines.

Line count is a smell, not a verdict. In this codebase, a cohesive 220-line owner with one responsibility is usually healthier than five 40-line files that force the reader to play import ping-pong. Split by responsibility, volatility, testability, and public boundary — not by a ruler.

Use these practical thresholds:

| File shape                                          | Default decision                                                               |
| --------------------------------------------------- | ------------------------------------------------------------------------------ |
| Under 150 lines and cohesive                        | Do not split unless it has clear mixed responsibilities or risky side effects. |
| 150–300 lines and cohesive                          | Usually keep. Add tests/guards before more fragmentation.                      |
| 300–500 lines with multiple reasons to change       | Split only along real ownership seams.                                         |
| Over 500 lines or mixes UI/state/effects/I/O/policy | Strong candidate for split, but still require behavior coverage.               |
| Any size with public consumers                      | Protect the public import path unless redesigning the API deliberately.        |

A split is justified when at least one of these is true:

- the file has multiple independent reasons to change;
- tests need to target a smaller owner to cover behavior cleanly;
- public callers should not know about internal state/material/geometry/controller layout;
- a runtime owner mixes side effects with pure policy or data normalization;
- lifecycle cleanup, timers, DOM access, storage access, or error reporting are mixed with unrelated logic;
- the current module is hard to review because unrelated changes appear in one diff.

A split is probably not justified when:

- the only reason is “the file is 210 lines”;
- the new files are named mechanically but still share one tangled responsibility;
- every function is still imported by every other new file;
- the facade is private and has only one caller;
- the guard only checks text shape while no runtime/user behavior is protected.

## Module categories

Every split module should fit one of these categories.

| Category             | Purpose                                                                                                  | Allowed imports                              | Must not contain                                                          |
| -------------------- | -------------------------------------------------------------------------------------------------------- | -------------------------------------------- | ------------------------------------------------------------------------- |
| Stable public facade | External or cross-family entry point, stable import path, service/hook/factory surface                   | Public consumers and sibling owners          | Business logic, mutable hidden state, DOM/storage/timers, fallback chains |
| Internal owner       | Owns one narrow responsibility such as state, geometry, material policy, lifecycle, or command execution | Facade and sibling owners in the same family | Public cross-family imports unless explicitly promoted                    |
| Internal shared seam | Shared contract/types/helper used by sibling owners                                                      | Same implementation family, sometimes tests  | Product behavior orchestration                                            |
| Adapter boundary     | Browser, DOM, storage, timer, or vendor integration boundary                                             | Explicit adapter callers                     | Domain logic or hidden fallback chains                                    |
| Compatibility shim   | Temporary legacy import path during migration                                                            | Existing legacy consumers only               | New callers, new behavior, or unbounded lifetime                          |

## When to keep a facade

Keep a facade when it is a real boundary:

- many files already import the path;
- the file is the public service/hook/factory entry point;
- it shields public consumers from internal owner layout;
- it lets internals split without import churn;
- it represents a stable product contract, not just a file location.

A correct tiny facade may do only one of these:

- re-export public functions/types from the canonical owner;
- construct a small public factory/hook from internal owners;
- normalize a narrow public argument into an internal owner contract;
- preserve a stable import path while implementation ownership changes behind it.

## When not to add a facade

Do not add a facade when:

- there is only one internal caller and no stable public seam;
- the facade just forwards to one private function and adds no boundary value;
- the internal owner is already the correct public API;
- the facade exists only to satisfy a line-count target;
- the facade hides a bad module name that should simply be renamed through a planned migration;
- the facade becomes a dumping ground for old fallback code.

## When to redesign external API

Changing public API can be professional, but only when the existing API is genuinely wrong.

Good reasons:

- the API exposes implementation details that block clean ownership;
- the API encourages runtime fallback or shape guessing;
- callers pass broad mutable bags where a typed command/context is required;
- the API causes duplicated behavior across families;
- the API creates unsafe import direction or circular dependency risk.

Bad reasons:

- the implementation file moved;
- the new layout looks prettier;
- a facade feels philosophically annoying;
- a regex guard is easier if old imports disappear.

Safe API redesign sequence:

1. Inventory current consumers.
2. Add the canonical API with clear types and behavior tests.
3. Move internal consumers first.
4. Add an import-boundary guard so new code uses the canonical API.
5. Keep the old facade only as a deprecated compatibility shim when needed.
6. Add removal criteria and a target stage.
7. Remove the shim only when the import graph proves it is unused.

Do not break external API just because a new file layout looks cleaner. That is a workshop accident wearing a tie.

## Guard test policy

Ownership guard tests are allowed to assert file shape:

- facade stays below a small line budget;
- facade imports only its approved owner/factory;
- private owner modules are not imported by unrelated families;
- no `export default` returns;
- no DOM/storage/timer access appears in pure owners.

But file-shape guards are not enough. Risky splits also need behavior coverage:

- public factory/hook/service still returns the same stable surface;
- key lifecycle paths still call cleanup/settle/report handlers;
- old public facade and new owners do not diverge;
- user-visible behavior stays covered by runtime/browser tests where possible.

## Stage 70 proposal

Stage 69 already exists in this repository as the render-interior-sketch external-drawers ownership split. Therefore the facade/API closeout must be Stage 70 or a documentation-only pre-stage, not another Stage 69.

### Stage 70 — Public facade/API policy closeout

Scope:

- Add this policy to the repo.
- Update `docs/QUALITY_GUARDRAILS.md` with facade/API rules.
- Add an import-boundary audit plan for private owner modules.
- Define the next code PR as guardrail enhancement and product-risk balancing, not another blind split.

Definition of done for the future code PR:

- `verify:refactor-modernization` remains the primary entry point.
- `check:refactor-guardrails` includes public/private import boundary checks.
- Recent facade splits have behavior/runtime guards in addition to regex ownership guards.
- Deprecated facades, if any, have removal criteria and no new-import allowance.
- The stage catalog records explicit metadata for high-number stages instead of only generic `Stage N` labels.

## Practical standard

The clean professional standard is:

- Keep public API stable by default.
- Split implementation ownership behind that API.
- Break API only when the API itself is wrong, not merely because the implementation moved.
- Stop splitting when modules are cohesive, reviewable, and behavior-covered.
- Use facades deliberately, not ceremonially.
- Guard behavior, not just file shape.
