import json
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.db.models import SyncEvent
from app.schemas.profile import UserProfileUpsertRequest
from app.schemas.sync import SyncRequest
from app.services.profile_service import upsert_profile


def _event_time(event) -> datetime:
    timestamp = event.client_timestamp
    if timestamp.tzinfo is None:
        return timestamp.replace(tzinfo=timezone.utc)
    return timestamp


def _collapse_latest_profile_updates(events: list) -> list:
    latest_profile_event = None
    retained = []

    for event in sorted(events, key=_event_time):
        if event.event_type == "profile_update":
            latest_profile_event = event
        else:
            retained.append(event)

    if latest_profile_event is not None:
        retained.append(latest_profile_event)

    return retained


def apply_sync_events(db: Session, payload: SyncRequest) -> dict:
    accepted = 0
    ignored = 0

    candidate_events = _collapse_latest_profile_updates(payload.events)

    for event in candidate_events:
        exists = (
            db.query(SyncEvent)
            .filter(SyncEvent.client_event_id == event.client_event_id)
            .first()
        )
        if exists:
            ignored += 1
            continue

        new_event = SyncEvent(
            client_event_id=event.client_event_id,
            event_type=event.event_type,
            payload_json=json.dumps(event.payload, ensure_ascii=False),
        )
        db.add(new_event)

        if event.event_type == "profile_update":
            try:
                profile_payload = UserProfileUpsertRequest(**event.payload)
                upsert_profile(db, profile_payload)
            except Exception:
                ignored += 1
                continue

        accepted += 1

    db.commit()

    return {
        "accepted": accepted,
        "ignored": ignored,
        "server_timestamp": datetime.now(timezone.utc),
    }
