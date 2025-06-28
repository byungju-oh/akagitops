// frontend/src/pages/Points.js
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-toastify';
import '../styles/Points.css';

const Points = () => {
  const { user } = useAuth();
  const [pointsData, setPointsData] = useState({
    total_points: 0,
    point_history: []
  });
  const [loading, setLoading] = useState(true);

  // 포인트 정보 조회
  const fetchPoints = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/points/my-points', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setPointsData(data);
      } else {
        toast.error('포인트 정보 조회 실패');
      }
    } catch (error) {
      console.error('포인트 조회 오류:', error);
      toast.error('포인트 정보를 불러올 수 없습니다');
    } finally {
      setLoading(false);
    }
  };

  // 싱크홀 신고 포인트 요청
  const handleSinkholeReport = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/points/sinkhole-report', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      
      if (response.ok) {
        toast.success(data.message);
        fetchPoints(); // 포인트 정보 새로고침
      } else {
        toast.error(data.detail || '포인트 지급 실패');
      }
    } catch (error) {
      console.error('싱크홀 신고 포인트 오류:', error);
      toast.error('포인트 지급 중 오류가 발생했습니다');
    }
  };

  // 산책경로 완주 포인트 요청 (테스트용)
  const handleWalkingRoute = async () => {
    try {
      const token = localStorage.getItem('token');
      // 테스트용 GPS 좌표 (서울 시청 - 광화문)
      const routeData = {
        start_latitude: 37.5666805,
        start_longitude: 126.9784147,
        destination_latitude: 37.5759,
        destination_longitude: 126.9768
      };

      const response = await fetch('/api/points/walking-route', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(routeData),
      });

      const data = await response.json();
      
      if (response.ok) {
        toast.success(data.message);
        fetchPoints(); // 포인트 정보 새로고침
      } else {
        toast.error(data.detail || '포인트 지급 실패');
      }
    } catch (error) {
      console.error('산책경로 포인트 오류:', error);
      toast.error('포인트 지급 중 오류가 발생했습니다');
    }
  };

  useEffect(() => {
    if (user) {
      fetchPoints();
    }
  }, [user]);

  // 포인트 타입별 이모지 및 설명
  const getPointTypeInfo = (pointType) => {
    switch (pointType) {
      case 'sinkhole_report':
        return { emoji: '🚨', name: '싱크홀 신고' };
      case 'walking_route':
        return { emoji: '🚶', name: '산책경로 완주' };
      default:
        return { emoji: '🏆', name: '기타' };
    }
  };

  // 날짜 포맷팅
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="points-container">
        <div className="loading">포인트 정보를 불러오는 중...</div>
      </div>
    );
  }

  return (
    <div className="points-container">
      <div className="points-header">
        <h1>🏆 내 포인트</h1>
        <div className="total-points">
          <span className="points-number">{pointsData.total_points}</span>
          <span className="points-label">포인트</span>
        </div>
      </div>

      <div className="points-actions">
        <h2>포인트 적립하기</h2>
       
        <p className="action-note">
          * 싱크홀 신고는 하루에 한 번만 포인트를 받을 수 있습니다.<br/>
          * 산책경로는 최소 0.5km 이상 완주해야 포인트를 받을 수 있습니다.
        </p>
      </div>

      <div className="points-history">
        <h2>포인트 내역</h2>
        {pointsData.point_history.length > 0 ? (
          <div className="history-list">
            {pointsData.point_history.map((history, index) => {
              const typeInfo = getPointTypeInfo(history.point_type);
              return (
                <div key={index} className="history-item">
                  <div className="history-icon">
                    {typeInfo.emoji}
                  </div>
                  <div className="history-content">
                    <div className="history-title">{typeInfo.name}</div>
                    <div className="history-description">{history.description}</div>
                    <div className="history-date">{formatDate(history.earned_at)}</div>
                  </div>
                  <div className="history-points">
                    +{history.points_earned}P
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="no-history">
            <p>아직 포인트 내역이 없습니다.</p>
            <p>위의 활동을 통해 포인트를 적립해보세요!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Points;