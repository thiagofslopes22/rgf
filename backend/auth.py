import os
import bcrypt
from datetime import datetime, timedelta

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from database import get_db, SessionLocal
from models import Usuario

SECRET_KEY = os.getenv("SECRET_KEY", "kora-rgf-secret-2025-troque-em-producao")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24

security = HTTPBearer()


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())


def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    to_encode["exp"] = expire
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> Usuario:
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if not email:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido")
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido ou expirado")

    user = db.query(Usuario).filter(Usuario.email == email, Usuario.ativo == True).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuário não encontrado")
    return user


def require_admin(current_user: Usuario = Depends(get_current_user)) -> Usuario:
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso negado — somente administradores",
        )
    return current_user


def seed_admin(db: Session) -> None:
    existing = db.query(Usuario).filter(Usuario.email == "admin@kora.app").first()
    if not existing:
        admin_password = os.getenv("ADMIN_PASSWORD", "kora2025")
        admin = Usuario(
            nome="Administrador",
            email="admin@kora.app",
            senha_hash=hash_password(admin_password),
            role="admin",
            ativo=True,
        )
        db.add(admin)
        db.commit()
