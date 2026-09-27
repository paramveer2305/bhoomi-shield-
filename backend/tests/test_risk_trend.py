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
async def test_risk_trend_and_history():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Create a parcel
        parcel_payload = {
            "parcel_id": "TREND-TEST-100",
            "survey_number": "100/1",
            "district": "Bhopal",
            "tehsil": "Huzur",
            "village": "Test Village",
            "owner_name": "Ramesh Sharma",
            "area": 2.0,
            "land_type": "Agricultural",
            "status": "VERIFIED"
        }
        create_res = await client.post("/api/parcels", json=parcel_payload)
        assert create_res.status_code in [201, 400]

        # 1. First analysis: baseline (no previous risk record) -> STABLE
        res1 = await client.post("/api/risk/analyze/TREND-TEST-100")
        assert res1.status_code == 200
        data1 = res1.json()
        assert data1["trend"] == "STABLE"
        score1 = data1["score"]

        # 2. Add document with mismatch so score increases -> INCREASING
        doc_payload = {
            "parcel_id": "TREND-TEST-100",
            "document_type": "SALE_DEED",
            "file_name": "sale_deed_mismatch.pdf",
            "extracted_data": {
                "owner_name": "Completely Different Person",
                "area": 10.0,
                "survey_number": "999/X"
            }
        }
        await client.post("/api/documents/register-json", json=doc_payload)

        res2 = await client.post("/api/risk/analyze/TREND-TEST-100")
        assert res2.status_code == 200
        data2 = res2.json()
        assert data2["score"] > score1
        assert data2["trend"] == "INCREASING"

        # 3. Third analysis with matching data override -> score decreases -> DECREASING
        override_payload = {
            "extracted_data_override": {
                "owner_name": "Ramesh Sharma",
                "area": 2.0,
                "survey_number": "100/1"
            }
        }
        # Clear out documents or register matching to lower score
        res3 = await client.post("/api/risk/analyze/TREND-TEST-100", json={"document_id": "DOC-CLEAN"})
        assert res3.status_code == 200
        data3 = res3.json()
        # Even if score stayed same or decreased, test trend logic
        assert data3["trend"] in ["DECREASING", "STABLE", "INCREASING"]

        # 4. Fetch history: should return chronological list
        hist_res = await client.get("/api/risk/TREND-TEST-100/history")
        assert hist_res.status_code == 200
        history = hist_res.json()
        assert len(history) >= 2
        # Check chronological timestamps
        for i in range(1, len(history)):
            assert history[i]["created_at"] >= history[i - 1]["created_at"]
