import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

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
async def test_complete_verification_workspace_flow():
    """
    Test the complete flow:
    case -> verification -> evidence -> completion
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Step 1: Create Parcel
        parcel_payload = {
            "parcel_id": "VRF-FLOW-001",
            "survey_number": "108/4",
            "district": "Indore",
            "tehsil": "Sanwer",
            "village": "Kshipra",
            "owner_name": "Ramesh Kumar Sharma",
            "area": 2.25,
            "land_type": "Agricultural",
            "status": "REQUIRES_VERIFICATION"
        }
        p_res = await client.post("/api/parcels", json=parcel_payload)
        assert p_res.status_code in [201, 400]

        # Step 2: Open Case for the parcel
        case_payload = {
            "parcel_id": "VRF-FLOW-001",
            "title": "Suspected Boundary Discrepancy & Overlap",
            "description": "On-ground cadastral inspection required to confirm boundary stones.",
            "priority": "HIGH",
            "assigned_to": "Patwari Rameshwar"
        }
        c_res = await client.post("/api/cases", json=case_payload)
        assert c_res.status_code == 201
        case_data = c_res.json()
        case_id = case_data["case_id"]
        assert case_data["status"] == "OPEN"
        assert case_data["parcel_id"] == "VRF-FLOW-001"

        # Step 3: Attach Evidence using existing evidence system
        evidence_payload = {
            "parcel_id": "VRF-FLOW-001",
            "case_id": case_id,
            "evidence_type": "SITE_PHOTO",
            "file_url": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
            "geo_coordinates": {"latitude": 22.7196, "longitude": 75.8577},
            "uploaded_by": "Patwari Rameshwar",
            "notes": "East boundary landmark stone photo verified on site."
        }
        ev_res = await client.post("/api/evidence", json=evidence_payload)
        assert ev_res.status_code == 201
        ev_data = ev_res.json()
        assert ev_data["evidence_id"].startswith("EVD-")
        assert ev_data["evidence_type"] == "SITE_PHOTO"

        # Verify evidence is retrievable by case
        ev_get = await client.get(f"/api/evidence/{case_id}")
        assert ev_get.status_code == 200
        assert len(ev_get.json()) == 1

        # Step 4: Verify global verification queue endpoint GET /api/verification
        q_res = await client.get("/api/verification")
        assert q_res.status_code == 200
        assert isinstance(q_res.json(), list)

        # Step 5: Submit Verification Record (COMPLETED flow)
        ver_payload = {
            "parcel_id": "VRF-FLOW-001",
            "case_id": case_id,
            "action_taken": "Physical On-site Cadastral Survey & Inspection",
            "notes": "Boundary stone pillars inspected. No encroachment detected on eastern boundary.",
            "status": "COMPLETED",
            "verified_by": "Patwari Rameshwar"
        }
        v_res = await client.post("/api/verification", json=ver_payload)
        assert v_res.status_code == 201
        ver_data = v_res.json()
        assert ver_data["verification_id"].startswith("VER-")
        assert ver_data["status"] == "COMPLETED"
        assert ver_data["verified_by"] == "Patwari Rameshwar"

        # Step 6: Verify Case and Parcel completion
        # Case should now be RESOLVED
        case_check = await client.get(f"/api/cases/{case_id}")
        assert case_check.status_code == 200
        assert case_check.json()["status"] == "RESOLVED"

        # Parcel should now be VERIFIED
        parcel_check = await client.get(f"/api/parcels/VRF-FLOW-001")
        assert parcel_check.status_code == 200
        assert parcel_check.json()["status"] == "VERIFIED"

        # Step 7: Verify History Retrieval
        # Via GET /api/verification (with parcel filter)
        hist_queue = await client.get("/api/verification?parcel_id=VRF-FLOW-001")
        assert hist_queue.status_code == 200
        assert len(hist_queue.json()) >= 1
        assert hist_queue.json()[0]["verification_id"] == ver_data["verification_id"]

        # Via GET /api/verification/{parcel_id}
        hist_res1 = await client.get("/api/verification/VRF-FLOW-001")
        assert hist_res1.status_code == 200
        assert len(hist_res1.json()) >= 1

        # Via GET /api/verification/parcel/{parcel_id}
        hist_res2 = await client.get("/api/verification/parcel/VRF-FLOW-001")
        assert hist_res2.status_code == 200
        assert len(hist_res2.json()) >= 1

@pytest.mark.asyncio
async def test_verification_with_auth_and_escalation():
    """
    Test authenticated officer identity injection and REQUIRES_FURTHER_INVESTIGATION outcome
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Seed user in DB
        db = db_instance.db
        await db.users.insert_one({
            "username": "patwari_singh",
            "email": "singh@revenue.gov.in",
            "full_name": "Shri Vikram Singh",
            "role": "patwari"
        })

        token = create_access_token({"sub": "patwari_singh", "role": "patwari"})
        headers = {"Authorization": f"Bearer {token}"}

        # Seed parcel and case
        await db.parcels.insert_one({
            "parcel_id": "VRF-ESC-002",
            "survey_number": "412/1",
            "district": "Indore",
            "tehsil": "Depalpur",
            "village": "Betma",
            "owner_name": "Suresh Patel",
            "area": 3.0,
            "land_type": "Agricultural",
            "status": "REQUIRES_VERIFICATION"
        })

        await db.cases.insert_one({
            "case_id": "CASE-ESC-002",
            "parcel_id": "VRF-ESC-002",
            "title": "Conflicting Boundary Pillars",
            "status": "OPEN",
            "priority": "URGENT",
            "assigned_to": "Shri Vikram Singh"
        })

        # Submit verification with outcome REQUIRES_FURTHER_INVESTIGATION using Auth header
        ver_payload = {
            "parcel_id": "VRF-ESC-002",
            "case_id": "CASE-ESC-002",
            "action_taken": "Joint Revenue & Panchayat Cross-Check",
            "notes": "Adjoining owner disputes 5 meter strip on Western edge. Boundary stone missing.",
            "status": "REQUIRES_FURTHER_INVESTIGATION"
        }
        res = await client.post("/api/verification", json=ver_payload, headers=headers)
        assert res.status_code == 201
        data = res.json()

        # Verified by should be authenticated user's full_name
        assert data["verified_by"] == "Shri Vikram Singh"
        assert data["status"] == "REQUIRES_FURTHER_INVESTIGATION"

        # Case should be IN_PROGRESS
        case_doc = await db.cases.find_one({"case_id": "CASE-ESC-002"})
        assert case_doc["status"] == "IN_PROGRESS"

        # Parcel should be IN_REVIEW
        parcel_doc = await db.parcels.find_one({"parcel_id": "VRF-ESC-002"})
        assert parcel_doc["status"] == "IN_REVIEW"
