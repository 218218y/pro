# Offline TSX-test runtime packages

This directory holds the lockfile-derived runtime dependency closure used by repository `.ts` and `.tsx`
tests. TSX and esbuild alone can transform TypeScript, but tests that import project UI or service modules also
need packages such as React, React DOM, Three.js, Zustand, PDF libraries, Supabase, and their transitive
runtime dependencies.

The profile is generated from `package-lock.json`; do not edit package versions, URLs, integrity values, or the
package list by hand. The profile starts from every production dependency, follows normal, optional, and
required peer dependencies, and keeps only packages compatible with Linux x64 glibc.
Windows, macOS, ARM, and musl native packages are excluded.

Synchronize or validate the download plan without requiring archives:

```bash
npm run vendor:offline:tsx-tests:plan
npm run vendor:offline:tsx-tests:check-plan
```

Print only archives that are currently missing or invalid:

```bash
npm run vendor:offline:tsx-tests:downloads
```

Automatic download and verification:

```bash
npm run vendor:offline:tsx-tests:refresh
npm run vendor:offline:tsx-tests:check
```

For a manual/no-network flow, download every printed URL to its exact destination path and then run:

```bash
npm run vendor:offline:tsx-tests:adopt
npm run vendor:offline:tsx-tests:check
```

The synchronizer verifies SHA-512 integrity and embedded package name/version before updating the manifest.
The workspace definition also records a SHA-256 fingerprint of `package-lock.json`, so any lockfile change
invalidates a stale plan before tests run. TSX and esbuild remain in their existing focused directories rather
than being duplicated here. Superseded runtime archives are removed only after a complete replacement profile
has been validated.
