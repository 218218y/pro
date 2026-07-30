# Offline esbuild archives

For ChatGPT/Linux x64, download these exact lockfile-pinned archives and keep their original filenames:

```text
vendor/offline/esbuild/esbuild-0.28.1.tgz
vendor/offline/esbuild/linux-x64-0.28.1.tgz
```

Do not extract or rename them. Verify and install with:

```bash
python tools/verify_offline_repair_vendor.py --esbuild-only
python tools/bootstrap_offline_esbuild.py
python tools/selftest_offline_esbuild.py
```

The common `esbuild` package provides the JavaScript API used by runtime-test loaders. The matching
`@esbuild/<platform>` archive provides the native executable. Both exact `0.28.1` archives are required.
