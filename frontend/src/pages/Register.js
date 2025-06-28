// frontend/src/pages/Register.js - 완성된 약관동의 포함 회원가입
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-toastify';
import '../styles/Auth.css';

const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  
  const [agreements, setAgreements] = useState({
    serviceTerms: false,
    privacyPolicy: false,
    locationConsent: false,
    marketingConsent: false // 선택사항
  });
  
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [currentTermsType, setCurrentTermsType] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleAgreementChange = (e) => {
    const { name, checked } = e.target;
    setAgreements({
      ...agreements,
      [name]: checked
    });
  };

  const handleAllAgreement = (e) => {
    const { checked } = e.target;
    setAgreements({
      serviceTerms: checked,
      privacyPolicy: checked,
      locationConsent: checked,
      marketingConsent: checked
    });
  };

  const openTermsModal = (type) => {
    setCurrentTermsType(type);
    setShowTermsModal(true);
  };

  const getTermsContent = (type) => {
    switch (type) {
      case 'service':
        return {
          title: '싱크홀 위험 알림 앱 이용약관',
          content: `제1장 총칙

제1조 (목적)
본 약관은 주식회사 OOO(이하 '회사')이 제공하는 '싱크홀 위험 알림 앱' 서비스(이하 '서비스')의 이용과 관련하여 회사와 회원 간의 권리, 의무 및 책임사항, 기타 필요한 사항을 규정함을 목적으로 합니다.

제2조 (용어의 정의)
본 약관에서 사용하는 용어의 정의는 다음과 같습니다.
- '서비스'라 함은 구현되는 단말기(모바일, 태블릿 등 각종 유무선 장치를 포함)와 상관없이 회원이 이용할 수 있는 싱크홀 위험 알림 및 관련 제반 서비스를 의미합니다.
- '회원'이라 함은 서비스에 접속하여 본 약관에 따라 회사와 이용계약을 체결하고 회사가 제공하는 서비스를 이용하는 고객을 말합니다.
- '개인정보'라 함은 살아 있는 개인에 관한 정보로서 성명, 생년월일 등에 의하여 특정한 개인을 알아볼 수 있는 정보를 말합니다.

제3조 (약관의 게시와 개정)
회사는 본 약관의 내용을 회원이 쉽게 알 수 있도록 서비스 내 초기화면 또는 연결화면을 통해 게시합니다.
회사는 '약관의 규제에 관한 법률', '개인정보 보호법', '위치정보의 보호 및 이용 등에 관한 법률' 등 관련 법을 위배하지 않는 범위에서 본 약관을 개정할 수 있습니다.

제2장 서비스 이용계약
제4조 (이용계약 체결)
이용계약은 회원이 되고자 하는 자(이하 '가입신청자')가 약관의 내용에 대하여 동의를 한 다음 회원가입신청을 하고 회사가 이러한 신청에 대하여 승낙함으로써 체결됩니다.

제5장 서비스의 이용
제11조 (서비스의 제공 및 변경)
회사는 회원에게 아래와 같은 서비스를 제공합니다.
- 싱크홀 위험지역 알림 서비스
- 음성 기반 경로 설정 및 네비게이션 연동 서비스
- 만보기 서비스
- 사진 분석을 통한 싱크홀 신고 지원 서비스

제6장 책임 제한 및 손해배상
제14조 (책임 제한)
회사가 제공하는 싱크홀 위험 정보, 경로 안내 및 AI 분석을 통한 규모 측정치는 공공 데이터 및 AI 분석을 기반으로 한 참고용 정보입니다. 회사는 해당 정보의 완전한 정확성, 신뢰성, 실시간성을 보증하지 않으며, 이를 신뢰함에 따라 발생한 회원의 어떠한 손해에 대해서도 책임을 지지 않습니다.

회원은 서비스를 이용함에 있어 항상 주변 상황을 직접 확인하고 교통법규를 준수하는 등 스스로의 안전을 확보할 의무가 있습니다.`
        };
      case 'privacy':
        return {
          title: '개인정보 처리방침',
          content: `제3장 개인정보의 보호 및 관리

제6조 (개인정보의 보호 및 수집)
회사는 정보통신망법 등 관계 법령이 정하는 바에 따라 회원의 개인정보를 보호하기 위해 노력합니다. 개인정보의 보호 및 사용에 대해서는 관련 법 및 회사의 개인정보처리방침이 적용됩니다.

회사는 서비스 제공을 위해 필요한 최소한의 범위에서 다음 각 호의 개인정보를 수집하며, 수집 시 회원에게 그 목적을 고지하고 별도의 동의를 받습니다.

1. 위치정보 (GPS): 싱크홀 위험지역 실시간 알림, 안전 경로 안내, 신고 지점의 정확한 위치 특정
2. 음성정보: 음성 명령을 통한 서비스 조작 및 경로 설정 기능 제공
3. 사진정보 (회원이 직접 등록한 이미지): AI 기반 싱크홀 규모 분석, 공공기관 신고 자료 생성, AI 모델 성능 향상을 통한 분석 정확도 개선
4. 사진 메타데이터 (EXIF): 사진에 포함된 촬영 시간, 위치 정보 등 신고의 정확성을 높이기 위한 목적
5. 단말기 정보 (OS 정보, 기기 식별값 등): 서비스 안정성 확보 및 오류 개선

제7조 (개인정보의 이용 및 처리)
회사는 회원의 위치정보 및 음성정보를 회사 서버에 저장하지 않는 것을 원칙으로 하며, 서비스 제공을 위한 실시간 처리 후 즉시 파기합니다.

회사는 회원이 등록한 사진정보에 포함될 수 있는 인물, 차량 번호판 등 개인 식별 정보를 인공지능 기술을 통해 자동으로 흐림(blur) 처리하여 비식별화 조치를 취한 후 이용합니다.

제8조 (정보주체의 권리)
회원은 언제든지 등록되어 있는 자신의 개인정보를 조회하거나 수정할 수 있으며, 수집·이용·제공 등에 대한 동의 철회(가입 해지)를 요청할 수 있습니다.

회원의 권리 행사는 서비스 내 '회원탈퇴' 기능을 이용하거나, 고객센터를 통해 서면, 전자우편 등으로 하실 수 있으며, 회사는 이에 대해 지체 없이 조치하겠습니다.`
        };
      case 'location':
        return {
          title: '위치정보 이용약관',
          content: `위치정보 수집 및 이용에 관한 동의

1. 위치정보 수집 목적
- 싱크홀 위험지역 실시간 알림
- 안전 경로 안내 및 네비게이션 서비스
- 사용자 위치 기반 맞춤형 안전 정보 제공
- 신고 지점의 정확한 위치 특정

2. 수집하는 위치정보
- GPS를 통한 정확한 위치 정보
- 네트워크 기반 위치 정보
- Wi-Fi 기반 위치 정보

3. 위치정보 보유 및 이용 기간
- 서비스 제공을 위한 실시간 처리 후 즉시 파기
- 사용자가 동의를 철회하거나 서비스 탈퇴 시 즉시 삭제
- 신고 관련 위치정보는 공공 안전을 위해 최대 1년간 보관 후 삭제

4. 위치정보 제3자 제공
- 원칙적으로 위치정보를 제3자에게 제공하지 않음
- 공공기관의 요청이 있는 경우에만 법적 근거에 따라 제공 가능
- Microsoft Corporation (Azure Cloud Services)를 통한 AI 분석 처리

5. 동의 철회 권리
- 언제든지 위치정보 수집 및 이용에 대한 동의를 철회할 수 있음
- 동의 철회 시 위치 기반 서비스 이용이 제한될 수 있음
- 동의 철회는 앱 설정 또는 고객센터를 통해 가능

6. 만 14세 미만자의 법정대리인 동의
- 만 14세 미만 아동의 경우 법정대리인의 동의가 필요함
- 법정대리인은 아동의 위치정보 수집, 이용 또는 제공에 동의하거나 철회할 수 있음`
        };
      default:
        return { title: '', content: '' };
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      toast.error('비밀번호가 일치하지 않습니다.');
      return;
    }

    // 필수 약관 동의 확인
    if (!agreements.serviceTerms || !agreements.privacyPolicy || !agreements.locationConsent) {
      toast.error('필수 약관에 모두 동의해주세요.');
      return;
    }

    setLoading(true);

    try {
      await register({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        agreements: agreements
      });
      toast.success('회원가입 성공! 로그인해주세요.');
      navigate('/login');
    } catch (error) {
      toast.error('회원가입 실패: ' + (error.response?.data?.detail || '서버 오류'));
    } finally {
      setLoading(false);
    }
  };

  const isAllRequiredAgreed = agreements.serviceTerms && agreements.privacyPolicy && agreements.locationConsent;

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>회원가입</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>이름</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>
          
          <div className="form-group">
            <label>이메일</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>
          
          <div className="form-group">
            <label>비밀번호</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>
          
          <div className="form-group">
            <label>비밀번호 확인</label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
            />
          </div>

          {/* 약관 동의 섹션 */}
          <div className="terms-section">
            <h3>약관 동의</h3>
            
            <div className="agreement-item all-agreement">
              <label>
                <input
                  type="checkbox"
                  checked={isAllRequiredAgreed && agreements.marketingConsent}
                  onChange={handleAllAgreement}
                />
                <span className="checkmark"></span>
                전체 동의
              </label>
            </div>

            <div className="agreement-list">
              <div className="agreement-item required">
                <label>
                  <input
                    type="checkbox"
                    name="serviceTerms"
                    checked={agreements.serviceTerms}
                    onChange={handleAgreementChange}
                  />
                  <span className="checkmark"></span>
                  <span className="required-mark">[필수]</span> 서비스 이용약관 동의
                </label>
                <button
                  type="button"
                  className="view-terms-btn"
                  onClick={() => openTermsModal('service')}
                >
                  보기
                </button>
              </div>

              <div className="agreement-item required">
                <label>
                  <input
                    type="checkbox"
                    name="privacyPolicy"
                    checked={agreements.privacyPolicy}
                    onChange={handleAgreementChange}
                  />
                  <span className="checkmark"></span>
                  <span className="required-mark">[필수]</span> 개인정보 처리방침 동의
                </label>
                <button
                  type="button"
                  className="view-terms-btn"
                  onClick={() => openTermsModal('privacy')}
                >
                  보기
                </button>
              </div>

              <div className="agreement-item required">
                <label>
                  <input
                    type="checkbox"
                    name="locationConsent"
                    checked={agreements.locationConsent}
                    onChange={handleAgreementChange}
                  />
                  <span className="checkmark"></span>
                  <span className="required-mark">[필수]</span> 위치정보 이용약관 동의
                </label>
                <button
                  type="button"
                  className="view-terms-btn"
                  onClick={() => openTermsModal('location')}
                >
                  보기
                </button>
              </div>

              <div className="agreement-item optional">
                <label>
                  <input
                    type="checkbox"
                    name="marketingConsent"
                    checked={agreements.marketingConsent}
                    onChange={handleAgreementChange}
                  />
                  <span className="checkmark"></span>
                  <span className="optional-mark">[선택]</span> 마케팅 정보 수신 동의
                </label>
              </div>
            </div>
          </div>
          
          <button 
            type="submit" 
            disabled={loading || !isAllRequiredAgreed} 
            className="auth-btn"
          >
            {loading ? '가입 중...' : '회원가입'}
          </button>
        </form>
        
        <p className="auth-link">
          이미 계정이 있으신가요? <Link to="/login">로그인</Link>
        </p>
      </div>

      {/* 약관 모달 */}
      {showTermsModal && (
        <div className="modal-overlay" onClick={() => setShowTermsModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{getTermsContent(currentTermsType).title}</h3>
              <button
                type="button"
                className="modal-close"
                onClick={() => setShowTermsModal(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <pre>{getTermsContent(currentTermsType).content}</pre>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="modal-btn confirm"
                onClick={() => setShowTermsModal(false)}
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Register;