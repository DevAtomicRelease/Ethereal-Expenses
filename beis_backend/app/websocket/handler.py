"""
WebSocket handler: transaction ack, alerts, ping/pong.
Fix 10: Supports token via query param (?token=xxx) AND first-message auth.
"""

import json
from typing import Dict, Set
from fastapi import WebSocket, WebSocketDisconnect, Query
from app.auth.utils import decode_token


class ConnectionManager:
    def __init__(self):
        self._connections: Dict[str, Set[WebSocket]] = {}

    async def connect(self, user_id: str, websocket: WebSocket):
        if user_id not in self._connections:
            self._connections[user_id] = set()
        self._connections[user_id].add(websocket)

    def disconnect(self, user_id: str, websocket: WebSocket):
        if user_id in self._connections:
            self._connections[user_id].discard(websocket)
            if not self._connections[user_id]:
                del self._connections[user_id]

    async def send_to_user(self, user_id: str, event: str, data: dict):
        if user_id not in self._connections:
            return
        payload = json.dumps({"event": event, "data": data})
        dead = set()
        for ws in self._connections[user_id]:
            try:
                await ws.send_text(payload)
            except Exception:
                dead.add(ws)
        for ws in dead:
            self._connections[user_id].discard(ws)

    @property
    def active_connections(self) -> int:
        return sum(len(c) for c in self._connections.values())


manager = ConnectionManager()


async def websocket_endpoint(websocket: WebSocket):
    """
    WebSocket endpoint. Supports two auth methods:
      1. Query param: ws://host/ws?token=JWT (preferred for React Native)
      2. First message: {"token": "JWT"} (fallback)
    """
    await websocket.accept()

    user_id = None

    # Method 1: Check query param
    token = websocket.query_params.get("token")
    if token:
        payload = decode_token(token)
        if payload and payload.get("type") == "access":
            user_id = payload["sub"]

    # Method 2: If no query param, wait for first message
    if not user_id:
        try:
            raw = await websocket.receive_text()
            msg = json.loads(raw)
            token = msg.get("token", "")
            payload = decode_token(token)
            if payload and payload.get("type") == "access":
                user_id = payload["sub"]
        except Exception:
            pass

    if not user_id:
        await websocket.send_text(json.dumps({"event": "auth_error", "data": {"message": "Invalid token"}}))
        await websocket.close(code=4001)
        return

    await manager.connect(user_id, websocket)
    await websocket.send_text(json.dumps({"event": "connected", "data": {"user_id": user_id}}))

    try:
        while True:
            data = await websocket.receive_text()
            msg = json.loads(data)
            if msg.get("type") == "ping":
                await websocket.send_text(json.dumps({"event": "pong", "data": {}}))
    except WebSocketDisconnect:
        manager.disconnect(user_id, websocket)
    except Exception:
        manager.disconnect(user_id, websocket)
        try:
            await websocket.close()
        except Exception:
            pass
