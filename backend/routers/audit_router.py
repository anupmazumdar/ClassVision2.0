from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from database import get_db
from middleware.jwt_middleware import require_teacher_or_admin
from services import audit_service

router = APIRouter(prefix="/audit-logs", tags=["audit-logs"])


@router.get("")
def get_audit_logs(
    actor_id: Optional[str] = Query(default=None),
    event_type: Optional[str] = Query(default=None),
    limit: int = Query(default=100, le=500),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    _: dict = Depends(require_teacher_or_admin),
):
    """
    Immutable Access & Security Audit Ledger.
    Read-only inspection of all system logins, device bindings, access attempts, and administrative actions.
    No manual deletion or modification is allowed.
    """
    return audit_service.get_audit_trail(
        db=db,
        actor_id=actor_id,
        event_type=event_type,
        limit=limit,
        offset=offset,
    )
