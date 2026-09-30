"""
normalizer.py – Data Normalization
====================================

Normalizes extracted field values so they can be compared reliably.

Problems solved:
  - Name casing: "RAJESH KUMAR" vs "Rajesh Kumar" vs "rajesh kumar  "
  - Extra whitespace and punctuation in names
  - Area unit variations: "Sq. M." → "sq meter"
  - Date format variations: "15-03-2024", "15/03/24", "March 15 2024"
  - Survey number formatting: "425 / 1" → "425/1"

IMPORTANT: Normalization is for COMPARISON only.
           We do NOT merge or assume two different people are the same person.
           That judgment is left to the risk signals + human officer.
"""

import re
import logging
from typing import Optional, Dict, Any
from datetime import datetime

logger = logging.getLogger("ai_engine.normalizer")


# ─────────────────────────────────────────────
#  Name Normalization
# ─────────────────────────────────────────────

def normalize_name(name: Optional[str]) -> Optional[str]:
    """
    Normalize a person's name for comparison.

    Rules:
      - Strip leading/trailing whitespace
      - Collapse multiple spaces to one
      - Title-case each word
      - Remove common honorifics (Shri, Smt, etc.)
      - Remove punctuation (dots, commas) but keep hyphens

    Does NOT attempt to merge or deduplicate different names.

    Args:
        name: Raw name string

    Returns:
        Normalized name string, or None if input is blank/None
    """
    if not name or not name.strip():
        return None

    # Remove honorifics / salutations
    honorifics = r"\b(?:shri|smt|srimati|mr\.?|mrs\.?|dr\.?|s\/o|d\/o|w\/o|son of|daughter of|wife of)\b"
    cleaned = re.sub(honorifics, "", name, flags=re.IGNORECASE)

    # Remove punctuation except hyphens
    cleaned = re.sub(r"[^\w\s\-]", " ", cleaned)

    # Collapse whitespace
    cleaned = re.sub(r"\s+", " ", cleaned).strip()

    # Title case each word
    cleaned = " ".join(w.capitalize() for w in cleaned.split())

    return cleaned if cleaned else None


# ─────────────────────────────────────────────
#  Area Normalization
# ─────────────────────────────────────────────

AREA_UNIT_MAP = {
    # Hectare variants
    "hectare": "hectare",
    "hectares": "hectare",
    "ha": "hectare",
    "hect": "hectare",
    # Acre variants
    "acre": "acre",
    "acres": "acre",
    "ac": "acre",
    # Bigha variants (MP/UP standard)
    "bigha": "bigha",
    "bighas": "bigha",
    # Guntha variants
    "guntha": "guntha",
    "gunthas": "guntha",
    "gunta": "guntha",
    "guntas": "guntha",
    # Sq meter variants
    "sq meter": "sq meter",
    "sq meters": "sq meter",
    "sqm": "sq meter",
    "sq m": "sq meter",
    "sq. m.": "sq meter",
    "square meter": "sq meter",
    "square meters": "sq meter",
    "m2": "sq meter",
    # Sq feet variants
    "sq ft": "sq ft",
    "sqft": "sq ft",
    "sq. ft.": "sq ft",
    "square feet": "sq ft",
    "square foot": "sq ft",
    "ft2": "sq ft",
}

# Conversion to sq meters (for canonical comparison)
TO_SQM = {
    "hectare": 10000.0,
    "acre":    4046.86,
    "bigha":   2529.29,  # MP/UP standard bigha
    "guntha":  101.17,
    "sq meter": 1.0,
    "sq ft":   0.092903,
}


def normalize_area_unit(unit: Optional[str]) -> Optional[str]:
    """Normalize area unit string to canonical form."""
    if not unit:
        return None
    u = unit.strip().lower()
    u = re.sub(r"\s+", " ", u)
    return AREA_UNIT_MAP.get(u, u)  # return as-is if not found


def area_to_sqm(value: Optional[float], unit: Optional[str]) -> Optional[float]:
    """Convert area value to square meters for comparison."""
    if value is None or value <= 0:
        return None
    normalized_unit = normalize_area_unit(unit) or "sq meter"
    factor = TO_SQM.get(normalized_unit, 1.0)
    return round(value * factor, 4)


# ─────────────────────────────────────────────
#  Survey Number Normalization
# ─────────────────────────────────────────────

def normalize_survey_number(survey: Optional[str]) -> Optional[str]:
    """
    Normalize survey/khasra number for comparison.

    Examples:
      "425 / 1"  → "425/1"
      "425-1"    → "425/1"
      "KH-425/1" → "425/1"  (strip prefix)
    """
    if not survey or not survey.strip():
        return None

    # Remove common prefixes like "KH-", "S.No.", etc.
    cleaned = re.sub(r"^(?:kh|s|sno|khasra|survey)\s*[\-\.]?\s*", "", survey.strip(), flags=re.IGNORECASE)

    # Normalize separators: spaces around / and - → /
    cleaned = re.sub(r"\s*/\s*", "/", cleaned)
    cleaned = re.sub(r"\s+\-\s+", "/", cleaned)

    return cleaned.strip().upper() if cleaned.strip() else None


# ─────────────────────────────────────────────
#  Date Normalization
# ─────────────────────────────────────────────

MONTH_MAP = {
    "jan": 1, "feb": 2, "mar": 3, "apr": 4,
    "may": 5, "jun": 6, "jul": 7, "aug": 8,
    "sep": 9, "oct": 10, "nov": 11, "dec": 12,
}


def normalize_date(date_str: Optional[str]) -> Optional[str]:
    """
    Normalize date string to ISO format YYYY-MM-DD.

    Handles:
      "15/03/2024", "15-03-24", "March 15 2024", "2024/03/15"

    Returns:
      ISO date string "2024-03-15" or None if unparseable
    """
    if not date_str:
        return None

    date_str = date_str.strip()

    # Try common formats
    formats = [
        "%d/%m/%Y", "%d-%m-%Y", "%d.%m.%Y",
        "%Y/%m/%d", "%Y-%m-%d",
        "%d/%m/%y", "%d-%m-%y",
        "%B %d %Y", "%d %B %Y",
        "%b %d %Y", "%d %b %Y",
    ]
    for fmt in formats:
        try:
            return datetime.strptime(date_str, fmt).strftime("%Y-%m-%d")
        except ValueError:
            continue

    # Try word-month pattern: "15 March 2024" or "March 15, 2024"
    m = re.search(
        r"(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})|([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})",
        date_str
    )
    if m:
        if m.group(1):
            day, month_word, year = m.group(1), m.group(2), m.group(3)
        else:
            month_word, day, year = m.group(4), m.group(5), m.group(6)

        month_key = month_word[:3].lower()
        month_num = MONTH_MAP.get(month_key)
        if month_num:
            try:
                return f"{int(year):04d}-{month_num:02d}-{int(day):02d}"
            except ValueError:
                pass

    logger.debug(f"[Normalizer] Could not parse date: '{date_str}'")
    return None


# ─────────────────────────────────────────────
#  Full Record Normalization
# ─────────────────────────────────────────────

def normalize_extracted(extracted: Dict[str, Any]) -> Dict[str, Any]:
    """
    Apply all normalization rules to an extracted field dict.

    Args:
        extracted: Raw extraction dict from extractor.py

    Returns:
        Normalized dict (same keys, cleaner values)
    """
    norm = dict(extracted)

    # Normalize all name fields
    for name_field in ("owner_name", "buyer_name", "seller_name"):
        if name_field in norm:
            norm[name_field] = normalize_name(norm[name_field])

    # Normalize survey number
    if "survey_number" in norm:
        norm["survey_number"] = normalize_survey_number(norm["survey_number"])

    # Normalize area unit
    if "area_unit" in norm:
        norm["area_unit"] = normalize_area_unit(norm["area_unit"])

    # Normalize date
    if "document_date" in norm:
        norm["document_date"] = normalize_date(norm["document_date"])

    # Add canonical area in sq meters for easy comparison
    if norm.get("area") is not None:
        norm["area_sqm"] = area_to_sqm(norm["area"], norm.get("area_unit"))

    # Strip and title-case location fields
    for loc_field in ("village", "tehsil", "district"):
        if norm.get(loc_field):
            norm[loc_field] = " ".join(norm[loc_field].strip().split()).title()

    return norm


def normalize_parcel(parcel: Dict[str, Any]) -> Dict[str, Any]:
    """
    Normalize a parcel record from the database for comparison.
    Same rules, but the parcel uses 'area' directly in hectares/acres by default.
    """
    norm = dict(parcel)

    if "owner_name" in norm:
        norm["owner_name"] = normalize_name(norm["owner_name"])

    if "survey_number" in norm:
        norm["survey_number"] = normalize_survey_number(norm["survey_number"])

    # Parcel area unit defaults to 'hectare' if not specified
    area_unit = norm.get("area_unit", "hectare")
    norm["area_unit"] = normalize_area_unit(area_unit)
    if norm.get("area") is not None:
        norm["area_sqm"] = area_to_sqm(norm["area"], norm.get("area_unit"))

    for loc_field in ("village", "tehsil", "district"):
        if norm.get(loc_field):
            norm[loc_field] = " ".join(norm[loc_field].strip().split()).title()

    return norm
