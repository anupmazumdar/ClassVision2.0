from fastapi import Request, HTTPException
from auth import decode_token

async def jwt_middleware(request: Request, call_next):
    open_paths = ["/", "/health", "/auth/login", "/auth/register"]
    if request.url.path in open_paths:
        return await call_next(request)
    token = request.headers.get("Authorization","").replace("Bearer ","")
    if not token: raise HTTPException(status_code=401, detail="Token missing")
    decode_token(token)
    return await call_next(request)
