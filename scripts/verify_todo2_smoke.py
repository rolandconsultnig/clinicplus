"""
Smoke: app imports, route count, optional GET /api/hub/ops/metrics (needs token for full check).
Run from project root: python scripts/verify_todo2_smoke.py
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def main():
    from main import app
    n = len(list(app.url_map.iter_rules()))
    print("ok: app loaded, url rules =", n)
    assert n > 100
    with app.test_client() as c:
        r = c.get("/api/health")
        print("/api/health", r.status_code)
    expected_patterns = [
        "/api/messages/search",
        "/api/messages/thread/",
        "/api/messages/events",
        "/api/messages/attachments/sign-upload",
        "/api/messages/attachments/upload",
        "/api/messages/attachments/sign-download",
        "/api/messages/attachments/download",
        "/api/messages/unread-summary",
        "/api/messages/group",
        "/api/hub/reports/schedule/",
        "/api/hub/reports/schedule/run-due",
        "/api/hub/reports/schedule/<int:job_id>/history",
    ]
    rule_strings = [str(r.rule) for r in app.url_map.iter_rules()]
    for p in expected_patterns:
        ok = any(p in rr for rr in rule_strings)
        print(f"route contains {p}: {ok}")
        assert ok
    print("smoke pass")


if __name__ == "__main__":
    main()
