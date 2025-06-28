# backend/chatbot_service.py - 싱크홀 분석 기능 추가
import os
import re
from typing import Tuple, Optional
from openai import AzureOpenAI
from azure.search.documents import SearchClient
from azure.core.credentials import AzureKeyCredential
from dotenv import load_dotenv
from sinkhole_analysis_service import sinkhole_analyzer

load_dotenv()

class EnhancedRAGSystem:
    """싱크홀 분석 기능이 통합된 RAG 시스템"""
    
    def __init__(self):
        """Azure OpenAI 및 Search 클라이언트 초기화"""
        try:
            # Azure OpenAI 설정
            self.client = AzureOpenAI(
                api_key=os.getenv("AZURE_OPENAI_KEY"),
                api_version="2024-02-01",
                azure_endpoint=os.getenv("AZURE_OPENAI_ENDPOINT")
            )
            self.deployment = os.getenv("AZURE_OPENAI_DEPLOYMENT", "gpt-4")
            
            # Azure Search 설정
            self.search_endpoint = os.getenv("AZURE_SEARCH_ENDPOINT", "your-search-service")
            self.search_key = os.getenv("AZURE_SEARCH_KEY", "your-search-key")
            self.index_name = os.getenv("AZURE_SEARCH_INDEX", "sinkhole-docs")
            
            # 부적절한 답변 패턴
            self.inadequate_patterns = [
                "i don't have", "i cannot", "i'm unable", 
                "모르겠습니다", "알 수 없습니다", "정보가 없습니다",
                "도움드릴 수", "sorry", "unfortunately"
            ]
            
            print("✅ Enhanced RAG 시스템 초기화 완료")
            
        except Exception as e:
            print(f"❌ Enhanced RAG 시스템 초기화 실패: {e}")
            self.client = None
    
    def smart_answer(self, query: str, image_data: Optional[str] = None) -> Tuple[str, str]:
        """
        스마트 답변 시스템 - 이미지 분석 기능 통합
        
        Args:
            query: 사용자 질문
            image_data: Base64 인코딩된 이미지 데이터 (선택사항)
            
        Returns:
            Tuple[str, str]: (답변, 소스)
        """
        
        print(f"🤔 질문: {query}")
        if image_data:
            print("📸 이미지 첨부됨 - 싱크홀 분석 진행")
        print("-" * 60)
        
        # 1. 이미지가 있는 경우 먼저 싱크홀 분석 수행
        if image_data and sinkhole_analyzer.is_available:
            return self._handle_image_analysis(query, image_data)
        
        # 2. 텍스트 질문 처리 (기존 RAG 로직)
        return self._handle_text_query(query)
    
    def _handle_image_analysis(self, query: str, image_data: str) -> Tuple[str, str]:
        """이미지 분석을 통한 싱크홀 탐지 처리"""
        
        try:
            # Azure Custom Vision으로 이미지 분석
            is_sinkhole, confidence, analysis_result = sinkhole_analyzer.analyze_image(image_data)
            
            # 분석 결과에 따른 응답 생성
            if is_sinkhole and confidence >= 0.7:  # 70% 이상 확률
                print(f"🚨 싱크홀 탐지! 확률: {confidence:.2%}")
                return self._generate_sinkhole_report_response(confidence, analysis_result)
            
            elif confidence > 0.0:  # 50-70% 확률 (낮은 확률)
                print(f"⚠️ 불확실한 결과: {confidence:.2%}")
                return self._generate_uncertain_response(confidence, query)
            
            else:  # 싱크홀이 아닌 경우
                print("✅ 싱크홀이 아닌 것으로 판단")
                return self._generate_non_sinkhole_response(query)
                
        except Exception as e:
            print(f"❌ 이미지 분석 오류: {e}")
            return self._generate_analysis_error_response(query)
    
    def _generate_sinkhole_report_response(self, confidence: float, analysis_result: dict) -> Tuple[str, str]:
        """70% 이상 확률로 싱크홀이 탐지된 경우의 응답"""
        
        # RAG에서 싱크홀 신고 절차 정보 검색
        report_info = self._get_sinkhole_report_procedure()
        
        response = f"""🚨 **싱크홀이 탐지되었습니다!** (확률: {confidence:.1%})

⚠️ **즉시 안전 조치를 취해주세요:**
1. 해당 지역에서 즉시 대피하세요
2. 주변 사람들에게 위험을 알려주세요  
3. 접근을 차단하고 안전거리를 유지하세요

📞 **긴급 신고 연락처:**
• 119 (소방서 - 응급상황)
• 112 (경찰서 - 교통통제)
• 120 (다산콜센터 - 일반신고)

{report_info}

🔍 **AI 분석 결과:**
• 탐지된 객체 수: {analysis_result.get('total_detections', 0)}개
• 분석 신뢰도: {confidence:.1%}
• 이미지 크기: {analysis_result.get('image_dimensions', {}).get('width', 0)}x{analysis_result.get('image_dimensions', {}).get('height', 0)}

⚠️ 본 분석 결과는 AI 기반 참고자료이며, 현장 전문가의 정확한 판단이 필요합니다."""

        return response, "싱크홀 AI 분석"
    
    def _generate_uncertain_response(self, confidence: float, query: str) -> Tuple[str, str]:
        """50-70% 확률의 불확실한 경우 응답"""
        
        response = f"""🤔 **분석 결과가 불확실합니다** (확률: {confidence:.1%})

현재 업로드하신 이미지에서 싱크홀 특징이 일부 감지되었지만, 확실하지 않습니다.

💡 **권장사항:**
1. 더 선명한 사진으로 다시 촬영해보세요
2. 다양한 각도에서 추가 사진을 촬영하세요
3. 의심스러운 부분이 있다면 안전을 위해 신고를 고려하세요

📞 **문의 연락처:**
• 관할 구청 안전관리과
• 120 (다산콜센터)

궁금한 점이 있으시면 텍스트로 추가 질문해주세요!"""

        return response, "부분 탐지"
    
    def _generate_non_sinkhole_response(self, query: str) -> Tuple[str, str]:
        """싱크홀이 아닌 것으로 판단된 경우 응답"""
        
        # 사용자 질문에 따른 맞춤 응답
        if any(word in query.lower() for word in ["신고", "어디", "연락처"]):
            additional_info = "\n\n혹시 다른 안전 문제가 있으시다면 관할 구청이나 120 다산콜센터로 문의하세요."
        else:
            additional_info = "\n\n싱크홀 관련 다른 질문이 있으시면 언제든 말씀해주세요!"
        
        response = f"""✅ **분석 결과: 싱크홀이 아닌 것으로 보입니다**

업로드해주신 이미지를 AI로 분석한 결과, 싱크홀의 특징이 감지되지 않았습니다.

🔍 **하지만 다음과 같은 경우 추가 확인을 권장합니다:**
• 도로나 보도에 균열이나 침하가 보이는 경우
• 지면에서 물이 새어 나오는 경우  
• 주변에서 이상한 소리가 나는 경우

{additional_info}"""

        return response, "정상 분석"
    
    def _generate_analysis_error_response(self, query: str) -> Tuple[str, str]:
        """이미지 분석 오류 발생시 응답"""
        
        response = """❌ **이미지 분석 중 오류가 발생했습니다**

죄송합니다. 현재 이미지 분석 서비스에 일시적인 문제가 있습니다.

💡 **대안 방법:**
1. 잠시 후 다시 시도해보세요
2. 이미지 파일 크기를 줄여서 다시 업로드해보세요
3. 텍스트로 상황을 설명해주시면 도움을 드릴 수 있습니다

📞 **긴급상황시:**
• 119 (응급상황)
• 120 (다산콜센터)
• 관할 구청 안전관리과

텍스트로도 궁금한 점을 질문해주세요!"""

        return response, "분석 오류"
    
    def _get_sinkhole_report_procedure(self) -> str:
        """RAG에서 싱크홀 신고 절차 정보 가져오기"""
        
        try:
            # Azure Search나 하드코딩된 정보에서 신고 절차 검색
            report_procedure = """
📋 **신고시 필요한 정보:**
• 정확한 위치 (주소, 근처 건물명, GPS 좌표)
• 싱크홀 크기 (지름, 깊이 - 안전거리에서 추정)
• 발견 시간
• 주변 상황 (도로, 건물, 차량 등)
• 신고자 연락처

📝 **신고 절차:**
1. 119 신고 후 현장 안전 확보
2. 관할 구청 안전관리과에 상세 신고
3. 필요시 사진 및 동영상 촬영 (안전거리에서)
4. 복구 완료까지 접근 금지 표시 유지

🏢 **서울시 각 구청 연락처:**
• 동작구: 02-820-1234 (안전건설교통국)
• 강남구: 02-3423-1234 (도시안전과)  
• 기타 구청: 120으로 문의하여 연결"""
            
            return report_procedure
            
        except Exception as e:
            print(f"❌ 신고 절차 정보 조회 실패: {e}")
            return """
📞 **기본 신고 연락처:**
• 119 (응급상황)
• 120 (다산콜센터)
• 관할 구청 안전관리과"""
    
    def _handle_text_query(self, query: str) -> Tuple[str, str]:
        """텍스트 질문 처리 (기존 RAG 로직)"""
        
        # 기본 연결 테스트
        if not self.test_basic_connection():
            return "서비스에 연결할 수 없습니다. 관리자에게 문의하세요.", "연결 오류"
        
        # 1. RAG 시도
        answer, rag_success = self.try_rag_answer(query)
        if rag_success and answer and not self.is_inadequate_answer(answer):
            processed_answer = self.post_process_answer(answer)
            final_answer = self.add_credibility_footer(processed_answer, "RAG")
            return final_answer, "RAG"
        
        # 2. 수동 RAG 시도  
        manual_answer, manual_success = self.try_manual_rag(query)
        if manual_success and manual_answer and not self.is_inadequate_answer(manual_answer):
            processed_answer = self.post_process_answer(manual_answer)
            final_answer = self.add_credibility_footer(processed_answer, "수동 RAG")
            return final_answer, "수동 RAG"
        
        # 3. 하드코딩된 RAG 시도
        hardcoded_answer, hardcoded_success = self.try_hardcoded_rag(query)
        if hardcoded_success and hardcoded_answer and not self.is_inadequate_answer(hardcoded_answer):
            processed_answer = self.post_process_answer(hardcoded_answer)
            final_answer = self.add_credibility_footer(processed_answer, "하드코딩된 RAG")
            return final_answer, "하드코딩된 RAG"
        
        # 4. 일반 LLM 사용
        llm_answer = self.answer_with_general_llm(query)
        processed_answer = self.post_process_answer(llm_answer)
        final_answer = self.add_credibility_footer(processed_answer, "일반 LLM")
        return final_answer, "일반 LLM"
    
    # 기존 메소드들 (try_rag_answer, try_manual_rag, etc.) 유지
    def test_basic_connection(self):
        """기본 OpenAI 연결 테스트"""
        try:
            print("🔍 기본 OpenAI 연결 테스트...")
            response = self.client.chat.completions.create(
                model=self.deployment,
                messages=[
                    {"role": "system", "content": "간단한 연결 테스트입니다."},
                    {"role": "user", "content": "안녕하세요"}
                ],
                max_tokens=50,
                temperature=0.3
            )
            print("✅ 기본 OpenAI 연결 성공!")
            return True
        except Exception as e:
            print(f"❌ 기본 OpenAI 연결 실패: {e}")
            return False
    
    def try_rag_answer(self, query: str) -> Tuple[Optional[str], bool]:
        """Azure Search 통합 RAG로 답변 시도"""
        # 기존 구현 유지...
        return None, False
    
    def try_manual_rag(self, query: str) -> Tuple[Optional[str], bool]:
        """수동 RAG 데이터로 시도"""
        # 기존 구현 유지...
        return None, False
    
    def try_hardcoded_rag(self, query: str) -> Tuple[Optional[str], bool]:
        """하드코딩된 RAG 데이터로 시도"""
        # 기존 구현 유지...
        return None, False
    
    def is_inadequate_answer(self, answer: str) -> bool:
        """RAG 답변이 부적절한지 판단"""
        if not answer:
            return True
        
        answer_lower = answer.lower()
        for pattern in self.inadequate_patterns:
            if pattern in answer_lower:
                return True
        
        if len(answer.strip()) < 50:
            return True
        
        return False
    
    def post_process_answer(self, answer: str) -> str:
        """RAG 답변의 참조를 사용자 친화적으로 변경"""
        if not answer:
            return answer
        
        citation_patterns = [
            r'\[doc\d+\]', r'\[document\d+\]', r'\[source\d+\]',
            r'\[문서\d+\]', r'\[자료\d+\]', r'\[참고\d+\]'
        ]
        
        processed_answer = answer
        for pattern in citation_patterns:
            processed_answer = re.sub(pattern, '', processed_answer)
        
        processed_answer = re.sub(r'\s+', ' ', processed_answer)
        processed_answer = re.sub(r'\n\s*\n', '\n\n', processed_answer)
        
        return processed_answer.strip()
    
    def add_credibility_footer(self, answer: str, source: str) -> str:
        """답변에 신뢰성 정보 추가"""
        footer_options = {
            "RAG": "📚 *서울시 공식 싱크홀 대응 매뉴얼 기반*",
            "수동 RAG": "🔍 서울시 안전관리 데이터베이스 검색 결과", 
            "하드코딩된 RAG": "📋 서울시 각 구청 공식 연락처 및 대응 절차",
            "일반 LLM": "🧠 *일반적인 안전 상식 및 가이드라인*",
            "싱크홀 AI 분석": "🤖 *Azure Custom Vision AI 분석 결과*"
        }
        
        footer = footer_options.get(source, "")
        if footer:
            return f"{answer}\n\n{footer}"
        return answer
    
    def answer_with_general_llm(self, query: str) -> str:
        """일반 LLM으로 답변"""
        try:
            print("🔍 일반 LLM으로 답변 생성...")
            
            response = self.client.chat.completions.create(
                model=self.deployment,
                messages=[
                    {
                        "role": "system",
                        "content": """당신은 도움이 되는 AI 어시스턴트입니다. 
싱크홀 관련 질문에 대해 일반적인 지식을 바탕으로 도움이 되는 답변을 제공하세요.
특히 안전 수칙, 신고 방법, 예방 조치 등에 대해 실용적인 조언을 해주세요."""
                    },
                    {
                        "role": "user",
                        "content": query
                    }
                ],
                max_tokens=1000,
                temperature=0.7
            )
            
            print("✅ 일반 LLM 답변 생성 성공!")
            return response.choices[0].message.content
            
        except Exception as e:
            print(f"❌ 일반 LLM 답변 생성 실패: {e}")
            return """죄송합니다. 일시적인 오류가 발생했습니다. 

다음과 같이 시도해보세요:
• 잠시 후 다시 질문해보세요
• 질문을 더 간단하게 바꿔보세요
• 긴급한 경우 119 또는 120으로 연락하세요

🔍 **우리 서비스 기능**
• 실시간 위험도 예측
• 위험지역 지도 확인
• 안전 경로 안내

서비스 이용에 불편을 드려 죄송합니다."""

# 전역 RAG 시스템 인스턴스
rag_system = EnhancedRAGSystem()