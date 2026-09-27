import difflib
from typing import Dict, Any, List, Tuple, Optional
from datetime import datetime
from jellyfish import jaro_winkler_similarity, levenshtein_distance

class RiskEngineService:
    """
    BHOOMI-SHIELD AI Risk Intelligence Engine

    Performs explainable risk signal calculation by comparing extracted document metadata
    against official stored parcel records.

    IMPORTANT: System outputs decision-support risk signals only. It NEVER asserts legal proof of fraud or guilt.
    """

    # Default weights (can be overridden by admin config)
    _weights = {
        "owner_mismatch": 25,
        "area_discrepancy": 15,
        "survey_mismatch": 20,
        "title_chain_break": 30,
        "multiple_unverified": 15,
        "high_event_frequency": 15,
        "owner_similarity_threshold": 0.85,
        "area_variance_threshold": 5.0,
        "critical_threshold": 85,
        "high_threshold": 60,
        "medium_threshold": 30,
    }

    @classmethod
    def update_weights(cls, weights: Dict[str, Any]):
        """Update risk weights from admin configuration"""
        cls._weights.update(weights)

    @classmethod
    def get_weights(cls) -> Dict[str, Any]:
        """Get current risk weights"""
        return cls._weights.copy()

    @staticmethod
    def calculate_name_similarity(name1: str, name2: str) -> float:
        """
        Calculate name similarity using Jaro-Winkler algorithm
        Better handles transliteration variations (e.g., "Ramesh Kumar" vs "Ramesh K.")
        """
        if not name1 or not name2:
            return 1.0
        n1 = name1.strip().lower()
        n2 = name2.strip().lower()
        # Use Jaro-Winkler which gives more weight to prefix matches
        return jaro_winkler_similarity(n1, n2)

    @staticmethod
    def normalize_area_to_sqm(value: float, unit: str) -> float:
        """
        Normalize area values to square meters
        Supports: Hectare, Acre, Bigha, Guntha, Sq Meter, Sq Ft
        """
        if not value or value <= 0:
            return 0.0

        unit = unit.strip().lower() if unit else "sq meter"

        # Conversion factors to square meters
        conversions = {
            "hectare": 10000.0,
            "hectares": 10000.0,
            "ha": 10000.0,
            "acre": 4046.86,
            "acres": 4046.86,
            "ac": 4046.86,
            "bigha": 2529.29,  # Standard UP/MP bigha ~ 2529 sq m
            "bighas": 2529.29,
            "guntha": 101.17,
            "gunthas": 101.17,
            "gunta": 101.17,
            "sq meter": 1.0,
            "sq meters": 1.0,
            "sqm": 1.0,
            "m2": 1.0,
            "sq ft": 0.092903,
            "sqft": 0.092903,
            "ft2": 0.092903,
            "square feet": 0.092903,
            "square foot": 0.092903,
        }

        factor = conversions.get(unit, 1.0)
        return float(value) * factor

    @classmethod
    def evaluate_risk(
        cls,
        parcel: Dict[str, Any],
        extracted_data_list: List[Dict[str, Any]],
        historical_events: List[Dict[str, Any]] = None
    ) -> Dict[str, Any]:

        w = cls._weights
        score = 0
        reasons = []
        recommended_actions = []

        stored_owner = parcel.get("owner_name", "")
        stored_area = parcel.get("area", 0.0)
        stored_survey = parcel.get("survey_number", "")
        stored_area_unit = parcel.get("area_unit", "sq meter")

        owner_mismatch_detected = False
        area_mismatch_detected = False
        survey_mismatch_detected = False
        title_chain_break_detected = False

        # Normalize stored area to sqm for consistent comparison
        stored_area_sqm = cls.normalize_area_to_sqm(stored_area, stored_area_unit)

        for doc in extracted_data_list:
            ext = doc.get("extracted_data", {})
            if not ext:
                continue

            # 1. Owner Name Comparison (e.g. buyer/owner in document)
            doc_owner = ext.get("owner_name") or ext.get("buyer_name")
            if doc_owner:
                similarity = cls.calculate_name_similarity(stored_owner, doc_owner)
                threshold = w.get("owner_similarity_threshold", 0.85)
                if similarity < threshold:
                    owner_mismatch_detected = True
                    impact = w.get("owner_mismatch", 25)
                    if similarity < 0.5:
                        impact = int(impact * 1.4)  # Higher penalty for very low similarity
                    reasons.append({
                        "factor": "OWNER_MISMATCH",
                        "impact": impact,
                        "description": f"Potential inconsistency: Extracted name '{doc_owner}' differs from registered parcel owner '{stored_owner}' (similarity: {int(similarity*100)}%). Verification recommended."
                    })
                    score += impact

            # 2. Area Discrepancy Comparison (with unit normalization)
            doc_area = ext.get("area")
            doc_area_unit = ext.get("area_unit", "sq meter")
            if doc_area is not None and stored_area_sqm > 0:
                doc_area_sqm = cls.normalize_area_to_sqm(doc_area, doc_area_unit)
                area_diff_pct = abs(doc_area_sqm - stored_area_sqm) / stored_area_sqm * 100
                threshold = w.get("area_variance_threshold", 5.0)
                if area_diff_pct > threshold:
                    area_mismatch_detected = True
                    impact = w.get("area_discrepancy", 15)
                    if area_diff_pct > 20:
                        impact = int(impact * 1.67)  # Higher penalty for large variance
                    reasons.append({
                        "factor": "AREA_MISMATCH",
                        "impact": impact,
                        "description": f"Potential inconsistency: Document states area as {doc_area} {doc_area_unit} ({doc_area_sqm:.1f} sq m), whereas stored record indicates {stored_area} {stored_area_unit} ({stored_area_sqm:.1f} sq m) ({area_diff_pct:.1f}% variance). Requires verification."
                    })
                    score += impact

            # 3. Survey Number Comparison
            doc_survey = ext.get("survey_number")
            if doc_survey and doc_survey.strip().lower() != stored_survey.strip().lower():
                survey_mismatch_detected = True
                impact = w.get("survey_mismatch", 20)
                reasons.append({
                    "factor": "SURVEY_NUMBER_MISMATCH",
                    "impact": impact,
                    "description": f"Potential inconsistency: Document references survey number '{doc_survey}', matching stored survey number '{stored_survey}' imperfectly. Verification recommended."
                })
                score += impact

        # 4. Title Chain Continuity Check (NEW)
        # Sort documents chronologically and verify seller-buyer chain
        verified_docs = [d for d in extracted_data_list if d.get("verification_status") == "VERIFIED"]
        if len(verified_docs) >= 2:
            # Sort by document_date or upload_date
            sorted_docs = sorted(verified_docs, key=lambda d: d.get("document_date", d.get("upload_date", "")))

            for i in range(1, len(sorted_docs)):
                prev_doc = sorted_docs[i - 1].get("extracted_data", {})
                curr_doc = sorted_docs[i].get("extracted_data", {})

                prev_buyer = prev_doc.get("buyer_name") or prev_doc.get("owner_name")
                curr_seller = curr_doc.get("seller_name")

                if prev_buyer and curr_seller:
                    similarity = cls.calculate_name_similarity(prev_buyer, curr_seller)
                    if similarity < 0.75:  # Lower threshold for chain continuity
                        title_chain_break_detected = True
                        impact = w.get("title_chain_break", 30)
                        reasons.append({
                            "factor": "TITLE_CHAIN_BREAK",
                            "impact": impact,
                            "description": f"Title chain discontinuity detected: Previous buyer '{prev_buyer}' does not match current seller '{curr_seller}' (similarity: {int(similarity*100)}%). Ownership chain broken."
                        })
                        score += impact

        # 5. Check Unverified Documents Count
        unverified_count = sum(1 for d in extracted_data_list if d.get("verification_status") != "VERIFIED")
        if unverified_count >= 2:
            impact = w.get("multiple_unverified", 15)
            reasons.append({
                "factor": "MULTIPLE_UNVERIFIED_DOCUMENTS",
                "impact": impact,
                "description": f"Risk signal: Parcel has {unverified_count} unverified documents requiring revenue officer cross-check."
            })
            score += impact

        # 6. Check Historical Timeline Events for rapid transactions
        if historical_events and len(historical_events) >= 3:
            impact = w.get("high_event_frequency", 15)
            reasons.append({
                "factor": "HIGH_EVENT_FREQUENCY",
                "impact": impact,
                "description": f"Risk signal: Higher than usual frequency of document uploads or updates recorded in parcel timeline."
            })
            score += impact

        # Cap overall score at 100
        score = min(100, score)

        # Determine Risk Level (using configurable thresholds)
        if score >= w.get("critical_threshold", 85):
            level = "CRITICAL"
        elif score >= w.get("high_threshold", 60):
            level = "HIGH"
        elif score >= w.get("medium_threshold", 30):
            level = "MEDIUM"
        else:
            level = "LOW"

        # Determine Trend (Baseline heuristic)
        trend = "STABLE"
        if score >= w.get("high_threshold", 60):
            trend = "INCREASING"

        # Generate Actionable Verification Recommendations
        if owner_mismatch_detected:
            recommended_actions.append("Verify ownership chain and title deed validity with local Revenue Registrar")
            recommended_actions.append("Check latest mutation entry in Sub-Registrar Office ledger")

        if area_mismatch_detected:
            recommended_actions.append("Conduct physical ground measurement or GIS boundary verification")
            recommended_actions.append("Verify Khasra Naksha map boundaries against survey records")

        if survey_mismatch_detected:
            recommended_actions.append("Cross-check Tehsil survey records for sub-division or re-numbering history")

        if title_chain_break_detected:
            recommended_actions.append("URGENT: Investigate title chain break - verify all intermediate conveyance deeds")
            recommended_actions.append("Check for missing mutation entries or unregistered transactions")
            recommended_actions.append("Recommend legal title opinion from empaneled advocate")

        if not recommended_actions:
            recommended_actions.append("Standard periodic record verification recommended")
            recommended_actions.append("Maintain routine monitoring of incoming document uploads")

        return {
            "score": score,
            "level": level,
            "trend": trend,
            "reasons": reasons,
            "recommended_actions": recommended_actions
        }
