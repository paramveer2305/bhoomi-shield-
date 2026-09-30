"""
BHOOMI-SHIELD AI Engine
=======================

OCR → Text Extraction → Structured JSON → Normalization → Comparison → Risk Signals

This module is the AI/Document Intelligence layer. It communicates with the
backend through documented REST APIs only and does NOT directly touch MongoDB.

API Integration Points (from docs/API_CONTRACT.md):
  POST /api/documents/register-json   ← Submit extracted document data
  POST /api/risk/analyze/{parcel_id}  ← Trigger risk evaluation with override
  GET  /api/parcels/{parcel_id}       ← Retrieve ground-truth parcel record

Pipeline:
  1. ocr.py          – File → Raw text (PDF/JPG/PNG, Tesseract or mock)
  2. extractor.py    – Raw text → Structured JSON fields
  3. normalizer.py   – Normalize names, areas, dates for consistent comparison
  4. comparator.py   – Compare extracted doc fields against DB parcel record
  5. risk_signals.py – Generate typed risk signals with severity + evidence
  6. risk_scorer.py  – Transparent rule-based score (0-100) + level
  7. explainer.py    – Human-readable explanation + recommended actions
  8. pipeline.py     – Orchestrate all stages end-to-end
  9. api_client.py   – HTTP client to post results back to the backend
  10. demo_data.py   – 15 synthetic test cases (5 LOW, 5 MEDIUM, 5 HIGH)
  11. main.py        – CLI and HTTP entry points
"""
