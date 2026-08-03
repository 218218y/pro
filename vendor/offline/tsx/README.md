# Offline TSX engine archive

`package-lock.json` owns the required TSX version, official npm URL, integrity, and esbuild dependency range.
Do not edit `vendor/offline/manifest.json` or this file when TSX advances.

Print the exact URL and destination path:

```bash
npm run vendor:offline:tsx:downloads
```

Automatic download or adoption of an already present valid archive:

```bash
npm run vendor:offline:tsx:refresh
npm run vendor:offline:tsx:check
```

For a manual/no-network update, download the untouched `.tgz` to the printed path and run:

```bash
npm run vendor:offline:tsx:adopt
```

The synchronizer verifies SHA-512 integrity and embedded package metadata, updates the manifest atomically,
checks the lockfile-declared esbuild range, and removes superseded TSX archives after success.

This directory contains only the TSX engine. Repository UI and service tests also require the generated
Linux x64 glibc runtime closure documented in `vendor/offline/runtime/README.md`:

```bash
npm run vendor:offline:tsx-tests:plan
npm run vendor:offline:tsx-tests:downloads
npm run vendor:offline:tsx-tests:refresh
```

`python tools/bootstrap_offline_tsx.py --engine-only` validates just TSX and esbuild. The default bootstrap,
offline test runner, and self-test require the complete `tsx-tests` runtime profile.
