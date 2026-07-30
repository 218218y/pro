# Offline repair core — changed files

The patch contains only source, configuration and documentation. It intentionally contains no downloaded
Node or npm archives.

```text
.gitignore
AGENTS.md
README.md
OFFLINE_REPAIR_CORE_CHANGED_FILES.md
docs/OFFLINE_REPAIR_CORE.md
tools/bootstrap_offline_repair_core.py
tools/bootstrap_offline_repair_core.bat
tools/bootstrap_offline_repair_core.sh
tools/run_offline_node24.py
tools/selftest_offline_repair_core.py
tools/verify_offline_repair_vendor.py
vendor/offline/README.md
vendor/offline/manifest.json
```

After applying the patch, manually add the platform archives listed in `vendor/offline/manifest.json`.
For ChatGPT/Linux x64, four archives are required: one Node archive, two common Oxc archives, and the
Linux x64 GNU Oxc binding.
