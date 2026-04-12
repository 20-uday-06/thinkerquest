from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db_session
from app.schemas.sync import SyncRequest, SyncResponse
from app.services.sync_service import apply_sync_events

router = APIRouter(prefix="/sync", tags=["sync"])


@router.post("", response_model=SyncResponse)
def sync_events(payload: SyncRequest, db: Session = Depends(get_db_session)) -> SyncResponse:
    result = apply_sync_events(db=db, payload=payload)
    return SyncResponse(**result)
