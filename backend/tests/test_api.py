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
async def test_health_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["database"] == "connected"

@pytest.mark.asyncio
async def test_parcel_workflow():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Create Parcel
        parcel_payload = {
            "parcel_id": "TEST-PARCEL-999",
            "survey_number": "999/A",
            "district": "Bhopal",
            "tehsil": "Huzur",
            "village": "Test Village",
            "owner_name": "Rajesh Kumar",
            "area": 3.0,
            "land_type": "Agricultural",
            "latitude": 23.25,
            "longitude": 77.41,
            "status": "VERIFIED"
        }
        res = await client.post("/api/parcels", json=parcel_payload)
        assert res.status_code in [201, 400]

        # 2. Get Parcel
        res = await client.get("/api/parcels/TEST-PARCEL-999")
        assert res.status_code == 200
        data = res.json()
        assert data["owner_name"] == "Rajesh Kumar"

        # 3. Register Document with Inconsistent Extracted Data (Owner mismatch + area discrepancy)
        doc_payload = {
            "parcel_id": "TEST-PARCEL-999",
            "document_type": "SALE_DEED",
            "file_name": "sale_deed_test.pdf",
            "extracted_data": {
                "owner_name": "Suresh Verma", # Inconsistent owner
                "area": 4.5,                  # Discrepancy: 4.5 vs 3.0
                "survey_number": "999/A"
            }
        }
        res = await client.post("/api/documents/register-json", json=doc_payload)
        assert res.status_code == 201
        doc_data = res.json()
        assert doc_data["document_id"].startswith("DOC-")

        # 4. Trigger Risk Analysis
        res = await client.post("/api/risk/analyze/TEST-PARCEL-999")
        assert res.status_code == 200
        risk_data = res.json()
        assert risk_data["parcel_id"] == "TEST-PARCEL-999"
        assert risk_data["score"] > 0
        assert len(risk_data["reasons"]) > 0
        assert len(risk_data["recommended_actions"]) > 0

        # 5. Fetch Risk Report & History
        res = await client.get("/api/risk/TEST-PARCEL-999")
        assert res.status_code == 200
        assert res.json()["score"] == risk_data["score"]

        res_hist = await client.get("/api/risk/TEST-PARCEL-999/history")
        assert res_hist.status_code == 200
        history = res_hist.json()
        assert len(history) >= 1
        assert history[0]["parcel_id"] == "TEST-PARCEL-999"
        assert "score" in history[0]
        assert "reasons" in history[0]
        assert "created_at" in history[0]

        # 6. Fetch Parcel Timeline
        res = await client.get("/api/parcels/TEST-PARCEL-999/timeline")
        assert res.status_code == 200
        events = res.json()
        assert len(events) >= 2

        # 7. Create Case
        case_payload = {
            "parcel_id": "TEST-PARCEL-999",
            "title": "Discrepancy Investigation Case",
            "description": "Owner name and area mismatch found during AI document scan.",
            "priority": "HIGH"
        }
        res = await client.post("/api/cases", json=case_payload)
        assert res.status_code == 201
        case_data = res.json()
        case_id = case_data["case_id"]

        # 8. Submit Officer Verification Record
        ver_payload = {
            "parcel_id": "TEST-PARCEL-999",
            "case_id": case_id,
            "action_taken": "Physical Ledger Cross-Check",
            "notes": "Verified original registry ledger. Discrepancy resolved.",
            "status": "COMPLETED"
        }
        res = await client.post("/api/verification", json=ver_payload)
        assert res.status_code == 201
        ver_data = res.json()
        assert ver_data["status"] == "COMPLETED"

        # 9. Verify Case is RESOLVED
        res = await client.get(f"/api/cases/{case_id}")
        assert res.status_code == 200
        assert res.json()["status"] == "RESOLVED"

@pytest.mark.asyncio
async def test_stats_and_priority_filter():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Create a parcel
        p_res = await client.post("/api/parcels", json={
            "parcel_id": "STAT-P-001",
            "survey_number": "11/2",
            "district": "Dewas",
            "tehsil": "Sonkatch",
            "village": "Pipri",
            "owner_name": "Gopal Sharma",
            "area": 2.0,
            "land_type": "Agricultural"
        })
        assert p_res.status_code in [201, 400]

        # Create two cases with different priorities
        await client.post("/api/cases", json={
            "parcel_id": "STAT-P-001",
            "title": "High Priority Task",
            "priority": "HIGH"
        })
        await client.post("/api/cases", json={
            "parcel_id": "STAT-P-001",
            "title": "Low Priority Task",
            "priority": "LOW"
        })

        # Test priority filter
        high_cases = await client.get("/api/cases?priority=HIGH")
        assert high_cases.status_code == 200
        assert all(c["priority"] == "HIGH" for c in high_cases.json())
        assert len(high_cases.json()) >= 1

        low_cases = await client.get("/api/cases?priority=LOW")
        assert low_cases.status_code == 200
        assert all(c["priority"] == "LOW" for c in low_cases.json())
        assert len(low_cases.json()) >= 1

        # Run risk analysis to populate risk_analysis collection
        await client.post("/api/risk/analyze/STAT-P-001")

        # Submit verification to populate verification_records collection
        await client.post("/api/verification", json={
            "parcel_id": "STAT-P-001",
            "action_taken": "Ground Inspection",
            "notes": "Verified boundary.",
            "status": "COMPLETED"
        })

        # Test stats dashboard endpoint returns correct counts from risk_analysis and verification_records
        stats_res = await client.get("/api/stats/dashboard")
        assert stats_res.status_code == 200
        stats = stats_res.json()
        assert stats["total_parcels"] >= 1
        assert stats["risk_analyses"] >= 1
        assert stats["verifications"] >= 1

        # Test export parcel report using risk_analysis and verification_records
        export_res = await client.post("/api/parcels/STAT-P-001/export")
        assert export_res.status_code == 200
        export_data = export_res.json()
        assert export_data["risk_analysis"] is not None
        assert export_data["verifications_count"] >= 1

