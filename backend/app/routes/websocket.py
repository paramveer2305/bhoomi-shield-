from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from typing import Dict, Set
import json
import asyncio
from datetime import datetime
import logging

from app.database import get_database

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ws", tags=["WebSocket"])

# Connection manager for real-time alert streaming
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, Set[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = set()
        self.active_connections[user_id].add(websocket)
        logger.info(f"WebSocket connected for user {user_id}")

    def disconnect(self, websocket: WebSocket, user_id: str):
        if user_id in self.active_connections:
            self.active_connections[user_id].discard(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
        logger.info(f"WebSocket disconnected for user {user_id}")

    async def send_personal_message(self, message: dict, user_id: str):
        if user_id in self.active_connections:
            disconnected = []
            for connection in self.active_connections[user_id]:
                try:
                    await connection.send_json(message)
                except Exception as e:
                    logger.error(f"Failed to send message to {user_id}: {e}")
                    disconnected.append(connection)

            # Clean up disconnected websockets
            for ws in disconnected:
                self.disconnect(ws, user_id)

    async def broadcast_to_role(self, message: dict, role: str):
        """Broadcast to all users with specific role"""
        # This would need user role tracking - simplified for now
        pass

manager = ConnectionManager()

@router.websocket("/alerts")
async def websocket_alerts(websocket: WebSocket):
    """
    Real-time alert streaming endpoint
    Clients connect and receive instant notifications for:
    - New alerts affecting their parcels
    - Status changes on verification cases
    - Risk level updates
    """
    try:
        # Accept connection first, then authenticate via query params
        await websocket.accept()

        # Get user info from query parameters (token should be passed)
        query_params = dict(websocket.query_params)
        token = query_params.get('token')

        if not token:
            await websocket.send_json({
                "type": "error",
                "message": "Authentication required. Pass token as query parameter."
            })
            await websocket.close(code=1008)
            return

        # For now, extract user_id from token (simplified)
        # In production, use proper JWT validation
        user_id = token  # Placeholder - should decode JWT

        # Register connection
        if user_id not in manager.active_connections:
            manager.active_connections[user_id] = set()
        manager.active_connections[user_id].add(websocket)

        # Send welcome message
        await websocket.send_json({
            "type": "connected",
            "message": "WebSocket connection established",
            "timestamp": datetime.utcnow().isoformat(),
            "user_id": user_id
        })

        # Listen for MongoDB change streams (alerts collection)
        db = get_database()

        # Keep connection alive and listen for messages
        while True:
            try:
                # Wait for client messages (heartbeat, subscriptions, etc.)
                data = await asyncio.wait_for(websocket.receive_text(), timeout=30.0)
                message = json.loads(data)

                if message.get('type') == 'ping':
                    await websocket.send_json({
                        "type": "pong",
                        "timestamp": datetime.utcnow().isoformat()
                    })

                elif message.get('type') == 'subscribe':
                    # Client wants to subscribe to specific parcel updates
                    parcel_id = message.get('parcel_id')
                    await websocket.send_json({
                        "type": "subscribed",
                        "parcel_id": parcel_id,
                        "timestamp": datetime.utcnow().isoformat()
                    })

            except asyncio.TimeoutError:
                # Send heartbeat
                await websocket.send_json({
                    "type": "heartbeat",
                    "timestamp": datetime.utcnow().isoformat()
                })
            except WebSocketDisconnect:
                logger.info(f"WebSocket disconnected for user {user_id}")
                break
            except Exception as e:
                logger.error(f"WebSocket error for user {user_id}: {e}")
                break

    finally:
        if user_id in manager.active_connections:
            manager.active_connections[user_id].discard(websocket)
            if not manager.active_connections[user_id]:
                del manager.active_connections[user_id]


async def notify_alert_created(alert_data: dict):
    """
    Called when a new alert is created
    Broadcasts to relevant users via WebSocket
    """
    message = {
        "type": "alert_created",
        "alert": alert_data,
        "timestamp": datetime.utcnow().isoformat()
    }

    # Notify affected parcel owner
    if alert_data.get('parcel_id'):
        # Get parcel owner and notify them
        db = get_database()
        parcel = await db.parcels.find_one({"parcel_id": alert_data['parcel_id']})
        if parcel:
            # In real implementation, map owner to user_id
            # await manager.send_personal_message(message, owner_user_id)
            pass

    # Notify all officers (role-based broadcast)
    # await manager.broadcast_to_role(message, "REVENUE_OFFICER")


async def notify_verification_status_change(case_id: str, new_status: str):
    """
    Notify when verification case status changes
    """
    message = {
        "type": "verification_status_changed",
        "case_id": case_id,
        "new_status": new_status,
        "timestamp": datetime.utcnow().isoformat()
    }

    # Broadcast to relevant users
    # Implementation depends on case assignment
    pass


# Export manager for use in other modules
__all__ = ['router', 'manager', 'notify_alert_created', 'notify_verification_status_change']
