from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from auth import hash_password, verify_password, create_token
from models import User
from pydantic import BaseModel

router = APIRouter()

class LoginReq(BaseModel):
    email: str
    password: str

class RegisterReq(BaseModel):
    name: str; email: str; password: str
    role: str = "student"; enrollment: str = None; department: str = None

@router.post("/login")
def login(req: LoginReq, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    if not user or not verify_password(req.password, user.password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_token({"sub": str(user.id), "role": user.role, "name": user.name})
    return {"access_token": token, "token_type": "bearer", "role": user.role}

@router.post("/register")
def register(req: RegisterReq, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == req.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(name=req.name, email=req.email,
                password=hash_password(req.password),
                role=req.role, enrollment=req.enrollment, department=req.department)
    db.add(user); db.commit(); db.refresh(user)
    return {"message": "User created", "id": user.id}
