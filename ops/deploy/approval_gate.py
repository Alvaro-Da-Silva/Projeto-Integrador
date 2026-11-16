import re

SHA = re.compile(r"[0-9a-f]{40}")
BRANCH = "deploy"
MANUAL = "manual-bf7d837b0504682f67fc259f36e74c85e079cab892dcc19da159e3a12777cd2e"
MANUAL_BASE = "babb91d5be3344a1748a235532ad942297dac66e"
MANUAL_FRONTEND = "485367520d213713325583755d9ddbf199dcda16"
CI = ".github/workflows/siscota-ci.yml"


class Blocked(Exception):
    pass


def require(condition, message):
    if not condition:
        raise Blocked(message)


def matches(pr, sha, repo):
    return (pr.get("merged_at") and pr.get("merge_commit_sha") == sha
            and pr["base"]["ref"] == BRANCH
            and pr["base"]["repo"]["full_name"].casefold() == repo.casefold())


def sensitive(path):
    # Arquivos desconhecidos também exigem revisão de compatibilidade.
    path = path.lower()
    documentation = path.startswith("docs/") and path.endswith(".md")
    static_image = path.startswith("frontend/public/") and path.endswith((".png", ".jpg", ".jpeg", ".webp", ".avif", ".ico"))
    stylesheet = path.startswith("frontend/src/") and path.endswith(".css")
    return not (documentation or static_image or stylesheet)


def check_protection(p):
    reviews = p["required_pull_request_reviews"]
    count = reviews["required_approving_review_count"]
    checks = p["required_status_checks"]
    bypass = reviews.get("bypass_pull_request_allowances") or {}
    require(count >= 1 and reviews["dismiss_stale_reviews"]
            and not any(bypass.values()) and p["enforce_admins"]["enabled"]
            and not p["allow_force_pushes"]["enabled"] and not p["allow_deletions"]["enabled"]
            and checks["strict"]
            and any(c["context"] == "siscota-validate" and c["app_id"] == 15368 for c in checks["checks"]),
            "Proteção de deploy insuficiente")
    return count


def evaluate(e, current, repo, reviewed_pair=None):
    branch = e["branch"]
    sha = branch["commit"]["sha"]
    manual = current == MANUAL
    require((manual or SHA.fullmatch(current)) and SHA.fullmatch(sha), "Identidade de release inválida")
    if sha == current:
        return ""
    require(branch["protected"], "Branch deploy desprotegida")
    count = check_protection(e["protection"])
    comparison = e["compare"]
    base = MANUAL_BASE if manual else current
    require(comparison["status"] == "ahead" and comparison["merge_base_commit"]["sha"] == base,
            "Revisão anterior ou divergente")
    files = comparison["files"]
    require(len(files) < 300, "Comparação possivelmente truncada")
    paths = [c[key] for c in files for key in ("filename", "previous_filename") if key in c]
    if manual:
        frontend = e["frontend_compare"]
        require(frontend["status"] in {"ahead", "identical"}
                and frontend["merge_base_commit"]["sha"] == MANUAL_FRONTEND,
                "A candidata não preserva a ancestralidade do frontend instalado")
    if manual or any(sensitive(path) for path in paths):
        require(reviewed_pair == (current, sha), "Transição exige autorização administrativa exata")
    pr = e["pull"]
    require(pr["merged"] and matches(pr, sha, repo), "PR mesclado para o SHA exato ausente")
    head = pr["head"]["sha"]
    require(SHA.fullmatch(head), "SHA do PR inválido")
    latest = {}
    for r in sorted(e["reviews"], key=lambda item: (item.get("submitted_at") or "", item["id"])):
        if r.get("submitted_at") and r["state"] in {"APPROVED", "DISMISSED", "CHANGES_REQUESTED"}:
            latest[r["user"]["id"]] = r
    require(not any(r["state"] == "CHANGES_REQUESTED" for r in latest.values()), "Revisão solicitou mudanças")
    approvals = [r for uid, r in latest.items()
                 if uid != pr["user"]["id"] and uid in e["eligible"]
                 and r["state"] == "APPROVED" and r["commit_id"] == head
                 and r["submitted_at"] <= pr["merged_at"]]
    require(len(approvals) >= count, "Revisões válidas do SHA final do PR insuficientes")
    require(e["runs"], "CI do SHA exato ausente")
    run = max(e["runs"], key=lambda r: r["run_number"])
    require(run["head_sha"] == sha and run["head_branch"] == BRANCH and run["event"] == "push"
            and run["status"] == "completed" and run["conclusion"] == "success"
            and run["path"].split("@", 1)[0] == CI
            and run["head_repository"]["full_name"].casefold() == repo.casefold(), "CI do SHA exato sem sucesso")
    jobs = [job for job in e["jobs"] if job["name"] == "siscota-validate"]
    require(len(jobs) == 1 and jobs[0]["head_sha"] == sha and jobs[0]["status"] == "completed"
            and jobs[0]["conclusion"] == "success", "Job obrigatório ausente ou sem sucesso")
    return sha
