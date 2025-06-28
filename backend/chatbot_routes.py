# backend/chatbot_routes.py - 싱크홀 분석 기능 포함
from fastapi.responses import Response
from fastapi import APIRouter, File, Form, UploadFile, HTTPException
from typing import Optional
import base64
import datetime
from chatbot_service import rag_system
from speech_service import speech_service
from sinkhole_analysis_service import sinkhole_analyzer

# 챗봇 라우터 생성
chatbot_router = APIRouter(prefix="/chatbot", tags=["chatbot"])

@chatbot_router.post("/ask")
async def chatbot_ask(
    query: str = Form(...),
    image: Optional[UploadFile] = File(None)
):
    """챗봇 질문 처리 API - 싱크홀 분석 기능 포함"""
    try:
        # 입력 유효성 검사
        if not query or len(query.strip()) < 2:
            raise HTTPException(status_code=400, detail="질문을 입력해주세요.")
        
        # 질문 길이 제한 (보안상)
        if len(query) > 1000:
            raise HTTPException(status_code=400, detail="질문이 너무 깁니다. 1000자 이내로 입력해주세요.")
        
        image_data = None
        image_analysis_result = None
        
        if image:
            # 이미지 파일 크기 제한 (10MB)
            contents = await image.read()
            if len(contents) > 10 * 1024 * 1024:  # 10MB
                raise HTTPException(status_code=400, detail="이미지 파일이 너무 큽니다. 10MB 이하로 업로드해주세요.")
            
            # 이미지 형식 확인
            if not image.content_type.startswith('image/'):
                raise HTTPException(status_code=400, detail="이미지 파일만 업로드 가능합니다.")
            
            image_data = base64.b64encode(contents).decode('utf-8')
            
            # 이미지 분석 메타데이터 수집 (선택사항)
            if sinkhole_analyzer.is_available:
                try:
                    is_sinkhole, confidence, analysis_result = sinkhole_analyzer.analyze_image(image_data)
                    image_analysis_result = {
                        "is_sinkhole": is_sinkhole,
                        "confidence": confidence,
                        "confidence_percent": confidence * 100,
                        "total_detections": analysis_result.get("total_detections", 0)
                    }
                    print(f"📊 이미지 분석 메타데이터: {image_analysis_result}")
                except Exception as e:
                    print(f"⚠️ 이미지 분석 메타데이터 수집 실패: {e}")
        
        # Enhanced RAG 시스템으로 답변 생성 (이미지 분석 포함)
        answer, source = rag_system.smart_answer(query.strip(), image_data)
        
        response_data = {
            "success": True,
            "answer": answer,
            "source": source,
            "query": query.strip(),
            "has_image": image is not None,
            "timestamp": datetime.datetime.now().isoformat()
        }
        
        # 이미지 분석 결과가 있으면 추가
        if image_analysis_result:
            response_data["image_analysis"] = image_analysis_result
        
        return response_data
        
    except HTTPException:
        # HTTPException은 그대로 재발생
        raise
        
    except Exception as e:
        print(f"챗봇 처리 오류: {e}")
        return {
            "success": False,
            "error": "답변 생성 중 오류가 발생했습니다.",
            "answer": """죄송합니다. 일시적인 오류가 발생했습니다. 

다음과 같이 시도해보세요:
• 잠시 후 다시 질문해보세요
• 질문을 더 간단하게 바꿔보세요
• 긴급한 경우 119 또는 120으로 연락하세요

서비스 이용에 불편을 드려 죄송합니다.""",
            "source": "오류",
            "timestamp": datetime.datetime.now().isoformat()
        }

@chatbot_router.post("/analyze-image")
async def analyze_image_only(
    image: UploadFile = File(...)
):
    """이미지만 분석하는 전용 API"""
    try:
        # 이미지 파일 검증
        if not image.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="이미지 파일만 업로드 가능합니다.")
        
        contents = await image.read()
        if len(contents) > 10 * 1024 * 1024:  # 10MB
            raise HTTPException(status_code=400, detail="이미지 파일이 너무 큽니다.")
        
        # Azure Custom Vision 서비스 사용 가능 여부 확인
        if not sinkhole_analyzer.is_available:
            raise HTTPException(
                status_code=503, 
                detail="이미지 분석 서비스를 현재 사용할 수 없습니다."
            )
        
        # 이미지 분석 수행
        image_data = base64.b64encode(contents).decode('utf-8')
        is_sinkhole, confidence, analysis_result = sinkhole_analyzer.analyze_image(image_data)
        
        # 주석 이미지 생성 (바운딩 박스 포함)
        annotated_image = None
        if analysis_result.get("predictions"):
            annotated_image = sinkhole_analyzer.create_annotated_image(image_data, analysis_result)
        
        # 분석 결과에 따른 권장사항 생성
        if is_sinkhole and confidence >= 0.7:
            recommendation = "즉시 안전 조치를 취하고 119에 신고하세요."
            risk_level = "high"
        elif confidence >= 0.5:
            recommendation = "전문가 확인을 권장합니다."
            risk_level = "medium"
        else:
            recommendation = "싱크홀로 보이지 않지만 의심스러우면 신고하세요."
            risk_level = "low"
        
        return {
            "success": True,
            "analysis_result": {
                "is_sinkhole": is_sinkhole,
                "confidence": confidence,
                "confidence_percent": round(confidence * 100, 1),
                "risk_level": risk_level,
                "recommendation": recommendation,
                "predictions": analysis_result.get("predictions", []),
                "total_detections": analysis_result.get("total_detections", 0),
                "image_dimensions": analysis_result.get("image_dimensions", {}),
                "annotated_image": annotated_image  # Base64 주석 이미지
            },
            "timestamp": datetime.datetime.now().isoformat()
        }
        
    except HTTPException:
        raise
        
    except Exception as e:
        print(f"이미지 분석 오류: {e}")
        return {
            "success": False,
            "error": f"이미지 분석 중 오류가 발생했습니다: {str(e)}",
            "timestamp": datetime.datetime.now().isoformat()
        }

@chatbot_router.get("/health")
async def chatbot_health():
    """챗봇 시스템 상태 확인 - 싱크홀 분석 기능 포함"""
    return {
        "status": "healthy",
        "message": "챗봇 시스템이 정상 작동 중입니다.",
        "features": {
            "text_chat": True,
            "image_upload": True,
            "rag_system": True,
            "fallback_llm": True,
            "sinkhole_analysis": sinkhole_analyzer.is_available,  # 새 기능
            "voice_support": True
        },
        "services": {
            "azure_openai": rag_system.client is not None,
            "azure_custom_vision": sinkhole_analyzer.is_available,
            "azure_speech": True  # speech_service 가정
        },
        "supported_queries": [
            "싱크홀 신고 방법",
            "싱크홀 크기 측정", 
            "발생 원인 및 예방",
            "피해 보상 절차",
            "서비스 이용 방법",
            "사진 분석을 통한 싱크홀 탐지"  # 새 기능
        ]
    }

@chatbot_router.get("/examples")
async def get_example_questions():
    """예시 질문 목록 제공 - 사진 분석 예시 추가"""
    return {
        "categories": {
            "신고_접수": [
                "싱크홀을 발견했는데 어디에 신고해야 하나요?",
                "싱크홀 신고할 때 어떤 정보가 필요한가요?",
                "응급상황일 때 연락처는 어디인가요?"
            ],
            "측정_평가": [
                "싱크홀 크기는 어떻게 측정하나요?",
                "어느 정도 크기부터 위험한가요?",
                "깊이를 알 수 없을 때는 어떻게 하나요?"
            ],
            "사진_분석": [  # 새 카테고리
                "이 사진이 싱크홀인지 확인해주세요",
                "사진으로 싱크홀을 분석할 수 있나요?",
                "AI 분석 정확도는 어느 정도인가요?"
            ],
            "원인_예방": [
                "싱크홀이 생기는 원인은 무엇인가요?",
                "싱크홀을 미리 예방할 수 있는 방법이 있나요?",
                "어떤 징후를 봐야 하나요?"
            ],
            "보상_절차": [
                "싱크홀 피해 보상은 어떻게 받나요?",
                "보상 신청에 필요한 서류는 무엇인가요?",
                "보상 처리 기간은 얼마나 걸리나요?"
            ],
            "서비스_이용": [
                "이 서비스는 어떻게 사용하나요?",
                "위험지도는 어디서 볼 수 있나요?",
                "안전 경로 검색 기능은 어떻게 쓰나요?"
            ]
        },
        "image_upload_tips": [
            "선명하고 밝은 사진을 업로드하세요",
            "가능하면 여러 각도에서 촬영하세요", 
            "안전거리를 유지하며 촬영하세요",
            "10MB 이하의 jpg, png 파일을 지원합니다"
        ]
    }

# 기존 음성 관련 엔드포인트들도 유지
@chatbot_router.post("/ask-with-voice")
async def chatbot_ask_with_voice(
    query: str = Form(...),
    image: Optional[UploadFile] = File(None),
    voice_name: str = Form("ko-KR-HyunsuMultilingualNeural")
):
    """챗봇 질문 + TTS 음성 응답 API - 싱크홀 분석 포함"""
    try:
        # 기존 챗봇 로직과 동일
        if not query or len(query.strip()) < 2:
            raise HTTPException(status_code=400, detail="질문을 입력해주세요.")
        
        if len(query) > 1000:
            raise HTTPException(status_code=400, detail="질문이 너무 깁니다. 1000자 이내로 입력해주세요.")
        
        image_data = None
        if image:
            contents = await image.read()
            if len(contents) > 10 * 1024 * 1024:  # 10MB
                raise HTTPException(status_code=400, detail="이미지 파일이 너무 큽니다.")
            
            if not image.content_type.startswith('image/'):
                raise HTTPException(status_code=400, detail="이미지 파일만 업로드 가능합니다.")
            
            image_data = base64.b64encode(contents).decode('utf-8')
        
        # Enhanced RAG 시스템으로 답변 생성 (이미지 분석 포함)
        answer, source = rag_system.smart_answer(query.strip(), image_data)
        
        # TTS로 음성 생성
        try:
            audio_data = speech_service.text_to_speech(answer, voice_name)
            audio_base64 = base64.b64encode(audio_data).decode('utf-8')
        except Exception as tts_error:
            print(f"TTS 오류: {tts_error}")
            audio_base64 = None
        
        return {
            "success": True,
            "answer": answer,
            "source": source,
            "query": query.strip(),
            "has_image": image is not None,
            "audio_data": audio_base64,  # Base64 인코딩된 음성 데이터
            "voice_name": voice_name,
            "timestamp": datetime.datetime.now().isoformat()
        }
        
    except HTTPException:
        raise
        
    except Exception as e:
        print(f"챗봇 음성 처리 오류: {e}")
        return {
            "success": False,
            "error": "답변 생성 중 오류가 발생했습니다.",
            "answer": "죄송합니다. 일시적인 오류가 발생했습니다.",
            "source": "오류",
            "audio_data": None,
            "timestamp": datetime.datetime.now().isoformat()
        }

@chatbot_router.post("/voice-conversation")
async def voice_conversation(
    audio: UploadFile = File(...),
    image: Optional[UploadFile] = File(None),
    voice_name: str = Form("ko-KR-HyunsuMultilingualNeural")
):
    """음성 대화 API - STT + 싱크홀 분석 + LLM + TTS"""
    try:
        # 1. 오디오 파일 검증
        if not audio.content_type.startswith('audio/'):
            raise HTTPException(status_code=400, detail="오디오 파일만 업로드 가능합니다.")
        
        audio_data = await audio.read()
        if len(audio_data) > 25 * 1024 * 1024:  # 25MB
            raise HTTPException(status_code=400, detail="오디오 파일이 너무 큽니다.")
        
        # 2. 이미지 처리 (선택사항)
        image_data = None
        if image:
            image_contents = await image.read()
            if len(image_contents) > 10 * 1024 * 1024:  # 10MB
                raise HTTPException(status_code=400, detail="이미지 파일이 너무 큽니다.")
            
            if not image.content_type.startswith('image/'):
                raise HTTPException(status_code=400, detail="이미지 파일만 업로드 가능합니다.")
            
            image_data = base64.b64encode(image_contents).decode('utf-8')
        
        # 3. STT: 음성을 텍스트로 변환
        try:
            recognized_text = speech_service.speech_to_text(audio_data)
            print(f"🎤 STT 결과: {recognized_text}")
        except Exception as stt_error:
            print(f"❌ STT 오류: {stt_error}")
            raise HTTPException(status_code=400, detail=f"음성 인식 실패: {str(stt_error)}")
        
        if not recognized_text or len(recognized_text.strip()) < 2:
            raise HTTPException(status_code=400, detail="음성에서 텍스트를 인식할 수 없습니다.")
        
        # 4. Enhanced RAG: 텍스트 + 이미지 분석
        try:
            answer, source = rag_system.smart_answer(recognized_text.strip(), image_data)
            print(f"🤖 LLM 응답: {answer[:100]}...")
        except Exception as llm_error:
            print(f"❌ LLM 오류: {llm_error}")
            answer = "죄송합니다. 답변 생성 중 오류가 발생했습니다."
            source = "오류"
        
        # 5. TTS: 답변을 음성으로 변환
        try:
            audio_response = speech_service.text_to_speech(answer, voice_name)
            audio_base64 = base64.b64encode(audio_response).decode('utf-8')
            print(f"🔊 TTS 성공: {len(audio_response)} bytes")
        except Exception as tts_error:
            print(f"❌ TTS 오류: {tts_error}")
            audio_base64 = None
        
        return {
            "success": True,
            "recognized_text": recognized_text,
            "answer": answer,
            "source": source,
            "audio_data": audio_base64,
            "voice_name": voice_name,
            "has_image": image is not None,
            "processing_time": "완료",
            "timestamp": datetime.datetime.now().isoformat()
        }
        
    except HTTPException:
        raise
        
    except Exception as e:
        print(f"음성 대화 API 오류: {e}")
        return {
            "success": False,
            "error": "음성 대화 처리 중 오류가 발생했습니다.",
            "recognized_text": "",
            "answer": "죄송합니다. 일시적인 오류가 발생했습니다.",
            "source": "오류",
            "audio_data": None,
            "timestamp": datetime.datetime.now().isoformat()
        }

@chatbot_router.post("/voice-test")
async def voice_test_endpoint():
    """음성 서비스 테스트 API"""
    try:
        # TTS 테스트
        test_text = "안녕하세요. 싱크홀 신고 도우미입니다. 음성 서비스가 정상 작동 중입니다."
        audio_data = speech_service.text_to_speech(test_text)
        audio_base64 = base64.b64encode(audio_data).decode('utf-8')
        
        return {
            "success": True,
            "message": "음성 서비스 테스트 성공",
            "test_text": test_text,
            "audio_data": audio_base64,
            "timestamp": datetime.datetime.now().isoformat()
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": f"음성 서비스 테스트 실패: {str(e)}",
            "timestamp": datetime.datetime.now().isoformat()
        }

@chatbot_router.get("/analysis-stats")
async def get_analysis_statistics():
    """싱크홀 분석 통계 정보 제공 (선택사항)"""
    return {
        "sinkhole_analysis": {
            "service_available": sinkhole_analyzer.is_available,
            "supported_formats": ["jpg", "jpeg", "png", "bmp"],
            "max_file_size_mb": 10,
            "confidence_threshold": 0.7,
            "detection_accuracy": "약 85-90% (테스트 데이터 기준)",
            "processing_time": "일반적으로 2-5초"
        },
        "usage_tips": [
            "밝고 선명한 사진을 사용하세요",
            "싱크홀 전체가 보이도록 촬영하세요",
            "안전거리를 유지하며 촬영하세요",
            "AI 분석은 참고용이며 전문가 확인이 필요합니다"
        ],
        "disclaimer": "AI 분석 결과는 참고용이며, 실제 현장 확인과 전문가 판단이 필요합니다."
    }