from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, JSON, Table
from sqlalchemy.orm import relationship
from database import Base


# Many-to-many: um usuário pode pertencer a várias prefeituras
usuario_prefeituras = Table(
    "usuario_prefeituras",
    Base.metadata,
    Column("usuario_id", Integer, ForeignKey("usuarios.id"), primary_key=True),
    Column("prefeitura_id", Integer, ForeignKey("prefeituras.id"), primary_key=True),
)


class Usuario(Base):
    __tablename__ = "usuarios"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    senha_hash = Column(String(255), nullable=False)
    role = Column(String(50), default="auditor")  # admin / auditor
    ativo = Column(Boolean, default=True)
    criado_em = Column(DateTime, default=datetime.utcnow)

    prefeituras = relationship("Prefeitura", secondary=usuario_prefeituras)


class Prefeitura(Base):
    __tablename__ = "prefeituras"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String(255), nullable=False)
    municipio = Column(String(255), nullable=False)
    uf = Column(String(2), nullable=False)
    ativo = Column(Boolean, default=True)
    criado_em = Column(DateTime, default=datetime.utcnow)

    conciliacoes = relationship(
        "Conciliacao",
        back_populates="prefeitura",
        order_by="desc(Conciliacao.criado_em)",
    )


class Conciliacao(Base):
    __tablename__ = "conciliacoes"

    id = Column(Integer, primary_key=True, index=True)
    prefeitura_id = Column(Integer, ForeignKey("prefeituras.id"), nullable=False)
    tipo = Column(String(50), default="RGF_SIMPLIFICADO")  # RGF_SIMPLIFICADO / RREO / LRF
    arquivo_rascunho = Column(String(255), nullable=True)
    arquivo_homologado = Column(String(255), nullable=True)
    arquivo_auditoria = Column(String(255), nullable=True)
    total_divergencias = Column(Integer, default=0)
    por_severidade = Column(JSON, nullable=True)
    por_anexo = Column(JSON, nullable=True)
    status = Column(String(50), default="concluida")  # sem_divergencias / com_divergencias / concluida
    arquivado = Column(Boolean, default=False)
    criado_em = Column(DateTime, default=datetime.utcnow)
    criado_por = Column(Integer, ForeignKey("usuarios.id"), nullable=True)

    prefeitura = relationship("Prefeitura", back_populates="conciliacoes")
    usuario = relationship("Usuario")
