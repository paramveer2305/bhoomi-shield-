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

@pytest_asyncio.fixture(scope="function", autouse=True)
async def setup_db():
    mock_client = AsyncMongoMockClient()
    db_instance.client = mock_client
    db_instance.db = mock_client[settings.DATABASE_NAME]
    yield
    if db_instance.client:
        db_instance.client.close()

@pytest.mark.asyncio
async def test_evidence_system():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Create a test parcel and case
        parcel_payload = {
            "parcel_id": "EVD-TEST-PARCEL",
            "survey_number": "555/2",
            "district": "Bhopal",
            "tehsil": "Huzur",
            "village": "Evidence Village",
            "owner_name": "Kailash Chand",
            "area": 1.5,
            "land_type": "Agricultural",
            "status": "VERIFIED"
        }
        p_res = await client.post("/api/parcels", json=parcel_payload)
        assert p_res.status_code in [201, 400]

        case_payload = {
            "parcel_id": "EVD-TEST-PARCEL",
            "title": "Boundary Encroachment Dispute",
            "priority": "HIGH"
        }
        c_res = await client.post("/api/cases", json=case_payload)
        assert c_res.status_code == 201
        case_id = c_res.json()["case_id"]

        # 2. Upload SITE_PHOTO Evidence
        photo_payload = {
            "parcel_id": "EVD-TEST-PARCEL",
            "case_id": case_id,
            "evidence_type": "SITE_PHOTO",
            "file_url": "/static/uploads/site_photo_555.jpg",
            "geo_coordinates": {"latitude": 23.2599, "longitude": 77.4126},
            "uploaded_by": "patwari_verma",
            "notes": "Corner boundary peg photographed on-site."
        }
        res1 = await client.post("/api/evidence", json=photo_payload)
        assert res1.status_code == 201
        data1 = res1.json()
        assert data1["evidence_id"].startswith("EVD-")
        assert data1["evidence_type"] == "SITE_PHOTO"
        assert data1["geo_coordinates"]["latitude"] == 23.2599
        assert "timestamp" in data1

        # 3. Upload BOUNDARY_MEASUREMENT Evidence
        meas_payload = {
            "parcel_id": "EVD-TEST-PARCEL",
            "case_id": case_id,
            "evidence_type": "BOUNDARY_MEASUREMENT",
            "file_url": "/static/uploads/survey_log_555.pdf",
            "geo_coordinates": {"latitude": 23.2601, "longitude": 77.4130},
            "uploaded_by": "patwari_verma",
            "notes": "Total perimeter surveyed: 340 meters."
        }
        res2 = await client.post("/api/evidence", json=meas_payload)
        assert res2.status_code == 201

        # 4. Upload WITNESS_RECORD Evidence
        wit_payload = {
            "parcel_id": "EVD-TEST-PARCEL",
            "case_id": case_id,
            "evidence_type": "WITNESS_RECORD",
            "uploaded_by": "patwari_verma",
            "notes": "Neighboring landowner confirmed boundary stone placement."
        }
        res3 = await client.post("/api/evidence", json=wit_payload)
        assert res3.status_code == 201

        # 5. Retrieve Evidence for Case
        get_res = await client.get(f"/api/evidence/{case_id}")
        assert get_res.status_code == 200
        evidence_list = get_res.json()
        assert len(evidence_list) == 3
        types = [e["evidence_type"] for e in evidence_list]
        assert "SITE_PHOTO" in types
        assert "BOUNDARY_MEASUREMENT" in types
        assert "WITNESS_RECORD" in types

        # 6. Verify invalid evidence type returns 400
        bad_payload = {
            "parcel_id": "EVD-TEST-PARCEL",
            "case_id": case_id,
            "evidence_type": "INVALID_TYPE",
            "notes": "Testing error handling"
        }
        bad_res = await client.post("/api/evidence", json=bad_payload)
        assert bad_res.status_code == 400
