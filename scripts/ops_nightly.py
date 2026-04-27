"""
Nightly ops orchestrator for Clinic+.

Runs:
  1) UAT checklist
  2) Scheduled report run-due worker
  3) Performance probe

Produces a single JSON report to stdout and optional file sink.

Usage:
  python scripts/ops_nightly.py

Environment:
  OPS_OUTPUT_FILE                 optional JSON report file path
  OPS_FAIL_ON_UAT                default true
  OPS_FAIL_ON_RUN_DUE            default true
  OPS_FAIL_ON_PERF               default true

  UAT_BASE_URL / UAT_BEARER / UAT_TIMEOUT
  REPORT_RUNNER_BASE_URL / REPORT_RUNNER_BEARER / REPORT_RUNNER_TIMEOUT
  PERF_BASE_URL / PERF_BEARER / PERF_LOOPS / PERF_TIMEOUT
"""
from __future__ import annotations

import importlib.util
import io
import json
import os
import sys
import traceback
from contextlib import redirect_stderr, redirect_stdout
from datetime import datetime, timezone
from pathlib import Path
from types import ModuleType
from typing import Any


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _env_bool(name: str, default: bool) -> bool:
    raw = (os.environ.get(name) or "").strip().lower()
    if not raw:
        return default
    return raw in {"1", "true", "yes", "y", "on"}


def _load_module(module_name: str, file_name: str) -> ModuleType:
    script_path = Path(__file__).resolve().parent / file_name
    spec = importlib.util.spec_from_file_location(module_name, script_path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"failed to load module from {script_path}")
    module = importlib.util.module_from_spec(spec)
    # Ensure decorators/introspection can resolve module metadata during import.
    sys.modules[module_name] = module
    spec.loader.exec_module(module)
    return module


def _run_module_main(module_name: str, file_name: str) -> dict[str, Any]:
    started = datetime.now(timezone.utc)
    out_buf = io.StringIO()
    err_buf = io.StringIO()
    try:
        module = _load_module(module_name, file_name)
        with redirect_stdout(out_buf), redirect_stderr(err_buf):
            code = int(module.main())
        ended = datetime.now(timezone.utc)
        return {
            "ok": code == 0,
            "exit_code": code,
            "started_at": started.isoformat(),
            "ended_at": ended.isoformat(),
            "duration_ms": int((ended - started).total_seconds() * 1000),
            "stdout": out_buf.getvalue(),
            "stderr": err_buf.getvalue(),
        }
    except Exception as e:
        ended = datetime.now(timezone.utc)
        return {
            "ok": False,
            "exit_code": 1,
            "started_at": started.isoformat(),
            "ended_at": ended.isoformat(),
            "duration_ms": int((ended - started).total_seconds() * 1000),
            "error": str(e),
            "traceback": traceback.format_exc(limit=8),
            "stdout": out_buf.getvalue(),
            "stderr": err_buf.getvalue(),
        }


def main() -> int:
    report: dict[str, Any] = {
        "ts": _utc_now(),
        "job": "ops_nightly",
        "config": {
            "fail_on_uat": _env_bool("OPS_FAIL_ON_UAT", True),
            "fail_on_run_due": _env_bool("OPS_FAIL_ON_RUN_DUE", True),
            "fail_on_perf": _env_bool("OPS_FAIL_ON_PERF", True),
        },
        "steps": {},
    }

    report["steps"]["uat"] = _run_module_main("run_uat_checklist", "run_uat_checklist.py")
    report["steps"]["run_due"] = _run_module_main("run_due_reports_worker", "run_due_reports_worker.py")
    report["steps"]["perf"] = _run_module_main("run_perf_probe", "run_perf_probe.py")

    failing = []
    if report["config"]["fail_on_uat"] and not report["steps"]["uat"]["ok"]:
        failing.append("uat")
    if report["config"]["fail_on_run_due"] and not report["steps"]["run_due"]["ok"]:
        failing.append("run_due")
    if report["config"]["fail_on_perf"] and not report["steps"]["perf"]["ok"]:
        failing.append("perf")

    report["summary"] = {
        "failing_gates": failing,
        "ok": len(failing) == 0,
    }
    output = json.dumps(report, indent=2, default=str)
    print(output)

    output_file = (os.environ.get("OPS_OUTPUT_FILE") or "").strip()
    if output_file:
        try:
            Path(output_file).parent.mkdir(parents=True, exist_ok=True)
            Path(output_file).write_text(output + "\n", encoding="utf-8")
        except Exception:
            # keep primary stdout contract; file write failure should not hide run result
            pass

    return 0 if report["summary"]["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())

