import json
from typing import Any, Dict, List, Optional
from sqlalchemy.orm import Session

from repositories import audit_log_repo


def record_audit_event(
    db: Session,
    event_type: str,
    actor_type: str,
    actor_id: str,
    ip_address: Optional[str] = None,
    device_id: Optional[str] = None,
    details: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Appends an immutable security & access log entry.
    """
    entry = audit_log_repo.append_audit_log(
        db=db,
        event_type=event_type,
        actor_type=actor_type,
        actor_id=actor_id,
        ip_address=ip_address,
        device_id=device_id,
        details=details,
    )
    return {
        "id": entry.id,
        "timestamp": entry.timestamp.isoformat() if entry.timestamp else None,
        "event_type": entry.event_type,
        "actor_type": entry.actor_type,
        "actor_id": entry.actor_id,
        "ip_address": entry.ip_address,
        "device_id": entry.device_id,
        "details": json.loads(entry.details) if entry.details else {},
        "log_hash": entry.log_hash,
    }


def get_audit_trail(
    db: Session,
    actor_id: Optional[str] = None,
    event_type: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
) -> Dict[str, Any]:
    """
    Fetches immutable audit logs with verification metadata.
    """
    logs = audit_log_repo.list_audit_logs(
        db=db,
        actor_id=actor_id,
        event_type=event_type,
        limit=limit,
        offset=offset,
    )
    total = audit_log_repo.count_audit_logs(db)

    serialized = []
    for l in logs:
        serialized.append({
            "id": l.id,
            "timestamp": l.timestamp.isoformat() if l.timestamp else None,
            "event_type": l.event_type,
            "actor_type": l.actor_type,
            "actor_id": l.actor_id,
            "ip_address": l.ip_address,
            "device_id": l.device_id,
            "details": json.loads(l.details) if l.details else {},
            "prev_hash": l.prev_hash,
            "log_hash": l.log_hash,
        })

    return {
        "total": total,
        "logs": serialized,
    }
