#!/usr/bin/env python3
from hashlib import file_digest, sha256
from pathlib import Path, PurePosixPath
import re
import sys

ARTIFACT = "bf7d837b0504682f67fc259f36e74c85e079cab892dcc19da159e3a12777cd2e"
CACHE = PurePosixPath("frontend/.next/cache")


def verify(tree, manifest):
    data = manifest.read_bytes()
    if sha256(data).hexdigest() != ARTIFACT:
        raise ValueError("Manifesto de build divergente")
    expected = set()
    for line in data.decode().splitlines():
        digest, name = line.split("  ", 1)
        path = PurePosixPath(name)
        if not re.fullmatch(r"[0-9a-f]{64}", digest) or path.parts[0] != "tree" or ".." in path.parts:
            raise ValueError("Entrada de manifesto invÃ¡lida")
        relative = PurePosixPath(*path.parts[1:])
        if relative.is_relative_to(CACHE):
            continue
        file = tree / relative
        if file.is_symlink() or not file.is_file() or not file.resolve().is_relative_to(tree):
            raise ValueError("Arquivo esperado ausente ou fora da release")
        with file.open("rb") as handle:
            if file_digest(handle, "sha256").hexdigest() != digest:
                raise ValueError(f"Arquivo divergente: {relative}")
        expected.add(relative)
    actual = set()
    for path in tree.rglob("*"):
        relative = path.relative_to(tree)
        if relative.is_relative_to(CACHE):
            continue
        if path.is_symlink():
            if Path(path.readlink()).is_absolute() or not path.resolve(strict=True).is_relative_to(tree):
                raise ValueError(f"Link externo: {relative}")
        elif path.is_file():
            actual.add(relative)
        elif not path.is_dir():
            raise ValueError(f"Entrada especial: {relative}")
    if actual != expected:
        raise ValueError(f"InventÃ¡rio divergente: {len(actual - expected)} extras, {len(expected - actual)} ausentes")


if __name__ == "__main__":
    try:
        verify(Path(sys.argv[1]).resolve(strict=True), Path(sys.argv[2]))
    except (IndexError, OSError, ValueError) as error:
        sys.exit(str(error))
    print("Artefato manual verificado, excluÃ­do o cache mutÃ¡vel do Next.")
