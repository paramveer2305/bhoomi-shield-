"""
extractor.py – Structured Information Extraction
=================================================

Parses raw OCR text and extracts the following fields:

  owner_name          – Registered land owner
  survey_number       – Khasra/Survey number (e.g., "425/1")
  area                – Numeric land area
  area_unit           – Unit of area (hectare, acre, bigha, etc.)
  village             – Village name
  tehsil              – Tehsil/Taluka name
  district            – District name
  document_date       – Date appearing in the document
  document_type       – Inferred type (SALE_DEED, MUTATION, etc.)
  transaction_type    – SALE, GIFT, INHERITANCE, MORTGAGE, etc.
  seller_name         – Seller in transaction documents
  buyer_name          – Buyer in transaction documents
  registration_number – Document registration number
  stamp_duty_paid     – Stamp duty amount

Returns structured dict. All fields are Optional — missing = None.
"""

import re
import logging
from typing import Optional, Dict, Any

logger = logging.getLogger("ai_engine.extractor")


# ─────────────────────────────────────────────
#  Document Type Keywords
# ─────────────────────────────────────────────

DOCUMENT_TYPE_KEYWORDS = {
    "SALE_DEED": ["sale deed", "conveyance deed", "sale agreement", "agreement to sell"],
    "MUTATION_DOCUMENT": ["mutation document", "mutation record", "mutation", "dakhil kharij", "intkal", "khasra bahi"],
    "MUTATION_RECORD": ["mutation document", "mutation record", "mutation", "dakhil kharij", "intkal", "khasra bahi"],
    "OWNERSHIP_DOCUMENT": ["ownership document", "ownership certificate", "patta", "land patta", "adhikar abhilekh"],
    "OWNERSHIP_CERTIFICATE": ["ownership document", "ownership certificate", "patta", "land patta", "adhikar abhilekh"],
    "LAND_RECORD": ["land record", "bhoomi record", "khasra khatauni", "jamabandi", "ror", "record of rights", "land register"],
    "SURVEY_DOCUMENT": ["survey document", "survey settlement", "settlement record", "khasra naksha", "cadastral map"],
    "POWER_OF_ATTORNEY": ["power of attorney", "poa", "general power", "special power"],
    "GIFT_DEED": ["gift deed", "deed of gift", "daan patra"],
    "MORTGAGE_DEED": ["mortgage deed", "hypothecation", "bandhan patra"],
    "INHERITANCE_RECORD": ["succession certificate", "succession", "will", "probate", "inheritance", "varasat"],
}

DOCUMENT_TYPE_DISPLAY_NAMES = {
    "SALE_DEED": "Sale Deed",
    "MUTATION_DOCUMENT": "Mutation Document",
    "MUTATION_RECORD": "Mutation Document",
    "OWNERSHIP_DOCUMENT": "Ownership Document",
    "OWNERSHIP_CERTIFICATE": "Ownership Document",
    "LAND_RECORD": "Land Record",
    "SURVEY_DOCUMENT": "Survey Document",
    "POWER_OF_ATTORNEY": "Power of Attorney",
    "GIFT_DEED": "Gift Deed",
    "MORTGAGE_DEED": "Mortgage Deed",
    "INHERITANCE_RECORD": "Inheritance Record",
    "UNKNOWN": "Land Document",
}

TRANSACTION_TYPE_KEYWORDS = {
    "SALE": ["sale", "purchase", "sold", "bought", "buyer", "seller"],
    "GIFT": ["gift", "gifted", "donated", "daan"],
    "INHERITANCE": ["inherit", "succession", "will", "heir", "varasat"],
    "MORTGAGE": ["mortgage", "hypothecate", "pledge", "lien"],
    "LEASE": ["lease", "rent", "tenancy", "licence"],
    "EXCHANGE": ["exchange", "swap", "barter"],
}


# ─────────────────────────────────────────────
#  Regex Patterns
# ─────────────────────────────────────────────

SURVEY_PATTERNS = [
    r"(?:survey\s*(?:no\.?|number)?|khasra\s*(?:no\.?|number)?|s\.?\s*no\.?|kh\.?\s*no\.?)[\s\:\-]+([0-9]+(?:[\/\-][0-9A-Za-z]+)*)",
    r"plot\s*(?:no\.?|number)?[\s\:\-]+([0-9]+(?:[\/\-][0-9A-Za-z]+)*)",
]

AREA_PATTERNS = [
    # "2.5 hectare" or "area: 2.5 acres"
    r"area[\s\:\-]+([0-9]+(?:\.[0-9]+)?)\s*(hectares?|acres?|bighas?|sq\.?\s*m(?:eter)?s?|sq\.?\s*ft|gunthas?|guntas?)",
    # standalone "2.5 hectares"
    r"([0-9]+(?:\.[0-9]+)?)\s+(hectares?|acres?|bighas?|sq\.?\s*m(?:eter)?s?|sq\.?\s*ft|gunthas?|guntas?)",
]

DATE_PATTERNS = [
    r"\b(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})\b",
    r"\b(\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})\b",
    r"\b(\d{1,2}\s+(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{4})\b",
]

PERSON_NAME_PATTERNS = [
    (r"buyer(?:[\s\:\-]+|\s*name[\s\:\-]+)([A-Za-z\.\'\-]+(?:[ \t]+[A-Za-z\.\'\-]+){0,4})(?=\r?\n|$|\s*,|\s*(?:seller|buyer|owner|grantor|grantee|survey|khasra|area|village|tehsil|district|date|reg))", "buyer_name"),
    (r"seller(?:[\s\:\-]+|\s*name[\s\:\-]+)([A-Za-z\.\'\-]+(?:[ \t]+[A-Za-z\.\'\-]+){0,4})(?=\r?\n|$|\s*,|\s*(?:seller|buyer|owner|grantor|grantee|survey|khasra|area|village|tehsil|district|date|reg))", "seller_name"),
    (r"owner(?:[\s\:\-]+|\s*name[\s\:\-]+)([A-Za-z\.\'\-]+(?:[ \t]+[A-Za-z\.\'\-]+){0,4})(?=\r?\n|$|\s*,|\s*(?:seller|buyer|owner|grantor|grantee|survey|khasra|area|village|tehsil|district|date|reg))", "owner_name"),
    (r"grantor(?:[\s\:\-]+|\s*name[\s\:\-]+)([A-Za-z\.\'\-]+(?:[ \t]+[A-Za-z\.\'\-]+){0,4})(?=\r?\n|$|\s*,|\s*(?:seller|buyer|owner|grantor|grantee|survey|khasra|area|village|tehsil|district|date|reg))", "seller_name"),
    (r"grantee(?:[\s\:\-]+|\s*name[\s\:\-]+)([A-Za-z\.\'\-]+(?:[ \t]+[A-Za-z\.\'\-]+){0,4})(?=\r?\n|$|\s*,|\s*(?:seller|buyer|owner|grantor|grantee|survey|khasra|area|village|tehsil|district|date|reg))", "buyer_name"),
    (r"vendor(?:[\s\:\-]+|\s*name[\s\:\-]+)([A-Za-z\.\'\-]+(?:[ \t]+[A-Za-z\.\'\-]+){0,4})(?=\r?\n|$|\s*,|\s*(?:seller|buyer|owner|grantor|grantee|survey|khasra|area|village|tehsil|district|date|reg))", "seller_name"),
    (r"vendee(?:[\s\:\-]+|\s*name[\s\:\-]+)([A-Za-z\.\'\-]+(?:[ \t]+[A-Za-z\.\'\-]+){0,4})(?=\r?\n|$|\s*,|\s*(?:seller|buyer|owner|grantor|grantee|survey|khasra|area|village|tehsil|district|date|reg))", "buyer_name"),
    (r"heir(?:[\s\:\-]+|\s*name[\s\:\-]+)([A-Za-z\.\'\-]+(?:[ \t]+[A-Za-z\.\'\-]+){0,4})(?=\r?\n|$|\s*,|\s*(?:seller|buyer|owner|grantor|grantee|survey|khasra|area|village|tehsil|district|date|reg))", "owner_name"),
]

LOCATION_PATTERNS = {
    "village": r"(?:village|gram|mauza)[\s\:\-]+([A-Za-z\s]+?)(?:\s*[,\n\r]|tehsil|district|$)",
    "tehsil": r"(?:tehsil|taluka|taluk|taluka)[\s\:\-]+([A-Za-z\s]+?)(?:\s*[,\n\r]|district|village|$)",
    "district": r"(?:district|zila|dist\.?)[\s\:\-]+([A-Za-z\s]+?)(?:\s*[,\n\r]|state|$)",
}

REGISTRATION_PATTERN = r"(?:reg(?:istration)?\.?\s*no\.?)[\s\:\-]+([A-Z0-9\/\-]+)"
STAMP_DUTY_PATTERN = r"(?:stamp\s*duty|stamp\s*fee)[\s\:\-]+(?:rs\.?|inr)?\s*([0-9,]+(?:\.[0-9]+)?)"


# ─────────────────────────────────────────────
#  Extraction Functions
# ─────────────────────────────────────────────

def _infer_document_type(text_lower: str) -> str:
    """Infer document type from keywords in text."""
    for doc_type, keywords in DOCUMENT_TYPE_KEYWORDS.items():
        for kw in keywords:
            if kw in text_lower:
                return doc_type
    return "UNKNOWN"


def _infer_transaction_type(text_lower: str) -> Optional[str]:
    """Infer transaction type from keywords."""
    for txn_type, keywords in TRANSACTION_TYPE_KEYWORDS.items():
        for kw in keywords:
            if kw in text_lower:
                return txn_type
    return None


def _extract_survey_number(text_lower: str) -> Optional[str]:
    for pattern in SURVEY_PATTERNS:
        m = re.search(pattern, text_lower)
        if m:
            return m.group(1).strip().upper()
    return None


def _extract_area(text_lower: str) -> tuple[Optional[float], Optional[str]]:
    for pattern in AREA_PATTERNS:
        m = re.search(pattern, text_lower)
        if m:
            try:
                area_val = float(m.group(1))
                area_unit = m.group(2).strip()
                # Normalize unit spelling
                area_unit = re.sub(r"sq\.?\s*m(?:eter)?s?", "sq meter", area_unit)
                area_unit = re.sub(r"sq\.?\s*fts?", "sq ft", area_unit)
                area_unit = re.sub(r"hectares?", "hectare", area_unit)
                area_unit = re.sub(r"acres?", "acre", area_unit)
                area_unit = re.sub(r"bighas?", "bigha", area_unit)
                area_unit = re.sub(r"gunthas?|guntas?", "guntha", area_unit)
                return area_val, area_unit
            except ValueError:
                pass
    return None, None


def _extract_date(text: str) -> Optional[str]:
    for pattern in DATE_PATTERNS:
        m = re.search(pattern, text)
        if m:
            return m.group(1)
    return None


def _extract_person_names(text: str) -> Dict[str, str]:
    found = {}
    for pattern, field in PERSON_NAME_PATTERNS:
        m = re.search(pattern, text, re.IGNORECASE)
        if m and field not in found:
            # Capitalize properly
            name = " ".join(w.capitalize() for w in m.group(1).strip().split())
            found[field] = name
    return found


def _extract_location(text_lower: str) -> Dict[str, Optional[str]]:
    loc = {}
    for field, pattern in LOCATION_PATTERNS.items():
        m = re.search(pattern, text_lower)
        if m:
            loc[field] = m.group(1).strip().title()
    return loc


def _extract_registration_number(text_lower: str) -> Optional[str]:
    m = re.search(REGISTRATION_PATTERN, text_lower)
    if m:
        return m.group(1).strip().upper()
    return None


def _extract_stamp_duty(text_lower: str) -> Optional[float]:
    m = re.search(STAMP_DUTY_PATTERN, text_lower)
    if m:
        try:
            return float(m.group(1).replace(",", ""))
        except ValueError:
            pass
    return None


# ─────────────────────────────────────────────
#  Public Interface
# ─────────────────────────────────────────────

def extract_fields(raw_text: str) -> Dict[str, Any]:
    """
    Parse raw OCR text and return structured fields.

    Args:
        raw_text: Raw OCR output text

    Returns:
        dict with extracted fields. All values are Optional.
        Example:
        {
            "owner_name": "Ramesh Kumar Sharma",
            "survey_number": "425/1",
            "area": 2.5,
            "area_unit": "hectare",
            "village": "Khajuri Kalan",
            "tehsil": "Huzur",
            "district": "Bhopal",
            "document_date": "15/03/2024",
            "document_type": "SALE_DEED",
            "transaction_type": "SALE",
            "seller_name": "Ramesh Kumar Sharma",
            "buyer_name": "Suresh Verma",
            "registration_number": "REG/2024/BPL/14892",
            "stamp_duty_paid": None
        }
    """
    if not raw_text or not raw_text.strip():
        logger.warning("[Extractor] Empty OCR text — no fields extracted")
        return {}

    text_lower = raw_text.lower()

    extracted: Dict[str, Any] = {}

    # Document classification
    extracted["document_type"] = _infer_document_type(text_lower)
    extracted["transaction_type"] = _infer_transaction_type(text_lower)

    # Survey number
    survey = _extract_survey_number(text_lower)
    if survey:
        extracted["survey_number"] = survey

    # Area
    area_val, area_unit = _extract_area(text_lower)
    if area_val is not None:
        extracted["area"] = area_val
        extracted["area_unit"] = area_unit

    # Date
    doc_date = _extract_date(raw_text)
    if doc_date:
        extracted["document_date"] = doc_date

    # Person names (buyer, seller, owner)
    names = _extract_person_names(raw_text)
    extracted.update(names)

    # Location
    location = _extract_location(text_lower)
    extracted.update({k: v for k, v in location.items() if v})

    # Registration number
    reg_num = _extract_registration_number(text_lower)
    if reg_num:
        extracted["registration_number"] = reg_num

    # Stamp duty
    stamp = _extract_stamp_duty(text_lower)
    if stamp is not None:
        extracted["stamp_duty_paid"] = stamp

    # Ensure owner_name fallback
    if not extracted.get("owner_name"):
        if extracted.get("seller_name"):
            extracted["owner_name"] = extracted["seller_name"]
        elif extracted.get("buyer_name") and extracted.get("document_type") in (
            "OWNERSHIP_DOCUMENT", "OWNERSHIP_CERTIFICATE", "MUTATION_RECORD", "MUTATION_DOCUMENT", "LAND_RECORD"
        ):
            extracted["owner_name"] = extracted["buyer_name"]

    # Provide canonical human-readable display name
    doc_type_code = extracted.get("document_type", "UNKNOWN")
    extracted["document_type_display"] = DOCUMENT_TYPE_DISPLAY_NAMES.get(doc_type_code, "Land Document")

    # Log extraction summary
    non_null = {k: v for k, v in extracted.items() if v is not None}
    logger.info(f"[Extractor] Extracted {len(non_null)} fields: {list(non_null.keys())}")

    return extracted


def extract_structured_document(raw_text: str) -> Dict[str, Any]:
    """
    Extract strictly the core schema required by BHOOMI-SHIELD AI Document Intelligence:
      - owner_name
      - survey_number
      - area
      - village
      - district
      - tehsil
      - document_date
      - document_type
      - transaction_type

    Returns clean structured JSON dict.
    """
    raw_fields = extract_fields(raw_text)
    doc_type_code = raw_fields.get("document_type", "UNKNOWN")
    display_type = DOCUMENT_TYPE_DISPLAY_NAMES.get(doc_type_code, "Land Record")

    structured = {
        "owner_name": raw_fields.get("owner_name"),
        "survey_number": raw_fields.get("survey_number"),
        "area": raw_fields.get("area"),
        "village": raw_fields.get("village"),
        "district": raw_fields.get("district"),
        "tehsil": raw_fields.get("tehsil"),
        "document_date": raw_fields.get("document_date"),
        "document_type": display_type,
        "transaction_type": raw_fields.get("transaction_type"),
    }
    return {k: v for k, v in structured.items() if v is not None}

