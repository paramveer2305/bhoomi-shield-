# BHOOMI-SHIELD API Contract & Integration Specifications

**Version:** 1.0.0  
**Target Audience:** Frontend Developers, AI/OCR Module Engineers, Case Management Developers  
**Base URL:** `http://localhost:8000/api`

---

## Important System Directives & Terminology

BHOOMI-SHIELD is a **decision-support early warning system**. It does **NOT** legally prove fraud, ownership, or guilt.

All clients integrating with this API **MUST** use decision-support phrasing:
- `potential inconsistency`
- `risk signal`
- `requires verification`
- `verification recommended`
- `decision-support`

---

## Data Entities & Shared Identifiers

`parcel_id` serves as the primary central relation across all collections (e.g., `MP-BPL-1024`).

A parcel is linked to:
- Documents (`document_id`)
- Parcel Events / Timeline (`event_id`)
- Risk Analyses (`risk_id`)
- Early Warning Alerts (`alert_id`)
- Verification Cases (`case_id`)
- Verification Log Records (`verification_id`)

---

## Endpoints Overview

| Method | Endpoint | Description | Role / Consumer |
|---|---|---|---|
| `GET` | `/api/health` | Service & DB Health Check | All / System |
| `POST` | `/api/auth/register` | Register User | All |
| `POST` | `/api/auth/login` | Authenticate User & obtain JWT | All |
| `GET` | `/api/auth/me` | Fetch Current User Profile | Auth Clients |
| `GET` | `/api/parcels` | List / Query Parcels | Frontend |
| `POST` | `/api/parcels` | Register New Parcel Master Record | Frontend / Officer |
| `GET` | `/api/parcels/{parcel_id}` | Get Detailed Parcel Record | Frontend |
| `PUT` | `/api/parcels/{parcel_id}` | Update Parcel Master Record | Frontend / Officer |
| `GET` | `/api/parcels/{parcel_id}/timeline` | Retrieve Chronological Parcel Event Stream | Frontend |
| `POST` | `/api/documents/upload` | Upload Document (Multipart/Form) | Frontend / User |
| `POST` | `/api/documents/register-json` | Direct AI Extraction JSON Ingestion | AI / OCR Engine |
| `GET` | `/api/documents/{parcel_id}` | List Documents for Parcel | Frontend / AI |
| `POST` | `/api/risk/analyze/{parcel_id}` | Trigger Comparative AI Risk Engine Evaluation | AI Engine / Frontend |
| `GET` | `/api/risk/{parcel_id}` | Get Latest Explainable Risk Analysis | Frontend |
| `GET` | `/api/alerts` | List Early Warning Alerts | Frontend / Dashboard |
| `POST` | `/api/alerts` | Raise Early Warning Alert | System / Officer |
| `PATCH` | `/api/alerts/{alert_id}` | Acknowledge / Resolve Alert | Frontend / Officer |
| `GET` | `/api/cases` | List Verification Cases | Case Management |
| `POST` | `/api/cases` | Create Verification Case | Case Management / Officer |
| `GET` | `/api/cases/{case_id}` | Get Case Details | Case Management |
| `PATCH` | `/api/cases/{case_id}` | Update Case Status / Assignment | Case Management |
| `POST` | `/api/verification` | Log Officer Verification Action | Case Management / Officer |
| `GET` | `/api/verification/{parcel_id}` | List Verification Audit Logs for Parcel | Frontend / Officer |

---

## Detailed Endpoint Specifications

### 1. Health Check
`GET /api/health`

**Response (`200 OK`):**
```json
{
  "status": "healthy",
  "system": "BHOOMI-SHIELD Risk Intelligence API",
  "database": "connected"
}
```

---

### 2. Parcels API

#### `GET /api/parcels`
Query parameters:
- `district` (optional string)
- `tehsil` (optional string)
- `village` (optional string)
- `status` (optional: `VERIFIED`, `REQUIRES_VERIFICATION`, `DISPUTED`)
- `limit` (default 50)
- `skip` (default 0)

**Response (`200 OK`):**
```json
[
  {
    "parcel_id": "MP-BPL-1024",
    "survey_number": "425/1",
    "district": "Bhopal",
    "tehsil": "Huzur",
    "village": "Khajuri Kalan",
    "owner_name": "Ramesh Kumar Sharma",
    "area": 2.5,
    "land_type": "Agricultural",
    "latitude": 23.2599,
    "longitude": 77.4126,
    "status": "VERIFIED",
    "created_at": "2026-09-26T12:00:00Z",
    "updated_at": "2026-09-26T12:00:00Z"
  }
]
```

#### `POST /api/parcels`
**Request Body:**
```json
{
  "parcel_id": "MP-BPL-1024",
  "survey_number": "425/1",
  "district": "Bhopal",
  "tehsil": "Huzur",
  "village": "Khajuri Kalan",
  "owner_name": "Ramesh Kumar Sharma",
  "area": 2.5,
  "land_type": "Agricultural",
  "latitude": 23.2599,
  "longitude": 77.4126,
  "status": "VERIFIED"
}
```

#### `GET /api/parcels/{parcel_id}/timeline`
**Response (`200 OK`):**
```json
[
  {
    "event_id": "EVT-8A2F11",
    "parcel_id": "MP-BPL-1024",
    "event_type": "DOCUMENT_UPLOADED",
    "title": "Document Uploaded (SALE_DEED)",
    "description": "New document 'sale_deed_425.pdf' uploaded for parcel MP-BPL-1024",
    "timestamp": "2026-09-26T12:05:00Z",
    "actor": "USER",
    "metadata": {
      "document_id": "DOC-A12B34"
    }
  }
]
```

---

### 3. Documents & AI Integration API

#### `POST /api/documents/register-json` (AI Engine Direct Endpoint)
**Request Body:**
```json
{
  "parcel_id": "MP-BPL-1024",
  "document_type": "SALE_DEED",
  "file_name": "sale_deed_scan.pdf",
  "file_url": "/static/uploads/sale_deed_scan.pdf",
  "extracted_data": {
    "owner_name": "Ramesh K. Sharma",
    "buyer_name": "Suresh Verma",
    "area": 2.5,
    "survey_number": "425/1",
    "document_date": "2026-08-15"
  }
}
```

**Response (`201 Created`):**
```json
{
  "document_id": "DOC-E49A21",
  "parcel_id": "MP-BPL-1024",
  "document_type": "SALE_DEED",
  "file_name": "sale_deed_scan.pdf",
  "file_url": "/static/uploads/sale_deed_scan.pdf",
  "extracted_data": {
    "owner_name": "Ramesh K. Sharma",
    "buyer_name": "Suresh Verma",
    "area": 2.5,
    "survey_number": "425/1"
  },
  "upload_date": "2026-09-26T12:10:00Z",
  "verification_status": "PENDING_VERIFICATION"
}
```

---

### 4. AI Risk Analysis API

#### `POST /api/risk/analyze/{parcel_id}`
Triggers comparative evaluation between stored parcel record and extracted document metadata.

**Optional Request Body:**
```json
{
  "extracted_data_override": {
    "owner_name": "Suresh Verma",
    "area": 3.8
  }
}
```

**Response (`200 OK`):**
```json
{
  "risk_id": "RSK-991A8F",
  "parcel_id": "MP-BPL-1024",
  "score": 82,
  "level": "HIGH",
  "trend": "INCREASING",
  "reasons": [
    {
      "factor": "OWNER_MISMATCH",
      "impact": 25,
      "description": "Potential inconsistency: Extracted name 'Suresh Verma' differs from registered parcel owner 'Ramesh Kumar Sharma'. Verification recommended."
    },
    {
      "factor": "AREA_MISMATCH",
      "impact": 15,
      "description": "Potential inconsistency: Document states area as 3.8 units, whereas stored record indicates 2.5 units. Requires verification."
    }
  ],
  "recommended_actions": [
    "Verify ownership chain and title deed validity with local Revenue Registrar",
    "Check latest mutation entry in Sub-Registrar Office ledger",
    "Conduct physical ground measurement or GIS boundary verification"
  ],
  "created_at": "2026-09-26T12:15:00Z"
}
```

---

### 5. Verification Case Management API

#### `POST /api/cases`
**Request Body:**
```json
{
  "parcel_id": "MP-BPL-1024",
  "title": "Investigate Land Area Discrepancy",
  "description": "AI analysis surfaced 1.3 acre variance between deed and registered record.",
  "priority": "HIGH",
  "assigned_to": "officer_sharma"
}
```

**Response (`201 Created`):**
```json
{
  "case_id": "CASE-44B12C",
  "parcel_id": "MP-BPL-1024",
  "title": "Investigate Land Area Discrepancy",
  "description": "AI analysis surfaced 1.3 acre variance between deed and registered record.",
  "status": "OPEN",
  "priority": "HIGH",
  "assigned_to": "officer_sharma",
  "risk_level": "HIGH",
  "created_at": "2026-09-26T12:20:00Z",
  "updated_at": "2026-09-26T12:20:00Z"
}
```

#### `POST /api/verification`
Logs officer verification notes and updates case/parcel status when completed.

**Request Body:**
```json
{
  "parcel_id": "MP-BPL-1024",
  "case_id": "CASE-44B12C",
  "action_taken": "Revenue Registry Physical Ledger Audit",
  "notes": "Checked Tehsil Registry Volume 412, Folio 89. Sale deed amendment was lawfully logged. Discrepancy cleared.",
  "status": "COMPLETED"
}
```

**Response (`201 Created`):**
```json
{
  "verification_id": "VER-772D1A",
  "parcel_id": "MP-BPL-1024",
  "case_id": "CASE-44B12C",
  "action_taken": "Revenue Registry Physical Ledger Audit",
  "notes": "Checked Tehsil Registry Volume 412, Folio 89. Sale deed amendment was lawfully logged. Discrepancy cleared.",
  "verified_by": "REVENUE_OFFICER_DEMO",
  "status": "COMPLETED",
  "timestamp": "2026-09-26T12:25:00Z"
}
```

---

## Standard Error Response Format

All error responses strictly follow this layout:

```json
{
  "error": {
    "code": 404,
    "message": "Parcel record 'MP-BPL-9999' not found",
    "path": "/api/parcels/MP-BPL-9999"
  }
}
```

HTTP Status Codes:
- `400 Bad Request`: Invalid parameters or duplicate records.
- `401 Unauthorized`: Missing or expired JWT credentials.
- `403 Forbidden`: Insufficient role permissions.
- `404 Not Found`: Entity not found.
- `422 Unprocessable Entity`: Schema validation errors.
- `500 Internal Server Error`: Server exception (details logged internally).
