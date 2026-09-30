"""
risk_signals.py – Risk Signal Generator
=========================================

Converts raw comparison results into structured, typed Risk Signals.

Each signal is a dict with:
  factor      – Signal type code (e.g., OWNER_MISMATCH)
  severity    – LOW | MEDIUM | HIGH | CRITICAL
  impact      – Points this signal contributes to the risk score
  description – Decision-support phrasing (NEVER "fraud confirmed")
  evidence    – Structured evidence dict (db_value, doc_value, similarity)

Signal Types Supported:
  OWNER_MISMATCH
  AREA_MISMATCH
  SURVEY_NUMBER_MISMATCH
  VILLAGE_MISMATCH
  DISTRICT_MISMATCH
  MISSING_DOCUMENT
  MISSING_KEY_FIELD
  DATE_INCONSISTENCY
  DUPLICATE_INFORMATION
  UNRESOLVED_EVENT
  TITLE_CHAIN_BREAK

IMPORTANT: This module never labels anyone as guilty or fraudulent.
           It generates decision-support risk signals only.
"""

import logging
from typing import Dict, Any, List, Optional, TYPE_CHECKING

if TYPE_CHECKING:
    from comparator import ComparisonResult

logger = logging.getLogger("ai_engine.risk_signals")


# ─────────────────────────────────────────────
#  Signal Weights (adjustable)
# ─────────────────────────────────────────────

DEFAULT_WEIGHTS: Dict[str, int] = {
    "OWNER_MISMATCH":           25,
    "AREA_MISMATCH":            15,
    "SURVEY_NUMBER_MISMATCH":   20,
    "VILLAGE_MISMATCH":          5,
    "DISTRICT_MISMATCH":        10,
    "MISSING_DOCUMENT":         15,
    "MISSING_KEY_FIELD":         5,
    "DATE_INCONSISTENCY":       10,
    "BOUNDARY_CHANGE":          15,
    "MUTATION_PENDING":         20,
    "DUPLICATE_RECORD":         20,
    "DUPLICATE_INFORMATION":    20,
    "UNRESOLVED_EVENT":         15,
    "TITLE_CHAIN_BREAK":        30,
}

# Severity thresholds by impact points
SEVERITY_MAP = [
    (25, "HIGH"),
    (15, "MEDIUM"),
    (0,  "LOW"),
]


def _get_severity(impact: int) -> str:
    for threshold, level in SEVERITY_MAP:
        if impact >= threshold:
            return level
    return "LOW"


# ─────────────────────────────────────────────
#  Signal Generators
# ─────────────────────────────────────────────

def signal_from_comparison(result: "ComparisonResult", weights: Dict[str, int]) -> Optional[Dict[str, Any]]:
    """
    Convert a ComparisonResult mismatch into a risk signal dict.
    Returns None for MATCH results (no signal needed).
    """
    if result.status != "MISMATCH":
        return None

    field = result.field

    # Map field names to signal factor codes
    field_to_factor = {
        "owner_name":        "OWNER_MISMATCH",
        "area":              "AREA_MISMATCH",
        "survey_number":     "SURVEY_NUMBER_MISMATCH",
        "village":           "VILLAGE_MISMATCH",
        "tehsil":            "VILLAGE_MISMATCH",   # reuse
        "district":          "DISTRICT_MISMATCH",
        "boundary":          "BOUNDARY_CHANGE",
        "boundary_change":   "BOUNDARY_CHANGE",
        "mutation":          "MUTATION_PENDING",
        "mutation_status":   "MUTATION_PENDING",
        "duplicate_record":  "DUPLICATE_RECORD",
        "duplicate":         "DUPLICATE_RECORD",
    }

    factor = field_to_factor.get(field)
    if not factor:
        factor = f"{field.upper()}_MISMATCH"

    base_impact = weights.get(factor, 10)

    # Amplify impact for very low similarity
    if result.similarity < 0.5:
        base_impact = int(base_impact * 1.4)

    # Cap individual signal impact at 35
    impact = min(35, base_impact)

    severity = _get_severity(impact)

    return {
        "factor":      factor,
        "severity":    severity,
        "impact":      impact,
        "description": result.detail,
        "evidence": {
            "field":      result.field,
            "db_value":   result.db_value,
            "doc_value":  result.doc_value,
            "similarity": result.similarity,
        }
    }


def signal_missing_document(
    parcel_id: str,
    expected_doc_types: List[str],
    found_doc_types: List[str],
    weights: Dict[str, int]
) -> Optional[Dict[str, Any]]:
    """
    Generate MISSING_DOCUMENT signal if key document types are absent.
    """
    missing = [dt for dt in expected_doc_types if dt not in found_doc_types]
    if not missing:
        return None

    impact = weights.get("MISSING_DOCUMENT", 15)
    severity = _get_severity(impact)

    return {
        "factor":   "MISSING_DOCUMENT",
        "severity": severity,
        "impact":   impact,
        "description": (
            f"Risk signal: Key document types missing for parcel {parcel_id}: "
            f"{', '.join(missing)}. "
            f"Complete documentation is required for verification."
        ),
        "evidence": {
            "expected_doc_types": expected_doc_types,
            "found_doc_types":    found_doc_types,
            "missing_doc_types":  missing,
        }
    }


def signal_missing_key_field(
    missing_fields: List[str],
    weights: Dict[str, int]
) -> Optional[Dict[str, Any]]:
    """
    Generate MISSING_KEY_FIELD signal if critical fields could not be extracted.
    """
    if not missing_fields:
        return None

    impact = weights.get("MISSING_KEY_FIELD", 5) * len(missing_fields)
    impact = min(impact, 15)  # cap at 15
    severity = _get_severity(impact)

    return {
        "factor":   "MISSING_KEY_FIELD",
        "severity": severity,
        "impact":   impact,
        "description": (
            f"Risk signal: Document is missing critical fields: {', '.join(missing_fields)}. "
            f"Incomplete documents may indicate a non-standard or tampered record. "
            f"Manual review recommended."
        ),
        "evidence": {
            "missing_fields": missing_fields,
        }
    }


def signal_date_inconsistency(
    doc_date: Optional[str],
    parcel_created_date: Optional[str],
    weights: Dict[str, int]
) -> Optional[Dict[str, Any]]:
    """
    Generate DATE_INCONSISTENCY if document date is before parcel was registered
    or if no date was found.
    """
    if not doc_date:
        return None  # Can't compare, skip

    if parcel_created_date and doc_date > parcel_created_date:
        return None  # Document is after parcel creation — normal

    # If document date predates parcel creation by more than trivial amount
    # (could indicate backdating, which is a risk signal — not fraud proof)
    if parcel_created_date and doc_date < parcel_created_date:
        impact = weights.get("DATE_INCONSISTENCY", 10)
        severity = _get_severity(impact)
        return {
            "factor":   "DATE_INCONSISTENCY",
            "severity": severity,
            "impact":   impact,
            "description": (
                f"Risk signal: Document date '{doc_date}' predates parcel registration "
                f"'{parcel_created_date}'. This may indicate document backdating or data entry error. "
                f"Verification of authentic document date recommended."
            ),
            "evidence": {
                "document_date":         doc_date,
                "parcel_creation_date":  parcel_created_date,
            }
        }

    return None


def signal_unresolved_events(
    open_case_count: int,
    weights: Dict[str, int]
) -> Optional[Dict[str, Any]]:
    """
    Generate UNRESOLVED_EVENT signal if there are open/pending verification cases.
    """
    if open_case_count <= 0:
        return None

    impact = min(weights.get("UNRESOLVED_EVENT", 15), 20)
    severity = _get_severity(impact)

    return {
        "factor":   "UNRESOLVED_EVENT",
        "severity": severity,
        "impact":   impact,
        "description": (
            f"Risk signal: {open_case_count} unresolved verification case(s) associated with this parcel. "
            f"Pending cases indicate known risk signals awaiting officer review."
        ),
        "evidence": {
            "open_case_count": open_case_count,
        }
    }


def signal_boundary_change(
    boundary_info: Dict[str, Any],
    weights: Dict[str, int]
) -> Optional[Dict[str, Any]]:
    """
    Generate BOUNDARY_CHANGE signal if GIS / boundary modifications or discrepancies are flagged.
    """
    impact = weights.get("BOUNDARY_CHANGE", 15)
    severity = _get_severity(impact)
    return {
        "factor":   "BOUNDARY_CHANGE",
        "severity": severity,
        "impact":   impact,
        "description": (
            f"Risk signal: Potential boundary change or discrepancy detected. "
            f"Ground verification and GIS cadastral survey recommended."
        ),
        "evidence": boundary_info
    }


def signal_mutation_pending(
    mutation_info: Dict[str, Any],
    weights: Dict[str, int]
) -> Optional[Dict[str, Any]]:
    """
    Generate MUTATION_PENDING signal if mutation/transfer record is pending or incomplete.
    """
    impact = weights.get("MUTATION_PENDING", 20)
    severity = _get_severity(impact)
    return {
        "factor":   "MUTATION_PENDING",
        "severity": severity,
        "impact":   impact,
        "description": (
            f"Risk signal: Mutation entry is pending or under verification. "
            f"Check status in Tehsil revenue register before proceeding."
        ),
        "evidence": mutation_info
    }


def signal_duplicate_record(
    duplicate_info: Dict[str, Any],
    weights: Dict[str, int]
) -> Optional[Dict[str, Any]]:
    """
    Generate DUPLICATE_RECORD / DUPLICATE_INFORMATION signal.
    """
    impact = weights.get("DUPLICATE_RECORD", 20)
    severity = _get_severity(impact)
    return {
        "factor":   "DUPLICATE_RECORD",
        "severity": severity,
        "impact":   impact,
        "description": (
            f"Risk signal: Duplicate record or conflicting registration entry detected. "
            f"Cross-reference registry ledger and Khasra entries."
        ),
        "evidence": duplicate_info
    }


# ─────────────────────────────────────────────
#  Public Interface
# ─────────────────────────────────────────────

def generate_signals(
    comparison_results: List["ComparisonResult"],
    parcel: Dict[str, Any],
    extracted: Dict[str, Any],
    documents: List[Dict[str, Any]] = None,
    open_cases: int = 0,
    weights: Optional[Dict[str, int]] = None,
) -> List[Dict[str, Any]]:
    """
    Generate all applicable risk signals from comparison results and context.

    Args:
        comparison_results: Output from comparator.compare()
        parcel:             Raw parcel record from DB
        extracted:          Normalized extracted doc fields
        documents:          All documents attached to parcel (for missing doc check)
        open_cases:         Count of unresolved verification cases
        weights:            Optional override for signal impact weights

    Returns:
        List of risk signal dicts
    """
    w = {**DEFAULT_WEIGHTS, **(weights or {})}
    signals: List[Dict[str, Any]] = []

    # 1. Signals from comparison mismatches
    for result in comparison_results:
        sig = signal_from_comparison(result, w)
        if sig:
            signals.append(sig)

    # 2. Missing key fields in extracted document
    critical_fields = ["owner_name", "survey_number", "area"]
    missing_fields = [f for f in critical_fields if not extracted.get(f)]
    missing_sig = signal_missing_key_field(missing_fields, w)
    if missing_sig:
        signals.append(missing_sig)

    # 3. Missing document types
    if documents is not None:
        found_types = list({d.get("document_type", "") for d in documents})
        expected_types = ["SALE_DEED", "MUTATION_RECORD"]
        missing_doc_sig = signal_missing_document(
            parcel_id=parcel.get("parcel_id", ""),
            expected_doc_types=expected_types,
            found_doc_types=found_types,
            weights=w
        )
        if missing_doc_sig:
            signals.append(missing_doc_sig)

    # 4. Date inconsistency
    parcel_created = str(parcel.get("created_at", ""))[:10]  # ISO date prefix
    date_sig = signal_date_inconsistency(
        doc_date=extracted.get("document_date"),
        parcel_created_date=parcel_created if parcel_created else None,
        weights=w,
    )
    if date_sig:
        signals.append(date_sig)

    # 5. Unresolved cases
    unresolved_sig = signal_unresolved_events(open_cases, w)
    if unresolved_sig:
        signals.append(unresolved_sig)

    # 6. Boundary change if flagged in parcel or document
    if parcel.get("boundary_changed") or parcel.get("boundary_dispute") or extracted.get("boundary_changed"):
        signals.append(signal_boundary_change({
            "parcel_id": parcel.get("parcel_id"),
            "details": parcel.get("boundary_notes", "GIS survey boundary delta flagged")
        }, w))

    # 7. Pending mutation if flagged in parcel or document
    if parcel.get("mutation_pending") or extracted.get("mutation_pending"):
        signals.append(signal_mutation_pending({
            "parcel_id": parcel.get("parcel_id"),
            "mutation_status": parcel.get("mutation_status", "PENDING_VERIFICATION")
        }, w))

    # 8. Duplicate record check if flagged
    if parcel.get("duplicate_record_flag") or extracted.get("duplicate_detected"):
        signals.append(signal_duplicate_record({
            "parcel_id": parcel.get("parcel_id"),
            "conflicting_record": parcel.get("duplicate_reference", "Conflicting entry in sub-registrar ledger")
        }, w))

    logger.info(f"[RiskSignals] Generated {len(signals)} risk signal(s)")
    return signals
