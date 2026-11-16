from copy import deepcopy
import unittest

from approval_gate import Blocked, CI, MANUAL, MANUAL_BASE, MANUAL_FRONTEND, evaluate

CURRENT = "a" * 40
TIP = "b" * 40
HEAD = "c" * 40
REPO = "example/project"


def evidence():
    return {
        "branch": {"protected": True, "commit": {"sha": TIP}},
        "protection": {
            "required_pull_request_reviews": {"required_approving_review_count": 1, "dismiss_stale_reviews": True},
            "enforce_admins": {"enabled": True},
            "allow_force_pushes": {"enabled": False}, "allow_deletions": {"enabled": False},
            "required_status_checks": {"strict": True, "checks": [{"context": "siscota-validate", "app_id": 15368}]},
        },
        "compare": {"status": "ahead", "merge_base_commit": {"sha": CURRENT}, "files": [{"filename": "docs/notes.md"}]},
        "pull": {"merged": True, "merge_commit_sha": TIP, "merged_at": "2026-11-16T12:00:00Z",
                 "user": {"id": 1}, "head": {"sha": HEAD},
                 "base": {"ref": "deploy", "repo": {"full_name": REPO}}},
        "reviews": [{"id": 1, "user": {"id": 2}, "state": "APPROVED",
                     "commit_id": HEAD, "submitted_at": "2026-11-16T11:00:00Z"}],
        "eligible": {2},
        "runs": [{"run_number": 1, "head_sha": TIP, "head_branch": "deploy", "event": "push", "status": "completed",
                  "conclusion": "success", "path": CI, "head_repository": {"full_name": REPO}}],
        "jobs": [{"name": "siscota-validate", "head_sha": TIP, "status": "completed", "conclusion": "success"}],
    }


class ApprovalTest(unittest.TestCase):
    def test_tip_and_distinct_pr_head(self):
        self.assertEqual(evaluate(evidence(), CURRENT, REPO), TIP)

    def test_manual_needs_ancestry_and_exact_authorization(self):
        e = evidence()
        e["compare"]["merge_base_commit"]["sha"] = MANUAL_BASE
        e["frontend_compare"] = {"status": "ahead", "merge_base_commit": {"sha": MANUAL_FRONTEND}}
        for pair in (None, (MANUAL_BASE, TIP), (MANUAL, HEAD)):
            with self.assertRaises(Blocked):
                evaluate(e, MANUAL, REPO, pair)
        self.assertEqual(evaluate(e, MANUAL, REPO, (MANUAL, TIP)), TIP)
        e["frontend_compare"]["status"] = "diverged"
        with self.assertRaises(Blocked):
            evaluate(e, MANUAL, REPO, (MANUAL, TIP))

    def test_visual_only_update_needs_no_additional_authorization(self):
        e = evidence()
        e["compare"]["files"] = [{"filename": "frontend/src/app/globals.css"},
                                 {"filename": "frontend/public/logo.webp"}]
        self.assertEqual(evaluate(e, CURRENT, REPO), TIP)

    def test_noop(self):
        self.assertEqual(evaluate({"branch": {"commit": {"sha": CURRENT}}}, CURRENT, REPO), "")

    def test_invalid_evidence(self):
        scenarios = [
            ("branch", "protected", False),
            ("compare", "status", "behind"),
            ("compare", "status", "diverged"),
            ("compare", "merge_base_commit", {"sha": HEAD}),
            ("compare", "files", [{"filename": "docs/r.md"}] * 300),
            ("compare", "files", [{"filename": "docs/r.md", "previous_filename": "backend/migrations/a.sql"}]),
            ("pull", "merged", False),
            ("pull", "merge_commit_sha", HEAD),
            ("pull", "user", {"id": 2}),
            ("reviews", 0, {"id": 1, "user": {"id": 2}, "state": "APPROVED",
                            "commit_id": CURRENT, "submitted_at": "2026-11-16T11:00:00Z"}),
        ]
        for section, key, value in scenarios:
            with self.subTest(section=section, key=key, value=str(value)[:90]):
                e = evidence()
                e[section][key] = value
                with self.assertRaises(Blocked):
                    evaluate(e, CURRENT, REPO)

    def test_sensitive_changes_need_exact_transition(self):
        e = evidence()
        e["compare"]["files"] = [{"filename": "backend/migrations/008.sql"}]
        for pair in (None, (HEAD, TIP), (CURRENT, HEAD)):
            with self.assertRaises(Blocked):
                evaluate(e, CURRENT, REPO, pair)
        self.assertEqual(evaluate(e, CURRENT, REPO, (CURRENT, TIP)), TIP)

    def test_newer_dismissal_blocks_older_approval(self):
        e = evidence()
        dismissed = dict(e["reviews"][0], id=2, state="DISMISSED")
        e["reviews"].insert(0, dismissed)
        with self.assertRaises(Blocked):
            evaluate(e, CURRENT, REPO)

    def test_missing_eligible_reviewer(self):
        e = evidence()
        e["eligible"].clear()
        with self.assertRaises(Blocked):
            evaluate(e, CURRENT, REPO)

    def test_newer_failed_ci_blocks_success(self):
        e = evidence()
        e["runs"].append(dict(e["runs"][0], run_number=2, conclusion="failure"))
        with self.assertRaises(Blocked):
            evaluate(e, CURRENT, REPO)

    def test_wrong_job_sha_or_skipped(self):
        e = evidence()
        for change in ({"head_sha": HEAD}, {"conclusion": "skipped"}):
            scenario = deepcopy(e)
            scenario["jobs"][0].update(change)
            with self.assertRaises(Blocked):
                evaluate(scenario, CURRENT, REPO)
