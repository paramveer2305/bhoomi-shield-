"""
test_pipeline.py – Comprehensive Test Suite for BHOOMI-SHIELD AI Engine
========================================================================

Validates all prompt-specified pipeline requirements:
  1. OCR Layer & Multi-tier capability check
  2. Information Extraction (structured JSON with required fields)
  3. Field Normalization (casing, whitespace, area units)
  4. Comparison Engine (mismatch detection, tolerances)
  5. Risk Signal Generation (factor, severity, impact, description, evidence)
  6. Explainable Risk Scoring (0–100, rule-based)
  7. Explanation & Recommended Actions
  8. Safety Rules (strictly no "fraud confirmed" or "ownership invalid")
  9. 15 Synthetic Demo Cases (5 Low, 5 Medium, 5 High)
"""

import pytest
import unittest
from typing import Dict, Any

from ocr import get_ocr_capabilities, extract_text_from_bytes
from extractor import extract_fields, extract_structured_document, DOCUMENT_TYPE_DISPLAY_NAMES
from normalizer import normalize_name, area_to_sqm, normalize_survey_number, normalize_extracted
from comparator import compare, compare_owner_name, compare_area, compare_survey_number
from risk_signals import generate_signals, DEFAULT_WEIGHTS
from risk_scorer import calculate_score
from explainer import explain
from llm_assistant import LLMAssistant, sanitize_safety_language
from pipeline import run_pipeline_from_text
from demo_data import ALL_DEMO_CASES, LOW_RISK_CASES, MEDIUM_RISK_CASES, HIGH_RISK_CASES


class TestAIEnginePipeline(unittest.TestCase):

    def test_01_ocr_capabilities(self):
        caps = get_ocr_capabilities()
        self.assertIn("active_tier", caps)
        self.assertIn("demo_mock_available", caps)
        self.assertTrue(caps["demo_mock_available"])

    def test_02_structured_field_extraction(self):
        sample_doc = (
            "SALE DEED\n"
            "This deed is executed on 15/03/2024\n"
            "Seller: Rajesh Sharma\n"
            "Buyer: Suresh Verma\n"
            "Survey No.: 142/2\n"
            "Area: 2.50 Hectare\n"
            "Village: Demo Village\n"
            "Tehsil: Huzur\n"
            "District: Bhopal\n"
        )
        extracted = extract_structured_document(sample_doc)
        
        self.assertEqual(extracted.get("owner_name"), "Rajesh Sharma")
        self.assertEqual(extracted.get("survey_number"), "142/2")
        self.assertEqual(extracted.get("area"), 2.50)
        self.assertEqual(extracted.get("village"), "Demo Village")
        self.assertEqual(extracted.get("district"), "Bhopal")
        self.assertEqual(extracted.get("tehsil"), "Huzur")
        self.assertEqual(extracted.get("document_date"), "15/03/2024")
        self.assertEqual(extracted.get("document_type"), "Sale Deed")
        self.assertEqual(extracted.get("transaction_type"), "SALE")

    def test_03_normalization(self):
        # Name normalization variations
        v1 = normalize_name("Rajesh Kumar")
        v2 = normalize_name("RAJESH KUMAR")
        v3 = normalize_name(" Rajesh Kumar  ")
        v4 = normalize_name("Shri Rajesh Kumar")
        
        self.assertEqual(v1, "Rajesh Kumar")
        self.assertEqual(v1, v2)
        self.assertEqual(v2, v3)
        self.assertEqual(v3, v4)

        # Different names must NOT be merged
        diff = normalize_name("Rajesh Sharma")
        self.assertNotEqual(v1, diff)

        # Area normalization
        sqm1 = area_to_sqm(2.5, "hectare")
        sqm2 = area_to_sqm(25000, "sq meter")
        self.assertEqual(sqm1, sqm2)

    def test_04_comparison_engine(self):
        # Owner mismatch
        res_owner = compare_owner_name("Rajesh Kumar", "Rajesh Sharma")
        self.assertTrue(res_owner.is_mismatch())
        self.assertEqual(res_owner.field, "owner_name")

        # Owner match
        res_match = compare_owner_name("Rajesh Kumar", "Rajesh Kumar")
        self.assertFalse(res_match.is_mismatch())

        # Area mismatch (2.50 vs 2.85 -> 14% difference)
        sqm_db = area_to_sqm(2.50, "hectare")
        sqm_doc = area_to_sqm(2.85, "hectare")
        res_area = compare_area(sqm_db, sqm_doc)
        self.assertTrue(res_area.is_mismatch())

    def test_05_risk_signals_structure(self):
        sqm_db = area_to_sqm(2.50, "hectare")
        sqm_doc = area_to_sqm(3.80, "hectare")

        parcel = {
            "parcel_id": "TEST-01",
            "owner_name": "Ramesh Kumar Sharma",
            "survey_number": "425/1",
            "area_sqm": sqm_db,
            "area": 2.5,
            "area_unit": "hectare"
        }
        extracted = {
            "owner_name": "Suresh Kumar",
            "survey_number": "425/1",
            "area_sqm": sqm_doc,
            "area": 3.8,
            "area_unit": "hectare"
        }

        comps = compare(parcel, extracted)
        signals = generate_signals(comps, parcel, extracted)

        for sig in signals:
            self.assertIn("factor", sig)
            self.assertIn("severity", sig)
            self.assertIn("impact", sig)
            self.assertIn("description", sig)
            self.assertIn("evidence", sig)
            # Verify safety language
            self.assertNotIn("fraud confirmed", sig["description"].lower())
            self.assertNotIn("legally invalid", sig["description"].lower())

    def test_06_explainability_and_safety_rules(self):
        signals = [
            {"factor": "OWNER_MISMATCH", "severity": "HIGH", "impact": 25, "description": "Owner discrepancy detected", "evidence": {}},
            {"factor": "AREA_MISMATCH", "severity": "MEDIUM", "impact": 15, "description": "Area discrepancy detected", "evidence": {}},
            {"factor": "MUTATION_PENDING", "severity": "MEDIUM", "impact": 20, "description": "Mutation pending", "evidence": {}},
        ]
        score, level, trend, confidence = calculate_score(signals)
        self.assertEqual(score, 60)
        self.assertEqual(level, "HIGH")
        self.assertIsInstance(confidence, float)
        self.assertGreaterEqual(confidence, 0.50)
        self.assertLessEqual(confidence, 0.99)

        exp = explain(score, level, signals, parcel_id="TEST-01")
        self.assertIn("reasons", exp)
        self.assertTrue(len(exp["reasons"]) >= 3)
        self.assertIn("recommended_actions", exp)
        self.assertTrue(len(exp["recommended_actions"]) >= 2)

        # Safety verification
        disclaimer = exp["disclaimer"].lower()
        self.assertIn("decision-support", disclaimer)
        self.assertIn("not confirm fraud", disclaimer)

    def test_07_demo_cases_counts(self):
        self.assertGreaterEqual(len(LOW_RISK_CASES), 5)
        self.assertGreaterEqual(len(MEDIUM_RISK_CASES), 5)
        self.assertGreaterEqual(len(HIGH_RISK_CASES), 5)
        self.assertEqual(len(ALL_DEMO_CASES), 15)

    def test_08_demo_pipeline_execution(self):
        for case in ALL_DEMO_CASES:
            result = run_pipeline_from_text(
                raw_text=case["document_text"],
                parcel_record=case["parcel"],
                document_type=case["document_type"],
                file_name=f"{case['case_id'].lower()}.txt"
            )
            self.assertIn("risk_score", result)
            self.assertIn("risk_level", result)
            self.assertIn("reasons", result)
            self.assertIn("recommended_actions", result)
            self.assertIn("api_risk_response", result)


if __name__ == "__main__":
    unittest.main()
