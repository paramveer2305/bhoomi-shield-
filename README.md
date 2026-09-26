# BHOOMI-SHIELD: AI-Powered Land Dispute Early Warning & Risk Intelligence System

## Project Overview

BHOOMI-SHIELD serves as an intelligence and early-warning layer over land records and uploaded documents. It is designed to assist officers and citizens by surfacing potential discrepancies, computing transparent risk signals, and facilitating verification workflows.

### Disclaimer & Compliance
This system is a **decision-support tool**. It does **NOT** legally prove fraud, ownership, or guilt. All system outputs represent **potential inconsistencies** and **risk signals requiring verification**.

---

## Directory Structure

- `backend/`: FastAPI REST API service with MongoDB database integration, JWT authentication, risk engine, and verification case management.
- `frontend/`: React Web Application (Integration target).
- `ai-engine/`: Document OCR and AI extraction modules (Integration target).
- `case-management/`: Verification workflow extensions.
- `docs/`: System documentation & `API_CONTRACT.md`.
- `data/`: Synthetic demonstration datasets.
