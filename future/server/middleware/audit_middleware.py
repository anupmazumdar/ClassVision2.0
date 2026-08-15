from fastapi import Request
from datetime import datetime

async def audit_middleware(request: Request, call_next):
    response = await call_next(request)
    # TODO: log to AuditLog table
    print(f"[AUDIT] {datetime.utcnow()} {request.method} {request.url.path} {response.status_code}")
    return response
