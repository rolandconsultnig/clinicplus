"""
Lightweight performance probe for heavy list endpoints.

Usage:
  python scripts/run_perf_probe.py

Environment:
  PERF_BASE_URL     default http://localhost:4300
  PERF_BEARER       required for authenticated endpoints
  PERF_LOOPS        default 5
  PERF_TIMEOUT      default 20
"""
from __future__ import annotations

import json
import os
import statistics
import time

import requests


def _timed_get(url: str, headers: dict, timeout: int):
    start = time.time()
    resp = requests.get(url, headers=headers, timeout=timeout)
    elapsed = (time.time() - start) * 1000
    return resp.status_code, elapsed


def main() -> int:
    base = (os.environ.get("PERF_BASE_URL") or "http://localhost:4300").rstrip("/")
    bearer = (os.environ.get("PERF_BEARER") or "").strip()
    loops = int(os.environ.get("PERF_LOOPS") or "5")
    timeout = int(os.environ.get("PERF_TIMEOUT") or "20")
    if not bearer:
        print(json.dumps({"error": "PERF_BEARER required"}, indent=2))
        return 2

    headers = {"Authorization": f"Bearer {bearer}"}
    endpoints = {
        "messages_inbox": f"{base}/api/messages?folder=inbox&per_page=100",
        "messages_sent": f"{base}/api/messages?folder=sent&per_page=100",
        "report_jobs": f"{base}/api/hub/reports/schedule",
        "report_saved": f"{base}/api/hub/reports/saved",
        "waitlist": f"{base}/api/hub/scheduling/waitlist",
    }
    report = {"base_url": base, "loops": loops, "results": {}}
    for name, url in endpoints.items():
        samples = []
        statuses = []
        for _ in range(loops):
            code, ms = _timed_get(url, headers, timeout)
            samples.append(ms)
            statuses.append(code)
        report["results"][name] = {
            "status_codes": statuses,
            "avg_ms": round(statistics.mean(samples), 2),
            "p95_ms": round(sorted(samples)[max(0, int(0.95 * len(samples)) - 1)], 2),
            "min_ms": round(min(samples), 2),
            "max_ms": round(max(samples), 2),
        }
    print(json.dumps(report, indent=2))
    # success if no 5xx responses
    for v in report["results"].values():
        if any(code >= 500 for code in v["status_codes"]):
            return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

