from datetime import datetime
from typing import Optional
import tempfile, os, uuid, shutil

from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import desc

from database import engine, SessionLocal, get_db
from models import Base, Usuario, Prefeitura, Conciliacao
from auth import get_current_user, require_admin, create_access_token, verify_password, hash_password, seed_admin
from conciliador import conciliar as _conciliar
from conciliador_rreo import conciliar_rreo as _conciliar_rreo

app = FastAPI(title="Kora — Auditoria Contábil Municipal", version="3.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

JOBS: dict[str, dict] = {}


@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)
    # Safe migrations for columns added after initial deploy
    with engine.connect() as conn:
        conn.execute(
            __import__("sqlalchemy").text(
                "ALTER TABLE conciliacoes ADD COLUMN IF NOT EXISTS arquivado BOOLEAN DEFAULT FALSE"
            )
        )
        conn.execute(
            __import__("sqlalchemy").text(
                "ALTER TABLE conciliacoes ADD COLUMN IF NOT EXISTS arquivo_auditoria VARCHAR(255)"
            )
        )
        conn.commit()
    db = SessionLocal()
    try:
        seed_admin(db)
    finally:
        db.close()


# ─────────────────────────────────────────────────────────
# Schemas
# ─────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    email: str
    senha: str

class UserCreateRequest(BaseModel):
    nome: str
    email: str
    senha: str
    role: str = "auditor"

class PrefeituraCreate(BaseModel):
    nome: str
    municipio: str
    uf: str


# ─────────────────────────────────────────────────────────
# Auth
# ─────────────────────────────────────────────────────────

@app.post("/auth/login")
def login(body: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(Usuario).filter(Usuario.email == body.email, Usuario.ativo == True).first()
    if not user or not verify_password(body.senha, user.senha_hash):
        raise HTTPException(status_code=401, detail="Email ou senha incorretos")
    token = create_access_token({"sub": user.email})
    return {
        "access_token": token,
        "token_type": "bearer",
        "id": user.id,
        "nome": user.nome,
        "email": user.email,
        "role": user.role,
    }


@app.get("/auth/me")
def me(current_user: Usuario = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "nome": current_user.nome,
        "email": current_user.email,
        "role": current_user.role,
        "ativo": current_user.ativo,
    }


@app.get("/auth/usuarios")
def list_users(current_user: Usuario = Depends(require_admin), db: Session = Depends(get_db)):
    users = db.query(Usuario).order_by(Usuario.criado_em).all()
    return [
        {
            "id": u.id,
            "nome": u.nome,
            "email": u.email,
            "role": u.role,
            "ativo": u.ativo,
            "criado_em": u.criado_em.isoformat(),
        }
        for u in users
    ]


@app.post("/auth/usuarios", status_code=201)
def create_user_endpoint(
    body: UserCreateRequest,
    current_user: Usuario = Depends(require_admin),
    db: Session = Depends(get_db),
):
    if db.query(Usuario).filter(Usuario.email == body.email).first():
        raise HTTPException(status_code=400, detail="Email já cadastrado")
    user = Usuario(
        nome=body.nome,
        email=body.email,
        senha_hash=hash_password(body.senha),
        role=body.role,
        ativo=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"id": user.id, "nome": user.nome, "email": user.email, "role": user.role, "ativo": user.ativo}


@app.patch("/auth/usuarios/{user_id}/toggle")
def toggle_user(
    user_id: int,
    current_user: Usuario = Depends(require_admin),
    db: Session = Depends(get_db),
):
    user = db.query(Usuario).filter(Usuario.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Não é possível desativar seu próprio usuário")
    user.ativo = not user.ativo
    db.commit()
    return {"id": user.id, "ativo": user.ativo}


# ─────────────────────────────────────────────────────────
# Prefeituras
# ─────────────────────────────────────────────────────────

def _prefeitura_dict(p: Prefeitura) -> dict:
    return {
        "id": p.id,
        "nome": p.nome,
        "municipio": p.municipio,
        "uf": p.uf,
        "ativo": p.ativo,
        "criado_em": p.criado_em.isoformat(),
    }


@app.post("/prefeituras", status_code=201)
def create_prefeitura(
    body: PrefeituraCreate,
    current_user: Usuario = Depends(require_admin),
    db: Session = Depends(get_db),
):
    p = Prefeitura(**body.model_dump())
    db.add(p)
    db.commit()
    db.refresh(p)
    return _prefeitura_dict(p)


@app.get("/prefeituras")
def list_prefeituras(
    ativo: Optional[bool] = None,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = db.query(Prefeitura)
    if ativo is not None:
        q = q.filter(Prefeitura.ativo == ativo)
    return [_prefeitura_dict(p) for p in q.order_by(Prefeitura.nome).all()]


@app.get("/prefeituras/{prefeitura_id}")
def get_prefeitura(
    prefeitura_id: int,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    p = db.query(Prefeitura).filter(Prefeitura.id == prefeitura_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Prefeitura não encontrada")
    return _prefeitura_dict(p)


@app.put("/prefeituras/{prefeitura_id}")
def update_prefeitura(
    prefeitura_id: int,
    body: PrefeituraCreate,
    current_user: Usuario = Depends(require_admin),
    db: Session = Depends(get_db),
):
    p = db.query(Prefeitura).filter(Prefeitura.id == prefeitura_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Prefeitura não encontrada")
    for key, value in body.model_dump().items():
        setattr(p, key, value)
    db.commit()
    db.refresh(p)
    return _prefeitura_dict(p)


@app.delete("/prefeituras/{prefeitura_id}", status_code=204)
def delete_prefeitura(
    prefeitura_id: int,
    current_user: Usuario = Depends(require_admin),
    db: Session = Depends(get_db),
):
    p = db.query(Prefeitura).filter(Prefeitura.id == prefeitura_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Prefeitura não encontrada")
    db.query(Conciliacao).filter(Conciliacao.prefeitura_id == prefeitura_id).delete()
    db.delete(p)
    db.commit()


@app.patch("/prefeituras/{prefeitura_id}/toggle")
def toggle_prefeitura(
    prefeitura_id: int,
    current_user: Usuario = Depends(require_admin),
    db: Session = Depends(get_db),
):
    p = db.query(Prefeitura).filter(Prefeitura.id == prefeitura_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Prefeitura não encontrada")
    p.ativo = not p.ativo
    db.commit()
    return {"id": p.id, "ativo": p.ativo}


# ─────────────────────────────────────────────────────────
# Conciliação
# ─────────────────────────────────────────────────────────

@app.post("/conciliar")
async def conciliar_endpoint(
    rascunho: UploadFile = File(...),
    homologado: UploadFile = File(...),
    prefeitura_id: int = Form(...),
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    prefeitura = db.query(Prefeitura).filter(
        Prefeitura.id == prefeitura_id, Prefeitura.ativo == True
    ).first()
    if not prefeitura:
        raise HTTPException(status_code=404, detail="Prefeitura não encontrada")

    job_id = str(uuid.uuid4())
    tmp_dir = tempfile.mkdtemp()

    try:
        r_path = os.path.join(tmp_dir, f"rascunho_{rascunho.filename}")
        h_path = os.path.join(tmp_dir, f"homologado_{homologado.filename}")

        with open(r_path, "wb") as f:
            f.write(await rascunho.read())
        with open(h_path, "wb") as f:
            f.write(await homologado.read())

        out_path = os.path.join(tmp_dir, f"conciliado_{job_id}.xlsx")
        result = _conciliar(r_path, h_path, out_path)

        por_severidade = result.get("por_severidade", {})
        total_div = result.get("total_divergencias", 0)
        criticas = por_severidade.get("CRÍTICA", 0)

        if total_div == 0:
            status_conc = "sem_divergencias"
        elif criticas > 0:
            status_conc = "com_divergencias"
        else:
            status_conc = "concluida"

        conc = Conciliacao(
            prefeitura_id=prefeitura_id,
            tipo="RGF_SIMPLIFICADO",
            arquivo_rascunho=rascunho.filename,
            arquivo_homologado=homologado.filename,
            total_divergencias=total_div,
            por_severidade=result.get("por_severidade"),
            por_anexo=result.get("por_anexo"),
            status=status_conc,
            criado_por=current_user.id,
        )
        db.add(conc)
        db.commit()
        db.refresh(conc)

        JOBS[job_id] = {"status": "ok", "path": out_path, "tmp_dir": tmp_dir, "stats": result}
        return {"job_id": job_id, "stats": result, "conciliacao_id": conc.id}

    except Exception as e:
        shutil.rmtree(tmp_dir, ignore_errors=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/download/{job_id}")
def download(job_id: str, current_user: Usuario = Depends(get_current_user)):
    job = JOBS.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job não encontrado")
    return FileResponse(
        job["path"],
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        filename="RGF_Conciliado.xlsx",
    )


@app.get("/download-auditoria/{job_id}")
def download_auditoria(job_id: str, current_user: Usuario = Depends(get_current_user)):
    job = JOBS.get(job_id)
    if not job or not job.get("audit_path"):
        raise HTTPException(status_code=404, detail="Relatório de auditoria não encontrado")
    return FileResponse(
        job["audit_path"],
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        filename="RREO_Relatorio_Auditoria.xlsx",
    )


@app.post("/conciliar-rreo")
async def conciliar_rreo_endpoint(
    rascunho_msc: UploadFile = File(...),
    siconfi_homologado: UploadFile = File(...),
    prefeitura_id: int = Form(...),
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    prefeitura = db.query(Prefeitura).filter(
        Prefeitura.id == prefeitura_id, Prefeitura.ativo == True
    ).first()
    if not prefeitura:
        raise HTTPException(status_code=404, detail="Prefeitura não encontrada")

    for upload in (rascunho_msc, siconfi_homologado):
        ext = os.path.splitext(upload.filename or "")[1].lower()
        if ext not in (".xls", ".xlsx"):
            raise HTTPException(
                status_code=400,
                detail=f"Formato não suportado: '{upload.filename}'. "
                       "Confirme se é um .xls ou .xlsx exportado do SICONFI/MSC.",
            )

    job_id = str(uuid.uuid4())
    tmp_dir = tempfile.mkdtemp()

    try:
        r_path = os.path.join(tmp_dir, f"rascunho_{rascunho_msc.filename}")
        h_path = os.path.join(tmp_dir, f"siconfi_{siconfi_homologado.filename}")

        with open(r_path, "wb") as f:
            f.write(await rascunho_msc.read())
        with open(h_path, "wb") as f:
            f.write(await siconfi_homologado.read())

        out_path = os.path.join(tmp_dir, f"rreo_conciliado_{job_id}.xlsx")
        audit_path = os.path.join(tmp_dir, f"rreo_auditoria_{job_id}.xlsx")

        resultado = _conciliar_rreo(r_path, h_path, out_path, audit_path, workdir=tmp_dir)
        result_dict = resultado.to_dict()

        por_classificacao = result_dict.get("por_classificacao", {})
        total_div = result_dict.get("total_divergencias", 0)
        criticas = por_classificacao.get("CRÍTICA", 0)

        if total_div == 0:
            status_conc = "sem_divergencias"
        elif criticas > 0:
            status_conc = "com_divergencias"
        else:
            status_conc = "concluida"

        conc = Conciliacao(
            prefeitura_id=prefeitura_id,
            tipo="RREO",
            arquivo_rascunho=rascunho_msc.filename,
            arquivo_homologado=siconfi_homologado.filename,
            arquivo_auditoria=audit_path,
            total_divergencias=total_div,
            por_severidade=por_classificacao,
            por_anexo=result_dict.get("por_sheet"),
            status=status_conc,
            criado_por=current_user.id,
        )
        db.add(conc)
        db.commit()
        db.refresh(conc)

        JOBS[job_id] = {
            "status": "ok",
            "path": out_path,
            "audit_path": audit_path,
            "tmp_dir": tmp_dir,
            "stats": result_dict,
        }
        return {
            "job_id": job_id,
            "stats": result_dict,
            "conciliacao_id": conc.id,
        }

    except HTTPException:
        shutil.rmtree(tmp_dir, ignore_errors=True)
        raise
    except Exception as e:
        shutil.rmtree(tmp_dir, ignore_errors=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/conciliacoes")
def list_conciliacoes(
    prefeitura_id: Optional[int] = None,
    limit: int = 50,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = db.query(Conciliacao)
    if prefeitura_id:
        q = q.filter(Conciliacao.prefeitura_id == prefeitura_id)
    items = q.order_by(desc(Conciliacao.criado_em)).limit(limit).all()
    return [
        {
            "id": c.id,
            "prefeitura_id": c.prefeitura_id,
            "prefeitura_nome": c.prefeitura.nome if c.prefeitura else None,
            "tipo": c.tipo,
            "total_divergencias": c.total_divergencias,
            "status": c.status,
            "criado_em": c.criado_em.isoformat(),
            "criado_por_nome": c.usuario.nome if c.usuario else None,
        }
        for c in items
    ]


@app.get("/conciliacoes/{conciliacao_id}")
def get_conciliacao(
    conciliacao_id: int,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    c = db.query(Conciliacao).filter(Conciliacao.id == conciliacao_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Conciliação não encontrada")
    return {
        "id": c.id,
        "prefeitura_id": c.prefeitura_id,
        "prefeitura_nome": c.prefeitura.nome if c.prefeitura else None,
        "tipo": c.tipo,
        "arquivo_rascunho": c.arquivo_rascunho,
        "arquivo_homologado": c.arquivo_homologado,
        "total_divergencias": c.total_divergencias,
        "por_severidade": c.por_severidade,
        "por_anexo": c.por_anexo,
        "status": c.status,
        "criado_em": c.criado_em.isoformat(),
        "criado_por_nome": c.usuario.nome if c.usuario else None,
    }


@app.get("/prefeituras/{prefeitura_id}/conciliacoes")
def prefeitura_conciliacoes(
    prefeitura_id: int,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    p = db.query(Prefeitura).filter(Prefeitura.id == prefeitura_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Prefeitura não encontrada")
    items = (
        db.query(Conciliacao)
        .filter(Conciliacao.prefeitura_id == prefeitura_id)
        .order_by(desc(Conciliacao.criado_em))
        .all()
    )
    return {
        "prefeitura": {"id": p.id, "nome": p.nome, "municipio": p.municipio, "uf": p.uf},
        "conciliacoes": [
            {
                "id": c.id,
                "tipo": c.tipo,
                "total_divergencias": c.total_divergencias,
                "por_severidade": c.por_severidade or {},
                "por_anexo": c.por_anexo or {},
                "status": c.status,
                "arquivado": c.arquivado,
                "criado_em": c.criado_em.isoformat(),
                "criado_por_nome": c.usuario.nome if c.usuario else None,
            }
            for c in items
        ],
    }


@app.patch("/conciliacoes/{conciliacao_id}/arquivar")
def arquivar_conciliacao(
    conciliacao_id: int,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    c = db.query(Conciliacao).filter(Conciliacao.id == conciliacao_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Conciliação não encontrada")
    c.arquivado = not c.arquivado
    db.commit()
    return {"id": c.id, "arquivado": c.arquivado}


# ─────────────────────────────────────────────────────────
# Dashboard
# ─────────────────────────────────────────────────────────

@app.get("/dashboard")
def dashboard(
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    prefeituras = db.query(Prefeitura).filter(Prefeitura.ativo == True).all()
    total_prefeituras = len(prefeituras)

    conformes = em_alerta = irregular = 0
    irregularidades_ativas = 0
    municipios_data = []

    for p in prefeituras:
        ultima = (
            db.query(Conciliacao)
            .filter(Conciliacao.prefeitura_id == p.id, Conciliacao.arquivado == False)
            .order_by(desc(Conciliacao.criado_em))
            .first()
        )

        status_mun = "conforme"
        total_div = 0
        ultima_data = None
        conc_status = "pendente"

        if ultima:
            total_div = ultima.total_divergencias
            ultima_data = ultima.criado_em.strftime("%d/%m/%Y")
            por_sev = ultima.por_severidade or {}
            criticas = por_sev.get("CRÍTICA", 0)
            significativas = por_sev.get("SIGNIFICATIVA", 0)

            if criticas > 0:
                status_mun = "irregular"
                irregularidades_ativas += criticas
                conc_status = "divergencia"
            elif significativas > 0 or total_div > 0:
                status_mun = "alerta"
                conc_status = "ok"
            else:
                status_mun = "conforme"
                conc_status = "ok"

        if status_mun == "conforme":
            conformes += 1
        elif status_mun == "alerta":
            em_alerta += 1
        else:
            irregular += 1

        municipios_data.append({
            "id": p.id,
            "nome": p.nome,
            "municipio": p.municipio,
            "uf": p.uf,
            "status": status_mun,
            "ultima_conciliacao": ultima_data,
            "total_divergencias": total_div,
            "conc_status": conc_status,
            "irregularidades": total_div,
        })

    conformidade_media = round((conformes / total_prefeituras * 100) if total_prefeituras > 0 else 0, 1)

    # Pendentes: prefeituras sem conciliação no mês corrente
    mes_atual = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    ids_com_conc_mes = {
        c.prefeitura_id
        for c in db.query(Conciliacao).filter(Conciliacao.criado_em >= mes_atual).all()
    }
    conciliacoes_pendentes = max(0, total_prefeituras - len(ids_com_conc_mes))

    # Alertas recentes: últimas 10 conciliações com divergências
    alertas_db = (
        db.query(Conciliacao)
        .filter(Conciliacao.total_divergencias > 0)
        .order_by(desc(Conciliacao.criado_em))
        .limit(10)
        .all()
    )
    alertas_recentes = []
    for c in alertas_db:
        por_sev = c.por_severidade or {}
        criticas = por_sev.get("CRÍTICA", 0)
        significativas = por_sev.get("SIGNIFICATIVA", 0)
        if criticas > 0:
            sev = "critica"
            descricao = f"Divergência crítica — {criticas} ocorrência{'s' if criticas > 1 else ''}"
        elif significativas > 0:
            sev = "alerta"
            descricao = f"Divergência significativa — {significativas} ocorrência{'s' if significativas > 1 else ''}"
        else:
            sev = "atencao"
            descricao = f"Divergência detectada — {c.total_divergencias} célula{'s' if c.total_divergencias > 1 else ''}"
        alertas_recentes.append({
            "id": c.id,
            "municipio": c.prefeitura.nome if c.prefeitura else "N/A",
            "uf": c.prefeitura.uf if c.prefeitura else "",
            "tipo": descricao,
            "severidade": sev,
            "data": c.criado_em.strftime("%d/%m"),
            "status": "novo",
        })

    # Atividade recente: últimas 20 conciliações
    atividade_db = (
        db.query(Conciliacao)
        .order_by(desc(Conciliacao.criado_em))
        .limit(20)
        .all()
    )
    atividade_recente = []
    for c in atividade_db:
        if c.total_divergencias == 0:
            tipo = "conciliacao"
            desc_str = "Conciliação concluída sem divergências"
        elif (c.por_severidade or {}).get("CRÍTICA", 0) > 0:
            tipo = "alerta"
            desc_str = f"Irregularidade detectada: {c.total_divergencias} divergência(s) crítica(s)"
        else:
            tipo = "conciliacao"
            desc_str = f"Conciliação com {c.total_divergencias} divergência(s)"

        delta = datetime.utcnow() - c.criado_em
        horas = int(delta.total_seconds() // 3600)
        if horas < 1:
            tempo = "agora"
        elif horas < 24:
            tempo = f"{horas} h"
        else:
            tempo = f"{delta.days} d"

        atividade_recente.append({
            "tipo": tipo,
            "desc": desc_str,
            "municipio": c.prefeitura.nome if c.prefeitura else "N/A",
            "tempo": tempo,
        })

    return {
        "municipios_monitorados": total_prefeituras,
        "irregularidades_ativas": irregularidades_ativas,
        "conciliacoes_pendentes": conciliacoes_pendentes,
        "conformidade_media": conformidade_media,
        "distribuicao_status": {"conforme": conformes, "alerta": em_alerta, "irregular": irregular},
        "alertas_recentes": alertas_recentes,
        "municipios": municipios_data,
        "atividade_recente": atividade_recente,
    }


@app.get("/health")
def health():
    return {"status": "ok"}
