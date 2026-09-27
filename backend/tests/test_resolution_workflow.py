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
async def test_complete_resolution_workflow():
    """
    Test complete Member 3 flow:
    case -> evidence -> verification -> resolution
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Step 1: Create Parcel
        parcel_payload = {
            "parcel_id": "RES-PARCEL-101",
            "survey_number": "77/1",
            "district": "Ujjain",
            "tehsil": "Ghatiya",
            "village": "Jalalabad",
            "owner_name": "Devendra Singh Rajput",
            "area": 4.5,
            "land_type": "Agricultural",
            "status": "DISPUTED"
        }
        p_res = await client.post("/api/parcels", json=parcel_payload)
        assert p_res.status_code in [201, 400]

        # Step 2: Create Active Alert for this parcel
        alert_payload = {
            "parcel_id": "RES-PARCEL-101",
            "severity": "HIGH",
            "title": "Severe Boundary Encroachment Detected",
            "message": "Satellite imagery shows unauthorized trench across northern boundary."
        }
        alt_res = await client.post("/api/alerts", json=alert_payload)
        assert alt_res.status_code == 201
        alert_id = alt_res.json()["alert_id"]
        assert alt_res.json()["status"] == "ACTIVE"

        # Step 3: Create Case for this parcel
        case_payload = {
            "parcel_id": "RES-PARCEL-101",
            "title": "Boundary Encroachment Dispute - Northern Border",
            "description": "Adjudication required regarding Khasra 77/1 boundary stone placement.",
            "priority": "URGENT",
            "assigned_to": "Tehsildar Sharma"
        }
        c_res = await client.post("/api/cases", json=case_payload)
        assert c_res.status_code == 201
        case_data = c_res.json()
        case_id = case_data["case_id"]
        assert case_data["status"] == "OPEN"

        # Step 4: Attach Evidence using existing evidence system
        ev_payload = {
            "parcel_id": "RES-PARCEL-101",
            "case_id": case_id,
            "evidence_type": "SITE_PHOTO",
            "file_url": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
            "geo_coordinates": {"latitude": 23.1765, "longitude": 75.7885},
            "uploaded_by": "Patwari Verma",
            "notes": "North boundary pillar verified; ground marks align with Khasra map."
        }
        ev_res = await client.post("/api/evidence", json=ev_payload)
        assert ev_res.status_code == 201
        assert ev_res.json()["evidence_id"].startswith("EVD-")

        # Step 5: Conduct Field Verification
        ver_payload = {
            "parcel_id": "RES-PARCEL-101",
            "case_id": case_id,
            "action_taken": "Physical On-site Cadastral Survey & Inspection",
            "notes": "Ground survey completed with village panchayat. Discrepancy reconciled.",
            "status": "COMPLETED",
            "verified_by": "Patwari Verma"
        }
        v_res = await client.post("/api/verification", json=ver_payload)
        assert v_res.status_code == 201

        # Step 6: Execute Resolution via POST /api/cases/{case_id}/resolve
        res_payload = {
            "status": "RESOLVED",
            "closing_notes": "Both parties presented title documents. Northern boundary demarcated with permanent pillars in presence of Revenue Inspector. Dispute amicably settled.",
            "legal_remarks": "Under MP Land Revenue Code 1959, Section 110 (Final Adjudication Order Ref: TEH-UJ-2026-88)",
            "resolved_by": "Tehsildar R. K. Sharma"
        }
        res = await client.post(f"/api/cases/{case_id}/resolve", json=res_payload)
        assert res.status_code == 200
        resolved_data = res.json()

        # Validate resolution properties
        assert resolved_data["case_id"] == case_id
        assert resolved_data["status"] == "RESOLVED"
        assert resolved_data["closing_notes"] == res_payload["closing_notes"]
        assert resolved_data["legal_remarks"] == res_payload["legal_remarks"]
        assert resolved_data["resolved_by"] == "Tehsildar R. K. Sharma"
        assert "resolved_at" in resolved_data

        # Verify Associated Active Alert was resolved
        db = db_instance.db
        alert_doc = await db.alerts.find_one({"alert_id": alert_id})
        assert alert_doc["status"] == "RESOLVED"

        # Verify Parcel status is updated to VERIFIED
        parcel_doc = await db.parcels.find_one({"parcel_id": "RES-PARCEL-101"})
        assert parcel_doc["status"] == "VERIFIED"

        # Verify Parcel Event is logged
        event_doc = await db.parcel_events.find_one({
            "parcel_id": "RES-PARCEL-101",
            "event_type": "CASE_RESOLVED"
        })
        assert event_doc is not None
        assert event_doc["actor"] == "Tehsildar R. K. Sharma"
        assert event_doc["metadata"]["case_id"] == case_id
        assert event_doc["metadata"]["status"] == "RESOLVED"

@pytest.mark.asyncio
async def test_resolve_with_auth_and_closure():
    """
    Test resolving with JWT authentication and status CLOSED
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        db = db_instance.db
        # Seed magistrate user
        await db.users.insert_one({
            "username": "tehsildar_gupta",
            "email": "gupta@revenue.gov.in",
            "full_name": "Dr. Ananya Gupta",
            "role": "tehsildar"
        })

        token = create_access_token({"sub": "tehsildar_gupta", "role": "tehsildar"})
        headers = {"Authorization": f"Bearer {token}"}

        # Seed parcel and case
        await db.parcels.insert_one({
            "parcel_id": "PARCEL-CLS-999",
            "survey_number": "12/A",
            "district": "Bhopal",
            "tehsil": "Huzur",
            "village": "Arera",
            "owner_name": "Smt. Sunita Verma",
            "area": 1.2,
            "land_type": "Residential",
            "status": "REQUIRES_VERIFICATION"
        })

        await db.cases.insert_one({
            "case_id": "CASE-CLS-999",
            "parcel_id": "PARCEL-CLS-999",
            "title": "Title Ownership Claim Investigation",
            "status": "IN_PROGRESS",
            "priority": "HIGH",
            "assigned_to": "Dr. Ananya Gupta",
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        })

        # Resolve with status CLOSED using Auth header
        payload = {
            "status": "CLOSED",
            "closing_notes": "Title deed registered and verified with sub-registrar records. Case formally closed.",
            "legal_remarks": "Order Ref: SUB-REG-BPL-2026-44"
        }
        res = await client.post("/api/cases/CASE-CLS-999/resolve", json=payload, headers=headers)
        assert res.status_code == 200
        data = res.json()

        # Resolved by should automatically take user's full_name
        assert data["resolved_by"] == "Dr. Ananya Gupta"
        assert data["status"] == "CLOSED"

        # Test non-existent case returns 404
        bad_res = await client.post("/api/cases/NON-EXISTENT/resolve", json=payload, headers=headers)
        assert bad_res.status_code == 404
