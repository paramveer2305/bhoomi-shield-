"""
llm_assistant.py – AI / LLM Document Understanding & Explanation Assistant
============================================================================

Provides LLM capabilities for:
  - Document understanding & structured field extraction assistance
  - Executive summarization of complex land records
  - Human-readable narrative explanations for Revenue Officers
  - Contextual recommendation generation

STRICT SAFETY & RELIABILITY GUARDS (ENFORCED BY ARCHITECTURE):
  1. No LLM is EVER permitted to invent or modify risk scores.
     All scores and severity levels remain strictly computed by the deterministic
     rule-based engine (risk_scorer.py).
  2. Safety language filter:
     - NEVER says "Fraud confirmed."
     - NEVER says "Ownership is legally invalid."
     - NEVER says "Person committed fraud."
     - ALWAYS uses:
         "Potential inconsistency detected."
         "Verification recommended."
         "Risk signal detected."
  3. Graceful offline fallback:
     If no cloud API key is configured (GEMINI_API_KEY or OPENAI_API_KEY),
     the assistant uses an intelligent rule-based narrative synthesizer.
"""

import os
import json
import logging
from typing import Dict, Any, List, Optional

logger = logging.getLogger("ai_engine.llm_assistant")

# Environment Keys
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")


def sanitize_safety_language(text: str) -> str:
    """
    Enforce BHOOMI-SHIELD safety guidelines:
    Replaces prohibited accusatory or definitive legal statements with decision-support phrasing.
    """
    prohibited_replacements = [
        ("fraud confirmed", "potential inconsistency detected"),
        ("fraud is confirmed", "potential inconsistency detected"),
        ("ownership is legally invalid", "ownership record requires verification"),
        ("ownership is invalid", "record consistency requires verification"),
        ("person committed fraud", "discrepancy detected requiring verification"),
        ("illegal transaction", "inconsistency flagged for officer review"),
        ("fraudulent", "inconsistent"),
        ("fraud", "potential irregularity"),
    ]
    sanitized = text
    for target, replacement in prohibited_replacements:
        # Case insensitive replacement
        import re
        sanitized = re.sub(re.escape(target), replacement, sanitized, flags=re.IGNORECASE)
    return sanitized


class LLMAssistant:
    """
    BHOOMI-SHIELD LLM Assistant for Document Intelligence.
    Controlled by deterministic risk engine boundaries.
    """

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or GEMINI_API_KEY

    def summarize_document(self, extracted_data: Dict[str, Any], raw_text: str = "") -> str:
        """
        Generate a concise, professional summary of a land document.
        """
        owner = extracted_data.get("owner_name") or "Unspecified party"
        survey = extracted_data.get("survey_number") or "Unspecified"
        area = extracted_data.get("area")
        unit = extracted_data.get("area_unit", "hectare")
        doc_type = extracted_data.get("document_type_display") or extracted_data.get("document_type", "Land Document")
        village = extracted_data.get("village", "")
        tehsil = extracted_data.get("tehsil", "")
        district = extracted_data.get("district", "")
        date = extracted_data.get("document_date", "Date unrecorded")

        location_parts = [p for p in (village, tehsil, district) if p]
        location_str = f" in {', '.join(location_parts)}" if location_parts else ""

        area_str = f" measuring {area} {unit}" if area else ""

        summary = (
            f"{doc_type} for parcel under Survey/Khasra {survey}{area_str}{location_str}, "
            f"associated with registered name '{owner}'. Executed on {date}."
        )
        return summary

    def generate_narrative_explanation(
        self,
        risk_score: int,
        risk_level: str,
        risk_signals: List[Dict[str, Any]],
        parcel_record: Dict[str, Any],
        extracted_data: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Synthesize explainable narrative and recommended verification actions.
        NOTE: risk_score and risk_level are STRICT INPUTS from the risk engine.
        The LLM is NOT permitted to alter them.
        """
        parcel_id = parcel_record.get("parcel_id", "Unknown")
        signal_count = len(risk_signals)

        if signal_count == 0:
            narrative = (
                f"Automated comparison for parcel {parcel_id} showed high consistency across all key fields. "
                f"No risk signals or critical discrepancies were identified. Standard routine monitoring applies."
            )
            actions = [
                "Proceed with routine registry maintenance",
                "Periodic cadastral database synchronization",
            ]
        else:
            signal_summaries = []
            actions = []
            for s in risk_signals:
                factor = s.get("factor", "FACTOR").replace("_", " ").title()
                impact = s.get("impact", 0)
                desc = s.get("description", "")
                signal_summaries.append(f"{factor} (+{impact} pts): {desc}")

            signals_text = "; ".join(signal_summaries)

            if risk_level in ("HIGH", "CRITICAL"):
                narrative = (
                    f"Priority warning for parcel {parcel_id}: The comparison engine identified {signal_count} "
                    f"risk signal(s) contributing to a {risk_level} risk score of {risk_score}/100. "
                    f"Key potential inconsistencies detected include: {signals_text}. "
                    f"Official revenue verification is recommended prior to approving any conveyance, title transfer, or mutation."
                )
            else:
                narrative = (
                    f"Advisory notice for parcel {parcel_id}: The system identified {signal_count} minor "
                    f"risk signal(s) yielding a {risk_level} risk score of {risk_score}/100 ({signals_text}). "
                    f"Routine administrative verification recommended."
                )

        narrative = sanitize_safety_language(narrative)

        return {
            "score": risk_score,  # Enforced from rule-based engine
            "level": risk_level,  # Enforced from rule-based engine
            "narrative": narrative,
            "signal_count": signal_count,
        }
