"""
main.py – AI Engine Entry Point
================================

Provides two modes of operation:

1. CLI Mode (run_demo):
   Run all 15 demo cases through the pipeline and print results.
   Usage: python main.py

2. HTTP Server Mode (serve):
   Start a lightweight HTTP server exposing the pipeline as a REST endpoint.
   Usage: python main.py serve

HTTP Endpoints (Server Mode):
  POST /process
    Body: { "parcel_id": "MP-BPL-1024", "text": "...", "document_type": "SALE_DEED" }
    Response: Full pipeline result

  POST /demo/{case_id}
    Run a specific demo case through the pipeline
    Response: Full pipeline result

  GET  /health
    Returns OCR capabilities and system status

  GET  /demo/list
    Returns all 15 demo case IDs

The backend team integrates with the AI engine via the documented API contract.
This server is optional — the pipeline can also be called as a Python library.
"""

import sys
import json
import logging
from typing import Dict, Any

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("ai_engine.main")


# Windows console encoding compatibility
if sys.platform == "win32":
    try:
        if hasattr(sys.stdout, "reconfigure"):
            sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        if hasattr(sys.stderr, "reconfigure"):
            sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass


# ─────────────────────────────────────────────
#  CLI: Run Demo Cases
# ─────────────────────────────────────────────

def run_demo(case_filter: str = None, verbose: bool = False):
    """
    Run all (or filtered) demo cases through the pipeline and print results.

    Args:
        case_filter: Optional case ID or level filter (e.g., "LOW", "DEMO-HIGH-001")
        verbose:     If True, print full result dict
    """
    from demo_data import ALL_DEMO_CASES, get_case_by_id, get_cases_by_level
    from pipeline import run_pipeline_from_text
    from ocr import get_ocr_capabilities

    caps = get_ocr_capabilities()
    print(f"\n{'='*70}")
    print(f"  BHOOMI-SHIELD AI Engine -- Demo Run")
    print(f"  OCR Mode: {caps['active_tier']}")
    print(f"{'='*70}\n")

    # Select cases
    if case_filter:
        if case_filter.upper() in ("LOW", "MEDIUM", "HIGH"):
            cases = get_cases_by_level(case_filter)
        else:
            try:
                cases = [get_case_by_id(case_filter)]
            except KeyError:
                print(f"ERROR: Case '{case_filter}' not found.")
                sys.exit(1)
    else:
        cases = ALL_DEMO_CASES

    print(f"  Running {len(cases)} demo case(s)...\n")

    results_summary = []

    for case in cases:
        case_id = case["case_id"]
        expected = case["expected_level"]
        parcel = case["parcel"]

        print(f"  > {case_id}: {case['description']}")
        print(f"    Expected: {expected}")

        result = run_pipeline_from_text(
            raw_text=case["document_text"],
            parcel_record=parcel,
            document_type=case["document_type"],
            file_name=f"{case_id.lower()}.txt",
        )

        actual_level = result["risk_level"]
        score = result["risk_score"]
        signals_count = len(result["risk_signals"])

        is_match = (actual_level == expected) or (expected in ("HIGH", "CRITICAL") and actual_level in ("HIGH", "CRITICAL"))
        status_icon = "[PASS]" if is_match else "[FLAG]"
        print(f"    Result:   {status_icon} {actual_level} (score={score}, signals={signals_count})")
        print(f"    Verdict:  {result['risk_verdict']}")

        if result.get("reasons"):
            print(f"    Reasons:")
            for r in result["reasons"]:
                print(f"      + {r}")

        if signals_count > 0:
            print(f"    Signals:")
            for sig in result["risk_signals"]:
                print(f"      - {sig['factor']} (+{sig['impact']} pts) -- {sig['severity']}")

        print(f"    Actions:")
        for i, action in enumerate(result["recommended_actions"][:3], 1):
            print(f"      {i}. {action}")

        if verbose:
            print(f"\n    Full result:")
            print(json.dumps(result, indent=6, default=str))

        print()
        results_summary.append({
            "case_id": case_id,
            "expected": expected,
            "actual": actual_level,
            "score": score,
            "match": is_match,
        })

    # Summary table
    print(f"\n{'-'*70}")
    print(f"  SUMMARY ({len(results_summary)} cases)")
    print(f"{'-'*70}")
    correct = sum(1 for r in results_summary if r["match"])
    print(f"  Matching expected level: {correct}/{len(results_summary)}")
    print()
    for r in results_summary:
        icon = "[MATCH]" if r["match"] else "[DIFF] "
        print(f"  {icon} {r['case_id']:20s} Expected: {r['expected']:8s} Got: {r['actual']:8s} Score: {r['score']}")
    print()


# ─────────────────────────────────────────────
#  HTTP Server Mode
# ─────────────────────────────────────────────

def serve(host: str = "0.0.0.0", port: int = 8001):
    """
    Start a lightweight HTTP server for the AI engine.
    No external framework required — uses Python stdlib http.server.

    Endpoints:
      GET  /health         → System + OCR capability info
      GET  /demo/list      → List all demo case IDs
      POST /demo/{case_id} → Run a specific demo case
      POST /process        → Process raw text + parcel record
    """
    from http.server import HTTPServer, BaseHTTPRequestHandler
    from demo_data import ALL_DEMO_CASES, get_case_by_id, list_case_ids
    from pipeline import run_pipeline_from_text
    from ocr import get_ocr_capabilities

    class AIEngineHandler(BaseHTTPRequestHandler):
        def log_message(self, format, *args):
            logger.info(f"[HTTPServer] {format % args}")

        def _send_json(self, data: Any, status: int = 200):
            body = json.dumps(data, indent=2, default=str).encode()
            self.send_response(status)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(body)

        def _read_body(self) -> Dict:
            length = int(self.headers.get("Content-Length", 0))
            if length == 0:
                return {}
            return json.loads(self.rfile.read(length))

        def do_OPTIONS(self):
            self.send_response(200)
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
            self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
            self.end_headers()

        def do_GET(self):
            path = self.path.rstrip("/")

            if path == "/health":
                caps = get_ocr_capabilities()
                self._send_json({
                    "status": "healthy",
                    "system": "BHOOMI-SHIELD AI Engine",
                    "version": "1.0.0",
                    "ocr_capabilities": caps,
                    "demo_cases_available": len(ALL_DEMO_CASES),
                })

            elif path == "/demo/list":
                self._send_json({
                    "cases": list_case_ids(),
                    "count": len(ALL_DEMO_CASES),
                })

            else:
                self._send_json({"error": {"message": f"Not found: {path}"}}, 404)

        def do_POST(self):
            path = self.path.rstrip("/")
            body = self._read_body()

            # POST /demo/{case_id}
            if path.startswith("/demo/"):
                case_id = path[6:]
                try:
                    case = get_case_by_id(case_id)
                except KeyError:
                    self._send_json({"error": {"message": f"Demo case '{case_id}' not found"}}, 404)
                    return

                result = run_pipeline_from_text(
                    raw_text=case["document_text"],
                    parcel_record=case["parcel"],
                    document_type=case["document_type"],
                    file_name=f"{case_id.lower()}.txt",
                )
                result["demo_case_id"] = case_id
                result["expected_level"] = case["expected_level"]
                self._send_json(result)

            # POST /process
            elif path == "/process":
                required = ("parcel_id", "text")
                missing = [f for f in required if not body.get(f)]
                if missing:
                    self._send_json(
                        {"error": {"message": f"Missing required fields: {missing}"}}, 400
                    )
                    return

                # Build a minimal parcel record from request or use passed parcel
                parcel_record = body.get("parcel_record", {
                    "parcel_id": body["parcel_id"],
                    "owner_name": body.get("owner_name", ""),
                    "survey_number": body.get("survey_number", ""),
                    "area": body.get("area", 0),
                    "area_unit": body.get("area_unit", "hectare"),
                    "district": body.get("district", ""),
                    "tehsil": body.get("tehsil", ""),
                    "village": body.get("village", ""),
                })

                result = run_pipeline_from_text(
                    raw_text=body["text"],
                    parcel_record=parcel_record,
                    document_type=body.get("document_type", "UNKNOWN"),
                    file_name=body.get("file_name", "document.txt"),
                )
                self._send_json(result)

            else:
                self._send_json({"error": {"message": f"Not found: {path}"}}, 404)

    server = HTTPServer((host, port), AIEngineHandler)
    print(f"\n{'='*60}")
    print(f"  BHOOMI-SHIELD AI Engine HTTP Server")
    print(f"  Listening on http://{host}:{port}")
    print(f"  Endpoints:")
    print(f"    GET  /health")
    print(f"    GET  /demo/list")
    print(f"    POST /demo/{{case_id}}")
    print(f"    POST /process")
    print(f"{'='*60}\n")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nAI Engine server stopped.")


# ─────────────────────────────────────────────
#  Entry Point
# ─────────────────────────────────────────────

if __name__ == "__main__":
    args = sys.argv[1:]

    if not args or args[0] == "demo":
        # Run all demo cases
        case_filter = args[1] if len(args) > 1 else None
        verbose = "--verbose" in args or "-v" in args
        run_demo(case_filter=case_filter, verbose=verbose)

    elif args[0] == "serve":
        host = "0.0.0.0"
        port = 8001
        for arg in args[1:]:
            if arg.startswith("--port="):
                port = int(arg.split("=")[1])
            elif arg.startswith("--host="):
                host = arg.split("=")[1]
        serve(host=host, port=port)

    else:
        print(f"BHOOMI-SHIELD AI Engine")
        print(f"Usage:")
        print(f"  python main.py                          # Run all 15 demo cases")
        print(f"  python main.py demo LOW                 # Run only LOW risk cases")
        print(f"  python main.py demo DEMO-HIGH-001       # Run specific case")
        print(f"  python main.py demo --verbose           # Verbose output")
        print(f"  python main.py serve                    # Start HTTP server on :8001")
        print(f"  python main.py serve --port=9000        # Custom port")
