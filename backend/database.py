# database.py

from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

# 환경 변수 로드
load_dotenv()

# ===== 1. 테스트 모드 확인 =====
# .env 파일에 TESTING_MODE=true 를 추가하면 SQLite를 사용합니다.
TESTING_MODE = os.getenv("TESTING_MODE", "false").lower() == "true"

# 전역 변수 선언
SQLALCHEMY_DATABASE_URL = ""
engine = None

if TESTING_MODE:
    # ===== 2. 테스트 모드일 경우: SQLite 설정 =====
    print("✅ 테스트 모드 활성화: SQLite 데이터베이스를 사용합니다.")
    
    # SQLite 데이터베이스 파일 경로 설정 (프로젝트 루트에 test.db 파일 생성)
    SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"
    
    # SQLite를 위한 엔진 생성. 
    # check_same_thread는 FastAPI(와 같은 멀티스레드 환경)에서 SQLite 사용 시 필수 옵션입니다.
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
    )

else:
    # ===== 3. 프로덕션 모드일 경우: 기존 PostgreSQL 설정 유지 =====
    print("🚀 프로덕션 모드: PostgreSQL 데이터베이스를 사용합니다.")
    
    POSTGRES_HOST = os.getenv("POSTGRES_HOST", "192.168.165.133")
    POSTGRES_PORT = os.getenv("POSTGRES_PORT", "5432")
    POSTGRES_DB = os.getenv("POSTGRES_DB", "mydb")
    POSTGRES_USER = os.getenv("POSTGRES_USER", "myuser")
    POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD", "mypass")

    SQLALCHEMY_DATABASE_URL = os.getenv(
        "DATABASE_URL", 
        f"postgresql://{POSTGRES_USER}:{POSTGRES_PASSWORD}@{POSTGRES_HOST}:{POSTGRES_PORT}/{POSTGRES_DB}"
    )
    
    engine = create_engine(SQLALCHEMY_DATABASE_URL)


# ===== 4. 공통 설정 =====
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# 데이터베이스 연결 테스트 함수 (선택사항)
def test_connection():
    try:
        with engine.connect() as connection:
            db_type = "SQLite" if TESTING_MODE else "PostgreSQL"
            print(f"✅ {db_type} 데이터베이스 연결 성공!")
            return True
    except Exception as e:
        print(f"❌ 데이터베이스 연결 실패: {e}")
        return False