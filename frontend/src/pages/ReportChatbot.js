// frontend/src/pages/ReportChatbot.js
import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext'; // 로그인 상태 확인
import { toast } from 'react-toastify';
import '../styles/ReportChatbot.css';

const ReportChatbot = () => {
  const { user } = useAuth(); // 로그인 상태 확인
  const [messages, setMessages] = useState([{
    id: 1,
    type: 'bot',
    content: '안녕하세요! 싱크홀 신고 도우미입니다. \n\n궁금한 점이 있으시거나 사진을 업로드해주시면 AI가 분석해드릴게요!',
    timestamp: new Date()
  }]);
  
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [showPointsModal, setShowPointsModal] = useState(false); // 포인트 모달 상태
  const [pointsEarned, setPointsEarned] = useState(0); // 적립된 포인트
  const [analysisResult, setAnalysisResult] = useState(null);
  const [compressionInfo, setCompressionInfo] = useState(null);
  
  const chatContainerRef = useRef(null);
  const fileInputRef = useRef(null);

  // 메시지 추가 시 스크롤 자동 이동
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // 이미지 압축 함수
  const compressImage = (file, maxSizeMB = 2, quality = 0.8) => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        // 이미지 크기 조정 로직
        let { width, height } = img;
        const maxDimension = 1200;
        
        if (width > height && width > maxDimension) {
          height = (height * maxDimension) / width;
          width = maxDimension;
        } else if (height > maxDimension) {
          width = (width * maxDimension) / height;
          height = maxDimension;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // 이미지 그리기
        ctx.drawImage(img, 0, 0, width, height);
        
        // Blob으로 변환
        canvas.toBlob((blob) => {
          const originalSizeMB = (file.size / (1024 * 1024)).toFixed(2);
          const compressedSizeMB = (blob.size / (1024 * 1024)).toFixed(2);
          
          setCompressionInfo({
            original: originalSizeMB,
            compressed: compressedSizeMB,
            ratio: ((1 - blob.size / file.size) * 100).toFixed(1)
          });
          
          resolve(blob);
        }, 'image/jpeg', quality);
      };
      
      img.src = URL.createObjectURL(file);
    });
  };

  // 이미지 선택 처리
  const handleImageSelect = async (event) => {
    const file = event.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // 10MB 제한
        toast.error('이미지 크기는 10MB 이하로 업로드해주세요.');
        return;
      }

      try {
        // 이미지 압축
        const compressedBlob = await compressImage(file);
        const compressedFile = new File([compressedBlob], file.name, {
          type: 'image/jpeg',
          lastModified: Date.now()
        });

        setSelectedImage(compressedFile);
        
        const reader = new FileReader();
        reader.onload = (e) => {
          setPreviewImage(e.target.result);
        };
        reader.readAsDataURL(compressedFile);
      } catch (error) {
        console.error('이미지 압축 실패:', error);
        toast.error('이미지 처리 중 오류가 발생했습니다.');
      }
    }
  };

  // 포인트 적립 API 호출
  const claimSinkholeReportPoints = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // 토큰 확인
      if (!token) {
        toast.error('로그인이 필요합니다.');
        return;
      }
      
      console.log('🏆 포인트 적립 요청 시작...');
      
      const response = await fetch('/api/points/sinkhole-report', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('📡 포인트 API 응답 상태:', response.status);

      const data = await response.json();
      console.log('📊 포인트 API 응답 데이터:', data);
      
      if (response.ok) {
        setPointsEarned(data.points_earned);
        setShowPointsModal(true);
        toast.success(data.message);
      } else {
        if (response.status === 401) {
          toast.error('로그인이 만료되었습니다. 다시 로그인해주세요.');
        } else {
          toast.error(data.detail || '포인트 지급 실패');
        }
      }
    } catch (error) {
      console.error('포인트 적립 오류:', error);
      toast.error('포인트 적립 중 오류가 발생했습니다');
    }
  };

  // RAG 시스템 호출
  const callRAGSystem = async (query, imageFile = null) => {
    try {
      console.log('🤖 RAG API 호출 시작:', { query, hasImage: !!imageFile });

      const formData = new FormData();
      formData.append('query', query);
      
      if (imageFile) {
        formData.append('image', imageFile);
        console.log('📎 이미지 파일 첨부:', {
          name: imageFile.name,
          size: `${(imageFile.size / 1024).toFixed(1)} KB`,
          type: imageFile.type
        });
      }

      console.log('📡 API 요청 전송 중...');
      //setAnalysisResult({ status: 'analyzing', message: 'AI가 분석하고 있습니다...' });

      const response = await fetch('/chatbot/ask', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ API 응답 성공:', data);
      
      // 🔍 이미지 분석 결과 상세 로깅
      if (data.image_analysis) {
        console.log('📊 이미지 분석 결과:', data.image_analysis);
        console.log('   - confidence_percent:', data.image_analysis.confidence_percent);
        console.log('   - risk_level:', data.image_analysis.risk_level);
        console.log('   - source:', data.source);
      }

      return {
        answer: data.answer || '응답을 받을 수 없습니다.',
        source: data.source || '알 수 없음',
        imageAnalysis: data.image_analysis || null
      };

    } catch (error) {
      console.error('❌ RAG API 호출 오류:', error);
      
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        return {
          answer: '❌ 서버에 연결할 수 없습니다.\n\n• 백엔드 서버가 실행 중인지 확인해주세요 (http://localhost:8000)\n• 잠시 후 다시 시도해주세요',
          source: '연결 오류'
        };
      }
      
      return {
        answer: '죄송합니다. 현재 서비스에 문제가 발생했습니다.\n\n• 잠시 후 다시 시도해주세요\n• 문제가 지속되면 관리자에게 문의하세요',
        source: '오류'
      };
    }
  };

  // 메시지 전송
  const handleSendMessage = async () => {
    if (!inputText.trim() && !selectedImage) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: inputText.trim() || '이미지를 분석해주세요',
      image: previewImage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    // 입력 초기화
    const query = inputText.trim() || '이미지를 분석해주세요';
    const imageFile = selectedImage;
    setInputText('');
    setSelectedImage(null);
    setPreviewImage(null);
    setAnalysisResult(null);
    setCompressionInfo(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    try {
      // RAG 시스템 호출 (이미지 분석 포함)
      const response = await callRAGSystem(query, imageFile);
      
      const botMessage = {
        id: Date.now() + 1,
        type: 'bot',
        content: response.answer,
        source: response.source,
        imageAnalysis: response.imageAnalysis,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, botMessage]);

      // 🆕 로그인된 사용자이고 AI가 실제로 싱크홀로 판정한 경우에만 포인트 버튼 표시
      if (user && imageFile && response.imageAnalysis) {
        // AI 분석 결과에서 싱크홀 판정 확인 (안전한 체크)
        const analysis = response.imageAnalysis;
        const confidence = analysis.confidence_percent || 0;
        const riskLevel = analysis.risk_level || 'low';
        const source = response.source || '';
        
        // 🔍 디버깅 정보 출력
        console.log('=== 포인트 판정 디버깅 ===');
        console.log('user:', !!user);
        console.log('imageFile:', !!imageFile);
        console.log('response.imageAnalysis:', response.imageAnalysis);
        console.log('confidence:', confidence);
        console.log('riskLevel:', riskLevel);
        console.log('source:', source);
        
        const isSinkholeDetected = confidence >= 70 && source === '싱크홀 AI 분석';
        // risk_level이 없어도 높은 확률이면 싱크홀로 판정
        
        console.log('isSinkholeDetected:', isSinkholeDetected);
        console.log('confidence >= 70:', confidence >= 70);
        console.log('source === 싱크홀 AI 분석:', source === '싱크홀 AI 분석');
        console.log('=== 수정된 조건: risk_level 체크 제거 ===');
        console.log('===========================');
        
        // 실제 싱크홀로 판정된 경우에만 포인트 버튼 표시
        if (isSinkholeDetected) {
          const pointsMessage = {
            id: Date.now() + 2,
            type: 'bot',
            content: `🚨 AI가 싱크홀로 판정했습니다! (확률: ${confidence}%)\n\n🏆 신고 완료 후 포인트를 받으시려면 아래 버튼을 클릭하세요!`,
            showPointsButton: true,
            analysisData: analysis,
            timestamp: new Date()
          };
          
          setMessages(prev => [...prev, pointsMessage]);
        } else if (confidence < 70) {
          // 싱크홀이 아닌 것으로 판정된 경우
          const noPointsMessage = {
            id: Date.now() + 2,
            type: 'bot',
            content: `📋 AI 분석 결과 싱크홀 가능성이 낮습니다. (확률: ${confidence}%)\n\n포인트는 싱크홀로 확실히 판정된 경우에만 지급됩니다.`,
            timestamp: new Date()
          };
          
          setMessages(prev => [...prev, noPointsMessage]);
        }
      } else {
        // 🔍 조건 미충족 디버깅
        console.log('=== 포인트 조건 미충족 ===');
        console.log('user:', !!user);
        console.log('imageFile:', !!imageFile);
        console.log('response.imageAnalysis:', !!response.imageAnalysis);
        console.log('========================');
      }

    } catch (error) {
      const errorMessage = {
        id: Date.now() + 1,
        type: 'bot',
        content: '죄송합니다. 답변 생성 중 오류가 발생했습니다. 다시 시도해주세요.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // 엔터 키 처리
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // 미리 정의된 질문 클릭
  const handleQuickQuestion = (question) => {
    setInputText(question);
  };

  const quickQuestions = [
    "싱크홀 발견했는데 어디로 신고하나요?",
    "신고할 때 어떤 정보가 필요한가요?",
    "긴급상황 연락처 알려주세요",
    "AI 분석 정확도는 어느 정도인가요?"
  ];

  return (
    <div className="report-chatbot">
      <div className="chatbot-container">
        <div className="chatbot-header">
          <h1>
  <img 
    src="/images/hole.png" 
    alt="싱크홀 도우미" 
    className="header-icon"
  /> 
  싱크홀 신고 도우미
</h1>
          <p>
            사진 업로드시 AI가 자동으로 싱크홀을 분석해드립니다!
            
          </p>
        </div>

        <div className="chat-messages" ref={chatContainerRef}>
          {messages.map((message) => (
            <div key={message.id} className={`message ${message.type}`}>
              <div className="message-avatar">
                {message.type === 'user' ? '👤' : <img src="/images/ai.png" alt="챗봇" />}
              </div>
              <div className="message-content">
                {message.image && (
                  <div className="message-image">
                    <img src={message.image} alt="첨부 이미지" />
                    {compressionInfo && (
                      <div className="compression-info">
                        압축: {compressionInfo.original}MB → {compressionInfo.compressed}MB ({compressionInfo.ratio}% 감소)
                      </div>
                    )}
                  </div>
                )}
                <div className="message-text">
                  {message.content.split('\n').map((line, index) => (
                    <React.Fragment key={index}>
                      {line}
                      {index < message.content.split('\n').length - 1 && <br />}
                    </React.Fragment>
                  ))}
                </div>
                
                {/* 🆕 포인트 적립 버튼 (싱크홀 판정 시에만) */}
                {message.showPointsButton && user && (
                  <div className="points-action">
                    <button 
                      className="points-claim-btn sinkhole-detected"
                      onClick={claimSinkholeReportPoints}
                    >
                      🚨 싱크홀 신고 포인트 받기 (+10P)
                    </button>
                    <p className="points-note">
                      ※ AI가 싱크홀로 판정한 경우에만 포인트가 지급됩니다 (하루 1회)
                    </p>
                  </div>
                )}
                
                {/* 이미지 분석 결과 표시 */}
                {message.imageAnalysis && (
                  <div className="analysis-details">
                    <div className="analysis-summary">
                      <h4>🔍 AI 분석 결과</h4>
                      <div className="analysis-metrics">
                        <span className={`confidence-badge ${message.imageAnalysis.risk_level || 'low'}`}>
                          확률: {message.imageAnalysis.confidence_percent || 0}%
                        </span>
                        <span className={`risk-badge ${message.imageAnalysis.risk_level || 'low'}`}>
                          위험도: {(message.imageAnalysis.risk_level || 'low').toUpperCase()}
                        </span>
                      </div>
                    </div>
                    {message.imageAnalysis.predictions && message.imageAnalysis.predictions.length > 0 && (
                      <div className="detection-list">
                        <h5>탐지된 객체:</h5>
                        {message.imageAnalysis.predictions.map((pred, idx) => (
                          <div key={idx} className="detection-item">
                            <span className="tag-name">{pred.tag_name || '알 수 없음'}</span>
                            <span className="confidence">{(pred.confidence_percent || 0).toFixed(1)}%</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                
                <div className="message-info">
                  <span className="message-time">
                    {message.timestamp.toLocaleTimeString('ko-KR', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </span>
                  {message.source && (
                    <span className={`message-source ${
                      message.source === 'RAG' ? 'rag' : 
                      message.source === '싱크홀 AI 분석' ? 'ai-analysis' :
                      message.source === '분석 오류' ? 'error' :
                      'llm'
                    }`}>
                      {message.source === 'RAG' ? '📚 전문자료' : 
                       message.source === '하드코딩된 RAG' ? '📋 기본정보' :
                       message.source === '수동 RAG' ? '🔍 검색자료' :
                       message.source === '일반 LLM' ? '🧠 AI지식' :
                       message.source === '싱크홀 AI 분석' ? '🤖 AI분석' :
                       message.source === '분석 오류' ? '❌ 오류' :
                       message.source === '연결 오류' ? '⚠️ 연결오류' :
                       message.source === '오류' ? '❌ 오류' : message.source}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
          
          {isLoading && (
  <div className="message bot loading">
    <div className="message-content">
      <div className="loading-message">
        <img 
          src="/images/thinkre.png" 
          alt="AI 분석 중" 
          className="loading-chatbot-image"
        />
        
        <div className="loading-typing-indicator">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
    </div>
  </div>
)}
        </div>

        {/* 미리 정의된 질문들 */}
        <div className="quick-questions">
          <h3>💡 자주 묻는 질문</h3>
          <div className="question-buttons">
            {quickQuestions.map((question, index) => (
              <button
                key={index}
                className="quick-question-btn"
                onClick={() => handleQuickQuestion(question)}
              >
                {question}
              </button>
            ))}
          </div>
        </div>

        {/* 입력 영역 */}
        <div className="chat-input-area">
          {previewImage && (
            <div className="image-preview">
              <img src={previewImage} alt="미리보기" />
              {compressionInfo && (
                <div className="compression-info">
                  📉 압축: {compressionInfo.original}MB → {compressionInfo.compressed}MB
                </div>
              )}
              <button 
                className="remove-image-btn"
                onClick={() => {
                  setSelectedImage(null);
                  setPreviewImage(null);
                  setCompressionInfo(null);
                  if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                  }
                }}
              >
                ✕
              </button>
            </div>
          )}
          
          <div className="input-container">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageSelect}
              accept="image/*"
              style={{ display: 'none' }}
            />
            
            <button
              className="image-upload-btn"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
              title="이미지 업로드 (최대 10MB)"
            >
              📷
            </button>
            
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={selectedImage ? "이미지에 대해 질문하세요..." : "싱크홀에 대해 질문하거나 이미지를 업로드하세요..."}
              disabled={isLoading}
              className="chat-input"
              rows="2"
            />
            
            <button
              onClick={handleSendMessage}
              disabled={isLoading || (!inputText.trim() && !selectedImage)}
              className="send-btn"
              title="메시지 전송 (Enter)"
            >
              {isLoading ? '⏳' : '📤'}
            </button>
          </div>
        </div>
      </div>

      {/* 🆕 포인트 적립 성공 모달 */}
      {showPointsModal && (
        <div className="points-modal-overlay" onClick={() => setShowPointsModal(false)}>
          <div className="points-modal" onClick={(e) => e.stopPropagation()}>
            <div className="points-modal-header">
              <h2>🎉 포인트 적립 완료!</h2>
            </div>
            <div className="points-modal-content">
              <div className="points-amount">
                <span className="points-number">+{pointsEarned}</span>
                <span className="points-label">포인트</span>
              </div>
              <p>싱크홀 신고로 포인트를 받으셨습니다!</p>
              <p className="points-note">하루에 한 번만 포인트를 받을 수 있습니다.</p>
            </div>
            <div className="points-modal-actions">
              <button 
                className="close-modal-btn"
                onClick={() => setShowPointsModal(false)}
              >
                확인
              </button>
              <button 
                className="view-points-btn"
                onClick={() => {
                  setShowPointsModal(false);
                  window.location.href = '/points';
                }}
              >
                포인트 확인하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportChatbot;