// frontend/src/pages/ReportChatbot.js - 이미지 압축 기능 추가
import React, { useState, useRef, useEffect } from 'react';
import '../styles/ReportChatbot.css';

const ReportChatbot = () => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'bot',
      content: '안녕하세요! 싱크홀 신고 도우미입니다. 어떤 도움이 필요하신가요?\n\n📸 사진을 업로드하면 AI가 싱크홀 여부를 분석해드립니다!\n💬 텍스트로도 궁금한 점을 질문해주세요!',
      timestamp: new Date()
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [isCompressing, setIsCompressing] = useState(false); // 🆕 압축 상태
  const [compressionInfo, setCompressionInfo] = useState(null); // 🆕 압축 정보
  
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const chatContainerRef = useRef(null);

  // 메시지 스크롤 자동 이동
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 🆕 이미지 압축 함수
  const compressImage = (file, maxSizeMB = 3, quality = 0.8, maxDimension = 2048) => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onerror = () => reject(new Error('이미지 로드 실패'));
      
      img.onload = () => {
        try {
          // 🔧 크기 계산 (비율 유지)
          let { width, height } = img;
          
          // 최대 해상도 제한
          if (width > height && width > maxDimension) {
            height = (height * maxDimension) / width;
            width = maxDimension;
          } else if (height > maxDimension) {
            width = (width * maxDimension) / height;
            height = maxDimension;
          }
          
          canvas.width = width;
          canvas.height = height;
          
          // 🔧 고품질 리샘플링
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);
          
          // 🔧 압축된 Blob 생성
          canvas.toBlob(
            (blob) => {
              if (blob) {
                // File 객체로 변환 (원본 파일명 유지)
                const compressedFile = new File([blob], file.name, {
                  type: 'image/jpeg',
                  lastModified: Date.now()
                });
                resolve(compressedFile);
              } else {
                reject(new Error('압축 실패'));
              }
            },
            'image/jpeg',
            quality
          );
        } catch (error) {
          reject(error);
        }
      };
      
      img.src = URL.createObjectURL(file);
    });
  };

  // 🔧 이미지 파일 선택 처리 (압축 기능 추가)
  const handleImageSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // 🔧 기본 검증
    if (!file.type.startsWith('image/')) {
      alert('❌ 이미지 파일만 업로드 가능합니다.\n\n지원 형식: JPG, PNG, GIF, BMP');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    // 🔧 최대 파일 크기 확인 (50MB)
    const maxFileSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxFileSize) {
      alert(`❌ 파일이 너무 큽니다!\n\n• 현재 크기: ${(file.size / (1024 * 1024)).toFixed(1)}MB\n• 최대 크기: 50MB\n\n📝 해결 방법:\n• 사진 해상도를 낮춰주세요\n• 다른 이미지 편집 앱으로 압축해주세요\n• 다른 사진을 선택해주세요`);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    // 🔧 압축이 필요한지 확인 (3MB 이상)
    const needsCompression = file.size > 3 * 1024 * 1024; // 3MB
    let finalFile = file;
    let compressionData = null;

    if (needsCompression) {
      try {
        setIsCompressing(true);
        console.log(`🔄 이미지 압축 시작... (원본: ${(file.size / (1024 * 1024)).toFixed(1)}MB)`);
        
        // 압축 수행
        const compressedFile = await compressImage(file, 3, 0.8, 2048);
        
        compressionData = {
          originalSize: file.size,
          compressedSize: compressedFile.size,
          compressionRatio: ((file.size - compressedFile.size) / file.size * 100).toFixed(1),
          originalSizeMB: (file.size / (1024 * 1024)).toFixed(1),
          compressedSizeMB: (compressedFile.size / (1024 * 1024)).toFixed(1)
        };
        
        console.log(`✅ 압축 완료: ${compressionData.originalSizeMB}MB → ${compressionData.compressedSizeMB}MB (${compressionData.compressionRatio}% 감소)`);
        
        finalFile = compressedFile;
        setCompressionInfo(compressionData);
        
      } catch (compressionError) {
        console.error('❌ 압축 실패:', compressionError);
        alert(`⚠️ 이미지 압축에 실패했습니다.\n\n원본 이미지를 사용합니다.\n오류: ${compressionError.message}`);
        finalFile = file;
        setCompressionInfo(null);
      } finally {
        setIsCompressing(false);
      }
    } else {
      console.log(`✅ 압축 불필요: ${(file.size / (1024 * 1024)).toFixed(1)}MB`);
      setCompressionInfo(null);
    }

    // 🔧 최종 파일 크기 재확인 (5MB)
    if (finalFile.size > 5 * 1024 * 1024) {
      alert(`❌ 압축 후에도 파일이 여전히 큽니다!\n\n• 압축 후 크기: ${(finalFile.size / (1024 * 1024)).toFixed(1)}MB\n• 허용 크기: 5MB\n\n📝 해결 방법:\n• 더 작은 해상도의 사진을 선택해주세요\n• 사진 편집 앱으로 추가 압축해주세요`);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setCompressionInfo(null);
      return;
    }

    // 🔧 파일 설정 및 미리보기
    setSelectedImage(finalFile);
    setAnalysisResult(null);
    
    // 미리보기 생성
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewImage(e.target.result);
    };
    reader.readAsDataURL(finalFile);
    
    // 자동으로 이미지 분석 수행
    performImageAnalysis(finalFile);
  };

  // 이미지 분석 수행
  const performImageAnalysis = async (imageFile) => {
    if (!imageFile) return;
    
    setIsAnalyzing(true);
    
    try {
      const formData = new FormData();
      formData.append('image', imageFile);
      
      console.log('🔍 이미지 분석 시작...', {
        fileName: imageFile.name,
        fileSize: `${(imageFile.size / (1024 * 1024)).toFixed(1)}MB`,
        fileType: imageFile.type
      });
      
      const response = await fetch('/chatbot/analyze-image', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        if (response.status === 413) {
          throw new Error('파일이 너무 큽니다. 더 작은 이미지를 선택해주세요.');
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setAnalysisResult(data.analysis_result);
        console.log('✅ 이미지 분석 완료:', data.analysis_result);
        
        // 분석 결과를 채팅에 자동으로 표시
        showAnalysisResultInChat(data.analysis_result);
      } else {
        console.error('❌ 이미지 분석 실패:', data.error);
        showAnalysisErrorInChat(data.error);
      }
      
    } catch (error) {
      console.error('❌ 이미지 분석 API 오류:', error);
      if (error.message.includes('파일이 너무 큽니다')) {
        showAnalysisErrorInChat('파일이 너무 큽니다. 이미지를 더 압축해주세요.');
      } else {
        showAnalysisErrorInChat('이미지 분석 서비스에 연결할 수 없습니다.');
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  // 분석 결과를 채팅에 표시
  const showAnalysisResultInChat = (result) => {
    let analysisMessage = '';
    let emoji = '';
    
    if (result.is_sinkhole && result.confidence >= 70) {
      emoji = '🚨';
      analysisMessage = `**싱크홀이 탐지되었습니다!** (확률: ${result.confidence_percent}%)

⚠️ **즉시 안전 조치를 취해주세요:**
• 해당 지역에서 즉시 대피하세요
• 주변 사람들에게 위험을 알려주세요
• 119에 즉시 신고하세요

📊 **분석 상세:**
• 위험도: ${result.risk_level.toUpperCase()}
• 탐지된 객체: ${result.total_detections}개
• 권장사항: ${result.recommendation}`;
    } else if (result.confidence >= 50) {
      emoji = '🤔';
      analysisMessage = `**분석 결과가 불확실합니다** (확률: ${result.confidence_percent}%)

현재 이미지에서 싱크홀 특징이 일부 감지되었지만 확실하지 않습니다.

💡 **권장사항:**
• 더 선명한 사진으로 다시 촬영해보세요
• 다양한 각도에서 추가 사진을 촬영하세요
• 의심스러운 부분이 있다면 신고를 고려하세요

📊 **분석 상세:**
• 위험도: ${result.risk_level.toUpperCase()}
• ${result.recommendation}`;
    } else {
      emoji = '✅';
      analysisMessage = `**싱크홀이 아닌 것으로 보입니다**

AI 분석 결과 싱크홀의 특징이 감지되지 않았습니다.

🔍 **하지만 다음과 같은 경우 추가 확인을 권장합니다:**
• 도로나 보도에 균열이나 침하가 보이는 경우
• 지면에서 물이 새어 나오는 경우
• 주변에서 이상한 소리가 나는 경우

다른 질문이 있으시면 언제든 말씀해주세요!`;
    }
    
    const botMessage = {
      id: Date.now(),
      type: 'bot',
      content: analysisMessage,
      source: '싱크홀 AI 분석',
      analysisData: result,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, botMessage]);
  };

  // 분석 오류를 채팅에 표시
  const showAnalysisErrorInChat = (errorMessage) => {
    const errorBotMessage = {
      id: Date.now(),
      type: 'bot',
      content: `❌ **이미지 분석 중 오류가 발생했습니다**

${errorMessage}

💡 **대안 방법:**
• 이미지 파일 크기를 줄여서 다시 시도해보세요
• 다른 형식(JPG, PNG)으로 저장해서 시도해보세요
• 텍스트로 상황을 설명해주시면 도움을 드릴 수 있습니다

📞 **긴급상황시:**
• 119 (응급상황)
• 120 (다산콜센터)`,
      source: '분석 오류',
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, errorBotMessage]);
  };

  // 이미지 선택 취소
  const handleImageCancel = () => {
    setSelectedImage(null);
    setPreviewImage(null);
    setAnalysisResult(null);
    setCompressionInfo(null); // 🆕 압축 정보 초기화
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // RAG 시스템 API 호출
  const callRAGSystem = async (query, imageFile = null) => {
    try {
      const formData = new FormData();
      formData.append('query', query);
      if (imageFile) {
        formData.append('image', imageFile);
      }

      console.log('🔄 백엔드 API 호출 중...', { query, hasImage: !!imageFile });

      const response = await fetch('/chatbot/ask', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      console.log('✅ API 응답 성공:', data);

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
    setCompressionInfo(null); // 🆕 압축 정보 초기화
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
          <h1>🕳️ 싱크홀 신고 도우미</h1>
          <p>사진 업로드시 AI가 자동으로 싱크홀을 분석해드립니다!</p>
        </div>

        <div className="chat-messages" ref={chatContainerRef}>
          {messages.map((message) => (
            <div key={message.id} className={`message ${message.type}`}>
              <div className="message-avatar">
                {message.type === 'user' ? '👤' : '🤖'}
              </div>
              <div className="message-content">
                {message.image && (
                  <div className="message-image">
                    <img src={message.image} alt="첨부 이미지" />
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
                
                {/* 이미지 분석 결과 표시 */}
                {message.analysisData && (
                  <div className="analysis-details">
                    <div className="analysis-summary">
                      <h4>🔍 AI 분석 결과</h4>
                      <div className="analysis-metrics">
                        <span className={`confidence-badge ${message.analysisData.risk_level}`}>
                          확률: {message.analysisData.confidence_percent}%
                        </span>
                        <span className={`risk-badge ${message.analysisData.risk_level}`}>
                          위험도: {message.analysisData.risk_level.toUpperCase()}
                        </span>
                      </div>
                    </div>
                    {message.analysisData.predictions && message.analysisData.predictions.length > 0 && (
                      <div className="detection-list">
                        <h5>탐지된 객체:</h5>
                        {message.analysisData.predictions.map((pred, idx) => (
                          <div key={idx} className="detection-item">
                            <span className="tag-name">{pred.tag_name}</span>
                            <span className="confidence">{pred.confidence_percent.toFixed(1)}%</span>
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
                       message.source === '오류' ? '❌ 오류' : '🤖 AI'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="message bot">
              <div className="message-avatar">🤖</div>
              <div className="message-content">
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* 빠른 질문 버튼들 */}
        {messages.length === 1 && (
          <div className="quick-questions">
            <p>자주 묻는 질문:</p>
            <div className="quick-question-buttons">
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
        )}

        {/* 이미지 미리보기 및 분석 상태 */}
        {previewImage && (
          <div className="image-preview">
            <div className="preview-container">
              <img src={previewImage} alt="업로드 예정 이미지" />
              <button className="remove-image-btn" onClick={handleImageCancel}>
                ✕
              </button>
              
              {/* 🆕 압축 진행 상태 표시 */}
              {isCompressing && (
                <div className="analysis-overlay">
                  <div className="analysis-spinner"></div>
                  <span>이미지를 압축하고 있습니다...</span>
                </div>
              )}
              
              {/* 분석 진행 상태 표시 */}
              {isAnalyzing && !isCompressing && (
                <div className="analysis-overlay">
                  <div className="analysis-spinner"></div>
                  <span>AI가 이미지를 분석하고 있습니다...</span>
                </div>
              )}
              
              {/* 🆕 압축 정보 표시 */}
              {compressionInfo && !isCompressing && !isAnalyzing && (
                <div className="compression-info">
                  <div className="compression-badge">
                    🗜️ 압축됨<br />
                    <small>{compressionInfo.originalSizeMB}MB → {compressionInfo.compressedSizeMB}MB</small>
                  </div>
                </div>
              )}
              
              {/* 분석 결과 미리보기 */}
              {analysisResult && !isAnalyzing && !isCompressing && (
                <div className="analysis-preview">
                  <div className={`analysis-badge ${analysisResult.risk_level}`}>
                    {analysisResult.is_sinkhole && analysisResult.confidence >= 70 ? 
                      '🚨 싱크홀 탐지!' : 
                      analysisResult.confidence >= 50 ? 
                      '🤔 불확실' : 
                      '✅ 정상'
                    }
                    <br />
                    <small>{analysisResult.confidence_percent.toFixed(1)}%</small>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 입력 영역 */}
        <div className="chat-input-container">
          <div className="input-row">
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
              title="이미지 첨부 (AI 자동 분석)"
              disabled={isAnalyzing || isCompressing} // 🆕 압축 중에도 비활성화
            >
              {isCompressing ? '🗜️' : isAnalyzing ? '🔍' : '📷'}
            </button>

            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="싱크홀 관련 질문을 입력하거나 사진을 첨부해주세요..."
              className="chat-input"
              rows="1"
              disabled={isLoading}
            />

            <button
              onClick={handleSendMessage}
              disabled={(!inputText.trim() && !selectedImage) || isLoading}
              className="send-btn"
            >
              {isLoading ? '⏳' : '📤'}
            </button>
          </div>
          
          <div className="input-help">
            💡 사진을 업로드하면 AI가 자동으로 싱크홀 여부를 분석합니다 (JPG, PNG, 자동 압축 지원)
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportChatbot;