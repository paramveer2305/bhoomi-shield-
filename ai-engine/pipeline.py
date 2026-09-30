"""
pipeline.py – End-to-End Document Intelligence Pipeline
=========================================================

Orchestrates the full AI pipeline:

  File/Text
    ↓ ocr.py
  Raw Text
    ↓ extractor.py
  Structured Fields
    ↓ normalizer.py
  Normalized Fields
    ↓ comparator.py  (vs. parcel DB record)
  Comparison Results
    ↓ risk_signals.py
  Risk Signals
    ↓ risk_scorer.py
  Score + Level
    ↓ explainer.py
  Explanation + Actions
    ↓
  Final Result Dict

The result dict is compatible with the backend API contract:
  POST /api/documents/register-json  (to store extracted data)
  POST /api/risk/analyze/{parcel_id} (to run risk evaluation)
"""

import logging
from typing import Dict, Any, List, Optional

from ocr import extract_text_from_bytes, extract_text_from_file, get_ocr_capabilities
from extractor import extract_fields, extract_structured_document
from normalizer import normalize_extracted, normalize_parcel
from comparator import compare
from risk_signals import generate_signals
from risk_scorer import calculate_score, score_breakdown
from explainer import explain
from llm_assistant import LLMAssistant

logger = logging.getLogger("ai_engine.pipeline")


# ─────────────────────────────────────────────
#  Pipeline Result Structure
# ─────────────────────────────────────────────

def _build_result(
    parcel_id: str,
    document_type: str,
    file_name: str,
    raw_text: str,
    extracted: Dict[str, Any],
    normalized_doc: Dict[str, Any],
    normalized_parcel: Dict[str, Any],
    comparison_results,
    signals: List[Dict[str, Any]],
    score: int,
    level: str,
    trend: str,
    confidence: float,
    explanation: Dict[str, Any],
    ocr_used: str,
) -> Dict[str, Any]:
    """Build the unified pipeline result dict."""

    llm = LLMAssistant()
    doc_summary = llm.summarize_document(extracted, raw_text)

    # API response format strictly adhering to BHOOMI-SHIELD contracts
    api_risk_response = {
        "score": score,
        "level": level,
        "trend": trend,
        "confidence_score": confidence,
        "factors": [
            {
                "factor": s["factor"],
                "severity": s.get("severity", "MEDIUM"),
                "impact": s.get("impact", 0),
                "description": s.get("description", ""),
                "evidence": s.get("evidence", {}),
            }
            for s in signals
        ],
        "reasons": explanation.get("reasons", []),
        "recommended_actions": explanation.get("recommended_actions", []),
    }

    return {
        # ── Metadata ──────────────────────────────
        "parcel_id":     parcel_id,
        "file_name":     file_name,
        "document_type": document_type,
        "ocr_engine":    ocr_used,

        # ── OCR output ────────────────────────────
        "raw_text_preview": raw_text[:300] if raw_text else "",

        # ── Extracted fields ──────────────────────
        "extracted_data": {
            k: v for k, v in extracted.items()
            if k not in ("_ocr_raw",) and v is not None
        },
        "structured_fields": extract_structured_document(raw_text),
        "document_summary": doc_summary,

        # ── Comparison results ────────────────────
        "comparison_results": [r.to_dict() for r in comparison_results],

        # ── Risk signals ──────────────────────────
        "risk_signals": signals,

        # ── Risk score ────────────────────────────
        "risk_score":      score,
        "risk_level":      level,
        "risk_trend":      trend,
        "confidence_score": confidence,

        # ── Breakdown & Reasons ───────────────────
        "score_breakdown": score_breakdown(signals),
        "reasons":         explanation.get("reasons", []),

        # ── Explanation ───────────────────────────
        "explanation":         explanation["summary"],
        "risk_verdict":        explanation["risk_verdict"],
        "recommended_actions": explanation["recommended_actions"],
        "disclaimer":          explanation["disclaimer"],

        # ── API Contract Format ───────────────────
        "api_risk_response":   api_risk_response,

        # ── Backend-compatible fields ─────────────
        # These match the schema expected by /api/documents/register-json
        "document_for_backend": {
            "parcel_id":      parcel_id,
            "document_type":  document_type,
            "file_name":      file_name,
            "extracted_data": {
                k: v for k, v in extracted.items()
                if k not in ("_ocr_raw", "area_sqm", "document_type", "transaction_type")
                and v is not None
            },
        },

        # These match the schema expected by /api/risk/analyze/{parcel_id}
        "risk_for_backend": {
            "extracted_data_override": {
                k: v for k, v in normalized_doc.items()
                if k not in ("area_sqm",) and v is not None
            }
        },
    }


# ─────────────────────────────────────────────
#  Main Pipeline Functions
# ─────────────────────────────────────────────

def run_pipeline_from_bytes(
    file_bytes: bytes,
    content_type: str,
    file_name: str,
    parcel_record: Dict[str, Any],
    document_type: str = "UNKNOWN",
    documents_on_parcel: Optional[List[Dict[str, Any]]] = None,
    open_cases: int = 0,
) -> Dict[str, Any]:
    """
    Run the full AI pipeline on document bytes.

    Args:
        file_bytes:          Raw file bytes (PDF/JPG/PNG)
        content_type:        MIME type of the file
        file_name:           Original filename
        parcel_record:       Official parcel record from database
        document_type:       Declared document type (overrideable)
        documents_on_parcel: All existing documents for the parcel
        open_cases:          Count of unresolved verification cases

    Returns:
        Full pipeline result dict (see _build_result)
    """
    parcel_id = parcel_record.get("parcel_id", "UNKNOWN")
    logger.info(f"[Pipeline] Starting pipeline for parcel '{parcel_id}', file '{file_name}'")

    # ── Stage 1: OCR ──────────────────────────────────────────────────────────
    caps = get_ocr_capabilities()
    raw_text = extract_text_from_bytes(file_bytes, content_type, file_name)
    ocr_used = caps["active_tier"]
    logger.info(f"[Pipeline] OCR complete: {len(raw_text)} chars using {ocr_used}")

    return _run_stages(
        raw_text=raw_text,
        parcel_record=parcel_record,
        parcel_id=parcel_id,
        document_type=document_type,
        file_name=file_name,
        documents_on_parcel=documents_on_parcel,
        open_cases=open_cases,
        ocr_used=ocr_used,
    )


def run_pipeline_from_file(
    file_path: str,
    parcel_record: Dict[str, Any],
    document_type: str = "UNKNOWN",
    documents_on_parcel: Optional[List[Dict[str, Any]]] = None,
    open_cases: int = 0,
) -> Dict[str, Any]:
    """
    Run the full AI pipeline on a file on disk.

    Args:
        file_path:     Path to document file (PDF/JPG/PNG)
        parcel_record: Official parcel record from database
        document_type: Declared document type
        documents_on_parcel: Existing docs on the parcel
        open_cases:    Count of unresolved cases

    Returns:
        Full pipeline result dict
    """
    import os
    parcel_id = parcel_record.get("parcel_id", "UNKNOWN")
    file_name = os.path.basename(file_path)
    logger.info(f"[Pipeline] Starting pipeline from file: '{file_path}'")

    raw_text = extract_text_from_file(file_path)
    caps = get_ocr_capabilities()

    return _run_stages(
        raw_text=raw_text,
        parcel_record=parcel_record,
        parcel_id=parcel_id,
        document_type=document_type,
        file_name=file_name,
        documents_on_parcel=documents_on_parcel,
        open_cases=open_cases,
        ocr_used=caps["active_tier"],
    )


def run_pipeline_from_text(
    raw_text: str,
    parcel_record: Dict[str, Any],
    document_type: str = "UNKNOWN",
    file_name: str = "document.txt",
    documents_on_parcel: Optional[List[Dict[str, Any]]] = None,
    open_cases: int = 0,
) -> Dict[str, Any]:
    """
    Run the pipeline starting from pre-extracted raw text (skip OCR stage).
    Useful for testing and integration where text is already available.

    Args:
        raw_text:      Pre-extracted document text
        parcel_record: Official parcel record from database
        document_type: Declared document type
        file_name:     Logical file name for reference
        documents_on_parcel: Existing docs on the parcel
        open_cases:    Count of unresolved cases

    Returns:
        Full pipeline result dict
    """
    parcel_id = parcel_record.get("parcel_id", "UNKNOWN")
    return _run_stages(
        raw_text=raw_text,
        parcel_record=parcel_record,
        parcel_id=parcel_id,
        document_type=document_type,
        file_name=file_name,
        documents_on_parcel=documents_on_parcel,
        open_cases=open_cases,
        ocr_used="PreExtracted",
    )


def _run_stages(
    raw_text: str,
    parcel_record: Dict[str, Any],
    parcel_id: str,
    document_type: str,
    file_name: str,
    documents_on_parcel: Optional[List[Dict[str, Any]]],
    open_cases: int,
    ocr_used: str,
) -> Dict[str, Any]:
    """Internal: run stages 2–8 of the pipeline after OCR."""

    # ── Stage 2: Extraction ───────────────────────────────────────────────────
    extracted = extract_fields(raw_text)
    # Override document_type if extractor found a better one
    if document_type == "UNKNOWN" and extracted.get("document_type"):
        document_type = extracted["document_type"]

    # ── Stage 3: Normalization ────────────────────────────────────────────────
    normalized_doc = normalize_extracted(extracted)
    normalized_db = normalize_parcel(parcel_record)

    # ── Stage 4: Comparison ───────────────────────────────────────────────────
    comparison_results = compare(normalized_db, normalized_doc)

    # ── Stage 5: Risk Signals ─────────────────────────────────────────────────
    signals = generate_signals(
        comparison_results=comparison_results,
        parcel=parcel_record,
        extracted=normalized_doc,
        documents=documents_on_parcel,
        open_cases=open_cases,
    )

    # ── Stage 6: Risk Scoring ─────────────────────────────────────────────────
    score, level, trend, confidence = calculate_score(signals)

    # ── Stage 7: Explanation ──────────────────────────────────────────────────
    explanation = explain(score, level, signals, parcel_id)

    # ── Stage 8: Assemble Result ─────────────────────────────────────────────
    result = _build_result(
        parcel_id=parcel_id,
        document_type=document_type,
        file_name=file_name,
        raw_text=raw_text,
        extracted=extracted,
        normalized_doc=normalized_doc,
        normalized_parcel=normalized_db,
        comparison_results=comparison_results,
        signals=signals,
        score=score,
        level=level,
        trend=trend,
        confidence=confidence,
        explanation=explanation,
        ocr_used=ocr_used,
    )

    logger.info(
        f"[Pipeline] Complete — Score: {score}, Level: {level}, "
        f"Signals: {len(signals)}, Comparisons: {len(comparison_results)}"
    )

    return result
