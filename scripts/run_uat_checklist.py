"""
UAT checklist runner for Clinic+ critical path.

Usage:
  python scripts/run_uat_checklist.py

Environment:
  UAT_BASE_URL      default http://localhost:4300
  UAT_BEARER        optional bearer token for authenticated endpoints
  UAT_TIMEOUT       default 20 seconds
"""
from __future__ import annotations

import json
import os
import sys
import time
from dataclasses import dataclass, asdict

import requests


@dataclass
class CheckResult:
    name: str
    method: str
    url: str
    status_code: int | None
    ok: bool
    elapsed_ms: int
    note: str = ""


def _request(method: str, url: str, headers=None, timeout=20):
    started = time.time()
    try:
        resp = requests.request(method, url, headers=headers, timeout=timeout)
        elapsed = int((time.time() - started) * 1000)
        return resp, elapsed, None
    except Exception as e:
        elapsed = int((time.time() - started) * 1000)
        return None, elapsed, str(e)


def main() -> int:
    base = (os.environ.get("UAT_BASE_URL") or "http://localhost:4300").rstrip("/")
    bearer = (os.environ.get("UAT_BEARER") or "").strip()
    timeout = int(os.environ.get("UAT_TIMEOUT") or "20")
    auth_headers = {"Authorization": f"Bearer {bearer}"} if bearer else {}

    checks: list[CheckResult] = []

    # Public health
    url = f"{base}/api/health"
    resp, elapsed, err = _request("GET", url, timeout=timeout)
    checks.append(CheckResult(
        name="health",
        method="GET",
        url=url,
        status_code=resp.status_code if resp else None,
        ok=bool(resp and resp.status_code in (200, 503)),
        elapsed_ms=elapsed,
        note=err or "",
    ))

    # Authenticated critical path checks
    auth_endpoints = [
        ("messages_inbox", "GET", f"{base}/api/messages?folder=inbox&per_page=20"),
        ("reports_saved", "GET", f"{base}/api/hub/reports/saved"),
        ("report_jobs", "GET", f"{base}/api/hub/reports/schedule"),
        ("unread_summary", "GET", f"{base}/api/messages/unread-summary"),
        ("collections_notes_shape", "GET", f"{base}/api/hub/rcm/collection-notes?patient_id=1"),
    ]
    for name, method, endpoint in auth_endpoints:
        if not bearer:
            checks.append(CheckResult(
                name=name,
                method=method,
                url=endpoint,
                status_code=None,
                ok=False,
                elapsed_ms=0,
                note="skipped: UAT_BEARER missing",
            ))
            continue
        resp, elapsed, err = _request(method, endpoint, headers=auth_headers, timeout=timeout)
        ok = bool(resp and resp.status_code < 500)
        checks.append(CheckResult(
            name=name,
            method=method,
            url=endpoint,
            status_code=resp.status_code if resp else None,
            ok=ok,
            elapsed_ms=elapsed,
            note=err or "",
        ))

    total = len(checks)
    passed = sum(1 for c in checks if c.ok)
    payload = {
        "base_url": base,
        "token_present": bool(bearer),
        "total_checks": total,
        "passed": passed,
        "failed": total - passed,
        "checks": [asdict(c) for c in checks],
    }
    print(json.dumps(payload, indent=2))

    # If token not provided, only enforce public health check
    if not bearer:
        return 0 if checks and checks[0].ok else 1
    return 0 if passed == total else 1


if __name__ == "__main__":
    raise SystemExit(main())

