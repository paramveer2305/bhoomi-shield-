import difflib
from typing import Dict, Any, List, Tuple
from datetime import datetime

class RiskEngineService:
    """
    BHOOMI-SHIELD AI Risk Intelligence Engine
    
    Performs explainable risk signal calculation by comparing extracted document metadata
    against official stored parcel records.
    
    IMPORTANT: System outputs decision-support risk signals only. It NEVER asserts legal proof of fraud or guilt.
    """

    @staticmethod
    def calculate_name_similarity(name1: str, name2: str) -> float:
        if not name1 or not name2:
            return 1.0
        n1 = name1.strip().lower()
        n2 = name2.strip().lower()
        return difflib.SequenceMatcher(None, n1, n2).ratio()

    @classmethod
    def evaluate_risk(
        cls, 
        parcel: Dict[str, Any], 
        extracted_data_list: List[Dict[str, Any]],
        historical_events: List[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        
        score = 0
        reasons = []
        recommended_actions = []

        stored_owner = parcel.get("owner_name", "")
        stored_area = parcel.get("area", 0.0)
        stored_survey = parcel.get("survey_number", "")

        owner_mismatch_detected = False
        area_mismatch_detected = False
        survey_mismatch_detected = False

        for doc in extracted_data_list:
            ext = doc.get("extracted_data", {})
            if not ext:
                continue
            
            # 1. Owner Name Comparison (e.g. buyer/owner in document)
            doc_owner = ext.get("owner_name") or ext.get("buyer_name")
            if doc_owner:
                similarity = cls.calculate_name_similarity(stored_owner, doc_owner)
                if similarity < 0.85:
                    owner_mismatch_detected = True
                    impact = 35 if similarity < 0.5 else 25
                    reasons.append({
                        "factor": "OWNER_MISMATCH",
                        "impact": impact,
                        "description": f"Potential inconsistency: Extracted name '{doc_owner}' differs from registered parcel owner '{stored_owner}' (similarity: {int(similarity*100)}%). Verification recommended."
                    })
                    score += impact

            # 2. Area Discrepancy Comparison
            doc_area = ext.get("area")
            if doc_area is not None and stored_area > 0:
                area_diff_pct = abs(float(doc_area) - float(stored_area)) / float(stored_area) * 100
                if area_diff_pct > 5.0:
                    area_mismatch_detected = True
                    impact = 25 if area_diff_pct > 20 else 15
                    reasons.append({
                        "factor": "AREA_MISMATCH",
                        "impact": impact,
                        "description": f"Potential inconsistency: Document states area as {doc_area} units, whereas stored record indicates {stored_area} units ({area_diff_pct:.1f}% variance). Requires verification."
                    })
                    score += impact

            # 3. Survey Number Comparison
            doc_survey = ext.get("survey_number")
            if doc_survey and doc_survey.strip().lower() != stored_survey.strip().lower():
                survey_mismatch_detected = True
                impact = 20
                reasons.append({
                    "factor": "SURVEY_NUMBER_MISMATCH",
                    "impact": impact,
                    "description": f"Potential inconsistency: Document references survey number '{doc_survey}', matching stored survey number '{stored_survey}' imperfectly. Verification recommended."
                })
                score += impact

        # 4. Check Unverified Documents Count
        unverified_count = sum(1 for d in extracted_data_list if d.get("verification_status") != "VERIFIED")
        if unverified_count >= 2:
            impact = 15
            reasons.append({
                "factor": "MULTIPLE_UNVERIFIED_DOCUMENTS",
                "impact": impact,
                "description": f"Risk signal: Parcel has {unverified_count} unverified documents requiring revenue officer cross-check."
            })
            score += impact

        # 5. Check Historical Timeline Events for rapid transactions
        if historical_events and len(historical_events) >= 3:
            impact = 15
            reasons.append({
                "factor": "HIGH_EVENT_FREQUENCY",
                "impact": impact,
                "description": f"Risk signal: Higher than usual frequency of document uploads or updates recorded in parcel timeline."
            })
            score += impact

        # Cap overall score at 100
        score = min(100, score)

        # Determine Risk Level
        if score >= 85:
            level = "CRITICAL"
        elif score >= 60:
            level = "HIGH"
        elif score >= 30:
            level = "MEDIUM"
        else:
            level = "LOW"

        # Determine Trend (Baseline heuristic)
        trend = "STABLE"
        if score >= 60:
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
