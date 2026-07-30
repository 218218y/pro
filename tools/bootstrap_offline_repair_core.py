#!/usr/bin/env python3
"""Install the repository's focused offline Node, AST and optional Prettier toolchain.

The script never invokes npm and never runs package lifecycle scripts. It only
uses files explicitly listed in vendor/offline/manifest.json and validates them
against .node-version, package-lock.json and pinned checksums before extraction.
"""

from __future__ import annotations

import argparse
import base64
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import platform
import shutil
import subprocess
import sys
import tarfile
import tempfile
import zipfile

ROOT = Path(__file__).resolve().parents[1]
MANIFEST_PATH = ROOT / "vendor" / "offline" / "manifest.json"
LOCK_PATH = ROOT / "package-lock.json"
NODE_VERSION_PATH = ROOT / ".node-version"


class OfflineCoreError(RuntimeError):
    pass


def _read_json(path: Path) -> dict:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError as exc:
        raise OfflineCoreError(f"Required file is missing: {_display_path(path)}") from exc
    except json.JSONDecodeError as exc:
        raise OfflineCoreError(f"Invalid JSON in {_display_path(path)}: {exc}") from exc


def load_manifest() -> dict:
    manifest = _read_json(MANIFEST_PATH)
    if manifest.get("schemaVersion") != 1:
        raise OfflineCoreError("Unsupported vendor/offline/manifest.json schemaVersion")
    return manifest


def platform_key() -> str:
    machine = platform.machine().lower()
    if machine in {"x86_64", "amd64"}:
        arch = "x64"
    elif machine in {"aarch64", "arm64"}:
        arch = "arm64"
    else:
        raise OfflineCoreError(f"Unsupported CPU architecture: {platform.machine()}")

    if sys.platform.startswith("linux"):
        if _is_musl_linux():
            raise OfflineCoreError(
                "This offline bundle supports glibc Linux only; a musl-specific Oxc binding is required."
            )
        return f"linux-{arch}"
    if os.name == "nt":
        return f"win32-{arch}"
    raise OfflineCoreError(f"Unsupported operating system: {sys.platform}")


def _is_musl_linux() -> bool:
    if not sys.platform.startswith("linux"):
        return False
    libc_name, _ = platform.libc_ver()
    if libc_name:
        return libc_name.lower() == "musl"
    ldd = shutil.which("ldd")
    if not ldd:
        return False
    probe = subprocess.run([ldd, "--version"], text=True, capture_output=True, check=False)
    return "musl" in (probe.stdout + probe.stderr).lower()


def _safe_relative_posix(value: str, label: str) -> PurePosixPath:
    path = PurePosixPath(value)
    if path.is_absolute() or not path.parts or any(part in {"", ".", ".."} for part in path.parts):
        raise OfflineCoreError(f"Unsafe {label}: {value!r}")
    return path


def _root_path(relative: str, label: str) -> Path:
    posix = _safe_relative_posix(relative, label)
    candidate = ROOT.joinpath(*posix.parts)
    resolved_parent = candidate.parent.resolve()
    root_resolved = ROOT.resolve()
    if resolved_parent != root_resolved and root_resolved not in resolved_parent.parents:
        raise OfflineCoreError(f"{label} escapes repository root: {relative!r}")
    return candidate


def _display_path(path: Path) -> str:
    try:
        return str(path.relative_to(ROOT))
    except ValueError:
        return str(path)


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _sha512_integrity(path: Path) -> str:
    digest = hashlib.sha512()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return "sha512-" + base64.b64encode(digest.digest()).decode("ascii")


def _require_file(path: Path, url: str) -> None:
    if not path.is_file():
        rel = _display_path(path)
        raise OfflineCoreError(
            f"Offline package is missing: {rel}\nDownload it from:\n{url}\n"
            f"and save it at that exact repository path."
        )


def _validate_lock_entry(packages: dict, entry: dict, expected_version: str, label: str) -> None:
    lock_path = entry["lockPath"]
    lock_entry = packages.get(lock_path)
    if not isinstance(lock_entry, dict):
        raise OfflineCoreError(f"{label} package is absent from package-lock.json: {lock_path}")
    if lock_entry.get("resolved") != entry["url"]:
        raise OfflineCoreError(f"Resolved URL mismatch for {lock_path}")
    if lock_entry.get("integrity") != entry["integrity"]:
        raise OfflineCoreError(f"Integrity mismatch for {lock_path}")
    if str(lock_entry.get("version")) != str(expected_version):
        raise OfflineCoreError(f"Version mismatch for {lock_path}")


def validate_manifest_against_project(manifest: dict) -> None:
    pinned_node = NODE_VERSION_PATH.read_text(encoding="utf-8").strip()
    manifest_node = str(manifest["node"]["version"])
    if pinned_node != manifest_node:
        raise OfflineCoreError(
            f"Node manifest version {manifest_node} does not match .node-version {pinned_node}"
        )

    lock = _read_json(LOCK_PATH)
    packages = lock.get("packages")
    if not isinstance(packages, dict):
        raise OfflineCoreError("package-lock.json has no packages map")

    ast_entries = list(manifest["ast"]["packages"]) + list(manifest["ast"]["bindings"].values())
    for entry in ast_entries:
        _validate_lock_entry(packages, entry, str(manifest["ast"]["version"]), "AST")

    prettier = manifest.get("prettier")
    if not isinstance(prettier, dict) or not isinstance(prettier.get("package"), dict):
        raise OfflineCoreError("vendor/offline/manifest.json has no Prettier package definition")
    _validate_lock_entry(packages, prettier["package"], str(prettier["version"]), "Prettier")


def selected_entries(manifest: dict, key: str) -> tuple[dict, list[dict]]:
    node_entry = manifest["node"]["platforms"].get(key)
    binding_entry = manifest["ast"]["bindings"].get(key)
    if node_entry is None or binding_entry is None:
        raise OfflineCoreError(f"No offline repair-core definition for platform {key}")
    return node_entry, [*manifest["ast"]["packages"], binding_entry]


def prettier_entry(manifest: dict) -> dict:
    entry = manifest.get("prettier", {}).get("package")
    if not isinstance(entry, dict):
        raise OfflineCoreError("No offline Prettier package definition")
    return entry


def _verify_npm_archives(entries: list[dict], label: str) -> None:
    for entry in entries:
        archive = _root_path(entry["file"], f"{label} archive path")
        _require_file(archive, entry["url"])
        actual = _sha512_integrity(archive)
        if actual != entry["integrity"]:
            raise OfflineCoreError(
                f"SHA-512 integrity mismatch for {_display_path(archive)}\n"
                f"expected: {entry['integrity']}\nactual:   {actual}"
            )


def verify_vendor(
    manifest: dict,
    key: str,
    *,
    node: bool = True,
    ast: bool = True,
    prettier: bool = False,
) -> None:
    validate_manifest_against_project(manifest)
    node_entry, ast_entries = selected_entries(manifest, key)

    if node:
        archive = _root_path(node_entry["file"], "Node archive path")
        _require_file(archive, node_entry["url"])
        actual = _sha256(archive)
        if actual != node_entry["sha256"]:
            raise OfflineCoreError(
                f"SHA-256 mismatch for {_display_path(archive)}\n"
                f"expected: {node_entry['sha256']}\nactual:   {actual}"
            )

    if ast:
        _verify_npm_archives(ast_entries, "AST")

    if prettier:
        _verify_npm_archives([prettier_entry(manifest)], "Prettier")


def _extract_node_binary(archive: Path, member_name: str, destination: Path) -> None:
    expected = str(_safe_relative_posix(member_name, "Node archive member"))
    destination.parent.mkdir(parents=True, exist_ok=True)

    if archive.suffix == ".zip":
        with zipfile.ZipFile(archive) as bundle:
            try:
                info = bundle.getinfo(expected)
            except KeyError as exc:
                raise OfflineCoreError(f"Node archive does not contain {expected}") from exc
            if info.is_dir():
                raise OfflineCoreError(f"Node archive member is not a file: {expected}")
            with bundle.open(info) as source, destination.open("wb") as target:
                shutil.copyfileobj(source, target)
    else:
        try:
            with tarfile.open(archive, mode="r:*") as bundle:
                try:
                    member = bundle.getmember(expected)
                except KeyError as exc:
                    raise OfflineCoreError(f"Node archive does not contain {expected}") from exc
                if not member.isfile():
                    raise OfflineCoreError(f"Node archive member is not a regular file: {expected}")
                source = bundle.extractfile(member)
                if source is None:
                    raise OfflineCoreError(f"Cannot read Node archive member: {expected}")
                with source, destination.open("wb") as target:
                    shutil.copyfileobj(source, target)
        except tarfile.TarError as exc:
            raise OfflineCoreError(f"Invalid Node archive {_display_path(archive)}: {exc}") from exc

    if os.name != "nt":
        destination.chmod(0o755)


def install_node(manifest: dict, key: str, *, force: bool = False) -> Path:
    node_entry, _ = selected_entries(manifest, key)
    install_dir = _root_path(manifest["node"]["installDirectory"], "Node install directory")
    executable = install_dir.joinpath(*PurePosixPath(node_entry["installedExecutable"]).parts)
    expected_version = f"v{manifest['node']['version']}"

    if executable.is_file() and not force:
        probe = subprocess.run([str(executable), "--version"], text=True, capture_output=True, check=False)
        if probe.returncode == 0 and probe.stdout.strip() == expected_version:
            return executable

    archive = _root_path(node_entry["file"], "Node archive path")
    install_dir.parent.mkdir(parents=True, exist_ok=True)
    temp_dir = Path(tempfile.mkdtemp(prefix="node24-", dir=install_dir.parent))
    try:
        temp_executable = temp_dir.joinpath(*PurePosixPath(node_entry["installedExecutable"]).parts)
        _extract_node_binary(archive, node_entry["archiveMember"], temp_executable)
        probe = subprocess.run([str(temp_executable), "--version"], text=True, capture_output=True, check=False)
        if probe.returncode != 0 or probe.stdout.strip() != expected_version:
            detail = (probe.stderr or probe.stdout).strip()
            raise OfflineCoreError(
                f"Extracted Node runtime failed verification; expected {expected_version}, got "
                f"{probe.stdout.strip() or detail or 'no output'}"
            )
        if install_dir.exists():
            shutil.rmtree(install_dir)
        temp_dir.replace(install_dir)
    except Exception:
        shutil.rmtree(temp_dir, ignore_errors=True)
        raise
    return executable


def _extract_npm_tgz(archive: Path, destination: Path) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    temp_dir = Path(tempfile.mkdtemp(prefix=destination.name + "-", dir=destination.parent))
    try:
        with tarfile.open(archive, mode="r:gz") as bundle:
            members = bundle.getmembers()
            if not members:
                raise OfflineCoreError(f"Empty npm archive: {_display_path(archive)}")
            for member in members:
                path = PurePosixPath(member.name)
                if path.is_absolute() or not path.parts or path.parts[0] != "package":
                    raise OfflineCoreError(
                        f"Unexpected npm archive path in {_display_path(archive)}: {member.name!r}"
                    )
                relative = PurePosixPath(*path.parts[1:])
                if not relative.parts:
                    continue
                if any(part in {"", ".", ".."} for part in relative.parts):
                    raise OfflineCoreError(
                        f"Unsafe npm archive path in {_display_path(archive)}: {member.name!r}"
                    )
                target = temp_dir.joinpath(*relative.parts)
                if member.isdir():
                    target.mkdir(parents=True, exist_ok=True)
                    continue
                if not member.isfile():
                    raise OfflineCoreError(
                        f"Unsupported non-regular npm archive member: {member.name!r}"
                    )
                target.parent.mkdir(parents=True, exist_ok=True)
                source = bundle.extractfile(member)
                if source is None:
                    raise OfflineCoreError(f"Cannot read npm archive member: {member.name!r}")
                with source, target.open("wb") as output:
                    shutil.copyfileobj(source, output)
                target.chmod(member.mode & 0o777 or 0o644)

        package_json = temp_dir / "package.json"
        if not package_json.is_file():
            raise OfflineCoreError(f"npm archive has no package/package.json: {_display_path(archive)}")
        if destination.exists():
            shutil.rmtree(destination)
        temp_dir.replace(destination)
    except Exception:
        shutil.rmtree(temp_dir, ignore_errors=True)
        raise


def _installed_package_version(destination: Path) -> str | None:
    package_json = destination / "package.json"
    if not package_json.is_file():
        return None
    try:
        value = json.loads(package_json.read_text(encoding="utf-8")).get("version")
    except (OSError, json.JSONDecodeError):
        return None
    return str(value) if value is not None else None


def _install_npm_entry(entry: dict, expected_version: str, *, force: bool = False) -> Path:
    archive = _root_path(entry["file"], "npm archive path")
    destination = _root_path(entry["installPath"], "npm install path")
    if not force and _installed_package_version(destination) == expected_version:
        return destination
    _extract_npm_tgz(archive, destination)
    actual_version = _installed_package_version(destination)
    if actual_version != expected_version:
        raise OfflineCoreError(
            f"Extracted package version mismatch at {_display_path(destination)}; "
            f"expected {expected_version}, got {actual_version or 'missing'}"
        )
    return destination


def install_ast(manifest: dict, key: str, node_executable: Path, *, force: bool = False) -> None:
    _, entries = selected_entries(manifest, key)
    expected_version = str(manifest["ast"]["version"])
    for entry in entries:
        _install_npm_entry(entry, expected_version, force=force)

    probe_script = (
        "import fs from 'node:fs';"
        "import('oxc-parser').then(m=>{const r=m.parseSync('offline_probe.js','export const ok = 1;');"
        "if(!r||!r.program) throw new Error('missing AST program');"
        "const p=JSON.parse(fs.readFileSync('node_modules/oxc-parser/package.json','utf8'));"
        "console.log('oxc-parser '+p.version);"
        "}).catch(e=>{console.error(e);process.exit(1)})"
    )
    probe = subprocess.run(
        [str(node_executable), "--input-type=module", "--eval", probe_script],
        cwd=ROOT,
        text=True,
        capture_output=True,
        check=False,
    )
    if probe.returncode != 0:
        raise OfflineCoreError(
            "The offline AST packages were extracted but oxc-parser could not load:\n"
            + (probe.stderr or probe.stdout).strip()
        )


def install_prettier(manifest: dict, node_executable: Path, *, force: bool = False) -> Path:
    entry = prettier_entry(manifest)
    expected_version = str(manifest["prettier"]["version"])
    destination = _install_npm_entry(entry, expected_version, force=force)
    executable = destination.joinpath(
        *_safe_relative_posix(manifest["prettier"]["executable"], "Prettier executable").parts
    )
    if not executable.is_file():
        raise OfflineCoreError(f"Prettier executable is missing after extraction: {_display_path(executable)}")
    probe = subprocess.run(
        [str(node_executable), str(executable), "--version"],
        cwd=ROOT,
        text=True,
        capture_output=True,
        check=False,
    )
    actual = probe.stdout.strip()
    if probe.returncode != 0 or actual != expected_version:
        detail = (probe.stderr or probe.stdout).strip()
        raise OfflineCoreError(
            f"Offline Prettier failed verification; expected {expected_version}, got "
            f"{actual or detail or 'no output'}"
        )
    return executable


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    group = parser.add_mutually_exclusive_group()
    group.add_argument("--node-only", action="store_true", help="Install only the pinned Node runtime")
    group.add_argument("--ast-only", action="store_true", help="Install only AST packages (Node must exist)")
    parser.add_argument(
        "--with-prettier",
        action="store_true",
        help="Also install and verify the lockfile-pinned Prettier package",
    )
    parser.add_argument("--force", action="store_true", help="Re-extract even when matching installs exist")
    parser.add_argument("--print-node", action="store_true", help="Print only the installed Node executable path")
    args = parser.parse_args(argv)

    try:
        manifest = load_manifest()
        key = platform_key()
        want_node = not args.ast_only
        want_ast = not args.node_only
        verify_vendor(
            manifest,
            key,
            node=want_node,
            ast=want_ast,
            prettier=args.with_prettier,
        )

        node_entry, _ = selected_entries(manifest, key)
        install_dir = _root_path(manifest["node"]["installDirectory"], "Node install directory")
        node_executable = install_dir.joinpath(*PurePosixPath(node_entry["installedExecutable"]).parts)
        if want_node:
            node_executable = install_node(manifest, key, force=args.force)
        elif not node_executable.is_file():
            raise OfflineCoreError("Pinned Node runtime is not installed; run without --ast-only first")

        if want_ast:
            install_ast(manifest, key, node_executable, force=args.force)
        if args.with_prettier:
            install_prettier(manifest, node_executable, force=args.force)

        if args.print_node:
            print(node_executable)
        else:
            installed = [f"Node {manifest['node']['version']}"]
            if want_ast:
                installed.append(f"AST adapter dependencies {manifest['ast']['version']}")
            if args.with_prettier:
                installed.append(f"Prettier {manifest['prettier']['version']}")
            print(f"Offline repair toolchain ready for {key}: " + ", ".join(installed))
        return 0
    except OfflineCoreError as exc:
        print(f"offline repair core error: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
