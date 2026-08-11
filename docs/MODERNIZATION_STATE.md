# Modernization current state

Generated at: 2026-08-11T14:47:03.596Z

> Generated source of truth for mutable modernization metrics. Living architecture documents should describe policy and ownership, not copy these counts.

## Gate status

- Overall: **PASS**
- Silent-catch policy: **PASS**
- Compatibility audit: **PASS**
- Private-owner boundary: **PASS**
- Test portfolio: **PASS**

## Error observability

- Statement-free catches: **518**
- Bare catches: **0**
- Vague catch comments: **0**
- Files containing statement-free catches: **281**

## Compatibility debt

- Categorized occurrences: **546**
- Files with categorized occurrences: **212**
- Growth-ratcheted compatibility occurrences: **25** across **16** files
- Project migration: **1**
- External API compatibility: **4**
- Explicit compatibility boundaries: **20**
- Legacy runtime risk: **0**
- Unknown classifications: **0**

## Ownership topology

- Registered topology families: **41**
- Private owners: **243**
- Guarded private-owner import sites: **499**
- Identity facades: **143**
- Explicitly inventoried identity facades: **122**

## Test portfolio

- Classified test files: **1244**
- Unit/runtime files: **1235**
- Playwright E2E files: **9**
- Canonical contracts: **21**
- Historical architecture proof files: **0**
- Portfolio failures: **0**

## Policy

- This report is generated from the canonical audits; do not edit its counts by hand.
- Reductions in compatibility or statement-free catch debt must ratchet their owning policy in the same change so removed debt cannot return.
- A new modernization lane is justified only by a measured regression, duplicated ownership, a live compatibility seam, or an actively changed family with proven source-shape friction.
