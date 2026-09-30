"""
seed_demo_cases.py – Seed All 15 Demo Cases via Backend API
=============================================================

This script:
1. Logs into the backend as 'officer'
2. For each of the 15 demo cases:
   a. Creates the parcel record (if it doesn't exist)
   b. Registers the document with extracted data
   c. Triggers risk analysis
3. Reports results

Run: python seed_demo_cases.py

The backend must be running at http://localhost:8000
"""

import sys
import logging
sys.path.insert(0, ".")  # Ensure ai-engine modules are importable

if sys.platform == "win32":
    try:
        if hasattr(sys.stdout, "reconfigure"):
            sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        if hasattr(sys.stderr, "reconfigure"):
            sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

from api_client import BhoomiShieldAPIClient, submit_pipeline_result
from pipeline import run_pipeline_from_text
from demo_data import ALL_DEMO_CASES

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("seed_demo_cases")

BACKEND_URL = "http://localhost:8000/api"
USERNAME = "officer"
PASSWORD = "officer123"


def seed_parcel(client: BhoomiShieldAPIClient, parcel: dict) -> bool:
    """Register a parcel record. Returns True if created, False if already exists."""
    try:
        client.get_parcel(parcel["parcel_id"])
        logger.info(f"  Parcel {parcel['parcel_id']} already exists -- skipping creation")
        return False
    except Exception:
        pass

    try:
        from datetime import datetime, timezone
        # pyrefly: ignore [missing-import]
        import httpx
        payload = {**parcel, "created_at": datetime.now(timezone.utc).isoformat(), "updated_at": datetime.now(timezone.utc).isoformat()}
        client._request("POST", "/parcels", json_body=payload)
        logger.info(f"  Created parcel {parcel['parcel_id']}")
        return True
    except Exception as e:
        logger.warning(f"  Could not create parcel {parcel['parcel_id']}: {e}")
        return False


def run_seeder():
    client = BhoomiShieldAPIClient(base_url=BACKEND_URL)

    # 1. Health check
    try:
        health = client.check_health()
        logger.info(f"Backend status: {health.get('status')}, DB: {health.get('database')}")
    except Exception as e:
        print(f"ERROR: Cannot reach backend at {BACKEND_URL}: {e}")
        print("Ensure the backend is running: uvicorn app.main:app --reload --port 8000")
        sys.exit(1)

    # 2. Authenticate
    try:
        token = client.login(USERNAME, PASSWORD)
        logger.info(f"Authenticated as '{USERNAME}'")
    except Exception as e:
        print(f"ERROR: Login failed: {e}")
        sys.exit(1)

    print(f"\n{'='*60}")
    print(f"  Seeding {len(ALL_DEMO_CASES)} demo cases...")
    print(f"{'='*60}\n")

    success_count = 0
    error_count = 0

    for case in ALL_DEMO_CASES:
        case_id = case["case_id"]
        parcel = case["parcel"]
        print(f"  > {case_id} ({case['expected_level']}) -- {case['description']}")

        try:
            # Step 1: Ensure parcel exists
            seed_parcel(client, parcel)

            # Step 2: Run pipeline
            result = run_pipeline_from_text(
                raw_text=case["document_text"],
                parcel_record=parcel,
                document_type=case["document_type"],
                file_name=f"{case_id.lower()}.txt",
            )

            # Step 3: Submit to backend
            api_result = submit_pipeline_result(result, client, also_trigger_risk_analysis=True)

            doc_id = api_result.get("document_response", {}).get("document_id", "?")
            risk_score = api_result.get("risk_response", {}).get("score", "?")
            risk_level = api_result.get("risk_response", {}).get("level", "?")

            print(f"    [OK] doc={doc_id}, risk={risk_level} (score={risk_score})")
            success_count += 1

        except Exception as e:
            logger.error(f"    [FAIL] Failed: {e}")
            error_count += 1

        print()

    print(f"{'='*60}")
    print(f"  Seeding complete: {success_count} success, {error_count} failed")
    print(f"{'='*60}\n")


if __name__ == "__main__":
    run_seeder()
