# BHOOMI-SHIELD Backend API

AI-Powered Land Dispute Early Warning & Risk Intelligence System - Backend Service built with Python, FastAPI, and MongoDB.

## Features

- **Parcel Records Management**: Cadastral parcel information tracking.
- **Document & Metadata Store**: Upload land documents and store extracted AI metadata.
- **AI Risk Engine**: Comparative evaluation between extracted document fields and parcel master records.
- **Explainable Risk Intelligence**: Produces structured risk scores, transparent risk factors, and recommended verification actions.
- **Early Warning Alerts**: Automatic alert triggering for high/critical risk signals.
- **Verification Case Management**: Officer verification workflows and audit logs.
- **Chronological Timeline**: Event stream logging for all parcel activities.

## Quick Start

### 1. Requirements

- Python 3.10+
- MongoDB instance (running on `localhost:27017` or configured URI)

### 2. Environment Setup

Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Install dependencies:
```bash
pip install -r requirements.txt
```

### 3. Run Development Server

```bash
uvicorn app.main:app --reload --port 8000
```

Access Interactive API Documentation:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

### 4. Running Tests

```bash
pytest
```
