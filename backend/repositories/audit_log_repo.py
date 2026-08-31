import hashlib
import json
from typing import Any, Dict, List, Optional
from sqlalchemy.orm import Session

from models.audit_log import AccessAuditLog
from utils.time import utc_now


def _compute_entry_hash(timestamp_str: str, event_type: str, actor_id: str, device_id: str, details: str, prev_hash: str) -> str:
    """Computes a SHA-256 cryptographic digest binding this record to the ledger chain."""
    payload = f"{timestamp_str}|{event_type}|{actor_id}|{device_id or ''}|{details}|{prev_hash or 'GENESIS'}"
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def append_audit_log(
    db: Session,
    event_type: str,
    actor_type: str,
    actor_id: str,
    ip_address: Optional[str] = None,
    device_id: Optional[str] = None,
    details: Optional[Dict[str, Any]] = None,
) -> AccessAuditLog:
    """
    Appends a new immutable audit record to the tamper-evident ledger.
    Note: NO delete or modify operations exist on this ledger.
    """
    # Fetch latest log entry to chain hashes
    latest_entry = db.query(AccessAuditLog).order_by(AccessAuditLog.id.desc()).first()
    prev_hash = latest_entry.log_hash if latest_entry else "GENESIS_ROOT_HASH"

    now_dt = utc_now()
    details_str = json.dumps(details or {}, sort_keys=True)
    current_hash = _compute_entry_hash(
        timestamp_str=now_dt.isoformat(),
        event_type=event_type,
        actor_id=actor_id,
        device_id=device_id or "",
        details=details_str,
        prev_hash=prev_hash,
    )

    log_entry = AccessAuditLog(
        timestamp=now_dt,
        event_type=event_type,
        actor_type=actor_type,
        actor_id=actor_id,
        ip_address=ip_address,
        device_id=device_id,
        details=details_str,
        prev_hash=prev_hash,
        log_hash=current_hash,
    )
    db.add(log_entry)
    db.commit()
    db.refresh(log_entry)
    return log_entry


def list_audit_logs(
    db: Session,
    actor_id: Optional[str] = None,
    event_type: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
) -> List[AccessAuditLog]:
    """
    Queries immutable audit logs for compliance review.
    """
    query = db.query(AccessAuditLog)
    if actor_id:
        query = query.filter(AccessAuditLog.actor_id == actor_id)
    if event_type:
        query = query.filter(AccessAuditLog.event_type == event_type)
    return query.order_by(AccessAuditLog.id.desc()).offset(offset).limit(limit).all()


def count_audit_logs(db: Session) -> int:
    return db.query(AccessAuditLog).count()
