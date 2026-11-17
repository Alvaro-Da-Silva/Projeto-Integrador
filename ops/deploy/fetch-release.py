#!/usr/bin/env python3
from pathlib import Path
import shutil
import sys
import tarfile

from approved import GitHub
from approval_gate import SHA, Blocked, require


def main():
    sha, archive, dest = sys.argv[1:]
    require(SHA.fullmatch(sha), "SHA inválido")
    with GitHub().request("/tarball/" + sha) as response, open(archive, "xb") as output:
        shutil.copyfileobj(response, output)
    with tarfile.open(archive, "r:gz") as tar:
        entries = tar.getmembers()
        roots = {Path(entry.name).parts[0] for entry in entries}
        require(len(roots) == 1, "Arquivo sem diretório raiz único")
        for entry in entries:
            parts = Path(entry.name).parts
            require(not entry.name.startswith("/") and ".." not in parts
                    and (entry.isfile() or entry.isdir()), "Entrada de release não permitida")
            if len(parts) == 1:
                require(entry.isdir(), "Entrada inválida na raiz")
                continue
            entry.name = "/".join(parts[1:])
            tar.extract(entry, dest, filter="data")


if __name__ == "__main__":
    try:
        main()
    except (OSError, ValueError, Blocked, tarfile.TarError):
        sys.exit("Falha ao obter arquivo da release")
