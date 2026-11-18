#!/usr/bin/env python3
import json
from pathlib import Path
import re
import stat
import sys
from urllib.parse import quote
from urllib.request import Request, urlopen

from approval_gate import Blocked, MANUAL, MANUAL_BASE, MANUAL_FRONTEND, SHA, check_protection, evaluate, matches, require

CFG = Path("/etc/siscota-cd")


def private(name):
    path = CFG / name
    info = path.lstat()
    require(stat.S_ISREG(info.st_mode) and info.st_uid == 0 and not info.st_mode & 0o077,
            "Arquivo de configuração deve pertencer a root e ser privado")
    return path.read_text().strip()


class GitHub:
    def __init__(self):
        self.repo = private("repository")
        require(re.fullmatch(r"[\w-]+/[\w.-]+", self.repo, re.ASCII), "Repositório inválido")
        self.token = private("github.token")
        require(re.fullmatch(r"[A-Za-z0-9_-]+", self.token), "Credencial inválida")
        self.base = "https://api.github.com/repos/" + self.repo

    def request(self, path):
        req = Request(self.base + path, headers={"Accept": "application/vnd.github+json",
                                                "X-GitHub-Api-Version": "2022-11-28"})
        req.add_unredirected_header("Authorization", "Bearer " + self.token)
        return urlopen(req, timeout=30)

    def get(self, path, complete=False):
        with self.request(path) as response:
            require(not complete or 'rel="next"' not in response.headers.get("Link", ""),
                    "Evidência paginada exige inspeção")
            return json.load(response)

    def candidate(self, current, *, review=False):
        manual = current == MANUAL
        require(manual or SHA.fullmatch(current), "Identidade instalada inválida")
        branch = self.get("/branches/deploy")
        sha = branch["commit"]["sha"]
        require(SHA.fullmatch(sha), "SHA GitHub inválido")
        if sha == current:
            return ""
        require(branch["protected"], "Branch deploy desprotegida")
        protection = self.get("/branches/deploy/protection")
        base = MANUAL_BASE if manual else current
        compare = self.get(f"/compare/{base}...{sha}?per_page=1")
        frontend = self.get(f"/compare/{MANUAL_FRONTEND}...{sha}?per_page=1") if manual else None
        pulls = self.get(f"/commits/{sha}/pulls?per_page=100", complete=True)
        found = [p for p in pulls if matches(p, sha, self.repo)]
        require(len(found) == 1, "Associação com PR ausente ou ambígua")
        path = "/pulls/" + str(int(found[0]["number"]))
        pull = self.get(path)
        reviews = self.get(path + "/reviews?per_page=100", complete=True)
        eligible = set()
        for r in reviews:
            user = r.get("user") or {}
            if (user.get("type") == "User" and r["state"] == "APPROVED"
                    and r.get("commit_id") == pull["head"]["sha"]
                    and user["id"] not in eligible and user["id"] != pull["user"]["id"]):
                login = quote(user["login"], safe="")
                info = self.get(f"/collaborators/{login}/permission")
                if info["user"]["id"] == user["id"] and info["permission"] in {"admin", "write"}:
                    eligible.add(user["id"])
        runs = self.get(f"/actions/workflows/siscota-ci.yml/runs?branch=deploy&event=push&head_sha={sha}&per_page=100",
                        complete=True)["workflow_runs"]
        jobs = []
        if runs:
            run = max(runs, key=lambda r: r["run_number"])
            jobs = self.get(f'/actions/runs/{int(run["id"])}/attempts/{int(run["run_attempt"])}/jobs?per_page=100',
                            complete=True)["jobs"]
        pair = tuple(private("reviewed-transition").split()) if (CFG / "reviewed-transition").exists() else None
        if review:
            pair = (current, sha)
        candidate = evaluate(dict(branch=branch, protection=protection, compare=compare, pull=pull,
                             reviews=reviews, eligible=eligible, runs=runs, jobs=jobs, frontend_compare=frontend), current, self.repo, pair)
        if review:
            print(f"PR #{pull['number']} - https://github.com/{self.repo}/pull/{pull['number']}", file=sys.stderr)
            print(f"Diff - https://github.com/{self.repo}/compare/{base}...{sha}", file=sys.stderr)
            for entry in compare["files"]:
                print(json.dumps({key: entry[key] for key in ("status", "filename", "previous_filename")
                                  if key in entry}, ensure_ascii=True), file=sys.stderr)
        return candidate


if __name__ == "__main__":
    try:
        if sys.argv[1:] == ["--check-private"]:
            git = GitHub()
            branch = git.get("/branches/deploy")
            print("repository e github.token válidos; acesso de leitura a deploy confirmado.")
            require(branch["protected"], "Branch deploy desprotegida")
            rules = git.get("/rules/branches/deploy")
            print("Tipos de regras aplicáveis:", ", ".join(sorted({r["type"] for r in rules})) or "nenhum")
            protection = git.get("/branches/deploy/protection")
            check_protection(protection)
            print("Acesso à proteção clássica confirmado.")
            sys.exit(0)
        review = len(sys.argv) == 3 and sys.argv[2] == "--show-review"
        require(len(sys.argv) == 2 or review, "Informe o SHA em execução")
        sha = GitHub().candidate(sys.argv[1], review=review)
        if sha:
            print(sha)
    except Blocked as error:
        sys.exit("CD bloqueado: " + str(error))
    except (OSError, ValueError, KeyError, TypeError, AttributeError):
        sys.exit("CD bloqueado: evidência GitHub indisponível ou incompleta")
