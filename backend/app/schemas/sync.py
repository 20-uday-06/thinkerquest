from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class SyncEventItem(BaseModel):
    client_event_id: str = Field(min_length=3, max_length=80)
    event_type: str = Field(min_length=2, max_length=40)
    payload: dict[str, Any]
    client_timestamp: datetime


class SyncRequest(BaseModel):
    events: list[SyncEventItem] = Field(default_factory=list)


class SyncResponse(BaseModel):
    accepted: int
    ignored: int
    server_timestamp: datetime
