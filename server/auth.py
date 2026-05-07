from datetime import datetime, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import HTTPException, Depends, status
from fastapi.security import OAuth2PasswordBearer
import os

SECRET_KEY = os.getenv("JWT_SECRET", "change-this-in-production-min-32-chars")
ALGORITHM  = "HS256"
EXPIRE_HRS = 8

pwd_context   = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

def hash_password(pw):    return pwd_context.hash(pw)
def verify_password(p,h): return pwd_context.verify(p,h)

def create_token(data):
    payload = {**data, "exp": datetime.utcnow() + timedelta(hours=EXPIRE_HRS)}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def decode_token(token):
    try:   return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError: raise HTTPException(status_code=401, detail="Invalid token")

def require_role(*roles):
    def checker(token: str = Depends(oauth2_scheme)):
        payload = decode_token(token)
        if payload.get("role") not in roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return payload
    return checker
