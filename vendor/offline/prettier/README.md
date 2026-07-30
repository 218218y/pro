# Prettier offline archive

Download the lockfile-pinned archive and save it here without extracting it:

```text
prettier-3.9.6.tgz
```

Then run:

```bash
python tools/verify_offline_repair_vendor.py --prettier-only
python tools/bootstrap_offline_prettier.py
python tools/selftest_offline_prettier.py
```

The expected URL and SHA-512 integrity are stored in `../manifest.json` and cross-checked against
`package-lock.json`.
