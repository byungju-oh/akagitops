# 🕳️ 이 길 어때? - Sinkhole Alert App

<div align="center">

![React](https://img.shields.io/badge/React-18.0-61DAFB?style=for-the-badge&logo=react)
![FastAPI](https://img.shields.io/badge/FastAPI-0.68-009688?style=for-the-badge&logo=fastapi)
![Python](https://img.shields.io/badge/Python-3.9+-3776AB?style=for-the-badge&logo=python)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-13-336791?style=for-the-badge&logo=postgresql)
![Azure](https://img.shields.io/badge/Azure-AI_Services-0078D4?style=for-the-badge&logo=microsoft-azure)

**서울시 싱크홀 위험 지역을 실시간으로 예측하고 안전한 경로를 안내하는 스마트 도시 안전 서비스**

[🌐 데모 보기](#demo) • [📱 기능 소개](#features) • [🚀 빠른 시작](#quick-start) • [📖 문서](#documentation)

</div>

---

## 📋 목차

- [🌟 주요 기능](#features)
- [🏗️ 시스템 아키텍처](#architecture)
- [🚀 빠른 시작](#quick-start)
- [⚙️ 설치 및 환경설정](#installation)
- [🔧 개발 환경 구성](#development)
- [📱 사용법](#usage)
- [🤖 AI 기능](#ai-features)
- [🛠️ API 문서](#api-docs)
- [🧪 테스트](#testing)
- [🚀 배포](#deployment)
- [🤝 기여하기](#contributing)
- [📄 라이선스](#license)

---

## 🌟 주요 기능 {#features}

### 🗺️ **실시간 위험지도**
- 서울시 전역 싱크홀 위험도 시각화
- 실시간 공사정보 및 위험지역 표시
- 위험도별 색상 구분 (낮음/보통/높음/매우높음)

### 🎯 **스마트 경로 안내**
- 위험지역을 회피하는 안전한 도보 경로 제공
- 음성 기반 목적지 설정 및 네비게이션
- 실시간 경로 재계산 및 우회 안내

### 🤖 **AI 기반 싱크홀 탐지**
- Azure Custom Vision을 활용한 이미지 분석
- 사진 업로드만으로 싱크홀 자동 탐지
- 70% 이상 정확도로 위험도 판정

### 🎤 **음성 인터페이스**
- Azure Speech Service 기반 STT/TTS
- 음성 명령으로 목적지 설정
- 시각장애인 접근성 지원

### 💬 **RAG 기반 챗봇**
- 싱크홀 관련 전문 지식 제공
- 신고 방법, 응급처치 안내
- 이미지 분석과 연동된 상담 서비스

### 🏃‍♂️ **만보기 & 건강 관리**
- GPS 기반 걸음 수 측정
- 일일/주간/월간 통계 제공
- 건강 목표 설정 및 달성률 추적

---

## 🏗️ 시스템 아키텍처 {#architecture}

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend       │    │  External APIs  │
│   (React)       │    │   (FastAPI)      │    │                 │
├─────────────────┤    ├──────────────────┤    ├─────────────────┤
│ • Leaflet Maps  │◄──►│ • REST API       │◄──►│ • Azure AI      │
│ • React Router  │    │ • SQLAlchemy     │    │ • OpenStreetMap │
│ • Axios         │    │ • Pydantic       │    │ • 서울시 공공데이터│
│ • Speech API    │    │ • JWT Auth       │    │ • Weather API   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌──────────────────┐
                       │    Database      │
                       │  (PostgreSQL)    │
                       ├──────────────────┤
                       │ • 사용자 정보     │
                       │ • 신고 데이터     │
                       │ • 걸음 수 기록    │
                       │ • 위험지역 정보   │
                       └──────────────────┘
```

---

## 🚀 빠른 시작 {#quick-start}

### 🔧 필수 요구사항

- **Python**: 3.9+
- **Node.js**: 16+
- **PostgreSQL**: 13+
- **Azure 계정**: AI 서비스 이용

### ⚡ 1분 설치

```bash
# 저장소 클론
git clone https://github.com/your-username/sinkhole-alert-app.git
cd sinkhole-alert-app

# 자동 설치 스크립트 실행
./install.sh

# 개발 서버 시작
npm run dev
```

---

## ⚙️ 설치 및 환경설정 {#installation}

### 1️⃣ **백엔드 설정**

```bash
# 가상환경 생성 및 활성화
cd backend
python -m venv venv

# Windows
venv\Scripts\activate
# macOS/Linux
source venv/bin/activate

# 의존성 설치
pip install -r requirements.txt
```

### 2️⃣ **환경변수 설정**

`.env` 파일을 생성하고 다음 정보를 입력하세요:

```env
# 데이터베이스 설정
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=sinkhole_app
POSTGRES_USER=your_username
POSTGRES_PASSWORD=your_password

# Azure AI 서비스
AZURE_OPENAI_ENDPOINT=https://your-openai.openai.azure.com/
AZURE_OPENAI_KEY=your_openai_key
AZURE_OPENAI_DEPLOYMENT=gpt-4

# Azure Custom Vision
AZURE_VISION_ENDPOINT=https://your-vision.cognitiveservices.azure.com/
AZURE_VISION_KEY=your_vision_key
AZURE_VISION_PROJECT_ID=your_project_id

# Azure Speech Service
AZURE_SPEECH_KEY=your_speech_key
AZURE_SPEECH_REGION=koreacentral

# JWT 설정
SECRET_KEY=your_super_secret_jwt_key_here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# 테스트 모드 (선택)
TESTING_MODE=false
```

### 3️⃣ **데이터베이스 초기화**

```bash
# PostgreSQL 데이터베이스 생성
createdb sinkhole_app

# 테이블 생성 (FastAPI 시작시 자동 생성됨)
python main.py
```

### 4️⃣ **프론트엔드 설정**

```bash
cd frontend

# 의존성 설치
npm install

# 개발 서버 시작
npm start
```

---

## 🔧 개발 환경 구성 {#development}

### 🔄 **개발 서버 실행**

```bash
# 터미널 1: 백엔드 서버
cd backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# 터미널 2: 프론트엔드 서버  
cd frontend
npm start
```

### 📁 **프로젝트 구조**

```
sinkhole-alert-app/
├── backend/                    # FastAPI 백엔드
│   ├── main.py                # 메인 API 서버
│   ├── database.py            # 데이터베이스 설정
│   ├── models.py              # SQLAlchemy 모델
│   ├── auth.py                # JWT 인증
│   ├── chatbot_service.py     # RAG 챗봇 시스템
│   ├── speech_service.py      # Azure Speech API
│   ├── sinkhole_analysis_service.py  # AI 이미지 분석
│   ├── simple_osm_routing.py  # OSM 라우팅 엔진
│   └── requirements.txt       # Python 의존성
├── frontend/                  # React 프론트엔드
│   ├── public/
│   ├── src/
│   │   ├── components/       # 재사용 컴포넌트
│   │   ├── pages/           # 페이지 컴포넌트
│   │   ├── contexts/        # React Context
│   │   ├── styles/          # CSS 스타일
│   │   └── utils/           # 유틸리티 함수
│   ├── package.json
│   └── package-lock.json
├── data/                      # 데이터 파일
│   └── 필터링결과.csv         # 공사정보 데이터
├── .env                       # 환경변수 (git 무시)
├── .gitignore
└── README.md
```

---

## 📱 사용법 {#usage}

### 🗺️ **위험지도 확인**

1. 메인 페이지에서 서울시 위험지도 확인
2. 색상별 위험도 범례 참조
3. 마커 클릭으로 상세 정보 확인

### 🎯 **안전경로 검색**

1. **음성 검색**: 🎤 버튼 클릭 후 목적지 음성 입력
2. **텍스트 검색**: 검색창에 목적지 입력
3. 위험지역을 회피한 최적 경로 확인

### 📸 **싱크홀 신고**

1. 신고 페이지에서 사진 업로드
2. AI 자동 분석 결과 확인
3. 위치정보와 함께 신고 접수

### 🏃‍♂️ **만보기 사용**

1. 운동 페이지에서 GPS 권한 허용
2. 실시간 걸음 수 및 거리 확인
3. 일간/주간 통계 및 목표 설정

---

## 🤖 AI 기능 {#ai-features}

### 🔍 **이미지 분석 AI**

```python
# Azure Custom Vision을 활용한 싱크홀 탐지
result = sinkhole_analyzer.analyze_image(image_data)
confidence = result['confidence']  # 신뢰도 (0-100%)
is_sinkhole = confidence >= 70     # 70% 이상시 싱크홀 판정
```

### 🗣️ **음성 인식 & 합성**

```javascript
// Azure Speech SDK 활용
const recognition = new SpeechRecognition();
recognition.lang = 'ko-KR';
recognition.onresult = (event) => {
  const transcript = event.results[0][0].transcript;
  processDestination(transcript);
};
```

### 💬 **RAG 챗봇**

```python
# Azure OpenAI + 벡터 검색 기반 지식 검색
def smart_answer(query, image_data=None):
    # 1. 벡터 유사도 검색
    relevant_docs = search_knowledge_base(query)
    
    # 2. GPT-4 기반 답변 생성
    response = openai_client.chat.completions.create(
        model="gpt-4",
        messages=[
            {"role": "system", "content": f"다음 문서를 참조하여 답변: {relevant_docs}"},
            {"role": "user", "content": query}
        ]
    )
    return response.choices[0].message.content
```

---

## 🛠️ API 문서 {#api-docs}

### 🔐 **인증 API**

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/register` | 회원가입 (약관동의 포함) |
| POST | `/login` | 로그인 |
| POST | `/logout` | 로그아웃 |
| GET | `/me` | 현재 사용자 정보 |

### 🗺️ **지도 & 경로 API**

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/sinkhole-risk-areas` | 위험지역 목록 |
| GET | `/construction-zones` | 공사정보 목록 |
| POST | `/safe-walking-route` | 안전 도보경로 검색 |
| POST | `/exercise-route` | 운동용 경로 생성 |

### 🤖 **AI & 챗봇 API**

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/chatbot/ask` | 텍스트/이미지 질문 |
| POST | `/chatbot/ask-with-voice` | 음성 응답 포함 |
| GET | `/chatbot/status` | 챗봇 서비스 상태 |
| GET | `/chatbot/examples` | 예시 질문 목록 |

### 🏃‍♂️ **운동 & 건강 API**

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/exercise/save-steps` | 걸음 수 저장 |
| GET | `/exercise/stats/{user_id}` | 운동 통계 조회 |
| POST | `/exercise/start-tracking` | 운동 추적 시작 |
| POST | `/exercise/stop-tracking` | 운동 추적 종료 |

### 📋 **신고 & 포인트 API**

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/reports/sinkhole` | 싱크홀 신고 |
| POST | `/reports/award-points` | 포인트 지급 |
| GET | `/reports/user/{user_id}` | 사용자 신고 내역 |

---

## 🧪 테스트 {#testing}

### 🔬 **백엔드 테스트**

```bash
cd backend

# 단위 테스트 실행
pytest tests/ -v

# 커버리지 리포트
pytest --cov=. tests/

# 특정 테스트 실행
pytest tests/test_chatbot.py::test_sinkhole_detection
```

### 🖥️ **프론트엔드 테스트**

```bash
cd frontend

# Jest 테스트 실행
npm test

# 컴포넌트 테스트
npm test -- --testPathPattern=components

# E2E 테스트 (Cypress)
npm run test:e2e
```

### 📊 **테스트 설정**

```env
# .env 파일에 테스트 모드 활성화
TESTING_MODE=true
```

---

## 🚀 배포 {#deployment}

### 🐳 **Docker 배포**

```bash
# Docker Compose로 전체 스택 배포
docker-compose up -d

# 개별 서비스 빌드
docker build -t sinkhole-backend ./backend
docker build -t sinkhole-frontend ./frontend
```

### ☁️ **클라우드 배포**

#### Azure Container Instances
```bash
# Azure CLI로 배포
az container create \
  --resource-group sinkhole-rg \
  --name sinkhole-app \
  --image your-registry.azurecr.io/sinkhole-app:latest
```

#### AWS ECS
```bash
# ECS 클러스터에 배포
aws ecs create-service \
  --cluster sinkhole-cluster \
  --service-name sinkhole-service \
  --task-definition sinkhole-task
```

### 🔒 **환경별 설정**

```bash
# 프로덕션 환경변수
export ENVIRONMENT=production
export DEBUG=false
export AZURE_STORAGE_CONNECTION_STRING=your_storage_connection
```

---

## 🤝 기여하기 {#contributing}

### 📝 **기여 가이드라인**

1. **Fork** 후 개발 브랜치 생성
2. **코딩 스타일** 준수 (Black, ESLint)
3. **테스트** 작성 및 통과 확인
4. **Pull Request** 생성

### 🔀 **개발 워크플로우**

```bash
# 1. Fork 후 클론
git clone https://github.com/your-username/sinkhole-alert-app.git

# 2. 기능 브랜치 생성
git checkout -b feature/새로운기능

# 3. 개발 및 커밋
git add .
git commit -m "feat: 새로운 기능 추가"

# 4. 푸시 및 PR 생성
git push origin feature/새로운기능
```

### 📋 **코딩 스타일**

#### Python (Black + isort)
```bash
# 코드 포맷팅
black backend/
isort backend/

# 린팅
flake8 backend/
```

#### JavaScript (ESLint + Prettier)
```bash
# 코드 포맷팅
npm run format

# 린팅
npm run lint
```

---

## 📄 라이선스 {#license}

```
MIT License

Copyright (c) 2024 이 길 어때? 개발팀

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

</div>
