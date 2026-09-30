"""
risk_scorer.py – Transparent Rule-Based Risk Scorer
=====================================================

Converts a list of risk signals into a single numeric risk score (0–100)
and a risk level (LOW / MEDIUM / HIGH / CRITICAL).

DESIGN PRINCIPLE: The risk score MUST be fully explainable and rule-based.
No LLM or ML model determines the final score — that would be uncontrollable.
LLMs may be used for explanation/summary text generation only.

Score Calculation:
  - Sum impact values from all active risk signals
  - Apply diminishing returns above 80 (to avoid double-counting)
  - Cap at 100

Risk Levels:
  0–29:   LOW
  30–59:  MEDIUM
  60–79:  HIGH
  80–100: CRITICAL
"""

import logging
from typing import Dict, Any, List, Tuple
import math

logger = logging.getLogger("ai_engine.risk_scorer")


# ─────────────────────────────────────────────
#  Score Thresholds
# ─────────────────────────────────────────────

THRESHOLDS = {
    "CRITICAL": 80,
    "HIGH":     60,
    "MEDIUM":   30,
    "LOW":       0,
}

TREND_THRESHOLDS = {
    "INCREASING": 60,
    "STABLE":      0,
}


def _calculate_confidence(signals: List[Dict[str, Any]], final_score: int) -> float:
    """
    Calculate AI confidence score (0.0 – 1.0) based on:
      - Number of signals detected
      - Severity distribution of signals
      - Strength of risk score evidence

    High confidence → many strong signals with high impact.
    Low confidence  → 0 or 1 weak signals.
    """
    if not signals:
        # No signals → LOW risk, moderate confidence (records seem clean)
        return round(0.65, 2)

    # Base confidence from signal count (more signals = more evidence = more confident)
    signal_count = len(signals)
    base = 0.55 + min(0.25, signal_count * 0.05)

    # Boost from high-severity signals
    severity_scores = {"HIGH": 0.08, "CRITICAL": 0.12, "MEDIUM": 0.04, "LOW": 0.01}
    severity_boost = sum(
        severity_scores.get(s.get("severity", "LOW"), 0.0)
        for s in signals
    )
    severity_boost = min(0.20, severity_boost)

    confidence = base + severity_boost
    return round(min(0.99, max(0.50, confidence)), 2)


def calculate_score(signals: List[Dict[str, Any]]) -> Tuple[int, str, str, float]:
    """
    Calculate risk score, level, trend, and AI confidence score from risk signals.

    Args:
        signals: List of risk signal dicts (from risk_signals.generate_signals)

    Returns:
        Tuple of (score: int, level: str, trend: str, confidence: float)
        Examples:
          (82, "CRITICAL", "INCREASING", 0.91)
          (15, "LOW",      "STABLE",     0.65)
          (45, "MEDIUM",   "STABLE",     0.78)
    """
    if not signals:
        return 0, "LOW", "STABLE", 0.65

    # Sum all signal impacts
    raw_score = sum(sig.get("impact", 0) for sig in signals)

    # Apply diminishing returns for scores above 80
    # (prevent single-document analysis from always maxing out score)
    if raw_score > 80:
        excess = raw_score - 80
        diminished_excess = excess * 0.5  # diminishing returns above 80
        final_score = int(80 + diminished_excess)
    else:
        final_score = raw_score

    # Hard cap at 100
    final_score = min(100, max(0, final_score))

    # Determine level
    level = "LOW"
    for lvl, threshold in [("CRITICAL", THRESHOLDS["CRITICAL"]),
                            ("HIGH",     THRESHOLDS["HIGH"]),
                            ("MEDIUM",   THRESHOLDS["MEDIUM"])]:
        if final_score >= threshold:
            level = lvl
            break

    # Determine trend (simple heuristic: high scores trend upward)
    trend = "INCREASING" if final_score >= TREND_THRESHOLDS["INCREASING"] else "STABLE"

    # Calculate AI confidence score
    confidence = _calculate_confidence(signals, final_score)

    logger.info(
        f"[RiskScorer] Raw score: {raw_score}, Final: {final_score}, "
        f"Level: {level}, Trend: {trend}, Confidence: {confidence}, Signals: {len(signals)}"
    )

    return final_score, level, trend, confidence


def score_breakdown(signals: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Return a sorted breakdown of signals by impact (highest first).
    Useful for explaining which factors contributed most to the score.
    """
    sorted_signals = sorted(signals, key=lambda s: s.get("impact", 0), reverse=True)
    return [
        {
            "factor":      sig["factor"],
            "impact":      sig["impact"],
            "severity":    sig.get("severity", "MEDIUM"),
            "description": sig.get("description", ""),
        }
        for sig in sorted_signals
    ]
