"""
comparator.py – Document vs. Parcel Comparison Engine
======================================================

Compares normalized extracted document fields against the official
parcel database record and produces typed comparison results.

Each comparison result indicates:
  - field:       which field was compared
  - status:      MATCH | MISMATCH | MISSING_IN_DOC | MISSING_IN_DB
  - db_value:    value from the official parcel record
  - doc_value:   value from the extracted document
  - similarity:  float 0.0–1.0 (for fuzzy string comparisons)
  - detail:      human-readable explanation

IMPORTANT: Uses decision-support phrasing only.
           Never accuses anyone of fraud or confirms legal invalidity.
"""

import re
import logging
from typing import Dict, Any, List, Optional

logger = logging.getLogger("ai_engine.comparator")


# ─────────────────────────────────────────────
#  Similarity Calculation
# ─────────────────────────────────────────────

def _name_similarity(name1: Optional[str], name2: Optional[str]) -> float:
    """
    Calculate name similarity for land record comparison.
    Follows BHOOMI-SHIELD safety principle:
      - Do NOT aggressively assume two different names are the same person.
      - If surnames differ (e.g. 'Rajesh Kumar' vs 'Rajesh Sharma'), flag as mismatch.
    """
    if not name1 or not name2:
        return 1.0  # Can't compare → no mismatch signal

    n1 = name1.strip().lower()
    n2 = name2.strip().lower()

    if n1 == n2:
        return 1.0

    tokens1 = n1.split()
    tokens2 = n2.split()

    # If both names contain multiple tokens (e.g. First + Surname)
    # Check if surname differs significantly
    if len(tokens1) >= 2 and len(tokens2) >= 2:
        try:
            from jellyfish import jaro_winkler_similarity
            last1, last2 = tokens1[-1], tokens2[-1]
            surname_sim = jaro_winkler_similarity(last1, last2)
            if surname_sim < 0.70:
                first_sim = jaro_winkler_similarity(tokens1[0], tokens2[0])
                # Strongly penalize different surnames even if first name matches
                return round(min(0.5, (first_sim * 0.4 + surname_sim * 0.6)), 3)
        except ImportError:
            pass

    try:
        from jellyfish import jaro_winkler_similarity, levenshtein_distance
        jw = jaro_winkler_similarity(n1, n2)
        max_len = max(len(n1), len(n2))
        lev = 1.0 - (levenshtein_distance(n1, n2) / max_len)
        return round(0.5 * jw + 0.5 * lev, 3)
    except ImportError:
        import difflib
        return round(difflib.SequenceMatcher(None, n1, n2).ratio(), 3)


# ─────────────────────────────────────────────
#  Comparison Result Type
# ─────────────────────────────────────────────

class ComparisonResult:
    """Represents the comparison of one field between document and database."""

    def __init__(
        self,
        field: str,
        status: str,
        db_value: Any,
        doc_value: Any,
        similarity: float = 1.0,
        detail: str = "",
    ):
        self.field = field
        self.status = status        # MATCH | MISMATCH | MISSING_IN_DOC | MISSING_IN_DB
        self.db_value = db_value
        self.doc_value = doc_value
        self.similarity = similarity
        self.detail = detail

    def to_dict(self) -> Dict[str, Any]:
        return {
            "field": self.field,
            "status": self.status,
            "db_value": self.db_value,
            "doc_value": self.doc_value,
            "similarity": round(self.similarity, 3),
            "detail": self.detail,
        }

    def is_mismatch(self) -> bool:
        return self.status == "MISMATCH"


# ─────────────────────────────────────────────
#  Individual Field Comparisons
# ─────────────────────────────────────────────

def compare_owner_name(
    parcel_name: Optional[str],
    doc_name: Optional[str],
    threshold: float = 0.85
) -> ComparisonResult:
    """Compare owner names with fuzzy similarity threshold."""

    if not doc_name:
        return ComparisonResult(
            field="owner_name",
            status="MISSING_IN_DOC",
            db_value=parcel_name,
            doc_value=None,
            detail="Owner name not found in document — cannot perform comparison."
        )

    if not parcel_name:
        return ComparisonResult(
            field="owner_name",
            status="MISSING_IN_DB",
            db_value=None,
            doc_value=doc_name,
            detail="Parcel record has no registered owner name — potential data quality issue."
        )

    sim = _name_similarity(parcel_name, doc_name)

    if sim >= threshold:
        return ComparisonResult(
            field="owner_name",
            status="MATCH",
            db_value=parcel_name,
            doc_value=doc_name,
            similarity=sim,
            detail=f"Owner name consistent (similarity: {int(sim*100)}%)."
        )
    else:
        return ComparisonResult(
            field="owner_name",
            status="MISMATCH",
            db_value=parcel_name,
            doc_value=doc_name,
            similarity=sim,
            detail=(
                f"Potential inconsistency: Document name '{doc_name}' differs from "
                f"registered owner '{parcel_name}' (similarity: {int(sim*100)}%). "
                f"Verification recommended."
            )
        )


def compare_area(
    parcel_area_sqm: Optional[float],
    doc_area_sqm: Optional[float],
    parcel_area_display: Optional[str] = None,
    doc_area_display: Optional[str] = None,
    threshold_pct: float = 5.0
) -> ComparisonResult:
    """Compare land areas (in sq meters) with percentage variance threshold."""

    if doc_area_sqm is None:
        return ComparisonResult(
            field="area",
            status="MISSING_IN_DOC",
            db_value=parcel_area_display or parcel_area_sqm,
            doc_value=None,
            detail="Area not found in document — cannot perform area comparison."
        )

    if not parcel_area_sqm or parcel_area_sqm <= 0:
        return ComparisonResult(
            field="area",
            status="MISSING_IN_DB",
            db_value=None,
            doc_value=doc_area_display or doc_area_sqm,
            detail="Parcel record has no registered area — potential data quality issue."
        )

    variance_pct = abs(doc_area_sqm - parcel_area_sqm) / parcel_area_sqm * 100

    if variance_pct <= threshold_pct:
        return ComparisonResult(
            field="area",
            status="MATCH",
            db_value=parcel_area_display or f"{parcel_area_sqm:.1f} sq m",
            doc_value=doc_area_display or f"{doc_area_sqm:.1f} sq m",
            similarity=1.0 - (variance_pct / 100),
            detail=f"Area consistent ({variance_pct:.1f}% variance, within {threshold_pct}% tolerance)."
        )
    else:
        return ComparisonResult(
            field="area",
            status="MISMATCH",
            db_value=parcel_area_display or f"{parcel_area_sqm:.1f} sq m",
            doc_value=doc_area_display or f"{doc_area_sqm:.1f} sq m",
            similarity=max(0.0, 1.0 - (variance_pct / 100)),
            detail=(
                f"Potential inconsistency: Document area {doc_area_display or f'{doc_area_sqm:.1f} sq m'} "
                f"differs from registered {parcel_area_display or f'{parcel_area_sqm:.1f} sq m'} "
                f"({variance_pct:.1f}% variance). Verification recommended."
            )
        )


def compare_survey_number(
    parcel_survey: Optional[str],
    doc_survey: Optional[str]
) -> ComparisonResult:
    """Compare survey/khasra numbers (exact match after normalization)."""

    if not doc_survey:
        return ComparisonResult(
            field="survey_number",
            status="MISSING_IN_DOC",
            db_value=parcel_survey,
            doc_value=None,
            detail="Survey number not found in document."
        )

    if not parcel_survey:
        return ComparisonResult(
            field="survey_number",
            status="MISSING_IN_DB",
            db_value=None,
            doc_value=doc_survey,
            detail="No survey number in parcel record — potential data quality issue."
        )

    p_norm = parcel_survey.strip().upper()
    d_norm = doc_survey.strip().upper()

    if p_norm == d_norm:
        return ComparisonResult(
            field="survey_number",
            status="MATCH",
            db_value=parcel_survey,
            doc_value=doc_survey,
            detail="Survey numbers match."
        )
    else:
        # Check if it's a sub-division variant (e.g., "425/1" vs "425/1A")
        base_p = p_norm.split("/")[0]
        base_d = d_norm.split("/")[0]
        if base_p == base_d:
            return ComparisonResult(
                field="survey_number",
                status="MISMATCH",
                db_value=parcel_survey,
                doc_value=doc_survey,
                similarity=0.7,
                detail=(
                    f"Potential inconsistency: Document survey '{doc_survey}' shares base with "
                    f"registered '{parcel_survey}' but sub-parcel suffix differs. "
                    f"May indicate sub-division — verification recommended."
                )
            )
        else:
            return ComparisonResult(
                field="survey_number",
                status="MISMATCH",
                db_value=parcel_survey,
                doc_value=doc_survey,
                similarity=0.0,
                detail=(
                    f"Potential inconsistency: Document references survey '{doc_survey}', "
                    f"registered parcel has survey '{parcel_survey}'. "
                    f"Cross-check Tehsil records for re-numbering or mis-assignment."
                )
            )


def compare_location_field(
    field: str,
    parcel_value: Optional[str],
    doc_value: Optional[str]
) -> Optional[ComparisonResult]:
    """Compare a location field (village, tehsil, district). Returns None if doc value missing."""
    if not doc_value:
        return None  # Missing in doc — not a mismatch, just absent

    if not parcel_value:
        return None  # No DB value — can't compare

    sim = _name_similarity(parcel_value, doc_value)
    if sim >= 0.80:
        return ComparisonResult(
            field=field,
            status="MATCH",
            db_value=parcel_value,
            doc_value=doc_value,
            similarity=sim,
            detail=f"{field.title()} consistent."
        )
    else:
        return ComparisonResult(
            field=field,
            status="MISMATCH",
            db_value=parcel_value,
            doc_value=doc_value,
            similarity=sim,
            detail=(
                f"Potential inconsistency: Document {field} '{doc_value}' "
                f"differs from registered '{parcel_value}'. "
                f"Verify parcel belongs to correct administrative boundary."
            )
        )


# ─────────────────────────────────────────────
#  Full Comparison
# ─────────────────────────────────────────────

def compare(
    normalized_parcel: Dict[str, Any],
    normalized_doc: Dict[str, Any],
    name_threshold: float = 0.85,
    area_threshold_pct: float = 5.0,
) -> List[ComparisonResult]:
    """
    Run all field comparisons between a normalized parcel record and
    a normalized extracted document.

    Args:
        normalized_parcel: Parcel dict (from normalizer.normalize_parcel)
        normalized_doc:    Document dict (from normalizer.normalize_extracted)
        name_threshold:    Min similarity score for names (default 0.85)
        area_threshold_pct: Max area variance % before flagging (default 5%)

    Returns:
        List of ComparisonResult objects
    """
    results: List[ComparisonResult] = []

    # 1. Owner name
    doc_owner = normalized_doc.get("owner_name") or normalized_doc.get("buyer_name")
    results.append(compare_owner_name(
        parcel_name=normalized_parcel.get("owner_name"),
        doc_name=doc_owner,
        threshold=name_threshold
    ))

    # 2. Area
    parcel_area_sqm = normalized_parcel.get("area_sqm")
    doc_area_sqm = normalized_doc.get("area_sqm")
    parcel_area_disp = f"{normalized_parcel.get('area')} {normalized_parcel.get('area_unit', 'hectare')}"
    doc_area_disp = (
        f"{normalized_doc.get('area')} {normalized_doc.get('area_unit', 'sq meter')}"
        if normalized_doc.get("area") else None
    )
    results.append(compare_area(
        parcel_area_sqm=parcel_area_sqm,
        doc_area_sqm=doc_area_sqm,
        parcel_area_display=parcel_area_disp,
        doc_area_display=doc_area_disp,
        threshold_pct=area_threshold_pct
    ))

    # 3. Survey number
    results.append(compare_survey_number(
        parcel_survey=normalized_parcel.get("survey_number"),
        doc_survey=normalized_doc.get("survey_number")
    ))

    # 4. Location fields (village, tehsil, district) — optional comparisons
    for loc_field in ("village", "tehsil", "district"):
        loc_result = compare_location_field(
            field=loc_field,
            parcel_value=normalized_parcel.get(loc_field),
            doc_value=normalized_doc.get(loc_field),
        )
        if loc_result:
            results.append(loc_result)

    mismatches = [r for r in results if r.is_mismatch()]
    matches = [r for r in results if r.status == "MATCH"]
    logger.info(f"[Comparator] {len(matches)} matches, {len(mismatches)} mismatches out of {len(results)} comparisons")

    return results
