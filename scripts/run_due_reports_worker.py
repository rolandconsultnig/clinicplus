"""
Cron-friendly runner for scheduled reports.

Usage:
  python scripts/run_due_reports_worker.py

Environment:
  REPORT_RUNNER_BASE_URL   default: http://localhost:4300
  REPORT_RUNNER_BEARER     required bearer token for /api/hub/reports/schedule/run-due
  REPORT_RUNNER_TIMEOUT    default: 30 (seconds)
  REPORT_RUNNER_LOG_FILE   optional path for newline JSON log output
"""
from __future__ import annotations

import json
import os
import sys
from datetime import datetime, timezone

import requests


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


_LOG_FILE = (os.environ.get("REPORT_RUNNER_LOG_FILE") or "").strip()


def _log(level: str, message: str, **extra):
    payload = {
        "ts": _utc_now(),
        "level": level,
        "message": message,
    }
    if extra:
        payload.update(extra)
    line = json.dumps(payload, default=str)
    print(line)
    if _LOG_FILE:
        try:
            with open(_LOG_FILE, "a", encoding="utf-8") as f:
                f.write(line + "\n")
        except Exception as e:
            print(json.dumps({
                "ts": _utc_now(),
                "level": "warn",
                "message": "failed_to_write_log_file",
                "error": str(e),
                "log_file": _LOG_FILE,
            }))


def main() -> int:
    base_url = (os.environ.get("REPORT_RUNNER_BASE_URL") or "http://localhost:4300").rstrip("/")
    bearer = (os.environ.get("REPORT_RUNNER_BEARER") or "").strip()
    timeout = int(os.environ.get("REPORT_RUNNER_TIMEOUT") or "30")

    if not bearer:
        _log("error", "Missing REPORT_RUNNER_BEARER")
        return 2

    url = f"{base_url}/api/hub/reports/schedule/run-due"
    headers = {
        "Authorization": f"Bearer {bearer}",
        "Content-Type": "application/json",
    }
    _log("info", "starting run-due call", url=url, timeout=timeout)
    try:
        resp = requests.post(url, headers=headers, json={}, timeout=timeout)
    except Exception as e:
        _log("error", "HTTP request failed", error=str(e))
        return 1

    body = None
    try:
        body = resp.json()
    except Exception:
        body = {"raw_text": resp.text[:1000]}

    if resp.status_code >= 400:
        _log("error", "run-due failed", status=resp.status_code, response=body)
        return 1

    results = body.get("results") or []
    rows_total = sum(int((r or {}).get("rows") or 0) for r in results)
    _log(
        "info",
        "run-due completed",
        status=resp.status_code,
        ran=body.get("ran"),
        rows_total=rows_total,
        jobs=results,
    )
    # Optionally fetch latest history rows for first few jobs to aid ops traceability.
    sampled = []
    for item in (results or [])[:3]:
        job_id = item.get("job_id")
        if not job_id:
            continue
        try:
            h_url = f"{base_url}/api/hub/reports/schedule/{job_id}/history?limit=1"
            h_resp = requests.get(h_url, headers=headers, timeout=timeout)
            h_body = h_resp.json() if h_resp.headers.get("content-type", "").startswith("application/json") else {}
            latest = (h_body.get("history") or [None])[0]
            sampled.append({"job_id": job_id, "history_status": h_resp.status_code, "latest": latest})
        except Exception as e:
            sampled.append({"job_id": job_id, "history_error": str(e)})
    if sampled:
        _log("info", "history_snapshot", samples=sampled)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
