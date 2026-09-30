"""
api_client.py – Backend API Integration Client
===============================================

HTTP client used by the AI engine to communicate with the FastAPI backend.

Implements the documented integration points from docs/API_CONTRACT.md:

  POST /api/documents/register-json
    → Submit extracted document data to the backend DB

  POST /api/risk/analyze/{parcel_id}
    → Trigger risk evaluation (with extracted data override)

  GET  /api/parcels/{parcel_id}
    → Fetch official parcel record for comparison

  GET  /api/health
    → Check backend availability

Handles:
  - Auth headers (Bearer token)
  - Timeout and retry
  - Structured error logging
"""

import logging
import time
from typing import Dict, Any, Optional

logger = logging.getLogger("ai_engine.api_client")

try:
    import httpx
    HAS_HTTPX = True
except ImportError:
    HAS_HTTPX = False
    logger.warning("[APIClient] httpx not installed. Using urllib fallback.")

DEFAULT_BASE_URL = "http://localhost:8000/api"
DEFAULT_TIMEOUT = 30.0
MAX_RETRIES = 2


# ─────────────────────────────────────────────
#  Client Class
# ─────────────────────────────────────────────

class BhoomiShieldAPIClient:
    """
    HTTP client for BHOOMI-SHIELD backend API.

    Usage:
        client = BhoomiShieldAPIClient(base_url="http://localhost:8000/api")

        # Fetch a parcel record (no auth needed for GET in demo)
        parcel = client.get_parcel("MP-BPL-1024")

        # Submit extracted document data
        doc = client.register_document_json({
            "parcel_id": "MP-BPL-1024",
            "document_type": "SALE_DEED",
            "file_name": "sale_deed.pdf",
            "extracted_data": { ... }
        })

        # Trigger risk analysis with override
        risk = client.analyze_risk("MP-BPL-1024", extracted_data_override={ ... })
    """

    def __init__(
        self,
        base_url: str = DEFAULT_BASE_URL,
        token: Optional[str] = None,
        timeout: float = DEFAULT_TIMEOUT,
    ):
        self.base_url = base_url.rstrip("/")
        self.token = token
        self.timeout = timeout

    def _headers(self) -> Dict[str, str]:
        headers = {"Content-Type": "application/json", "Accept": "application/json"}
        if self.token:
            headers["Authorization"] = f"Bearer {self.token}"
        return headers

    def _request(
        self,
        method: str,
        path: str,
        json_body: Optional[Dict] = None,
        retries: int = MAX_RETRIES,
    ) -> Dict[str, Any]:
        """Make an HTTP request with retry logic."""
        url = f"{self.base_url}{path}"
        last_error = None

        for attempt in range(retries + 1):
            try:
                if HAS_HTTPX:
                    with httpx.Client(timeout=self.timeout) as client:
                        resp = client.request(
                            method=method,
                            url=url,
                            json=json_body,
                            headers=self._headers(),
                        )
                    if resp.status_code >= 400:
                        err = resp.json() if resp.content else {"error": {"message": resp.text}}
                        raise RuntimeError(
                            f"API error {resp.status_code}: {err.get('error', {}).get('message', str(err))}"
                        )
                    return resp.json()
                else:
                    # urllib fallback
                    import json
                    import urllib.request
                    import urllib.error

                    data = json.dumps(json_body).encode() if json_body else None
                    req = urllib.request.Request(
                        url,
                        data=data,
                        headers=self._headers(),
                        method=method,
                    )
                    with urllib.request.urlopen(req, timeout=self.timeout) as resp:
                        return json.loads(resp.read())

            except Exception as e:
                last_error = e
                if attempt < retries:
                    wait = 2 ** attempt
                    logger.warning(f"[APIClient] Attempt {attempt+1} failed: {e}. Retrying in {wait}s...")
                    time.sleep(wait)

        logger.error(f"[APIClient] All {retries+1} attempts failed for {method} {url}: {last_error}")
        raise RuntimeError(f"API request failed after {retries+1} attempts: {last_error}")

    # ── API Methods ────────────────────────────────────────────────────────────

    def check_health(self) -> Dict[str, Any]:
        """GET /api/health — Check backend availability."""
        return self._request("GET", "/health")

    def get_parcel(self, parcel_id: str) -> Dict[str, Any]:
        """GET /api/parcels/{parcel_id} — Fetch official parcel record."""
        return self._request("GET", f"/parcels/{parcel_id}")

    def register_document_json(self, document_payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        POST /api/documents/register-json
        Submit extracted document data to backend.

        Expected payload keys:
          parcel_id, document_type, file_name, [file_url], [extracted_data]
        """
        return self._request("POST", "/documents/register-json", json_body=document_payload)

    def analyze_risk(
        self,
        parcel_id: str,
        extracted_data_override: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        POST /api/risk/analyze/{parcel_id}
        Trigger risk evaluation with optional extracted data override.
        """
        body = {}
        if extracted_data_override:
            body["extracted_data_override"] = extracted_data_override
        return self._request("POST", f"/risk/analyze/{parcel_id}", json_body=body if body else None)

    def get_risk_analysis(self, parcel_id: str) -> Dict[str, Any]:
        """GET /api/risk/{parcel_id} — Get latest risk analysis."""
        return self._request("GET", f"/risk/{parcel_id}")

    def get_documents(self, parcel_id: str) -> list:
        """GET /api/documents/{parcel_id} — List all documents for parcel."""
        return self._request("GET", f"/documents/{parcel_id}")

    def set_token(self, token: str):
        """Update the Bearer token (call after login)."""
        self.token = token

    def login(self, username: str, password: str) -> str:
        """
        POST /api/auth/login — Authenticate and store token.
        Returns the access token string.
        """
        result = self._request("POST", "/auth/login", json_body={
            "username": username,
            "password": password,
        })
        token = result.get("access_token", "")
        if token:
            self.token = token
            logger.info(f"[APIClient] Authenticated as '{username}'")
        return token


# ─────────────────────────────────────────────
#  Convenience Functions
# ─────────────────────────────────────────────

def submit_pipeline_result(
    result: Dict[str, Any],
    client: BhoomiShieldAPIClient,
    also_trigger_risk_analysis: bool = True,
) -> Dict[str, Any]:
    """
    Submit a pipeline result to the backend in one call.

    1. Registers extracted document data via /api/documents/register-json
    2. Optionally triggers risk analysis via /api/risk/analyze/{parcel_id}

    Args:
        result:                  Output from pipeline.run_pipeline_*
        client:                  Authenticated BhoomiShieldAPIClient instance
        also_trigger_risk_analysis: If True, also POST to /api/risk/analyze

    Returns:
        dict with "document_response" and optionally "risk_response"
    """
    parcel_id = result["parcel_id"]
    output = {}

    # Step 1: Register document
    logger.info(f"[APIClient] Registering document for parcel '{parcel_id}'...")
    doc_payload = result["document_for_backend"]
    output["document_response"] = client.register_document_json(doc_payload)
    logger.info(f"[APIClient] Document registered: {output['document_response'].get('document_id')}")

    # Step 2: Trigger risk analysis
    if also_trigger_risk_analysis:
        logger.info(f"[APIClient] Triggering risk analysis for parcel '{parcel_id}'...")
        risk_override = result.get("risk_for_backend", {}).get("extracted_data_override", {})
        output["risk_response"] = client.analyze_risk(parcel_id, risk_override)
        logger.info(
            f"[APIClient] Risk analysis: score={output['risk_response'].get('score')}, "
            f"level={output['risk_response'].get('level')}"
        )

    return output
