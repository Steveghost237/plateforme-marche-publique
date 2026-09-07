from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import settings

def _build_db_url(url: str) -> str:
    """Ajoute sslmode=require pour les bases distantes (Neon, Supabase…).
    Laisse passer SQLite tel quel pour le développement local."""
    if url.startswith("sqlite:///"):
        return url
    is_local = "localhost" in url or "127.0.0.1" in url
    if not is_local and "sslmode" not in url:
        sep = "&" if "?" in url else "?"
        url = url + sep + "sslmode=require"
    return url

engine_kwargs = {
    "pool_pre_ping": True,
    "pool_size": 5,
    "max_overflow": 10,
    "pool_timeout": 30,
    "pool_recycle": 300,
}

# SQLite ne supporte pas les pools de connexion de la même façon
if settings.DATABASE_URL.startswith("sqlite:///"):
    engine_kwargs = {"connect_args": {"check_same_thread": False}}

engine = create_engine(
    _build_db_url(settings.DATABASE_URL),
    **engine_kwargs,
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
