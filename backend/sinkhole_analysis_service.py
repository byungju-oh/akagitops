# backend/sinkhole_analysis_service.py
from azure.cognitiveservices.vision.customvision.prediction import CustomVisionPredictionClient
from msrest.authentication import ApiKeyCredentials
from PIL import Image, ImageDraw
import numpy as np
import os
import io
import base64
from typing import Tuple, Optional, Dict, Any
from dotenv import load_dotenv

load_dotenv()

class SinkholeAnalysisService:
    """Azure Custom Vision을 사용한 싱크홀 분석 서비스"""
    
    def __init__(self):
        """Azure Custom Vision 클라이언트 초기화"""
        try:
            self.prediction_endpoint = os.getenv("PREDICTION_ENDPOINT")
            self.prediction_key = os.getenv("PREDICTION_KEY") 
            self.project_id = os.getenv("PROJECT_ID")
            self.model_name = os.getenv("MODEL_NAME")
            
            # 필수 환경변수 확인
            if not all([self.prediction_endpoint, self.prediction_key, 
                       self.project_id, self.model_name]):
                print("⚠️ Azure Custom Vision 환경변수가 설정되지 않았습니다.")
                self.is_available = False
                return
                
            # Custom Vision 클라이언트 생성
            credentials = ApiKeyCredentials(in_headers={"Prediction-key": self.prediction_key})
            self.predictor = CustomVisionPredictionClient(
                endpoint=self.prediction_endpoint, 
                credentials=credentials
            )
            
            self.is_available = True
            print("✅ Azure Custom Vision 클라이언트 초기화 성공!")
            
        except Exception as e:
            print(f"❌ Azure Custom Vision 초기화 실패: {e}")
            self.is_available = False
    
    def analyze_image(self, image_data: str) -> Tuple[bool, float, Dict[str, Any]]:
        """
        Base64 이미지 데이터를 분석하여 싱크홀 여부 판단
        
        Args:
            image_data: Base64 인코딩된 이미지 데이터
            
        Returns:
            Tuple[bool, float, Dict]: (is_sinkhole, confidence, analysis_result)
        """
        if not self.is_available:
            print("❌ Azure Custom Vision 서비스를 사용할 수 없습니다.")
            return False, 0.0, {"error": "서비스 사용 불가"}
        
        try:
            # Base64 디코딩
            image_bytes = base64.b64decode(image_data)
            
            # PIL Image로 변환
            image = Image.open(io.BytesIO(image_bytes))
            
            # 이미지 크기 확인 및 조정 (필요시)
            if image.width > 4096 or image.height > 4096:
                image.thumbnail((4096, 4096), Image.Resampling.LANCZOS)
                print(f"📏 이미지 크기 조정: {image.width}x{image.height}")
            
            # 이미지를 바이트로 변환 (Custom Vision API 호출용)
            image_buffer = io.BytesIO()
            image.save(image_buffer, format='JPEG', quality=95)
            image_buffer.seek(0)
            
            # Custom Vision API 호출
            print("🔍 Azure Custom Vision으로 싱크홀 분석 중...")
            results = self.predictor.detect_image(
                self.project_id, 
                self.model_name, 
                image_buffer
            )
            
            # 결과 분석
            analysis_result = self._process_detection_results(results, image)
            
            # 싱크홀 여부 판단 (가장 높은 확률의 예측 사용)
            is_sinkhole = False
            max_confidence = 0.0
            
            if analysis_result["predictions"]:
                # 가장 높은 확률의 예측 찾기
                best_prediction = max(
                    analysis_result["predictions"], 
                    key=lambda x: x["confidence"]
                )
                max_confidence = best_prediction["confidence"]
                
                # 싱크홀 관련 태그 확인 (태그명에 따라 조정 필요)
                sinkhole_tags = ["sinkhole", "싱크홀", "sink_hole", "hole"]
                is_sinkhole = any(tag.lower() in best_prediction["tag_name"].lower() 
                                for tag in sinkhole_tags)
            
            print(f"🔍 분석 완료 - 싱크홀 여부: {is_sinkhole}, 확률: {max_confidence:.2%}")
            
            return is_sinkhole, max_confidence, analysis_result
            
        except Exception as e:
            print(f"❌ 이미지 분석 오류: {e}")
            return False, 0.0, {"error": str(e)}
    
    def _process_detection_results(self, results, image: Image.Image) -> Dict[str, Any]:
        """Custom Vision 결과를 처리하여 구조화된 데이터 반환"""
        
        predictions = []
        image_width, image_height = image.size
        
        for prediction in results.predictions:
            # 확률이 50% 이상인 예측만 포함
            if prediction.probability > 0.5:
                # 바운딩 박스 좌표 계산
                left = prediction.bounding_box.left * image_width
                top = prediction.bounding_box.top * image_height
                width = prediction.bounding_box.width * image_width
                height = prediction.bounding_box.height * image_height
                
                prediction_info = {
                    "tag_name": prediction.tag_name,
                    "confidence": prediction.probability,
                    "confidence_percent": prediction.probability * 100,
                    "bounding_box": {
                        "left": left,
                        "top": top,
                        "width": width,
                        "height": height,
                        "right": left + width,
                        "bottom": top + height
                    }
                }
                predictions.append(prediction_info)
        
        return {
            "predictions": predictions,
            "total_detections": len(predictions),
            "image_dimensions": {
                "width": image_width,
                "height": image_height
            },
            "analysis_timestamp": "2024-12-19"  # 실제로는 datetime.now()
        }
    
    def create_annotated_image(self, image_data: str, analysis_result: Dict[str, Any]) -> Optional[str]:
        """
        분석 결과로 주석이 달린 이미지 생성 (바운딩 박스 표시)
        
        Args:
            image_data: 원본 Base64 이미지 데이터
            analysis_result: 분석 결과
            
        Returns:
            Base64 인코딩된 주석 이미지 (실패시 None)
        """
        try:
            # 원본 이미지 복원
            image_bytes = base64.b64decode(image_data)
            image = Image.open(io.BytesIO(image_bytes))
            
            # 그리기 객체 생성
            draw = ImageDraw.Draw(image)
            
            # 선 굵기 계산
            line_width = max(int(image.width / 100), 2)
            color = 'red'  # 싱크홀 탐지용 빨간색
            
            # 예측 결과에 바운딩 박스 그리기
            for prediction in analysis_result.get("predictions", []):
                bbox = prediction["bounding_box"]
                
                # 바운딩 박스 좌표
                points = [
                    (bbox["left"], bbox["top"]),
                    (bbox["right"], bbox["top"]),
                    (bbox["right"], bbox["bottom"]),
                    (bbox["left"], bbox["bottom"]),
                    (bbox["left"], bbox["top"])
                ]
                
                # 바운딩 박스 그리기
                draw.line(points, fill=color, width=line_width)
                
                # 레이블 텍스트
                label = f"{prediction['tag_name']} {prediction['confidence_percent']:.1f}%"
                
                # 텍스트 배경 사각형
                text_bbox = draw.textbbox((bbox["left"], bbox["top"] - 30), label)
                draw.rectangle(text_bbox, fill=color)
                draw.text((bbox["left"], bbox["top"] - 30), label, fill='white')
            
            # 주석 이미지를 Base64로 변환
            output_buffer = io.BytesIO()
            image.save(output_buffer, format='JPEG', quality=95)
            output_buffer.seek(0)
            
            annotated_image_b64 = base64.b64encode(output_buffer.getvalue()).decode('utf-8')
            
            print("✅ 주석 이미지 생성 완료")
            return annotated_image_b64
            
        except Exception as e:
            print(f"❌ 주석 이미지 생성 실패: {e}")
            return None

# 전역 서비스 인스턴스
sinkhole_analyzer = SinkholeAnalysisService()