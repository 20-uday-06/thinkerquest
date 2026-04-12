from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import get_settings

settings = get_settings()

_db_path = Path(settings.sqlite_db_path)
_db_path.parent.mkdir(parents=True, exist_ok=True)

engine = create_engine(
    f"sqlite:///{_db_path}",
    connect_args={"check_same_thread": False},
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
