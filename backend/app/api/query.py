from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db_session
from app.schemas.query import AdvisoryQueryRequest, AdvisoryQueryResponse
from app.services.advisory_service import generate_advisory

router = APIRouter(prefix="/query", tags=["query"])


@router.post("", response_model=AdvisoryQueryResponse)
def ask_advisory(
    payload: AdvisoryQueryRequest, db: Session = Depends(get_db_session)
) -> AdvisoryQueryResponse:
    result = generate_advisory(db=db, query_text=payload.text)
    return AdvisoryQueryResponse(**result)
