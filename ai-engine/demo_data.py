"""
demo_data.py – Synthetic Demo Cases
=====================================

15 synthetic demo cases for demonstration and testing:
  - 5 LOW risk cases    (normal, consistent records)
  - 5 MEDIUM risk cases (minor inconsistencies)
  - 5 HIGH risk cases   (multiple risk signals)

Each case includes:
  - A synthetic parcel record (mirrors DB schema)
  - A synthetic document text (mirrors OCR output)
  - Expected approximate risk level

These cases allow the frontend to demo all risk scenarios
without needing real uploaded documents.
"""

from typing import List, Dict, Any


# ─────────────────────────────────────────────
#  LOW Risk Cases (Score ~0–29)
#  All fields consistent, clean records
# ─────────────────────────────────────────────

LOW_RISK_CASES: List[Dict[str, Any]] = [
    {
        "case_id": "DEMO-LOW-001",
        "description": "Clean Sale Deed — all fields match",
        "expected_level": "LOW",
        "parcel": {
            "parcel_id": "MP-BPL-1024",
            "survey_number": "425/1",
            "district": "Bhopal",
            "tehsil": "Huzur",
            "village": "Khajuri Kalan",
            "owner_name": "Ramesh Kumar Sharma",
            "area": 2.5,
            "area_unit": "hectare",
            "land_type": "Agricultural",
            "status": "VERIFIED",
        },
        "document_text": (
            "SALE DEED\n"
            "This deed is executed on 15/03/2024\n"
            "Seller: Ramesh Kumar Sharma\n"
            "Buyer: Suresh Verma\n"
            "Survey No.: 425/1\n"
            "Area: 2.5 Hectare\n"
            "Village: Khajuri Kalan, Tehsil: Huzur, District: Bhopal\n"
            "Registration No.: REG/2024/BPL/14892\n"
        ),
        "document_type": "SALE_DEED",
    },
    {
        "case_id": "DEMO-LOW-002",
        "description": "Ownership Certificate — exact match",
        "expected_level": "LOW",
        "parcel": {
            "parcel_id": "MP-IND-2048",
            "survey_number": "108/3B",
            "district": "Indore",
            "tehsil": "Sanwer",
            "village": "Manglia",
            "owner_name": "Sunita Verma",
            "area": 1.8,
            "area_unit": "hectare",
            "land_type": "Residential",
            "status": "VERIFIED",
        },
        "document_text": (
            "OWNERSHIP CERTIFICATE\n"
            "Owner: Sunita Verma\n"
            "Survey No.: 108/3B\n"
            "Area: 1.8 Hectare\n"
            "Village: Manglia, Tehsil: Sanwer, District: Indore\n"
            "Issue Date: 05/06/2022\n"
        ),
        "document_type": "OWNERSHIP_CERTIFICATE",
    },
    {
        "case_id": "DEMO-LOW-003",
        "description": "Mutation record — consistent with database",
        "expected_level": "LOW",
        "parcel": {
            "parcel_id": "MP-JBP-3096",
            "survey_number": "78/2",
            "district": "Jabalpur",
            "tehsil": "Sihanora",
            "village": "Barela",
            "owner_name": "Vikram Singh Patel",
            "area": 4.2,
            "area_unit": "hectare",
            "land_type": "Agricultural",
            "status": "VERIFIED",
        },
        "document_text": (
            "MUTATION RECORD\n"
            "Owner: Vikram Singh Patel\n"
            "Khasra No.: 78/2\n"
            "Area: 4.2 Hectare\n"
            "Village: Barela, Tehsil: Sihanora, District: Jabalpur\n"
            "Mutation Date: 12/01/2023\n"
        ),
        "document_type": "MUTATION_RECORD",
    },
    {
        "case_id": "DEMO-LOW-004",
        "description": "Gift Deed — names slightly different casing but match",
        "expected_level": "LOW",
        "parcel": {
            "parcel_id": "MP-GWL-4001",
            "survey_number": "212/5",
            "district": "Gwalior",
            "tehsil": "Gwalior",
            "village": "Morar",
            "owner_name": "Meena Devi Tiwari",
            "area": 0.5,
            "area_unit": "hectare",
            "land_type": "Residential",
            "status": "VERIFIED",
        },
        "document_text": (
            "GIFT DEED\n"
            "Grantor: MEENA DEVI TIWARI\n"
            "Grantee: Suresh Tiwari\n"
            "Survey No.: 212/5\n"
            "Area: 0.5 Hectare\n"
            "Village: Morar, Tehsil: Gwalior, District: Gwalior\n"
        ),
        "document_type": "GIFT_DEED",
    },
    {
        "case_id": "DEMO-LOW-005",
        "description": "Inheritance record — consistent ownership transfer",
        "expected_level": "LOW",
        "parcel": {
            "parcel_id": "MP-SAG-5012",
            "survey_number": "321/A",
            "district": "Sagar",
            "tehsil": "Sagar",
            "village": "Motipur",
            "owner_name": "Ramu Lal Yadav",
            "area": 3.0,
            "area_unit": "acre",
            "land_type": "Agricultural",
            "status": "VERIFIED",
        },
        "document_text": (
            "SUCCESSION CERTIFICATE\n"
            "Deceased: Ramu Lal Yadav\n"
            "Heir/Owner: Ramu Lal Yadav\n"
            "Khasra No.: 321/A\n"
            "Area: 3.0 Acre\n"
            "Village: Motipur, Tehsil: Sagar, District: Sagar\n"
        ),
        "document_type": "INHERITANCE_RECORD",
    },
]


# ─────────────────────────────────────────────
#  MEDIUM Risk Cases (Score ~30–59)
#  Minor inconsistencies in one or two fields
# ─────────────────────────────────────────────

MEDIUM_RISK_CASES: List[Dict[str, Any]] = [
    {
        "case_id": "DEMO-MED-001",
        "description": "Area variance ~15% + pending mutation — document shows larger area",
        "expected_level": "MEDIUM",
        "parcel": {
            "parcel_id": "MP-BPL-2001",
            "survey_number": "555/3",
            "district": "Bhopal",
            "tehsil": "Berasia",
            "village": "Semra",
            "owner_name": "Lalita Mishra",
            "area": 2.0,
            "area_unit": "hectare",
            "land_type": "Agricultural",
            "status": "REQUIRES_VERIFICATION",
            "mutation_pending": True,
        },
        "document_text": (
            "SALE DEED\n"
            "Seller: Lalita Mishra\n"
            "Buyer: Pradeep Verma\n"
            "Survey No.: 555/3\n"
            "Area: 2.3 Hectare\n"
            "Village: Semra, Tehsil: Berasia, District: Bhopal\n"
            "Date: 10/05/2024\n"
        ),
        "document_type": "SALE_DEED",
    },
    {
        "case_id": "DEMO-MED-002",
        "description": "Owner name discrepancy + pending mutation check",
        "expected_level": "MEDIUM",
        "parcel": {
            "parcel_id": "MP-IND-6002",
            "survey_number": "99/1",
            "district": "Indore",
            "tehsil": "Mhow",
            "village": "Kanadiya",
            "owner_name": "Mohammad Salim Khan",
            "area": 1.2,
            "area_unit": "hectare",
            "land_type": "Residential",
            "status": "REQUIRES_VERIFICATION",
            "mutation_pending": True,
        },
        "document_text": (
            "OWNERSHIP CERTIFICATE\n"
            "Owner: Salim Akhtar Khan\n"
            "Survey No.: 99/1\n"
            "Area: 1.2 Hectare\n"
            "Village: Kanadiya, Tehsil: Mhow, District: Indore\n"
        ),
        "document_type": "OWNERSHIP_CERTIFICATE",
    },
    {
        "case_id": "DEMO-MED-003",
        "description": "Survey sub-division suffix mismatch (180/2 vs 180/2A) + boundary alteration",
        "expected_level": "MEDIUM",
        "parcel": {
            "parcel_id": "MP-UJJ-7003",
            "survey_number": "180/2",
            "district": "Ujjain",
            "tehsil": "Ujjain",
            "village": "Nanakheda",
            "owner_name": "Pooja Sharma",
            "area": 0.8,
            "area_unit": "hectare",
            "land_type": "Residential",
            "status": "REQUIRES_VERIFICATION",
            "boundary_changed": True,
        },
        "document_text": (
            "SALE DEED\n"
            "Seller: Pooja Sharma\n"
            "Buyer: Amit Patel\n"
            "Survey No.: 180/2A\n"
            "Area: 0.8 Hectare\n"
            "Village: Nanakheda, Tehsil: Ujjain, District: Ujjain\n"
        ),
        "document_type": "SALE_DEED",
    },
    {
        "case_id": "DEMO-MED-004",
        "description": "Document date is older than parcel creation — possible backdating",
        "expected_level": "MEDIUM",
        "parcel": {
            "parcel_id": "MP-RTM-8004",
            "survey_number": "67/B",
            "district": "Ratlam",
            "tehsil": "Ratlam",
            "village": "Kherchi",
            "owner_name": "Deepak Joshi",
            "area": 1.5,
            "area_unit": "acre",
            "land_type": "Agricultural",
            "status": "REQUIRES_VERIFICATION",
            "created_at": "2024-01-01T00:00:00Z",
            "mutation_pending": True,
        },
        "document_text": (
            "MUTATION RECORD\n"
            "Owner: Deepak Joshi\n"
            "Khasra No.: 67/B\n"
            "Area: 1.5 Acre\n"
            "Village: Kherchi, Tehsil: Ratlam, District: Ratlam\n"
            "Date: 10/01/2015\n"  # Predates modern parcel creation
        ),
        "document_type": "MUTATION_RECORD",
    },
    {
        "case_id": "DEMO-MED-005",
        "description": "Missing area field in document + boundary variation",
        "expected_level": "MEDIUM",
        "parcel": {
            "parcel_id": "MP-SHR-9005",
            "survey_number": "44/7",
            "district": "Shivpuri",
            "tehsil": "Shivpuri",
            "village": "Tindoli",
            "owner_name": "Ramkali Bai",
            "area": 2.1,
            "area_unit": "bigha",
            "land_type": "Agricultural",
            "status": "REQUIRES_VERIFICATION",
            "boundary_changed": True,
            "mutation_pending": True,
        },
        "document_text": (
            "LAND RECORD\n"
            "Owner: Ramkali Bai\n"
            "Survey No.: 44/7\n"
            # Note: Area deliberately missing
            "Village: Tindoli, Tehsil: Shivpuri, District: Shivpuri\n"
            "Date: 22/09/2024\n"
        ),
        "document_type": "OWNERSHIP_CERTIFICATE",
    },
]


# ─────────────────────────────────────────────
#  HIGH Risk Cases (Score ~60–100)
#  Multiple significant risk signals
# ─────────────────────────────────────────────

HIGH_RISK_CASES: List[Dict[str, Any]] = [
    {
        "case_id": "DEMO-HIGH-001",
        "description": "Owner mismatch + Area mismatch + pending mutation",
        "expected_level": "HIGH",
        "parcel": {
            "parcel_id": "MP-BPL-3001",
            "survey_number": "425/1",
            "district": "Bhopal",
            "tehsil": "Huzur",
            "village": "Khajuri Kalan",
            "owner_name": "Ramesh Kumar Sharma",
            "area": 2.5,
            "area_unit": "hectare",
            "land_type": "Agricultural",
            "status": "REQUIRES_VERIFICATION",
            "mutation_pending": True,
        },
        "document_text": (
            "SALE DEED\n"
            "Seller: Suresh Kumar\n"    # ← MISMATCH: different name
            "Buyer: Anil Gupta\n"
            "Survey No.: 425/1\n"
            "Area: 3.8 Hectare\n"       # ← MISMATCH: 52% variance
            "Village: Khajuri Kalan, Tehsil: Huzur, District: Bhopal\n"
            "Date: 12/08/2024\n"
        ),
        "document_type": "SALE_DEED",
    },
    {
        "case_id": "DEMO-HIGH-002",
        "description": "Different survey number + district mismatch + boundary alteration",
        "expected_level": "HIGH",
        "parcel": {
            "parcel_id": "MP-IND-4002",
            "survey_number": "108/3B",
            "district": "Indore",
            "tehsil": "Sanwer",
            "village": "Manglia",
            "owner_name": "Sunita Verma",
            "area": 1.8,
            "area_unit": "hectare",
            "land_type": "Residential",
            "status": "REQUIRES_VERIFICATION",
            "boundary_changed": True,
            "mutation_pending": True,
        },
        "document_text": (
            "OWNERSHIP CERTIFICATE\n"
            "Owner: Sunita Verma\n"
            "Survey No.: 205/7A\n"          # ← MISMATCH: completely different
            "Area: 1.8 Hectare\n"
            "Village: Manglia, Tehsil: Sanwer, District: Ujjain\n"  # ← DISTRICT MISMATCH
        ),
        "document_type": "OWNERSHIP_CERTIFICATE",
    },
    {
        "case_id": "DEMO-HIGH-003",
        "description": "Owner mismatch + survey mismatch + area mismatch — triple signal",
        "expected_level": "HIGH",
        "parcel": {
            "parcel_id": "MP-JBP-5003",
            "survey_number": "78/2",
            "district": "Jabalpur",
            "tehsil": "Sihanora",
            "village": "Barela",
            "owner_name": "Vikram Singh Patel",
            "area": 4.2,
            "area_unit": "hectare",
            "land_type": "Agricultural",
            "status": "DISPUTED",
        },
        "document_text": (
            "SALE DEED\n"
            "Seller: Mohan Lal Singh\n"     # ← OWNER MISMATCH
            "Buyer: Priya Sharma\n"
            "Survey No.: 99/5\n"            # ← SURVEY MISMATCH
            "Area: 6.5 Hectare\n"           # ← AREA MISMATCH ~55%
            "Village: Barela, Tehsil: Sihanora, District: Jabalpur\n"
        ),
        "document_type": "SALE_DEED",
    },
    {
        "case_id": "DEMO-HIGH-004",
        "description": "Wrong owner + wrong area + backdated document + mutation pending",
        "expected_level": "HIGH",
        "parcel": {
            "parcel_id": "MP-GWL-6004",
            "survey_number": "301/1",
            "district": "Gwalior",
            "tehsil": "Morar",
            "village": "Padav",
            "owner_name": "Hari Prasad Gupta",
            "area": 3.5,
            "area_unit": "acre",
            "land_type": "Commercial",
            "status": "DISPUTED",
            "created_at": "2024-01-01T00:00:00Z",
            "mutation_pending": True,
        },
        "document_text": (
            "SALE DEED\n"
            "Seller: Ramesh Agarwal\n"      # ← Completely different name
            "Buyer: Kapil Sharma\n"
            "Survey No.: 301/1\n"
            "Area: 5.8 Acre\n"              # ← 65% area mismatch
            "Village: Padav, Tehsil: Morar, District: Gwalior\n"
            "Date: 15/08/2010\n"            # ← Backdated document
        ),
        "document_type": "SALE_DEED",
    },
    {
        "case_id": "DEMO-HIGH-005",
        "description": "Document for entirely different location — possible document substitution",
        "expected_level": "HIGH",
        "parcel": {
            "parcel_id": "MP-SAG-7005",
            "survey_number": "142/2",
            "district": "Sagar",
            "tehsil": "Bina",
            "village": "Khurai",
            "owner_name": "Shyam Sunder Rawat",
            "area": 1.0,
            "area_unit": "hectare",
            "land_type": "Agricultural",
            "status": "DISPUTED",
        },
        "document_text": (
            "OWNERSHIP CERTIFICATE\n"
            "Owner: Mahesh Prasad\n"        # ← Different name
            "Survey No.: 999/1\n"           # ← Different survey
            "Area: 4.5 Acre\n"              # ← Different unit + amount
            "Village: Seoni, Tehsil: Seoni, District: Seoni\n"  # ← Completely different location
            "Date: 22/03/2024\n"
        ),
        "document_type": "OWNERSHIP_CERTIFICATE",
    },
]


# ─────────────────────────────────────────────
#  Combined Access
# ─────────────────────────────────────────────

ALL_DEMO_CASES: List[Dict[str, Any]] = LOW_RISK_CASES + MEDIUM_RISK_CASES + HIGH_RISK_CASES


def get_case_by_id(case_id: str) -> Dict[str, Any]:
    """Look up a demo case by its case_id."""
    for case in ALL_DEMO_CASES:
        if case["case_id"] == case_id:
            return case
    raise KeyError(f"Demo case '{case_id}' not found")


def get_cases_by_level(level: str) -> List[Dict[str, Any]]:
    """Get all demo cases for a given expected risk level (LOW/MEDIUM/HIGH)."""
    level_upper = level.upper()
    return [c for c in ALL_DEMO_CASES if c["expected_level"] == level_upper]


def list_case_ids() -> List[str]:
    """Return all demo case IDs."""
    return [c["case_id"] for c in ALL_DEMO_CASES]


if __name__ == "__main__":
    print(f"Total demo cases: {len(ALL_DEMO_CASES)}")
    print(f"LOW:    {len(LOW_RISK_CASES)} cases → {[c['case_id'] for c in LOW_RISK_CASES]}")
    print(f"MEDIUM: {len(MEDIUM_RISK_CASES)} cases → {[c['case_id'] for c in MEDIUM_RISK_CASES]}")
    print(f"HIGH:   {len(HIGH_RISK_CASES)} cases → {[c['case_id'] for c in HIGH_RISK_CASES]}")
