"""
Notification Service for BHOOMI-SHIELD
Handles SMS and WhatsApp notifications via Twilio/Gupshup
"""

import os
import logging
from typing import Optional, Dict, Any
from datetime import datetime

logger = logging.getLogger("bhoomi_shield.notification")

# Try to import Twilio, handle gracefully if not installed
try:
    from twilio.rest import Client
    TWILIO_AVAILABLE = True
except ImportError:
    TWILIO_AVAILABLE = False
    Client = None

# Try to import Gupshup, handle gracefully if not installed
try:
    import httpx
    GUPSHUP_AVAILABLE = True
except ImportError:
    GUPSHUP_AVAILABLE = False
    httpx = None


class NotificationService:
    """
    Unified notification service supporting multiple providers:
    - Twilio (SMS + WhatsApp)
    - Gupshup (WhatsApp Business API)
    """

    def __init__(self):
        self.twilio_client = None
        self.twilio_phone = None
        self.twilio_whatsapp = None
        self.gupshup_app_name = None
        self.gupshup_api_key = None
        self.gupshup_src_addr = None
        self.enabled = False
        self.provider = "mock"  # mock, twilio, gupshup

        self._initialize()

    def _initialize(self):
        """Initialize notification providers based on environment variables"""

        # Try Twilio first
        twilio_sid = os.getenv("TWILIO_ACCOUNT_SID")
        twilio_token = os.getenv("TWILIO_AUTH_TOKEN")
        twilio_phone = os.getenv("TWILIO_PHONE_NUMBER")
        twilio_whatsapp = os.getenv("TWILIO_WHATSAPP_NUMBER")

        if TWILIO_AVAILABLE and twilio_sid and twilio_token:
            self.twilio_client = Client(twilio_sid, twilio_token)
            self.twilio_phone = twilio_phone
            self.twilio_whatsapp = twilio_whatsapp or f"whatsapp:+{twilio_phone}" if twilio_phone else None
            self.enabled = True
            self.provider = "twilio"
            logger.info("Twilio notification service initialized")
            return

        # Try Gupshup
        gupshup_api_key = os.getenv("GUPSHUP_API_KEY")
        gupshup_app_name = os.getenv("GUPSHUP_APP_NAME")
        gupshup_src = os.getenv("GUPSHUP_SOURCE_ADDRESS")

        if GUPSHUP_AVAILABLE and gupshup_api_key and gupshup_app_name:
            self.gupshup_api_key = gupshup_api_key
            self.gupshup_app_name = gupshup_app_name
            self.gupshup_src_addr = gupshup_src or "BHOOMIS"
            self.enabled = True
            self.provider = "gupshup"
            logger.info("Gupshup notification service initialized")
            return

        # Fallback to mock
        self.enabled = False
        self.provider = "mock"
        logger.warning("No notification provider configured - using mock service")

    async def send_sms(self, to_phone: str, message: str) -> Dict[str, Any]:
        """
        Send SMS notification
        Args:
            to_phone: Destination phone number (E.164 format: +91XXXXXXXXXX)
            message: Message content
        Returns:
            Dict with status, message_id, provider
        """
        if not to_phone:
            return {"status": "failed", "error": "No phone number provided", "provider": self.provider}

        if self.provider == "twilio" and self.twilio_client:
            return await self._send_twilio_sms(to_phone, message)
        elif self.provider == "gupshup":
            return await self._send_gupshup_sms(to_phone, message)
        else:
            return await self._send_mock_sms(to_phone, message)

    async def send_whatsapp(self, to_phone: str, message: str, template_name: str = None) -> Dict[str, Any]:
        """
        Send WhatsApp notification
        Args:
            to_phone: Destination phone number (E.164 format)
            message: Message content
            template_name: Optional WhatsApp template name (for approved templates)
        Returns:
            Dict with status, message_id, provider
        """
        if not to_phone:
            return {"status": "failed", "error": "No phone number provided", "provider": self.provider}

        if self.provider == "twilio" and self.twilio_client and self.twilio_whatsapp:
            return await self._send_twilio_whatsapp(to_phone, message)
        elif self.provider == "gupshup":
            return await self._send_gupshup_whatsapp(to_phone, message, template_name)
        else:
            return await self._send_mock_whatsapp(to_phone, message)

    async def _send_twilio_sms(self, to_phone: str, message: str) -> Dict[str, Any]:
        """Send SMS via Twilio"""
        try:
            message_obj = self.twilio_client.messages.create(
                body=message,
                from_=self.twilio_phone,
                to=to_phone
            )
            logger.info(f"Twilio SMS sent to {to_phone}: SID {message_obj.sid}")
            return {
                "status": "sent",
                "message_id": message_obj.sid,
                "provider": "twilio",
                "to": to_phone
            }
        except Exception as e:
            logger.error(f"Twilio SMS failed: {str(e)}")
            return {"status": "failed", "error": str(e), "provider": "twilio"}

    async def _send_twilio_whatsapp(self, to_phone: str, message: str) -> Dict[str, Any]:
        """Send WhatsApp via Twilio"""
        try:
            # Ensure WhatsApp format
            to_whatsapp = f"whatsapp:+{to_phone.replace('+', '').replace('whatsapp:', '')}"
            message_obj = self.twilio_client.messages.create(
                body=message,
                from_=self.twilio_whatsapp,
                to=to_whatsapp
            )
            logger.info(f"Twilio WhatsApp sent to {to_whatsapp}: SID {message_obj.sid}")
            return {
                "status": "sent",
                "message_id": message_obj.sid,
                "provider": "twilio",
                "to": to_whatsapp
            }
        except Exception as e:
            logger.error(f"Twilio WhatsApp failed: {str(e)}")
            return {"status": "failed", "error": str(e), "provider": "twilio"}

    async def _send_gupshup_sms(self, to_phone: str, message: str) -> Dict[str, Any]:
        """Send SMS via Gupshup (using their SMS API)"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    "https://api.gupshup.io/sm/api/v1/msg",
                    headers={
                        "apikey": self.gupshup_api_key,
                        "Content-Type": "application/x-www-form-urlencoded"
                    },
                    data={
                        "channel": "sms",
                        "source": self.gupshup_src_addr,
                        "destination": to_phone.replace("+", ""),
                        "message": message,
                        "src.name": self.gupshup_src_addr
                    }
                )
                result = response.json()
                return {
                    "status": "sent" if response.status_code == 200 else "failed",
                    "message_id": result.get("messageId"),
                    "provider": "gupshup",
                    "raw": result
                }
        except Exception as e:
            logger.error(f"Gupshup SMS failed: {str(e)}")
            return {"status": "failed", "error": str(e), "provider": "gupshup"}

    async def _send_gupshup_whatsapp(self, to_phone: str, message: str, template_name: str = None) -> Dict[str, Any]:
        """Send WhatsApp via Gupshup"""
        try:
            async with httpx.AsyncClient() as client:
                payload = {
                    "channel": "whatsapp",
                    "source": self.gupshup_app_name,
                    "destination": to_phone.replace("+", ""),
                    "src.name": self.gupshup_app_name
                }

                if template_name:
                    payload["template"] = {
                        "name": template_name,
                        "language": {"policy": "deterministic", "code": "en"}
                    }
                    payload["message"] = ""
                else:
                    payload["message"] = message

                response = await client.post(
                    "https://api.gupshup.io/sm/api/v1/msg",
                    headers={
                        "apikey": self.gupshup_api_key,
                        "Content-Type": "application/json"
                    },
                    json=payload
                )
                result = response.json()
                return {
                    "status": "sent" if response.status_code == 200 else "failed",
                    "message_id": result.get("messageId"),
                    "provider": "gupshup",
                    "raw": result
                }
        except Exception as e:
            logger.error(f"Gupshup WhatsApp failed: {str(e)}")
            return {"status": "failed", "error": str(e), "provider": "gupshup"}

    async def _send_mock_sms(self, to_phone: str, message: str) -> Dict[str, Any]:
        """Mock SMS for development/testing"""
        logger.info(f"[MOCK SMS] To: {to_phone} | Message: {message[:100]}...")
        return {
            "status": "sent",
            "message_id": f"MOCK-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}",
            "provider": "mock",
            "to": to_phone
        }

    async def _send_mock_whatsapp(self, to_phone: str, message: str) -> Dict[str, Any]:
        """Mock WhatsApp for development/testing"""
        logger.info(f"[MOCK WhatsApp] To: {to_phone} | Message: {message[:100]}...")
        return {
            "status": "sent",
            "message_id": f"MOCK-WA-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}",
            "provider": "mock",
            "to": to_phone
        }


# Singleton instance
_notification_service: Optional[NotificationService] = None


def get_notification_service() -> NotificationService:
    """Get or create notification service singleton"""
    global _notification_service
    if _notification_service is None:
        _notification_service = NotificationService()
    return _notification_service


async def send_high_risk_alert(parcel: Dict[str, Any], alert: Dict[str, Any], citizen_phone: str):
    """
    Send HIGH/CRITICAL risk alert to citizen via SMS and WhatsApp
    """
    service = get_notification_service()

    # Format localized message
    survey = parcel.get("survey_number", "Unknown")
    village = parcel.get("village", "Unknown")
    district = parcel.get("district", "Unknown")
    severity = alert.get("severity", "HIGH")
    title = alert.get("title", "Risk Alert")

    # Hindi/English bilingual message
    message = (
        f"⚠️ BHOOMI-SHIELD ALERT ({severity})\n\n"
        f"Survey No: {survey}\n"
        f"Village: {village}\n"
        f"District: {district}\n\n"
        f"Alert: {title}\n\n"
        f"कृपया अपने राजस्व कार्यालय से संपर्क करें।\n"
        f"Contact your Revenue Office immediately.\n\n"
        f"Ref: {alert.get('alert_id', 'N/A')}"
    )

    # Send both SMS and WhatsApp
    sms_result = await service.send_sms(citizen_phone, message)
    wa_result = await service.send_whatsapp(citizen_phone, message)

    return {
        "sms": sms_result,
        "whatsapp": wa_result
    }


async def send_document_verification_notification(
    parcel: Dict[str, Any],
    document_type: str,
    citizen_phone: str,
    verification_status: str
):
    """
    Send document verification status update to citizen
    """
    service = get_notification_service()

    survey = parcel.get("survey_number", "Unknown")
    village = parcel.get("village", "Unknown")
    district = parcel.get("district", "Unknown")

    status_text = {
        "VERIFIED": "✅ Verified Successfully",
        "DISCREPANCY_DETECTED": "⚠️ Discrepancy Detected",
        "PENDING_VERIFICATION": "⏳ Under Review"
    }.get(verification_status, verification_status)

    message = (
        f"📄 BHOOMI-SHIELD Document Update\n\n"
        f"Survey No: {survey}\n"
        f"Village: {village}\n"
        f"District: {district}\n\n"
        f"Document: {document_type}\n"
        f"Status: {status_text}\n\n"
        f"View details in BHOOMI-SHIELD portal."
    )

    sms_result = await service.send_sms(citizen_phone, message)
    wa_result = await service.send_whatsapp(citizen_phone, message)

    return {
        "sms": sms_result,
        "whatsapp": wa_result
    }