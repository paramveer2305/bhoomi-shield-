import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from datetime import datetime, timezone
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from mongomock_motor import AsyncMongoMockClient
from app.main import app
from app.database import db_instance
from app.config import settings
from app.utils.auth import create_access_token

@pytest_asyncio.fixture(scope="function", autouse=True)
async def setup_db():
    mock_client = AsyncMongoMockClient()
    db_instance.client = mock_client
    db_instance.db = mock_client[settings.DATABASE_NAME]
    yield
    if db_instance.client:
        db_instance.client.close()

@pytest.mark.asyncio
async def test_member3_complete_end_to_end_workflow():
    """
    Test the full Member 3 integrated lifecycle:
    1. Risk Analysis
    2. Risk History
    3. Risk Trend
    4. Early Warning & Alert
    5. Case Creation & Status Transitions
    6. Field Verification Workspace
    7. Evidence Tracking & Attachment
    8. Resolution Workflow & Closure
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Create an authorized officer user and generate JWT token
        db = db_instance.db
        await db.users.insert_one({
            "username": "officer_patel",
            "email": "patel@revenue.mp.gov.in",
            "full_name": "Smt. Priya Patel",
            "role": "officer"
        })
        token = create_access_token({"sub": "officer_patel", "role": "officer"})
        auth_headers = {"Authorization": f"Bearer {token}"}

        # Step 0: Register Parcel & Initial Deed
        parcel_payload = {
            "parcel_id": "M3-FULL-PARCEL-001",
            "survey_number": "301/2",
            "district": "Indore",
            "tehsil": "Mhow",
            "village": "Harniya Khedi",
            "owner_name": "Bhagwandas Choudhary",
            "area": 5.0,
            "land_type": "Agricultural",
            "status": "VERIFIED"
        }
        res_p = await client.post("/api/parcels", json=parcel_payload)
        assert res_p.status_code in [201, 400]

        # Register document with mismatch to trigger risk
        doc_payload = {
            "parcel_id": "M3-FULL-PARCEL-001",
            "document_type": "SALE_DEED",
            "file_name": "deed_301.pdf",
            "extracted_data": {
                "owner_name": "Bhagwandas Patidar", # Slight mismatch
                "area": 6.2,                         # 6.2 vs 5.0 discrepancy
                "survey_number": "301/2"
            }
        }
        res_doc = await client.post("/api/documents/register-json", json=doc_payload)
        assert res_doc.status_code == 201

        # Step 1: Risk Analysis
        res_risk1 = await client.post("/api/risk/analyze/M3-FULL-PARCEL-001")
        assert res_risk1.status_code == 200
        risk1 = res_risk1.json()
        assert risk1["parcel_id"] == "M3-FULL-PARCEL-001"
        assert risk1["score"] > 0
        assert len(risk1["reasons"]) > 0

        # Step 2: Risk History
        res_hist1 = await client.get("/api/risk/M3-FULL-PARCEL-001/history")
        assert res_hist1.status_code == 200
        hist1 = res_hist1.json()
        assert len(hist1) >= 1
        assert hist1[0]["parcel_id"] == "M3-FULL-PARCEL-001"

        # Step 3: Risk Trend
        # Second analysis with additional discrepancy to test INCREASING trend
        await db.parcels.update_one({"parcel_id": "M3-FULL-PARCEL-001"}, {"$set": {"status": "DISPUTED"}})
        res_risk2 = await client.post("/api/risk/analyze/M3-FULL-PARCEL-001")
        assert res_risk2.status_code == 200
        risk2 = res_risk2.json()
        assert risk2["trend"] in ["INCREASING", "STABLE", "DECREASING"]

        # Step 4: Early Warning & Alert
        alert_payload = {
            "parcel_id": "M3-FULL-PARCEL-001",
            "severity": "HIGH",
            "title": "Discrepancy in Boundary & Ownership Title",
            "message": "AI Engine identified 1.2 acre area variance and owner mismatch."
        }
        res_alt = await client.post("/api/alerts", json=alert_payload)
        assert res_alt.status_code == 201
        alert_data = res_alt.json()
        alert_id = alert_data["alert_id"]
        assert alert_data["status"] == "ACTIVE"

        # Verify alerts query with parcel_id
        res_alt_list = await client.get("/api/alerts?parcel_id=M3-FULL-PARCEL-001&status=ACTIVE")
        assert res_alt_list.status_code == 200
        assert len(res_alt_list.json()) >= 1

        # Step 5: Case Creation & Priority Filtering
        case_payload = {
            "parcel_id": "M3-FULL-PARCEL-001",
            "title": "Khasra 301/2 Discrepancy Investigation",
            "description": "Area variance and title mismatch requiring on-site patwari survey.",
            "priority": "HIGH",
            "assigned_to": "Smt. Priya Patel"
        }
        res_case = await client.post("/api/cases", json=case_payload)
        assert res_case.status_code == 201
        case_data = res_case.json()
        case_id = case_data["case_id"]
        assert case_data["status"] == "OPEN"

        # Verify parcel status transitioned to REQUIRES_VERIFICATION
        p_check1 = await client.get("/api/parcels/M3-FULL-PARCEL-001")
        assert p_check1.status_code == 200
        assert p_check1.json()["status"] == "REQUIRES_VERIFICATION"

        # Verify priority filtering works on cases endpoint
        res_prio = await client.get("/api/cases?priority=HIGH")
        assert res_prio.status_code == 200
        assert any(c["case_id"] == case_id for c in res_prio.json())

        # Step 6: Evidence Attachment
        evidence_payload = {
            "parcel_id": "M3-FULL-PARCEL-001",
            "case_id": case_id,
            "evidence_type": "BOUNDARY_MEASUREMENT",
            "file_url": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
            "geo_coordinates": {"latitude": 22.5539, "longitude": 75.7648},
            "uploaded_by": "Smt. Priya Patel",
            "notes": "Field tape survey confirmed perimeter boundary stones."
        }
        res_ev = await client.post("/api/evidence", json=evidence_payload, headers=auth_headers)
        assert res_ev.status_code == 201
        assert res_ev.json()["case_id"] == case_id
        assert res_ev.json()["evidence_type"] == "BOUNDARY_MEASUREMENT"

        # Verify evidence retrieval by case
        res_ev_get = await client.get(f"/api/evidence/{case_id}")
        assert res_ev_get.status_code == 200
        assert len(res_ev_get.json()) >= 1

        # Step 7: Field Verification
        ver_payload = {
            "parcel_id": "M3-FULL-PARCEL-001",
            "case_id": case_id,
            "action_taken": "Physical Cadastral Boundary Survey",
            "notes": "Boundary stone markers verified on-site. Area confirmed as exactly 5.0 acres.",
            "status": "COMPLETED"
        }
        res_ver = await client.post("/api/verification", json=ver_payload, headers=auth_headers)
        assert res_ver.status_code == 201
        ver_data = res_ver.json()
        assert ver_data["verification_id"].startswith("VER-")
        # Ensure authenticated officer identity was used instead of hardcoded demo
        assert ver_data["verified_by"] == "Smt. Priya Patel"
        assert ver_data["status"] == "COMPLETED"

        # Verify global verification queue
        res_ver_q = await client.get("/api/verification?parcel_id=M3-FULL-PARCEL-001")
        assert res_ver_q.status_code == 200
        assert len(res_ver_q.json()) >= 1

        # Step 8: Resolution Workflow & Closure
        res_payload = {
            "status": "RESOLVED",
            "closing_notes": "Title rectified. Typographical error in sale deed corrected. Ground boundary matches village Khasra map.",
            "legal_remarks": "Under MP Land Revenue Code 1959, Section 110 (Dispute Adjudication Order Ref: TEH-MHOW-2026-102)"
        }
        res_resolve = await client.post(f"/api/cases/{case_id}/resolve", json=res_payload, headers=auth_headers)
        assert res_resolve.status_code == 200
        resolved_case = res_resolve.json()

        # Check resolution fields
        assert resolved_case["status"] == "RESOLVED"
        assert resolved_case["closing_notes"] == res_payload["closing_notes"]
        assert resolved_case["legal_remarks"] == res_payload["legal_remarks"]
        assert resolved_case["resolved_by"] == "Smt. Priya Patel"
        assert "resolved_at" in resolved_case

        # Check that associated alert status transitioned to RESOLVED
        alert_doc = await db.alerts.find_one({"alert_id": alert_id})
        assert alert_doc["status"] == "RESOLVED"

        # Check that parcel status transitioned to VERIFIED
        parcel_doc = await db.parcels.find_one({"parcel_id": "M3-FULL-PARCEL-001"})
        assert parcel_doc["status"] == "VERIFIED"

        # Check that parcel timeline event was recorded
        timeline_event = await db.parcel_events.find_one({
            "parcel_id": "M3-FULL-PARCEL-001",
            "event_type": "CASE_RESOLVED"
        })
        assert timeline_event is not None
        assert timeline_event["actor"] == "Smt. Priya Patel"
        assert timeline_event["metadata"]["case_id"] == case_id
