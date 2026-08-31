from datetime import datetime, timezone


def utc_now() -> datetime:
    """Returns the current timezone-aware UTC datetime."""
    return datetime.now(timezone.utc)
