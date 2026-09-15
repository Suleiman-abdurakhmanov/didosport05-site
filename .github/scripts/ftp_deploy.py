#!/usr/bin/env python3
"""Atomic FTP deploy: upload new/changed files, remove stale files."""
import os
import sys
from ftplib import FTP, FTP_TLS, error_perm

FTP_SERVER = os.environ["FTP_SERVER"]
FTP_USERNAME = os.environ["FTP_USERNAME"]
FTP_PASSWORD = os.environ["FTP_PASSWORD"]
FTP_REMOTE_DIR = os.environ.get("FTP_REMOTE_DIR", "/www/didosport05.ru")
LOCAL_DIR = "."  # workflow runs from repo root

SKIP_NAMES = {".git", ".github", ".gitignore", "node_modules", ".DS_Store"}
SKIP_EXTS = {".pyc", ".pyo"}

def human(n):
    for u in ["B", "KB", "MB", "GB"]:
        if n < 1024:
            return f"{n:.1f} {u}"
        n /= 1024
    return f"{n:.1f} TB"

def walk_local(root):
    """Yield (abs_path, rel_path) for every file we want to deploy."""
    for dirpath, dirnames, filenames in os.walk(root):
        # prune
        dirnames[:] = [d for d in dirnames if d not in SKIP_NAMES]
        for fn in filenames:
            if fn in SKIP_NAMES:
                continue
            ext = os.path.splitext(fn)[1]
            if ext in SKIP_EXTS:
                continue
            abs_p = os.path.join(dirpath, fn)
            rel_p = os.path.relpath(abs_p, root).replace(os.sep, "/")
            yield abs_p, rel_p

def walk_remote(ftp, path="/"):
    """Yield remote paths of all files (recursively)."""
    try:
        names = []
        ftp.retrlines(f"LIST {path}", names.append)
    except error_perm:
        return
    for line in names:
        parts = line.split(maxsplit=8)
        if len(parts) < 9:
            continue
        perms = parts[0]
        name = parts[8]
        if name in (".", ".."):
            continue
        full = f"{path.rstrip('/')}/{name}"
        if perms.startswith("d"):
            yield from walk_remote(ftp, full)
        else:
            yield full.lstrip("/")

def ensure_dir(ftp, path):
    """Create dir recursively (relative to cwd), ignore 'already exists'."""
    parts = [p for p in path.split("/") if p]
    cur = ""
    for p in parts:
        cur += ("/" if cur else "") + p
        try:
            ftp.mkd(cur)
        except error_perm as e:
            msg = str(e).lower()
            if "550" in msg or "exist" in msg or "not allowed" in msg:
                continue
            raise

def upload(ftp, local_path, remote_path):
    """Upload file. Paths are RELATIVE to ftp.pwd() (we cd into FTP_REMOTE_DIR up front)."""
    if "/" in remote_path:
        remote_dir = remote_path.rsplit("/", 1)[0]
        ensure_dir(ftp, remote_dir)
    size = os.path.getsize(local_path)
    with open(local_path, "rb") as f:
        ftp.storbinary(f"STOR {remote_path}", f)
    print(f"  ↑ {remote_path}  ({human(size)})")

def main():
    print(f"Connecting to ftp://{FTP_SERVER} as {FTP_USERNAME}...")
    ftp = FTP()
    ftp.connect(FTP_SERVER, 21, timeout=60)
    ftp.login(FTP_USERNAME, FTP_PASSWORD)
    print(f"Logged in. Remote dir: {FTP_REMOTE_DIR}")

    # 1) index existing remote files
    ftp.cwd(FTP_REMOTE_DIR)
    remote_files = set(walk_remote(ftp, FTP_REMOTE_DIR))
    remote_files = {p[len(FTP_REMOTE_DIR):].lstrip("/") for p in remote_files if p}
    print(f"Remote has {len(remote_files)} files")

    # 2) build local file set
    local_files = {}
    for abs_p, rel_p in walk_local(LOCAL_DIR):
        local_files[rel_p] = abs_p
    print(f"Local has {len(local_files)} files to deploy")

    # 3) upload everything (overwrites on conflict)
    uploaded = 0
    for rel_p, abs_p in sorted(local_files.items()):
        try:
            upload(ftp, abs_p, rel_p)
            uploaded += 1
        except Exception as e:
            print(f"  ❌ FAILED {rel_p}: {e}", file=sys.stderr)
            raise

    # 4) delete stale remote files (relative to cwd)
    stale = sorted(remote_files - set(local_files))
    deleted = 0
    for rel_p in stale:
        first = rel_p.split("/", 1)[0]
        if first in SKIP_NAMES:
            continue
        if delete_remote(ftp, "", rel_p):
            deleted += 1

    ftp.quit()
    print(f"\n✅ Done. uploaded={uploaded} deleted={deleted} unchanged={len(local_files)-uploaded}")

if __name__ == "__main__":
    main()
