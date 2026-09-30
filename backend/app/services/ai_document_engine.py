import io
import re
import uuid
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, Tuple

import jellyfish

# Try importing PDF and OCR libraries
try:
    import pymupdf as fitz
except ImportError:
    try:
        import fitz
    except ImportError:
        fitz = None

try:
    from PIL import Image
    import pytesseract
except ImportError:
    pytesseract = None
    Image = None


DOCUMENT_TYPE_LABELS = {
    "SALE_DEED": "Sale Deed",
    "REGISTRY": "Registry Document",
    "LAND_RECORD": "Land Record (Jamabandi / ROR)",
    "TAX_RECORD": "Tax Record / Lagaan",
    "SURVEY_DOCUMENT": "Survey / Khasra Document",
    "PROPERTY_DOCUMENT": "Property Document",
    "MUTATION_RECORD": "Mutation Record",
    "OWNERSHIP_CERTIFICATE": "Ownership Certificate",
    "POWER_OF_ATTORNEY": "Power of Attorney",
    "UNKNOWN": "Land Document",
}


def extract_text_from_file_bytes(content: bytes, filename: str, content_type: Optional[str] = None) -> Tuple[str, str]:
    """
    Extract text from uploaded PDF or Image bytes.
    Returns (extracted_text, method_used).
    """
    fn_lower = filename.lower()
    text = ""
    method = "TEXT_PARSER"

    # PDF Processing
    if fn_lower.endswith(".pdf") or (content_type and "pdf" in content_type.lower()):
        if fitz:
            try:
                doc = fitz.open(stream=content, filetype="pdf")
                pages_text = []
                for page in doc:
                    pages_text.append(page.get_text())
                doc.close()
                text = "\n".join(pages_text).strip()
                method = "PYMUPDF_PDF_PARSER"
            except Exception as e:
                print(f"[OCR] PyMuPDF failed on {filename}: {e}")

    # Image Processing (PNG / JPG / JPEG)
    elif any(fn_lower.endswith(ext) for ext in [".png", ".jpg", ".jpeg", ".webp", ".bmp"]) or (
        content_type and "image" in content_type.lower()
    ):
        if pytesseract and Image:
            try:
                image = Image.open(io.BytesIO(content))
                text = pytesseract.image_to_string(image).strip()
                method = "PYTESSERACT_OCR"
            except Exception as e:
                print(f"[OCR] Tesseract failed on {filename}: {e}")
                # Fallback to simulated OCR or raw byte extraction
                text = ""
                method = "OCR_FALLBACK"

    # Plain text / fallback
    if not text:
        try:
            # Try decoding as utf-8 or latin-1 in case of text files or metadata
            text = content.decode("utf-8", errors="ignore").strip()
            if len(text) > 30:
                method = "UTF8_DECODER"
        except Exception:
            pass

    return text, method


def parse_document_fields(text: str, default_type: str = "UNKNOWN", filename: str = "") -> Dict[str, Any]:
    """
    Extracts structured fields from raw text:
    - owner_name
    - buyer_name / seller_name
    - survey_number / khasra_number
    - property_id
    - area & area_unit
    - village, tehsil, district, state
    - registration_number
    - document_date
    - boundaries (North, South, East, West)
    - latitude & longitude
    """
    raw_lower = text.lower()
    fields: Dict[str, Any] = {
        "owner_name": None,
        "buyer_name": None,
        "seller_name": None,
        "survey_number": None,
        "property_id": None,
        "area": None,
        "area_unit": "hectare",
        "area_sqm": None,
        "village": None,
        "tehsil": None,
        "district": None,
        "state": "Madhya Pradesh",
        "registration_number": None,
        "document_date": None,
        "document_type": default_type,
        "boundaries": {
            "north": None,
            "south": None,
            "east": None,
            "west": None,
        },
        "latitude": None,
        "longitude": None,
        "raw_text_preview": text[:400] if text else "",
    }

    # Infer document type if UNKNOWN
    if default_type == "UNKNOWN" or not default_type:
        if "sale deed" in raw_lower or "vikray" in raw_lower:
            fields["document_type"] = "SALE_DEED"
        elif "registry" in raw_lower or "panjiyan" in raw_lower:
            fields["document_type"] = "REGISTRY"
        elif "khasra" in raw_lower or "khatauni" in raw_lower or "jamabandi" in raw_lower:
            fields["document_type"] = "LAND_RECORD"
        elif "tax" in raw_lower or "lagaan" in raw_lower or "receipt" in raw_lower:
            fields["document_type"] = "TAX_RECORD"
        elif "mutation" in raw_lower or "dakhil" in raw_lower:
            fields["document_type"] = "MUTATION_RECORD"
        elif "survey" in raw_lower or "naksha" in raw_lower:
            fields["document_type"] = "SURVEY_DOCUMENT"

    # 1. Survey / Khasra number
    survey_patterns = [
        r"(?:survey\s*(?:no\.?|number)?|khasra\s*(?:no\.?|number)?|s\.?\s*no\.?|kh\.?\s*no\.?)[\s\:\-]+([0-9]+(?:[\/\-][0-9A-Za-z]+)?)",
        r"plot\s*(?:no\.?|number)?[\s\:\-]+([0-9]+(?:[\/\-][0-9A-Za-z]+)?)",
    ]
    for pat in survey_patterns:
        m = re.search(pat, raw_lower)
        if m:
            fields["survey_number"] = m.group(1).strip().upper()
            break

    # 2. Property ID / Cadastral ID
    prop_id_patterns = [
        r"(?:property\s*id|prop\.?\s*id|parcel\s*id|upid|bhoomi\s*id)[\s\:\-]+([A-Za-z0-9\-_]+)",
        r"(MP\-[A-Z]{3}\-[0-9]{4,})",
    ]
    for pat in prop_id_patterns:
        m = re.search(pat, text, re.IGNORECASE)
        if m:
            fields["property_id"] = m.group(1).strip().upper()
            break

    # 3. Area & Unit
    area_patterns = [
        r"area[\s\:\-]+([0-9]+(?:\.[0-9]+)?)\s*(hectares?|acres?|bighas?|sq\.?\s*m(?:eter)?s?|sq\.?\s*ft|gunthas?|guntas?)",
        r"([0-9]+(?:\.[0-9]+)?)\s+(hectares?|acres?|bighas?|sq\.?\s*m(?:eter)?s?|sq\.?\s*ft|gunthas?|guntas?)",
    ]
    for pat in area_patterns:
        m = re.search(pat, raw_lower)
        if m:
            try:
                val = float(m.group(1))
                unit = m.group(2).strip()
                unit = re.sub(r"sq\.?\s*m(?:eter)?s?", "sqm", unit)
                unit = re.sub(r"sq\.?\s*fts?", "sqft", unit)
                unit = re.sub(r"hectares?", "hectare", unit)
                unit = re.sub(r"acres?", "acre", unit)
                unit = re.sub(r"bighas?", "bigha", unit)
                fields["area"] = val
                fields["area_unit"] = unit

                # Normalization to sqm
                conversions = {
                    "hectare": 10000.0,
                    "acre": 4046.86,
                    "bigha": 2529.29,
                    "sqm": 1.0,
                    "sqft": 0.092903,
                    "guntha": 101.17,
                }
                fields["area_sqm"] = round(val * conversions.get(unit, 1.0), 2)
                break
            except Exception:
                pass

    # 4. Owner, Seller, Buyer
    name_patterns = [
        (r"(?:owner|proprietor|landowner|bhumi\s*swami)[\s\:\-]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})", "owner_name"),
        (r"(?:seller|vendor|grantor)[\s\:\-]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})", "seller_name"),
        (r"(?:buyer|purchaser|vendee|grantee)[\s\:\-]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})", "buyer_name"),
    ]
    for pat, key in name_patterns:
        m = re.search(pat, text, re.IGNORECASE)
        if m:
            name_val = " ".join([w.capitalize() for w in m.group(1).strip().split()])
            fields[key] = name_val

    if not fields["owner_name"]:
        if fields["seller_name"]:
            fields["owner_name"] = fields["seller_name"]
        elif fields["buyer_name"]:
            fields["owner_name"] = fields["buyer_name"]

    # 5. Registration Number
    reg_patterns = [
        r"(?:reg(?:istration)?\.?\s*(?:no\.?|number)?)[\s\:\-]+([A-Za-z0-9\/\-]+)",
        r"(REG\/[0-9]{4}\/[A-Za-z]+\/[0-9]+)",
    ]
    for pat in reg_patterns:
        m = re.search(pat, text, re.IGNORECASE)
        if m:
            fields["registration_number"] = m.group(1).strip().upper()
            break

    # 6. Document Date
    date_patterns = [
        r"\b(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})\b",
        r"\b(\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})\b",
        r"\b(\d{1,2}\s+(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{4})\b",
    ]
    for pat in date_patterns:
        m = re.search(pat, text, re.IGNORECASE)
        if m:
            fields["document_date"] = m.group(1).strip()
            break

    # 7. Location (Village, Tehsil, District)
    village_m = re.search(r"(?:village|gram|mauza)[\s\:\-]+([A-Za-z\s]+?)(?:\s*[,\n\r]|tehsil|district|$)", text, re.IGNORECASE)
    if village_m:
        fields["village"] = village_m.group(1).strip().title()

    tehsil_m = re.search(r"(?:tehsil|taluka)[\s\:\-]+([A-Za-z\s]+?)(?:\s*[,\n\r]|district|village|$)", text, re.IGNORECASE)
    if tehsil_m:
        fields["tehsil"] = tehsil_m.group(1).strip().title()

    district_m = re.search(r"(?:district|zila|dist\.?)[\s\:\-]+([A-Za-z\s]+?)(?:\s*[,\n\r]|state|$)", text, re.IGNORECASE)
    if district_m:
        fields["district"] = district_m.group(1).strip().title()

    # 8. Land Boundaries (North, South, East, West / Chauhaddi)
    north_m = re.search(r"(?:north|uttar)[\s\:\-]+([^\n\r,\;]{3,60})", text, re.IGNORECASE)
    if north_m:
        fields["boundaries"]["north"] = north_m.group(1).strip()

    south_m = re.search(r"(?:south|dakshin)[\s\:\-]+([^\n\r,\;]{3,60})", text, re.IGNORECASE)
    if south_m:
        fields["boundaries"]["south"] = south_m.group(1).strip()

    east_m = re.search(r"(?:east|poorv|purv)[\s\:\-]+([^\n\r,\;]{3,60})", text, re.IGNORECASE)
    if east_m:
        fields["boundaries"]["east"] = east_m.group(1).strip()

    west_m = re.search(r"(?:west|paschim)[\s\:\-]+([^\n\r,\;]{3,60})", text, re.IGNORECASE)
    if west_m:
        fields["boundaries"]["west"] = west_m.group(1).strip()

    # 9. Latitude & Longitude / Coordinates
    gps_m = re.search(r"(?:lat(?:itude)?|gps)[\s\:\-]+([0-9]+\.[0-9]+)[,\s]+(?:lon(?:gitude)?)[\s\:\-]+([0-9]+\.[0-9]+)", text, re.IGNORECASE)
    if gps_m:
        try:
            fields["latitude"] = float(gps_m.group(1))
            fields["longitude"] = float(gps_m.group(2))
        except Exception:
            pass
    else:
        coord_m = re.search(r"([0-9]{2}\.[0-9]{3,7})[°\s]*[Nn]?[,\s]+([0-9]{2}\.[0-9]{3,7})[°\s]*[Ee]?", text)
        if coord_m:
            try:
                fields["latitude"] = float(coord_m.group(1))
                fields["longitude"] = float(coord_m.group(2))
            except Exception:
                pass

    return fields


def calculate_name_similarity(name1: Optional[str], name2: Optional[str]) -> float:
    if not name1 or not name2:
        return 1.0
    n1 = name1.strip().lower()
    n2 = name2.strip().lower()
    if n1 == n2:
        return 1.0

    tok1 = n1.split()
    tok2 = n2.split()
    if len(tok1) >= 2 and len(tok2) >= 2:
        last1, last2 = tok1[-1], tok2[-1]
        sur_sim = jellyfish.jaro_winkler_similarity(last1, last2)
        if sur_sim < 0.70:
            first_sim = jellyfish.jaro_winkler_similarity(tok1[0], tok2[0])
            return round(min(0.55, first_sim * 0.4 + sur_sim * 0.6), 3)

    jw = jellyfish.jaro_winkler_similarity(n1, n2)
    max_len = max(len(n1), len(n2))
    lev = 1.0 - (jellyfish.levenshtein_distance(n1, n2) / max_len)
    return round(0.5 * jw + 0.5 * lev, 3)


def cross_compare_documents(
    doc_list: List[Dict[str, Any]],
    parcel_record: Optional[Dict[str, Any]] = None
) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]], int, str, Dict[str, Any]]:
    """
    Cross-compares all uploaded documents with each other and against parcel ground truth.
    Returns:
    - mismatches: List of detected mismatches with severity, evidence, and affected docs.
    - risk_factors: List of calibrated risk factors with evidence and confidence.
    - risk_score: 0 to 100 integer.
    - risk_level: LOW, MEDIUM, HIGH, CRITICAL.
    - summary: Aggregated metrics.
    """
    mismatches: List[Dict[str, Any]] = []
    risk_factors: List[Dict[str, Any]] = []
    reasons: List[str] = []
    score = 0

    if not doc_list:
        return [], [], 0, "LOW", {"total_docs": 0, "mismatches_count": 0}

    # 1. Compare across document pairs (Pairwise)
    num_docs = len(doc_list)
    for i in range(num_docs):
        for j in range(i + 1, num_docs):
            doc_a = doc_list[i]
            doc_b = doc_list[j]
            name_a = doc_a.get("file_name", f"Document {i+1}")
            name_b = doc_b.get("file_name", f"Document {j+1}")
            type_a = DOCUMENT_TYPE_LABELS.get(doc_a.get("document_type"), doc_a.get("document_type", "Doc"))
            type_b = DOCUMENT_TYPE_LABELS.get(doc_b.get("document_type"), doc_b.get("document_type", "Doc"))

            fa = doc_a.get("extracted_fields", {})
            fb = doc_b.get("extracted_fields", {})

            # A. Owner Name Mismatch
            owner_a = fa.get("owner_name")
            owner_b = fb.get("owner_name")
            if owner_a and owner_b:
                sim = calculate_name_similarity(owner_a, owner_b)
                if sim < 0.82:
                    score += 35
                    mismatches.append({
                        "id": f"MIS-{uuid.uuid4().hex[:6].upper()}",
                        "type": "OWNER_NAME_MISMATCH",
                        "title": "Owner Name Discrepancy",
                        "severity": "HIGH",
                        "field": "owner_name",
                        "doc_a_name": f"{type_a} ({name_a})",
                        "doc_a_val": owner_a,
                        "doc_b_name": f"{type_b} ({name_b})",
                        "doc_b_val": owner_b,
                        "similarity": round(sim * 100, 1),
                        "evidence": f"Document '{name_a}' states '{owner_a}' whereas '{name_b}' states '{owner_b}' (Similarity: {round(sim*100)}%)",
                        "description": "Owner names across legal instruments exhibit significant discordance, suggesting identity confusion or unauthorized transfer.",
                    })
                    risk_factors.append({
                        "factor": "Cross-Document Owner Discrepancy",
                        "severity": "HIGH",
                        "impact": 35,
                        "confidence": 92,
                        "evidence": f"Doc A: {owner_a} vs Doc B: {owner_b}",
                        "reason": "Name mismatch between primary land instruments is a primary indicator of title conflict.",
                    })
                    reasons.append(f"Owner name mismatch between {type_a} ('{owner_a}') and {type_b} ('{owner_b}')")

            # B. Survey / Khasra Mismatch
            s_a = fa.get("survey_number")
            s_b = fb.get("survey_number")
            if s_a and s_b and s_a != s_b:
                score += 30
                mismatches.append({
                    "id": f"MIS-{uuid.uuid4().hex[:6].upper()}",
                    "type": "SURVEY_KHASRA_MISMATCH",
                    "title": "Survey / Khasra Number Mismatch",
                    "severity": "HIGH",
                    "field": "survey_number",
                    "doc_a_name": f"{type_a} ({name_a})",
                    "doc_a_val": s_a,
                    "doc_b_name": f"{type_b} ({name_b})",
                    "doc_b_val": s_b,
                    "evidence": f"Document '{name_a}' specifies Survey '{s_a}' while '{name_b}' specifies Survey '{s_b}'",
                    "description": "Different survey numbers identified across submitted instruments for the same parcel holding.",
                })
                risk_factors.append({
                    "factor": "Survey Number Discordance",
                    "severity": "HIGH",
                    "impact": 30,
                    "confidence": 95,
                    "evidence": f"Survey {s_a} vs Survey {s_b}",
                    "reason": "Document refers to conflicting survey plot numbers, risking invalid mutation registration.",
                })
                reasons.append(f"Survey number mismatch: {s_a} vs {s_b}")

            # C. Area Mismatch
            area_a = fa.get("area_sqm")
            area_b = fb.get("area_sqm")
            if area_a and area_b and area_a > 0 and area_b > 0:
                diff_pct = abs(area_a - area_b) / min(area_a, area_b) * 100
                if diff_pct > 8.0:
                    sev = "CRITICAL" if diff_pct > 25.0 else "HIGH"
                    pts = 25 if diff_pct > 25.0 else 18
                    score += pts
                    mismatches.append({
                        "id": f"MIS-{uuid.uuid4().hex[:6].upper()}",
                        "type": "AREA_MISMATCH",
                        "title": f"Land Area Variance ({round(diff_pct, 1)}%)",
                        "severity": sev,
                        "field": "area",
                        "doc_a_name": f"{type_a} ({name_a})",
                        "doc_a_val": f"{fa.get('area')} {fa.get('area_unit')} ({area_a:,.0f} m²)",
                        "doc_b_name": f"{type_b} ({name_b})",
                        "doc_b_val": f"{fb.get('area')} {fb.get('area_unit')} ({area_b:,.0f} m²)",
                        "variance_pct": round(diff_pct, 1),
                        "evidence": f"Calculated area disparity of {round(diff_pct, 1)}% between {name_a} and {name_b}",
                        "description": f"Area discrepancy exceeds statutory tolerance threshold (variance is {round(diff_pct, 1)}%).",
                    })
                    risk_factors.append({
                        "factor": f"Significant Area Variance ({round(diff_pct, 1)}%)",
                        "severity": sev,
                        "impact": pts,
                        "confidence": 94,
                        "evidence": f"{fa.get('area')} {fa.get('area_unit')} vs {fb.get('area')} {fb.get('area_unit')}",
                        "reason": f"Discrepancy of {round(diff_pct, 1)}% suggests potential encroachment or un-subdivided plot transfer.",
                    })
                    reasons.append(f"Area variance exceeds threshold: {round(diff_pct, 1)}% discrepancy detected")

            # D. Boundary Mismatch
            bounds_a = fa.get("boundaries", {})
            bounds_b = fb.get("boundaries", {})
            for direction in ["north", "south", "east", "west"]:
                ba = bounds_a.get(direction)
                bb = bounds_b.get(direction)
                if ba and bb and ba.strip().lower() != bb.strip().lower():
                    sim_b = calculate_name_similarity(ba, bb)
                    if sim_b < 0.70:
                        score += 15
                        mismatches.append({
                            "id": f"MIS-{uuid.uuid4().hex[:6].upper()}",
                            "type": "BOUNDARY_MISMATCH",
                            "title": f"Boundary Mismatch ({direction.upper()})",
                            "severity": "HIGH",
                            "field": f"boundary_{direction}",
                            "doc_a_name": f"{type_a} ({name_a})",
                            "doc_a_val": ba,
                            "doc_b_name": f"{type_b} ({name_b})",
                            "doc_b_val": bb,
                            "evidence": f"{direction.capitalize()} boundary mismatch: '{ba}' vs '{bb}'",
                            "description": f"Cadastral description of {direction} boundary is divergent between documents.",
                        })
                        risk_factors.append({
                            "factor": f"Conflicting {direction.capitalize()} Boundary",
                            "severity": "HIGH",
                            "impact": 15,
                            "confidence": 88,
                            "evidence": f"{ba} vs {bb}",
                            "reason": f"Conflicting {direction} boundary descriptions indicate potential spatial encroachment.",
                        })
                        reasons.append(f"{direction.capitalize()} boundary discordance: '{ba}' vs '{bb}'")
                        break  # flag once per pair

            # E. Registration Number Mismatch
            reg_a = fa.get("registration_number")
            reg_b = fb.get("registration_number")
            if reg_a and reg_b and reg_a != reg_b and type_a == type_b:
                score += 20
                mismatches.append({
                    "id": f"MIS-{uuid.uuid4().hex[:6].upper()}",
                    "type": "REGISTRATION_NUMBER_MISMATCH",
                    "title": "Registration Serial Mismatch",
                    "severity": "HIGH",
                    "field": "registration_number",
                    "doc_a_name": f"{type_a} ({name_a})",
                    "doc_a_val": reg_a,
                    "doc_b_name": f"{type_b} ({name_b})",
                    "doc_b_val": reg_b,
                    "evidence": f"Differing registration numbers: {reg_a} vs {reg_b}",
                    "description": "Two documents of the same category specify different registration numbers.",
                })

            # F. Location Mismatch (Village / Tehsil / District)
            for loc_field in ["village", "tehsil", "district"]:
                la = fa.get(loc_field)
                lb = fb.get(loc_field)
                if la and lb and la.strip().lower() != lb.strip().lower():
                    score += 20
                    mismatches.append({
                        "id": f"MIS-{uuid.uuid4().hex[:6].upper()}",
                        "type": "LOCATION_MISMATCH",
                        "title": f"Jurisdiction Mismatch ({loc_field.capitalize()})",
                        "severity": "HIGH",
                        "field": loc_field,
                        "doc_a_name": f"{type_a} ({name_a})",
                        "doc_a_val": la,
                        "doc_b_name": f"{type_b} ({name_b})",
                        "doc_b_val": lb,
                        "evidence": f"Different {loc_field} records: '{la}' vs '{lb}'",
                        "description": f"Conflicting administrative jurisdiction ({loc_field}) found in land documents.",
                    })
                    risk_factors.append({
                        "factor": f"Conflicting {loc_field.capitalize()} Location",
                        "severity": "HIGH",
                        "impact": 20,
                        "confidence": 95,
                        "evidence": f"{la} vs {lb}",
                        "reason": "Administrative jurisdiction mismatch invalidates standard revenue verification.",
                    })
                    reasons.append(f"Jurisdiction mismatch ({loc_field}): '{la}' vs '{lb}'")
                    break

            # G. Date Inconsistency
            da_str = fa.get("document_date")
            db_str = fb.get("document_date")
            if da_str and db_str:
                # Check for apparent sequence anomalies (e.g. sale deed earlier than 1970 or future dated)
                pass

    # 2. Check for Missing Crucial Fields across documents
    for doc in doc_list:
        fa = doc.get("extracted_fields", {})
        doc_name = doc.get("file_name", "Document")
        doc_type = DOCUMENT_TYPE_LABELS.get(doc.get("document_type"), doc.get("document_type", "Document"))

        missing = []
        if not fa.get("owner_name") and not fa.get("seller_name") and not fa.get("buyer_name"):
            missing.append("Owner / Party Name")
        if not fa.get("survey_number"):
            missing.append("Survey / Khasra Number")
        if not fa.get("area"):
            missing.append("Land Area")

        if missing:
            score += 10 * len(missing)
            mismatches.append({
                "id": f"MIS-{uuid.uuid4().hex[:6].upper()}",
                "type": "MISSING_FIELDS",
                "title": f"Incomplete Legal Fields in {doc_type}",
                "severity": "MEDIUM",
                "field": "missing_fields",
                "doc_a_name": f"{doc_type} ({doc_name})",
                "doc_a_val": f"Missing: {', '.join(missing)}",
                "doc_b_name": "Official Cadastral Standard",
                "doc_b_val": "Mandatory Fields Required",
                "evidence": f"Document '{doc_name}' is missing: {', '.join(missing)}",
                "description": f"Statutory requirement: land documents must state parcel survey, owner, and area.",
            })
            risk_factors.append({
                "factor": f"Missing Critical Fields ({', '.join(missing)})",
                "severity": "MEDIUM",
                "impact": 10 * len(missing),
                "confidence": 90,
                "evidence": f"Document: {doc_name}",
                "reason": "Omission of core identifier fields hinders cadastral matching and validation.",
            })
            reasons.append(f"Missing mandatory fields in {doc_name}: {', '.join(missing)}")

    # 3. Ground Truth Comparison (if parcel_record provided)
    if parcel_record:
        gt_owner = parcel_record.get("owner_name")
        gt_survey = parcel_record.get("survey_number")
        gt_area = parcel_record.get("area")  # assumed hectare or stored
        gt_area_sqm = parcel_record.get("area", 0) * 10000.0  # standard hectare

        for doc in doc_list:
            fa = doc.get("extracted_fields", {})
            doc_name = doc.get("file_name", "Document")
            doc_type = DOCUMENT_TYPE_LABELS.get(doc.get("document_type"), doc.get("document_type", "Document"))

            # Ground truth Owner vs Document Owner
            doc_owner = fa.get("owner_name")
            if doc_owner and gt_owner:
                sim = calculate_name_similarity(doc_owner, gt_owner)
                if sim < 0.82:
                    score += 25
                    mismatches.append({
                        "id": f"MIS-{uuid.uuid4().hex[:6].upper()}",
                        "type": "OWNER_NAME_MISMATCH",
                        "title": "Ground Truth Cadastral Owner Mismatch",
                        "severity": "HIGH",
                        "field": "owner_name",
                        "doc_a_name": f"{doc_type} ({doc_name})",
                        "doc_a_val": doc_owner,
                        "doc_b_name": "Cadastral Database Record",
                        "doc_b_val": gt_owner,
                        "similarity": round(sim * 100, 1),
                        "evidence": f"Official record lists '{gt_owner}', but '{doc_name}' claims '{doc_owner}'",
                        "description": "Document claimant does not match the officially registered titleholder in the state land database.",
                    })

            # Ground truth Survey vs Document Survey
            doc_survey = fa.get("survey_number")
            if doc_survey and gt_survey and doc_survey != gt_survey:
                score += 25
                mismatches.append({
                    "id": f"MIS-{uuid.uuid4().hex[:6].upper()}",
                    "type": "SURVEY_KHASRA_MISMATCH",
                    "title": "Survey Number vs Official Record",
                    "severity": "HIGH",
                    "field": "survey_number",
                    "doc_a_name": f"{doc_type} ({doc_name})",
                    "doc_a_val": doc_survey,
                    "doc_b_name": "Cadastral Database Record",
                    "doc_b_val": gt_survey,
                    "evidence": f"Expected Survey {gt_survey}, but document specifies {doc_survey}",
                    "description": "Document references a different survey number than the targeted official parcel record.",
                })

    # Clamp risk score between 0 and 100
    final_score = min(100, max(0, score))

    if final_score >= 85:
        risk_level = "CRITICAL"
    elif final_score >= 60:
        risk_level = "HIGH"
    elif final_score >= 30:
        risk_level = "MEDIUM"
    else:
        risk_level = "LOW"

    # Default baseline risk factor if clean
    if not risk_factors:
        risk_factors.append({
            "factor": "Consistent Document Alignment",
            "severity": "LOW",
            "impact": 0,
            "confidence": 98,
            "evidence": "All cross-document comparisons matched within normal tolerances",
            "reason": "No critical identity, survey, or area discrepancies observed.",
        })

    summary = {
        "total_documents": num_docs,
        "mismatches_count": len(mismatches),
        "high_severity_count": len([m for m in mismatches if m.get("severity") in ["HIGH", "CRITICAL"]]),
        "medium_severity_count": len([m for m in mismatches if m.get("severity") == "MEDIUM"]),
        "reasons": reasons,
    }

    return mismatches, risk_factors, final_score, risk_level, summary


def generate_3d_land_geometry(
    parcel_id: str,
    survey_number: str,
    center_lat: float,
    center_lng: float,
    area_hectare: float,
    has_mismatch: bool = False,
    mismatch_type: Optional[str] = None
) -> Dict[str, Any]:
    """
    Generates synthetic 3D Cadastral Map GeoJSON feature collection with:
    - Official Ground Truth Boundary Polygon
    - Disputed / Claimed Boundary Polygon (offset if mismatch)
    - Surrounding survey parcels
    - Road & waterway infrastructure
    - 3D Terrain elevation profile
    - Boundary pillars with GPS coordinates
    """
    # 1 hectare is 100m x 100m. 0.001 deg lat ~ 111m, 0.001 deg lng ~ 102m
    # Scale polygon radius based on area (roughly 0.0008 deg for ~1.5 - 2.5 ha)
    import math
    side_deg = math.sqrt(max(0.5, area_hectare)) * 0.00085

    p1 = [center_lng - side_deg * 0.9, center_lat - side_deg * 0.8]  # SW
    p2 = [center_lng + side_deg * 0.85, center_lat - side_deg * 0.75] # SE
    p3 = [center_lng + side_deg * 0.95, center_lat + side_deg * 0.9]  # NE
    p4 = [center_lng - side_deg * 0.8, center_lat + side_deg * 0.85]  # NW
    official_ring = [p1, p2, p3, p4, p1]

    # If mismatch exists, create a skewed claimed boundary showing boundary dispute / encroachment
    claimed_ring = []
    if has_mismatch:
        claimed_p1 = [center_lng - side_deg * 0.9, center_lat - side_deg * 0.8]
        claimed_p2 = [center_lng + side_deg * 1.35, center_lat - side_deg * 0.75]  # Extended 35% East
        claimed_p3 = [center_lng + side_deg * 1.4, center_lat + side_deg * 1.1]   # Extended NE
        claimed_p4 = [center_lng - side_deg * 0.8, center_lat + side_deg * 0.85]
        claimed_ring = [claimed_p1, claimed_p2, claimed_p3, claimed_p4, claimed_p1]

    # Adjacent survey numbers
    adj_parcels = [
        {
            "survey": "424",
            "relation": "North",
            "ring": [
                p4,
                p3,
                [p3[0] + 0.0001, p3[1] + side_deg * 0.9],
                [p4[0] - 0.0001, p4[1] + side_deg * 0.9],
                p4
            ]
        },
        {
            "survey": "426",
            "relation": "East",
            "ring": [
                p2,
                [p2[0] + side_deg * 1.1, p2[1] - 0.0002],
                [p3[0] + side_deg * 1.1, p3[1] + 0.0002],
                p3,
                p2
            ]
        },
        {
            "survey": "428",
            "relation": "South",
            "ring": [
                [p1[0] - 0.0001, p1[1] - side_deg * 0.8],
                [p2[0] + 0.0001, p2[1] - side_deg * 0.8],
                p2,
                p1,
                [p1[0] - 0.0001, p1[1] - side_deg * 0.8]
            ]
        }
    ]

    # Nearby Access Road
    road_line = [
        [center_lng - side_deg * 1.8, center_lat - side_deg * 0.95],
        [center_lng, center_lat - side_deg * 0.85],
        [center_lng + side_deg * 1.8, center_lat - side_deg * 0.80],
    ]

    return {
        "parcel_id": parcel_id,
        "survey_number": survey_number,
        "center": [center_lng, center_lat],
        "zoom": 17.5,
        "pitch": 55,
        "bearing": -18,
        "area_hectares": area_hectare,
        "is_synthetic_demo": True,
        "cadastral_division": "Bhopal Revenue Circle 4 (Huzur Tehsil)",
        "elevation_m": {
            "min": 496.2,
            "max": 508.4,
            "mean": 502.1
        },
        "official_polygon": {
            "type": "Feature",
            "properties": {
                "name": f"Official Cadastral Boundary (Khasra {survey_number})",
                "survey_number": survey_number,
                "area_hectares": area_hectare,
                "status": "OFFICIAL_GROUND_TRUTH",
                "color": "#10B981",
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [official_ring]
            }
        },
        "claimed_polygon": {
            "type": "Feature",
            "properties": {
                "name": f"Document Claimed Disputed Boundary (Discrepancy)",
                "survey_number": survey_number,
                "status": "DISCREPANCY_OVERLAY",
                "color": "#EF4444",
                "mismatch_type": mismatch_type or "Boundary & Area Discrepancy"
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [claimed_ring] if claimed_ring else []
            }
        } if claimed_ring else None,
        "adjacent_parcels": adj_parcels,
        "nearby_road": road_line,
        "boundary_pillars": [
            {"id": "P-NW", "name": "Pillar 1 (North-West)", "coord": p4, "elevation": 506.2},
            {"id": "P-NE", "name": "Pillar 2 (North-East)", "coord": p3, "elevation": 508.4},
            {"id": "P-SE", "name": "Pillar 3 (South-East)", "coord": p2, "elevation": 498.7},
            {"id": "P-SW", "name": "Pillar 4 (South-West)", "coord": p1, "elevation": 496.2},
        ],
    }


def get_demo_property_payload() -> Dict[str, Any]:
    """
    Returns the rich demo property package ready to inspect or analyze.
    Includes 3 realistic Indian government land documents with intentional discrepancies.
    """
    demo_parcel = {
        "parcel_id": "MP-BPL-1024",
        "survey_number": "425/1",
        "district": "Bhopal",
        "tehsil": "Huzur",
        "village": "Khajuri Kalan",
        "owner_name": "Ramesh Kumar Sharma",
        "area": 2.5,
        "area_unit": "hectare",
        "land_type": "Agricultural",
        "latitude": 23.2599,
        "longitude": 77.4126,
        "status": "REQUIRES_VERIFICATION",
    }

    doc1_text = """GOVERNMENT OF MADHYA PRADESH
OFFICE OF THE SUB-REGISTRAR, BHOPAL
REGISTERED SALE DEED (CONVEYANCE OF AGRICULTURAL LAND)

Document Registration No.: REG/2024/BPL/14892
Date of Execution: 15/03/2024
Book No.: 1, Volume: 894, Pages: 112 to 124

PARTIES TO TRANSACTION:
Seller (Vendor): Ramesh Kumar Sharma, S/o Late Shri O.P. Sharma
Resident of: Plot 14, Khajuri Kalan, Bhopal (M.P.)
Buyer (Vendee): Suresh Verma, S/o Shri M.L. Verma
Resident of: Arera Colony, Bhopal (M.P.)

SCHEDULE OF PROPERTY:
Land Parcel ID: MP-BPL-1024
Khasra / Survey Number: 425/1
Village: Khajuri Kalan, Tehsil: Huzur, District: Bhopal
Total Area: 2.5 Hectare (25,000 Sq. Meters)
Nature of Land: Irrigated Agricultural (Do-Fasli)
GPS Coordinates: Latitude: 23.2599° N, Longitude: 77.4126° E

BOUNDARIES / CHAUHADDI:
North: Canal & Survey No. 424 (Panchayat drain)
South: PWD Access Road (12 meter wide)
East: Survey No. 426 (Land belonging to Harish Patel)
West: Village boundary & Land of Ramdas

STAMP DUTY & REGISTRATION:
Market Value as per Collector Guidelines: INR 48,00,000/-
Stamp Duty Paid: INR 2,40,000/- (Treasury Challan Ref: MP-TR-998124)
Registration Fee Paid: INR 48,000/-

Executed and Signed in presence of two witnesses on 15/03/2024."""

    doc2_text = """MADHYA PRADESH BHULEKH (LAND RECORDS PORTAL)
FORM P-II (KHASRA / RECORD OF RIGHTS - RO-R)
FASLI YEAR: 1431 (2023-2024)

District: Bhopal
Tehsil: Huzur
Gram (Village): Khajuri Kalan
Patwari Halka No.: 18

KHASRA DETAILS:
Survey / Khasra No.: 425/1
Khata / Holding No.: 88/2
Registered Bhumiswami (Owner): Rajesh Sharma, S/o Late Shri O.P. Sharma
Land Use Type: Krishi (Agricultural)
Total Recorded Area: 2.5 Hectare
Soil Classification: Kali Mitti (Medium Black)
Irrigation Source: Tube-well

ENCUMBRANCE / REMARKS COLUMN:
Mutation Order No. 45/Mut/2021 dated 10/08/2021 recorded in Revenue Register.
No court injunction or bank hypothecation active as on date of report generation.
Report Generated Date: 12/01/2024
Issued by: Office of Patwari, Halka 18, Huzur Tehsil."""

    doc3_text = """REVENUE DEPARTMENT, TEHSIL OFFICE HUZUR
APPLICATION FOR NAME MUTATION (NAMANTARAN AAVEDAN) & FIELD VERIFICATION

Case Reference: REV/MUT/2024/0912
Date of Filing: 22/04/2024

APPLICANT DETAILS:
Applicant / Claimant: Suresh Verma
Vendor / Recorded Titleholder: Suresh Kumar Sharma

LAND PARTICULARS CLAIMED:
Property ID: MP-BPL-1024
Survey / Khasra Number: 425/2
Village: Khajuri Kalan, Tehsil: Huzur, District: Bhopal
Claimed Area: 3.2 Hectare (32,000 Sq. Meters)

CLAIMED BOUNDARIES:
North: Survey No. 424
South: PWD Road
East: Public Roadway (Discrepancy with Registry boundary)
West: Land of Ramdas

SUPPORTING DOCUMENTS ENCLOSED:
1. Photocopy of Registered Deed No. REG/2024/BPL/14892
2. Revenue Map (Aks Naksha Copy)

REVENUE INSPECTOR / PATWARI PRELIMINARY NOTE:
Discrepancy noted in recorded survey sub-division (425/1 in record vs 425/2 in application)
and area claimed (3.2 Ha exceeds title deed area of 2.5 Ha by 0.70 Ha). Field demarcation advised."""

    doc1_fields = parse_document_fields(doc1_text, "SALE_DEED", "sale_deed_bhopal_1024.pdf")
    doc2_fields = parse_document_fields(doc2_text, "LAND_RECORD", "khasra_record_khajuri.pdf")
    doc3_fields = parse_document_fields(doc3_text, "MUTATION_RECORD", "mutation_application_0912.pdf")

    docs = [
        {
            "document_id": "DOC-DEMO-001",
            "file_name": "sale_deed_bhopal_1024.pdf",
            "document_type": "SALE_DEED",
            "extracted_fields": doc1_fields,
            "raw_text": doc1_text,
            "file_size": "1.8 MB",
            "status": "ANALYZED",
        },
        {
            "document_id": "DOC-DEMO-002",
            "file_name": "khasra_record_khajuri.pdf",
            "document_type": "LAND_RECORD",
            "extracted_fields": doc2_fields,
            "raw_text": doc2_text,
            "file_size": "1.2 MB",
            "status": "ANALYZED",
        },
        {
            "document_id": "DOC-DEMO-003",
            "file_name": "mutation_application_0912.pdf",
            "document_type": "MUTATION_RECORD",
            "extracted_fields": doc3_fields,
            "raw_text": doc3_text,
            "file_size": "950 KB",
            "status": "ANALYZED",
        },
    ]

    mismatches, risk_factors, score, level, summary = cross_compare_documents(docs, demo_parcel)

    map_geo = generate_3d_land_geometry(
        parcel_id=demo_parcel["parcel_id"],
        survey_number=demo_parcel["survey_number"],
        center_lat=demo_parcel["latitude"],
        center_lng=demo_parcel["longitude"],
        area_hectare=demo_parcel["area"],
        has_mismatch=True,
        mismatch_type="Survey No. 425/1 vs 425/2 & 28% Area Inflation"
    )

    return {
        "parcel": demo_parcel,
        "documents": docs,
        "mismatches": mismatches,
        "risk_factors": risk_factors,
        "risk_score": score,
        "risk_level": level,
        "summary": summary,
        "map_geometry": map_geo,
        "ai_findings": [
            "Critical identity discrepancy: Sale Deed specifies 'Ramesh Kumar Sharma', Khasra specifies 'Rajesh Sharma', while Mutation Application specifies 'Suresh Kumar Sharma'.",
            "Survey plot discordance: Official deed states Survey 425/1, but mutation application claims Survey 425/2.",
            "Area inflation detected: 3.2 Hectare claimed in mutation record versus 2.5 Hectare registered in Sub-Registrar record (+28% discrepancy).",
            "Spatial boundary conflict on East border: Deed designates 'Survey 426 (Harish Patel)', application designates 'Public Roadway'.",
        ],
        "recommended_actions": [
            "Order immediate stay on mutation proceedings under MP Land Revenue Code Section 110.",
            "Issue summons for physical presence of both Ramesh Kumar Sharma and Rajesh Sharma with Aadhaar verification.",
            "Direct Halka Patwari to execute on-site DGPS demarcation to verify actual physical possession and boundary pillars.",
            "Inspect Sub-Registrar Volume Index-II to authenticate original thumb impressions and challan receipts.",
        ],
    }
