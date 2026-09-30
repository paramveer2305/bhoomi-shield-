"""
ocr.py – OCR Layer
==================

Converts document files (PDF, JPG, PNG) into raw text strings.

Design principle: Keep the OCR layer replaceable.
  - Tier 1: PyMuPDF (fast native PDF text extraction, no OCR needed for digital PDFs)
  - Tier 2: Tesseract (open-source OCR for scanned images/PDFs)
  - Tier 3: Mock/Synthetic (demo mode, when neither is available)

The caller receives raw text regardless of which tier was used.
"""

import io
import logging
from pathlib import Path
from typing import Optional

logger = logging.getLogger("ai_engine.ocr")


# ─────────────────────────────────────────────
#  OCR Engine Detection (graceful degradation)
# ─────────────────────────────────────────────

def _check_pymupdf() -> bool:
    try:
        import pymupdf as fitz  # noqa: F401
        return True
    except ImportError:
        try:
            import fitz  # noqa: F401
            return True
        except ImportError:
            return False


def _check_tesseract() -> bool:
    try:
        import pytesseract
        from PIL import Image  # noqa: F401
        pytesseract.get_tesseract_version()
        return True
    except Exception:
        return False


HAS_PYMUPDF = _check_pymupdf()
HAS_TESSERACT = _check_tesseract()


# ─────────────────────────────────────────────
#  OCR Backends
# ─────────────────────────────────────────────

def _extract_with_pymupdf(file_bytes: bytes) -> str:
    """Extract text from a PDF using PyMuPDF (fast, no OCR for digital PDFs)."""
    try:
        import pymupdf as fitz
    except ImportError:
        import fitz
    doc = fitz.open(stream=file_bytes, filetype="pdf")
    pages = []
    for page in doc:
        pages.append(page.get_text())
    doc.close()
    return "\n".join(pages)


def _extract_with_tesseract(file_bytes: bytes, content_type: str) -> str:
    """Extract text using Tesseract OCR."""
    import pytesseract
    from PIL import Image

    if "pdf" in content_type.lower():
        # Try rendering PDF page as image, then OCR it
        if HAS_PYMUPDF:
            try:
                import pymupdf as fitz
            except ImportError:
                import fitz
            doc = fitz.open(stream=file_bytes, filetype="pdf")
            texts = []
            for page in doc:
                pix = page.get_pixmap(dpi=200)
                img_bytes = pix.tobytes("png")
                image = Image.open(io.BytesIO(img_bytes))
                texts.append(pytesseract.image_to_string(image, lang="eng"))
            doc.close()
            return "\n".join(texts)
        else:
            return ""  # Can't render PDF without PyMuPDF
    else:
        image = Image.open(io.BytesIO(file_bytes))
        return pytesseract.image_to_string(image, lang="eng")


def _mock_ocr(file_name: str) -> str:
    """
    Demo mode: return synthetic realistic OCR text based on filename hints.
    Used when neither PyMuPDF nor Tesseract is available.
    """
    name_lower = file_name.lower()

    if "sale_deed" in name_lower or "sale" in name_lower:
        return (
            "SALE DEED\n"
            "This deed is executed on 15/03/2024\n"
            "Seller: Ramesh Kumar Sharma\n"
            "Buyer: Suresh Verma\n"
            "Survey No.: 425/1\n"
            "Area: 2.5 Hectare\n"
            "Village: Khajuri Kalan, Tehsil: Huzur, District: Bhopal\n"
            "Registration No.: REG/2024/BPL/14892\n"
        )
    elif "mutation" in name_lower:
        return (
            "MUTATION RECORD\n"
            "Khasra No.: 425/1\n"
            "Owner: Ramesh Kumar Sharma\n"
            "Area: 2.5 Hectare\n"
            "Village: Khajuri Kalan\n"
            "Date: 10/01/2023\n"
        )
    elif "ownership" in name_lower or "patta" in name_lower:
        return (
            "OWNERSHIP CERTIFICATE\n"
            "Owner Name: Ramesh Kumar Sharma\n"
            "Survey No: 425/1\n"
            "Area: 2.5 Hectare\n"
            "District: Bhopal, Tehsil: Huzur, Village: Khajuri Kalan\n"
            "Issue Date: 05/06/2020\n"
        )
    else:
        return (
            "LAND DOCUMENT\n"
            "Owner: Unknown\n"
            "Survey No: UNKNOWN\n"
            "Area: 0\n"
        )


# ─────────────────────────────────────────────
#  Public Interface
# ─────────────────────────────────────────────

def extract_text_from_bytes(
    file_bytes: bytes,
    content_type: str,
    file_name: str = "document"
) -> str:
    """
    Primary OCR entry point.

    Args:
        file_bytes:   Raw file bytes
        content_type: MIME type (e.g., 'application/pdf', 'image/jpeg')
        file_name:    Original filename (used for mock fallback hints)

    Returns:
        str: Raw extracted text (may be empty if extraction fails)
    """
    try:
        ct = content_type.lower() if content_type else ""

        # Tier 1: PyMuPDF for digital PDFs (no OCR needed, very accurate)
        if "pdf" in ct and HAS_PYMUPDF:
            text = _extract_with_pymupdf(file_bytes)
            if text.strip():
                logger.info(f"[OCR] PyMuPDF extracted {len(text)} chars from '{file_name}'")
                return text

        # Tier 2: Tesseract for images or scanned PDFs
        if HAS_TESSERACT:
            text = _extract_with_tesseract(file_bytes, ct)
            if text.strip():
                logger.info(f"[OCR] Tesseract extracted {len(text)} chars from '{file_name}'")
                return text

        # Tier 3: Mock OCR (demo/dev mode)
        logger.warning(f"[OCR] No OCR engine available. Using mock OCR for '{file_name}'")
        return _mock_ocr(file_name)

    except Exception as e:
        logger.error(f"[OCR] Extraction failed for '{file_name}': {e}")
        return ""


def extract_text_from_file(file_path: str) -> str:
    """
    Convenience wrapper: read file from disk and extract text.

    Args:
        file_path: Absolute or relative path to document file

    Returns:
        str: Raw extracted text
    """
    path = Path(file_path)
    if not path.exists():
        raise FileNotFoundError(f"Document file not found: {file_path}")

    content_type_map = {
        ".pdf": "application/pdf",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
    }
    content_type = content_type_map.get(path.suffix.lower(), "application/octet-stream")
    file_bytes = path.read_bytes()

    return extract_text_from_bytes(file_bytes, content_type, path.name)


def get_ocr_capabilities() -> dict:
    """Return which OCR backends are available (useful for health checks)."""
    return {
        "pymupdf_available": HAS_PYMUPDF,
        "tesseract_available": HAS_TESSERACT,
        "demo_mock_available": True,
        "active_tier": (
            "PyMuPDF/Tesseract" if HAS_PYMUPDF or HAS_TESSERACT else "MockOCR (Demo)"
        )
    }
