"""
explainer.py – Human-Readable Explanation Generator
=====================================================

Converts risk signals + score into clear, human-readable text for officers.

Output format:
  {
    "summary":             "...",             # 1-2 sentence overview
    "score_breakdown":     [...],             # ranked factors
    "recommended_actions": [...],             # prioritized action list
    "risk_verdict":        "MEDIUM RISK — Verification Required"
  }

SAFETY RULES (strictly enforced):
  ✗ NEVER say "Fraud confirmed"
  ✗ NEVER say "Ownership is legally invalid"
  ✗ NEVER say "Person committed fraud"
  ✓ USE "Potential inconsistency detected"
  ✓ USE "Verification recommended"
  ✓ USE "Risk signal detected"
  ✓ USE "Decision-support system only"
"""

import logging
from typing import Dict, Any, List

logger = logging.getLogger("ai_engine.explainer")


# ─────────────────────────────────────────────
#  Recommended Actions by Signal
# ─────────────────────────────────────────────

SIGNAL_ACTIONS: Dict[str, List[str]] = {
    "OWNER_MISMATCH": [
        "Verify ownership chain with local Revenue Registrar office",
        "Check latest mutation (Dakhil Kharij) entry in Tehsil records",
        "Request certified copy of latest registered sale deed",
    ],
    "AREA_MISMATCH": [
        "Conduct physical ground measurement or GIS boundary survey",
        "Verify Khasra Naksha map boundaries against survey records at Tehsil office",
        "Cross-reference with satellite imagery for boundary changes",
    ],
    "SURVEY_NUMBER_MISMATCH": [
        "Cross-check Tehsil survey records for sub-division or re-numbering history",
        "Verify with Revenue Inspector whether survey number was re-assigned",
        "Check for any pending mutation that may change survey reference",
    ],
    "VILLAGE_MISMATCH": [
        "Verify village administrative boundaries at Tehsil office",
        "Check for recent village boundary or administrative area changes",
    ],
    "DISTRICT_MISMATCH": [
        "Verify district jurisdiction at Revenue Divisional Commissioner office",
        "Check for administrative re-organization that may affect district assignment",
    ],
    "MISSING_DOCUMENT": [
        "Request missing documents from the parcel owner within a specified period",
        "Flag parcel as requiring documentation — block transfer until resolved",
        "Officer to initiate documentation verification process",
    ],
    "MISSING_KEY_FIELD": [
        "Obtain a clearer scan or original document for re-processing",
        "Manually verify missing fields with Tehsil revenue records",
    ],
    "DATE_INCONSISTENCY": [
        "Verify authenticity of document date with issuing Sub-Registrar office",
        "Request original registration receipt to confirm filing date",
        "Check for retrospective or antedated entries in revenue records",
    ],
    "UNRESOLVED_EVENT": [
        "Review all open verification cases associated with this parcel",
        "Prioritize resolution of pending cases before approving any transfer",
    ],
    "TITLE_CHAIN_BREAK": [
        "URGENT: Investigate title chain discontinuity — verify all intermediate deeds",
        "Check for missing mutation entries between owner transitions",
        "Recommend obtaining formal legal title opinion from an empaneled advocate",
        "Place parcel on high-priority monitoring until chain is verified",
    ],
    "BOUNDARY_CHANGE": [
        "Conduct physical ground boundary verification and GIS re-survey",
        "Compare historical Khasra Naksha cadastre maps against latest survey",
        "Verify boundary demarcation with neighboring land parcel owners",
    ],
    "MUTATION_PENDING": [
        "Check mutation record (Dakhil Kharij) status in Tehsil register",
        "Verify pending mutation application and check for registered objections",
        "Require resolution of pending mutation before clearing title",
    ],
    "DUPLICATE_RECORD": [
        "Investigate potential duplicate registration or double-allotment of parcel record",
        "Cross-reference registry ledger and Khasra entries for conflicting records",
        "Initiate verification with Sub-Registrar to ensure title exclusivity",
    ],
    "DUPLICATE_INFORMATION": [
        "Investigate duplicate document records — possible data entry error or intentional duplication",
        "Cross-check with original physical documents at Tehsil office",
    ],
}

# Default actions when no specific signals
DEFAULT_ACTIONS = [
    "Standard periodic record verification recommended",
    "Maintain routine monitoring of incoming document uploads",
]


# ─────────────────────────────────────────────
#  Summary Templates by Risk Level
# ─────────────────────────────────────────────

SUMMARY_TEMPLATES = {
    "LOW": (
        "No significant risk signals detected for this parcel. "
        "Records appear consistent with available documentation. "
        "Standard monitoring is recommended."
    ),
    "MEDIUM": (
        "One or more potential inconsistencies were detected between the submitted document "
        "and the official parcel record. This is a decision-support signal only — "
        "it does not confirm any legal irregularity. Officer verification is recommended."
    ),
    "HIGH": (
        "Multiple risk signals detected for this parcel. Significant potential inconsistencies "
        "were found between document data and official records. "
        "Priority officer verification is recommended before any transaction is processed. "
        "This system provides decision-support only and does not determine legal validity."
    ),
    "CRITICAL": (
        "Critical-level risk signals detected. Several fields show potential inconsistencies "
        "between submitted documents and official parcel records. "
        "Immediate officer review is strongly recommended. "
        "No transactions should be approved until verification is completed. "
        "IMPORTANT: This is a decision-support signal only — "
        "it does not confirm fraud, legal invalidity, or guilt."
    ),
}


# ─────────────────────────────────────────────
#  Explanation Builder
# ─────────────────────────────────────────────

def _deduplicate_actions(actions: List[str]) -> List[str]:
    """Remove duplicates while preserving order."""
    seen = set()
    result = []
    for action in actions:
        key = action.strip().lower()
        if key not in seen:
            seen.add(key)
            result.append(action)
    return result


def explain(
    score: int,
    level: str,
    signals: List[Dict[str, Any]],
    parcel_id: str = "",
) -> Dict[str, Any]:
    """
    Generate a human-readable explanation of the risk analysis.

    Args:
        score:     Numeric risk score (0–100)
        level:     Risk level (LOW / MEDIUM / HIGH / CRITICAL)
        signals:   List of risk signals from risk_signals.generate_signals()
        parcel_id: For contextual reference in output text

    Returns:
        dict with:
          summary            – paragraph text overview
          score_breakdown    – ranked factor list
          recommended_actions – prioritized action items
          risk_verdict       – short verdict string
          disclaimer         – legal safety note
    """

    # Score breakdown (sorted by impact)
    breakdown = sorted(
        [
            {
                "factor":      sig["factor"],
                "impact":      f"+{sig['impact']} pts",
                "severity":    sig.get("severity", "MEDIUM"),
                "description": sig.get("description", ""),
            }
            for sig in signals
        ],
        key=lambda x: -int(x["impact"].replace("+", "").replace(" pts", ""))
    )

    # Human-readable reasons list (e.g., "Owner Mismatch +25", "Area Mismatch +15")
    reasons_list = [
        f"{sig.get('factor', 'Risk Factor').replace('_', ' ').title()} +{sig.get('impact', 0)}"
        for sig in sorted(signals, key=lambda s: -s.get("impact", 0))
    ]

    # Collect recommended actions from matched signals
    actions: List[str] = []
    for sig in sorted(signals, key=lambda s: -s.get("impact", 0)):
        factor = sig.get("factor", "")
        factor_actions = SIGNAL_ACTIONS.get(factor, [])
        actions.extend(factor_actions)

    if not actions:
        actions = list(DEFAULT_ACTIONS)

    actions = _deduplicate_actions(actions)

    # Summary text
    summary = SUMMARY_TEMPLATES.get(level, SUMMARY_TEMPLATES["MEDIUM"])
    if parcel_id:
        summary = f"Parcel {parcel_id}: " + summary

    # Risk verdict line
    level_display = {
        "LOW":      "LOW RISK",
        "MEDIUM":   "MEDIUM RISK — Verification Recommended",
        "HIGH":     "HIGH RISK — Priority Verification Required",
        "CRITICAL": "CRITICAL RISK — Immediate Review Required",
    }
    verdict = f"{level_display.get(level, level)} (Score: {score}/100)"

    return {
        "summary":              summary,
        "score":                score,
        "level":                level,
        "reasons":              reasons_list,
        "score_breakdown":      breakdown,
        "recommended_actions":  actions[:6],  # top 6 actions
        "risk_verdict":         verdict,
        "disclaimer": (
            "IMPORTANT: BHOOMI-SHIELD is a decision-support system only. "
            "Risk signals indicate potential inconsistencies requiring officer verification. "
            "This system does NOT confirm fraud, legal invalidity, or guilt. "
            "All final determinations must be made by authorized Revenue Officers."
        ),
    }
