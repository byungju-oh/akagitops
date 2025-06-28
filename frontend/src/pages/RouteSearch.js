// frontend/src/pages/RouteSearch.js - 개선된 산책하기 GPS 체크 시스템

import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, CircleMarker } from 'react-leaflet';
import { toast } from 'react-toastify';
import axios from 'axios';
import L from 'leaflet';
import { useAuth } from '../contexts/AuthContext';
import AzureVoiceNavigation from '../components/AzureVoiceNavigation';
import '../styles/RouteSearch.css';
import '../styles/VoiceNavigation.css';

// 아이콘 설정
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const RouteSearch = () => {
  const { user } = useAuth();
  
  // 기본 경로 검색 관련 state
  const [startLocation, setStartLocation] = useState('');
  const [endLocation, setEndLocation] = useState('');
  const [startCoords, setStartCoords] = useState(null);
  const [endCoords, setEndCoords] = useState(null);
  const [route, setRoute] = useState(null);
  const [loading, setLoading] = useState(false);
  const [routeType, setRouteType] = useState('safe');
  const [activeTab, setActiveTab] = useState('recommend');

  // 검색 자동완성 관련 state
  const [startSuggestions, setStartSuggestions] = useState([]);
  const [endSuggestions, setEndSuggestions] = useState([]);
  const [showStartSuggestions, setShowStartSuggestions] = useState(false);
  const [showEndSuggestions, setShowEndSuggestions] = useState(false);
  const [showRouteDetails, setShowRouteDetails] = useState(false);
  
  // 추천 산책로 관련 state
  const [recommendedCourses, setRecommendedCourses] = useState([]);
  const [searchTimeout, setSearchTimeout] = useState(null);
  const [recommendBaseLocation, setRecommendBaseLocation] = useState('');
  const [recommendBaseCoords, setRecommendBaseCoords] = useState(null);
  const [recommendSuggestions, setRecommendSuggestions] = useState([]);
  const [showRecommendSuggestions, setShowRecommendSuggestions] = useState(false);
  
  // 산책 완주 관련 state들 (수정됨)
  const [walkingSession, setWalkingSession] = useState({
    isActive: false,
    startChecked: false,
    endChecked: false,
    selectedRoute: null,
    startTime: null,
    currentUserLocation: null // 현재 사용자 위치 추가
  });
  const [walkingPointsStatus, setWalkingPointsStatus] = useState({
    can_earn_today: true,
    message: '',
    points_available: 10
  });
  
  const mapRef = useRef(null);

  useEffect(() => {
    handleCurrentLocation(true);
    checkWalkingPointsStatus();
    return () => { if (searchTimeout) clearTimeout(searchTimeout); };
  }, []);

  useEffect(() => {
    checkWalkingPointsStatus();
  }, [user]);

  // 외부 클릭 시 자동완성 드롭다운 닫기
  useEffect(() => {
    const handleDocumentClick = (e) => {
      if (!e.target.closest('.search-input-container')) {
        setShowStartSuggestions(false);
        setShowEndSuggestions(false);
        setShowRecommendSuggestions(false);
      }
    };
    document.addEventListener('click', handleDocumentClick);
    return () => document.removeEventListener('click', handleDocumentClick);
  }, []);

  // 산책 포인트 상태 확인
  const checkWalkingPointsStatus = async () => {
    if (!user) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/points/walking-route/status', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setWalkingPointsStatus(data);
      }
    } catch (error) {
      console.error('포인트 상태 확인 오류:', error);
    }
  };

  // 음성 안내 기능 관련 함수들
  const handleVoiceRouteFound = (foundRoute, currentLoc, destCoords, destName) => {
    setRoute(foundRoute);
    setStartCoords(currentLoc);
    setEndCoords(destCoords);
    setStartLocation(`현재위치 (${currentLoc.lat.toFixed(4)}, ${currentLoc.lng.toFixed(4)})`);
    setEndLocation(destName || '음성 입력 목적지');
    
    if (mapRef.current) {
      const bounds = L.latLngBounds([
        [currentLoc.lat, currentLoc.lng],
        [destCoords.lat, destCoords.lng]
      ]);
      mapRef.current.fitBounds(bounds, { padding: [50, 50] });
    }
  };

  const handleVoiceLocationUpdate = (newLocation) => {
    setStartCoords(newLocation);
    setStartLocation(`현재위치 (${newLocation.lat.toFixed(4)}, ${newLocation.lng.toFixed(4)})`);
  };

  // 추천 산책로 가져오기
  const fetchRecommendedCourses = async (coords) => {
    if (!coords) return;
    
    setLoading(true);
    
    try {
      const response = await axios.get('/api/exercise-areas');
      const areas = response.data.areas || [];
      
      if (areas.length === 0) {
        setRecommendedCourses([]);
        return;
      }
      
      const sortedCourses = areas.map((area) => {
        if (!area.center || !area.center.lat || !area.center.lng) {
          return { ...area, distance: 999999 };
        }
        
        const distance = L.latLng(coords.lat, coords.lng).distanceTo(
          L.latLng(area.center.lat, area.center.lng)
        );
        
        return { ...area, distance: distance / 1000 };
      }).sort((a, b) => a.distance - b.distance);
      
      setRecommendedCourses(sortedCourses);
      
    } catch (error) {
      toast.error("추천 산책로를 불러오는 데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // 현재 위치 가져오기
  const handleCurrentLocation = (autoFetchCourses = false) => {
    if (navigator.geolocation) {
      setLoading(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords = { lat: position.coords.latitude, lng: position.coords.longitude };
          setStartCoords(coords);
          setStartLocation(`현재위치 (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)})`);
          
          // 산책로 추천 탭용 기준 위치도 설정
          setRecommendBaseCoords(coords);
          setRecommendBaseLocation(`현재위치 (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)})`);
          
          setLoading(false);
          toast.success('현재 위치를 가져왔습니다.');
          if (autoFetchCourses) {
            fetchRecommendedCourses(coords);
          }
        },
        () => { setLoading(false); toast.error('위치 정보를 가져올 수 없습니다.'); },
        { timeout: 10000, enableHighAccuracy: true }
      );
    } else {
      toast.error('이 브라우저는 위치 서비스를 지원하지 않습니다.');
    }
  };

  // 산책로 추천용 현재위치 가져오기
  const handleRecommendCurrentLocation = () => {
    if (navigator.geolocation) {
      setLoading(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords = { lat: position.coords.latitude, lng: position.coords.longitude };
          setRecommendBaseCoords(coords);
          setRecommendBaseLocation(`현재위치 (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)})`);
          setLoading(false);
          toast.success('현재 위치를 가져왔습니다.');
          fetchRecommendedCourses(coords);
        },
        () => { setLoading(false); toast.error('위치 정보를 가져올 수 없습니다.'); },
        { timeout: 10000, enableHighAccuracy: true }
      );
    } else {
      toast.error('이 브라우저는 위치 서비스를 지원하지 않습니다.');
    }
  };

  // 장소 검색 함수
  const searchPlaces = async (query, isRecommendSearch = false) => {
    if (!query.trim()) return [];
    
    try {
      const response = await axios.get(`/search-location-combined?query=${encodeURIComponent(query)}`);
      const suggestions = response.data.results || response.data.places || [];
      
      if (isRecommendSearch) {
        setRecommendSuggestions(suggestions);
        setShowRecommendSuggestions(true);
        return suggestions;
      } else {
        return suggestions;
      }
    } catch (error) {
      console.error('장소 검색 오류:', error);
      // 로컬 더미 데이터로 폴백
      const localResults = getLocalSearchResults(query);
      if (isRecommendSearch) {
        setRecommendSuggestions(localResults);
        setShowRecommendSuggestions(true);
      }
      return localResults;
    }
  };

  // 로컬 더미 검색 결과 (API 실패 시 백업)
  const getLocalSearchResults = (query) => {
    const localPlaces = [
      { place_name: "강남역", address_name: "서울 강남구 역삼동", x: "127.0276", y: "37.4979" },
      { place_name: "홍대입구역", address_name: "서울 마포구 동교동", x: "126.9240", y: "37.5574" },
      { place_name: "명동", address_name: "서울 중구 명동", x: "126.9826", y: "37.5636" },
      { place_name: "잠실역", address_name: "서울 송파구 잠실동", x: "127.1000", y: "37.5134" },
      { place_name: "종로3가", address_name: "서울 종로구 종로3가", x: "126.9925", y: "37.5703" },
      { place_name: "이태원", address_name: "서울 용산구 이태원동", x: "126.9947", y: "37.5347" },
      { place_name: "신촌", address_name: "서울 서대문구 신촌동", x: "126.9364", y: "37.5558" },
      { place_name: "여의도", address_name: "서울 영등포구 여의도동", x: "126.9245", y: "37.5219" },
      { place_name: "서울시청", address_name: "서울 중구 태평로1가", x: "126.9780", y: "37.5665" },
      { place_name: "동대문", address_name: "서울 중구 동대문로", x: "127.0099", y: "37.5711" },
    ];
    
    return localPlaces.filter(place => 
      place.place_name.toLowerCase().includes(query.toLowerCase()) ||
      place.address_name.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 5);
  };

  // 검색 입력 핸들러들
  const handleStartLocationChange = async (e) => {
    const value = e.target.value;
    setStartLocation(value);
    
    if (searchTimeout) clearTimeout(searchTimeout);
    
    if (value.trim()) {
      setSearchTimeout(setTimeout(async () => {
        const suggestions = await searchPlaces(value);
        setStartSuggestions(suggestions);
        setShowStartSuggestions(true);
        setShowEndSuggestions(false);
        setShowRecommendSuggestions(false);
      }, 300));
    } else {
      setShowStartSuggestions(false);
    }
  };

  const handleEndLocationChange = async (e) => {
    const value = e.target.value;
    setEndLocation(value);
    
    if (searchTimeout) clearTimeout(searchTimeout);
    
    if (value.trim()) {
      setSearchTimeout(setTimeout(async () => {
        const suggestions = await searchPlaces(value);
        setEndSuggestions(suggestions);
        setShowEndSuggestions(true);
        setShowStartSuggestions(false);
        setShowRecommendSuggestions(false);
      }, 300));
    } else {
      setShowEndSuggestions(false);
    }
  };

  const handleRecommendLocationChange = async (e) => {
    const value = e.target.value;
    setRecommendBaseLocation(value);
    
    if (searchTimeout) clearTimeout(searchTimeout);
    
    if (value.trim()) {
      setSearchTimeout(setTimeout(async () => {
        await searchPlaces(value, true);
        setShowStartSuggestions(false);
        setShowEndSuggestions(false);
      }, 300));
    } else {
      setShowRecommendSuggestions(false);
    }
  };

  // 검색 결과 선택 핸들러들
  const selectStartSuggestion = (suggestion) => {
    setStartLocation(suggestion.place_name);
    setStartCoords({ lat: parseFloat(suggestion.y), lng: parseFloat(suggestion.x) });
    setShowStartSuggestions(false);
    toast.success(`출발지: ${suggestion.place_name}`);
  };

  const selectEndSuggestion = (suggestion) => {
    setEndLocation(suggestion.place_name);
    setEndCoords({ lat: parseFloat(suggestion.y), lng: parseFloat(suggestion.x) });
    setShowEndSuggestions(false);
    toast.success(`도착지: ${suggestion.place_name}`);
  };

  const selectRecommendSuggestion = (suggestion) => {
    setRecommendBaseLocation(suggestion.place_name);
    const coords = { lat: parseFloat(suggestion.y), lng: parseFloat(suggestion.x) };
    setRecommendBaseCoords(coords);
    setShowRecommendSuggestions(false);
    toast.success(`기준 위치: ${suggestion.place_name}`);
    fetchRecommendedCourses(coords);
  };

  // 경로 검색
  const handleSearch = async () => {
    if (!startCoords || !endCoords) {
      toast.error('출발지와 도착지를 모두 선택해주세요.');
      return;
    }

    setLoading(true);
    try {
      const endpoint = routeType === 'safe' ? '/safe-walking-route' : '/walking-route';
      const response = await axios.post(endpoint, {
        start_latitude: startCoords.lat,
        start_longitude: startCoords.lng,
        end_latitude: endCoords.lat,
        end_longitude: endCoords.lng
      });

      setRoute(response.data);
      toast.success('경로를 찾았습니다!');

      if (mapRef.current) {
        const bounds = L.latLngBounds([
          [startCoords.lat, startCoords.lng],
          [endCoords.lat, endCoords.lng]
        ]);
        mapRef.current.fitBounds(bounds, { padding: [50, 50] });
      }
    } catch (error) {
      console.error('경로 검색 오류:', error);
      toast.error('경로를 찾을 수 없습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 출발지/도착지 위치 바꾸기
  const swapLocations = () => {
    setStartLocation(endLocation);
    setEndLocation(startLocation);
    setStartCoords(endCoords);
    setEndCoords(startCoords);
  };

  // 경로 타입별 색상
  const getRouteColor = (type) => {
    switch(type) {
      case 'safe': return '#4CAF50';
      case 'fast': return '#2196F3';
      default: return '#FF5722';
    }
  };

  // 거리 포맷팅
  const formatDistance = (km) => {
    if (km < 1) return `${Math.round(km * 1000)}m`;
    return `${km.toFixed(1)}km`;
  };

  // 시간 포맷팅
  const formatTime = (minutes) => {
    if (minutes < 60) return `${Math.round(minutes)}분`;
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}시간 ${mins}분`;
  };

  // ==================== 수정된 산책 완주 포인트 관련 함수들 ====================

  // 산책 시작 버튼 클릭 (수정됨 - 로그인 없어도 경로 안내 가능)
  const handleStartWalking = async (course) => {
    // 로그인하지 않아도 산책 경로 안내는 가능
    if (user && !walkingPointsStatus.can_earn_today) {
      toast.info(walkingPointsStatus.message);
      return;
    }

    // 현재 위치 가져오기
    if (navigator.geolocation) {
      setLoading(true);
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const currentLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };

          // 경로 생성 (현재 위치 -> 추천 산책지)
          const destinationCoords = { lat: course.center.lat, lng: course.center.lng };
          
          try {
            const response = await axios.post('/safe-walking-route', {
              start_latitude: currentLocation.lat,
              start_longitude: currentLocation.lng,
              end_latitude: destinationCoords.lat,
              end_longitude: destinationCoords.lng
            });

            // 상태 설정
            setRoute(response.data);
            setStartCoords(currentLocation);
            setEndCoords(destinationCoords);
            setStartLocation(`현재위치 (${currentLocation.lat.toFixed(4)}, ${currentLocation.lng.toFixed(4)})`);
            setEndLocation(course.name);
            
            // 산책 세션 시작
            setWalkingSession({
              isActive: true,
              startChecked: false,
              endChecked: false,
              selectedRoute: course,
              startTime: new Date(),
              currentUserLocation: currentLocation
            });

            // 지도를 경로에 맞게 조정
            if (mapRef.current) {
              const bounds = L.latLngBounds([
                [currentLocation.lat, currentLocation.lng],
                [destinationCoords.lat, destinationCoords.lng]
              ]);
              mapRef.current.fitBounds(bounds, { padding: [50, 50] });
            }

            toast.success(`${course.name} 산책을 시작합니다! ${user ? 'GPS 체크로 포인트를 받으려면 ' : ''}출발지에서 GPS 체크를 해주세요.`);
            
          } catch (error) {
            console.error('경로 생성 오류:', error);
            toast.error('경로 생성에 실패했습니다.');
          }
          
          setLoading(false);
        },
        (error) => {
          setLoading(false);
          toast.error('현재 위치를 가져올 수 없습니다.');
        },
        { timeout: 10000, enableHighAccuracy: true }
      );
    } else {
      toast.error('이 브라우저는 위치 서비스를 지원하지 않습니다.');
    }
  };

  // GPS 체크 (수정됨 - 로그인 없어도 체크 가능, 포인트만 차이)
  const handleGPSCheck = (isStart = true) => {
    if (!walkingSession.isActive) {
      toast.error('먼저 산책을 시작해주세요.');
      return;
    }
    
    if (navigator.geolocation) {
      setLoading(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const currentPos = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          
          // 위치 정확도 체크
          const targetPos = isStart ? startCoords : endCoords;
          const distance = calculateDistance(currentPos.lat, currentPos.lng, targetPos.lat, targetPos.lng);
          
          // 허용 거리를 100m로 설정
          const allowedDistance = 0.1; // km
          
          if (distance > allowedDistance) {
            toast.error(`${isStart ? '출발지' : '도착지'}에서 너무 멀리 떨어져 있습니다. (${(distance * 1000).toFixed(0)}m 떨어짐, 100m 이내에서 체크해주세요)`);
            setLoading(false);
            return;
          }
          
          if (isStart && !walkingSession.startChecked) {
            setWalkingSession(prev => ({ 
              ...prev, 
              startChecked: true,
              currentUserLocation: currentPos 
            }));
            toast.success('🚩 출발지 GPS 체크 완료! 이제 목적지로 이동하세요.');
          } else if (!isStart && walkingSession.startChecked && !walkingSession.endChecked) {
            setWalkingSession(prev => ({ 
              ...prev, 
              endChecked: true,
              currentUserLocation: currentPos 
            }));
            if (user) {
              toast.success('🎯 도착지 GPS 체크 완료! 산책 완주를 확인 중...');
              handleWalkingComplete(currentPos);
            } else {
              toast.success('🎯 도착지 GPS 체크 완료! 산책을 완주하셨습니다! 🎉 (로그인하시면 포인트를 받을 수 있습니다)');
              // 로그인하지 않은 사용자는 포인트 없이 세션만 종료
              setTimeout(() => {
                setWalkingSession({
                  isActive: false,
                  startChecked: false,
                  endChecked: false,
                  selectedRoute: null,
                  startTime: null,
                  currentUserLocation: null
                });
                setRoute(null);
                setStartCoords(null);
                setEndCoords(null);
                setStartLocation('');
                setEndLocation('');
              }, 2000);
            }
          } else if (!walkingSession.startChecked) {
            toast.error('먼저 출발지에서 GPS 체크를 해주세요.');
          } else if (walkingSession.endChecked) {
            toast.info('이미 완주하셨습니다!');
          }
          
          setLoading(false);
        },
        (error) => {
          setLoading(false);
          toast.error('GPS 위치를 가져올 수 없습니다.');
        },
        { timeout: 10000, enableHighAccuracy: true }
      );
    } else {
      toast.error('이 브라우저는 위치 서비스를 지원하지 않습니다.');
    }
  };

  // 거리 계산 함수
  const calculateDistance = (lat1, lng1, lat2, lng2) => {
    const R = 6371; // 지구 반지름 (km)
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // 산책 완주 처리 (수정됨)
  const handleWalkingComplete = async (finalPosition = null) => {
    try {
      const token = localStorage.getItem('token');
      const routeData = {
        start_latitude: startCoords.lat,
        start_longitude: startCoords.lng,
        destination_latitude: endCoords.lat,
        destination_longitude: endCoords.lng,
        route_name: walkingSession.selectedRoute?.name || '추천 산책로'
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
        toast.success(`🎉 ${data.message} 🏆 +${data.points_earned}P`);
        
        // 산책 세션 종료
        setWalkingSession({
          isActive: false,
          startChecked: false,
          endChecked: false,
          selectedRoute: null,
          startTime: null,
          currentUserLocation: null
        });
        
        // 경로 초기화
        setRoute(null);
        setStartCoords(null);
        setEndCoords(null);
        setStartLocation('');
        setEndLocation('');
        
        // 포인트 상태 새로고침
        checkWalkingPointsStatus();
        
      } else {
        toast.error(data.detail || '포인트 지급 실패');
      }
    } catch (error) {
      console.error('산책 완주 처리 오류:', error);
      toast.error('산책 완주 처리 중 오류가 발생했습니다.');
    }
  };

  // 산책 중단
  const handleCancelWalking = () => {
    setWalkingSession({
      isActive: false,
      startChecked: false,
      endChecked: false,
      selectedRoute: null,
      startTime: null,
      currentUserLocation: null
    });
    
    // 경로 정보도 초기화
    setRoute(null);
    setStartCoords(null);
    setEndCoords(null);
    setStartLocation('');
    setEndLocation('');
    
    toast.info('산책이 중단되었습니다.');
  };

  // ==================== UI 컴포넌트들 ====================

  // 산책 상태 표시 컴포넌트
  const WalkingStatusBar = () => {
    if (!walkingSession.isActive) return null;
    
    return (
      <div className="walking-status-bar">
        <div className="walking-info">
          <strong>🚶‍♂️ {walkingSession.selectedRoute?.name} 산책 중</strong>
          <div className="walking-progress">
            <span className={walkingSession.startChecked ? 'completed' : 'pending'}>
              {walkingSession.startChecked ? '✅' : '⏳'} 출발지 체크
            </span>
            <span className={walkingSession.endChecked ? 'completed' : 'pending'}>
              {walkingSession.endChecked ? '✅' : '⏳'} 도착지 체크
            </span>
          </div>
          <div className="walking-progress-bar">
            <div 
              className="walking-progress-fill" 
              style={{ 
                width: `${walkingSession.startChecked ? (walkingSession.endChecked ? 100 : 50) : 0}%` 
              }}
            />
          </div>
        </div>
        <button onClick={handleCancelWalking} className="cancel-btn">
          중단
        </button>
      </div>
    );
  };

  // GPS 체크 버튼들
  const GPSCheckButtons = () => {
    if (!walkingSession.isActive) return null;
    
    return (
      <div className="gps-check-buttons">
        <button
          onClick={() => handleGPSCheck(true)}
          disabled={walkingSession.startChecked || loading}
          className={`gps-btn ${walkingSession.startChecked ? 'completed' : 'active'}`}
        >
          {loading ? (
            <span className="walking-loading"></span>
          ) : walkingSession.startChecked ? (
            '✅ 출발지 완료'
          ) : (
            '📍 출발지 체크'
          )}
        </button>
        
        <button
          onClick={() => handleGPSCheck(false)}
          disabled={!walkingSession.startChecked || walkingSession.endChecked || loading}
          className={`gps-btn ${walkingSession.endChecked ? 'completed' : walkingSession.startChecked ? 'active' : 'disabled'}`}
        >
          {loading ? (
            <span className="walking-loading"></span>
          ) : walkingSession.endChecked ? (
            '✅ 도착지 완료'
          ) : (
            '🎯 도착지 체크'
          )}
        </button>
      </div>
    );
  };

  // 추천 코스 아이템 컴포넌트 (수정됨 - 로그인 없어도 산책 시작 가능)
  const RecommendedCourseItem = ({ course, index }) => {
    return (
      <div 
        key={index} 
        className={`course-item ${walkingSession.isActive && walkingSession.selectedRoute?.id !== course.id ? 'disabled' : ''} ${walkingSession.selectedRoute?.id === course.id ? 'active-walk' : ''}`}
      >
        <h4>{course.name}</h4>
        <p className="distance-info">
          📍 <span className="distance-info">{course.distance?.toFixed(1)}km 거리</span>
        </p>
        <p>{course.description}</p>
        
        {/* 산책 시작 버튼 - 로그인 상태에 관계없이 사용 가능 */}
        <div className="walking-actions">
          {/* 로그인한 사용자의 경우 */}
          {user && (
            <>
              {walkingPointsStatus.can_earn_today ? (
                <button
                  onClick={() => handleStartWalking(course)}
                  disabled={walkingSession.isActive || loading}
                  className="start-walking-btn"
                >
                  {loading ? (
                    <span className="walking-loading"></span>
                  ) : walkingSession.isActive ? 
                    (walkingSession.selectedRoute?.id === course.id ? '🚶‍♂️ 진행 중...' : '다른 산책 진행 중') : 
                    '🚶‍♂️ 산책 시작 (10P)'
                  }
                </button>
              ) : (
                <>
                  <button
                    onClick={() => handleStartWalking(course)}
                    disabled={walkingSession.isActive || loading}
                    className="start-walking-btn"
                  >
                    {loading ? (
                      <span className="walking-loading"></span>
                    ) : walkingSession.isActive ? 
                      (walkingSession.selectedRoute?.id === course.id ? '🚶‍♂️ 진행 중...' : '다른 산책 진행 중') : 
                      '🚶‍♂️ 산책 시작'
                    }
                  </button>
                  <div className="points-message warning">
                    {walkingPointsStatus.message}
                  </div>
                </>
              )}
            </>
          )}
          
          {/* 로그인하지 않은 사용자의 경우 */}
          {!user && (
            <>
              <button
                onClick={() => handleStartWalking(course)}
                disabled={walkingSession.isActive || loading}
                className="start-walking-btn guest-mode"
              >
                {loading ? (
                  <span className="walking-loading"></span>
                ) : walkingSession.isActive ? 
                  (walkingSession.selectedRoute?.id === course.id ? '🚶‍♂️ 진행 중...' : '다른 산책 진행 중') : 
                  '🚶‍♂️ 산책 시작'
                }
              </button>
              <div className="points-message info">
                로그인하면 산책 완주 시 포인트를 받을 수 있습니다!
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  // 검색 결과 드롭다운 컴포넌트
  const SuggestionDropdown = ({ suggestions, show, onSelect, type }) => {
    if (!show || !suggestions || suggestions.length === 0) return null;

    return (
      <div className="suggestion-dropdown">
        {suggestions.map((suggestion, index) => (
          <div
            key={`${type}-${index}`}
            className="suggestion-item"
            onClick={() => {
              onSelect(suggestion);
              // 드롭다운 즉시 닫기
              setShowStartSuggestions(false);
              setShowEndSuggestions(false);
              setShowRecommendSuggestions(false);
            }}
          >
            <div className="place-name">{suggestion.place_name}</div>
            <div className="place-address">{suggestion.address_name}</div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="route-search">
      {/* 산책 상태 바와 GPS 체크 버튼들 */}
      <WalkingStatusBar />
      <GPSCheckButtons />

      <div className="search-panel">
        <h2>🗺️ 경로 안내</h2>

        {/* 탭 선택 */}
        <div className="search-tabs">
          <button 
            className={`tab-btn ${activeTab === 'recommend' ? 'active' : ''}`}
            onClick={() => setActiveTab('recommend')}
          >
            🚶‍♂️ 산책로 추천
          </button>
          <button 
            className={`tab-btn ${activeTab === 'route' ? 'active' : ''}`}
            onClick={() => setActiveTab('route')}
          >
            🎯 경로 검색
          </button>
        </div>

        {/* 탭 내용 */}
        <div className="tab-content">
          {/* 산책로 추천 탭 */}
          {activeTab === 'recommend' && (
            <div>
              {/* 기준 위치 선택 */}
              <div className="recommend-location-section">
                <h3>📍 기준 위치</h3>
                <div className="search-input-container">
                  <input
                    type="text"
                    value={recommendBaseLocation}
                    onChange={handleRecommendLocationChange}
                    placeholder="기준이 될 위치를 입력하세요"
                    className="location-input"
                    disabled={walkingSession.isActive}
                  />
                  <SuggestionDropdown
                    suggestions={recommendSuggestions}
                    show={showRecommendSuggestions && !walkingSession.isActive}
                    onSelect={selectRecommendSuggestion}
                    type="recommend"
                  />
                </div>
                <button 
                  onClick={handleRecommendCurrentLocation}
                  disabled={loading || walkingSession.isActive}
                  className="current-location-btn"
                >
                  {loading ? (
                    <span className="walking-loading"></span>
                  ) : (
                    '📍 현재 위치'
                  )}
                </button>
              </div>

              {/* 추천 산책로 목록 */}
              <div className="recommended-section">
                <h3>🏃‍♂️ 추천 산책로</h3>
                {loading ? (
                  <div className="loading">추천 산책로를 불러오는 중...</div>
                ) : recommendedCourses.length > 0 ? (
                  <div className="recommended-courses">
                    {recommendedCourses.map((course, index) => (
                      <RecommendedCourseItem key={index} course={course} index={index} />
                    ))}
                  </div>
                ) : (
                  <div className="no-courses">
                    <p>기준 위치를 선택하면 주변 산책로를 추천해드립니다.</p>
                  </div>
                )}
              </div>

              {/* 오늘의 포인트 상태 - 로그인한 사용자만 표시 */}
              {user && (
                <div className="points-status-card">
                  <h4>🏆 오늘의 포인트</h4>
                  {walkingPointsStatus.can_earn_today ? (
                    <div className="points-available">
                      <span className="points-text">산책 완주 시 +{walkingPointsStatus.points_available}P</span>
                      <span className="status-badge available">획득 가능</span>
                    </div>
                  ) : (
                    <div className="points-unavailable">
                      <span className="points-text">내일 다시 도전하세요!</span>
                      <span className="status-badge completed">완료</span>
                    </div>
                  )}
                </div>
              )}

              {/* 게스트 사용자 안내 */}
              {!user && (
                <div className="guest-info-card">
                  <h4>🎯 게스트 모드</h4>
                  <p>경로 안내와 산책 기능을 자유롭게 이용하실 수 있습니다!</p>
                  <p>로그인하시면 포인트 적립과 기록 저장이 가능합니다.</p>
                </div>
              )}

              {/* 산책 중일 때 안내 메시지 */}
              {walkingSession.isActive && (
                <div className="walking-guide-card">
                  <h4>🗺️ 산책 안내</h4>
                  <div className="guide-steps">
                    <div className={`guide-step ${walkingSession.startChecked ? 'completed' : 'current'}`}>
                      <span className="step-number">1</span>
                      <span className="step-text">출발지에서 GPS 체크</span>
                      {walkingSession.startChecked && <span className="step-check">✅</span>}
                    </div>
                    <div className={`guide-step ${walkingSession.startChecked && !walkingSession.endChecked ? 'current' : walkingSession.endChecked ? 'completed' : 'pending'}`}>
                      <span className="step-number">2</span>
                      <span className="step-text">목적지로 이동</span>
                      {walkingSession.endChecked && <span className="step-check">✅</span>}
                    </div>
                    <div className={`guide-step ${walkingSession.endChecked ? 'completed' : 'pending'}`}>
                      <span className="step-number">3</span>
                      <span className="step-text">도착지에서 GPS 체크</span>
                      {walkingSession.endChecked && <span className="step-check">✅</span>}
                    </div>
                  </div>
                  {route && (
                    <div className="current-route-info">
                      <p><strong>거리:</strong> {formatDistance(route.distance)}</p>
                      <p><strong>예상시간:</strong> {formatTime(route.estimated_time)}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 경로 검색 탭 */}
          {activeTab === 'route' && (
            <div>
              {/* 산책 중일 때는 경로 검색 비활성화 */}
              {walkingSession.isActive && (
                <div className="walking-mode-notice">
                  <h3>🚶‍♂️ 산책 진행 중</h3>
                  <p>현재 {walkingSession.selectedRoute?.name} 산책이 진행 중입니다.</p>
                  <p>새로운 경로 검색은 산책 완료 후 이용 가능합니다.</p>
                </div>
              )}

              {/* 경로 타입 선택 */}
              <div className="route-type-selector">
                <h3>🛡️ 경로 타입</h3>
                <label>
                  <input
                    type="radio"
                    name="routeType"
                    value="safe"
                    checked={routeType === 'safe'}
                    onChange={(e) => setRouteType(e.target.value)}
                    disabled={walkingSession.isActive}
                  />
                  안전 경로 (위험지역 우회)
                </label>
                <label>
                  <input
                    type="radio"
                    name="routeType"
                    value="normal"
                    checked={routeType === 'normal'}
                    onChange={(e) => setRouteType(e.target.value)}
                    disabled={walkingSession.isActive}
                  />
                  일반 경로 (최단거리)
                </label>
              </div>

              {/* 출발지 입력 */}
              <div className="search-input-container">
                <label>🚩 출발지</label>
                <input
                  type="text"
                  value={startLocation}
                  onChange={handleStartLocationChange}
                  placeholder="출발지를 입력하세요"
                  className="location-input"
                  disabled={walkingSession.isActive}
                />
                <SuggestionDropdown
                  suggestions={startSuggestions}
                  show={showStartSuggestions && !walkingSession.isActive}
                  onSelect={selectStartSuggestion}
                  type="start"
                />
              </div>

              {/* 위치 바꾸기 버튼 */}
              <div className="swap-container">
                <button 
                  onClick={swapLocations}
                  className="swap-btn"
                  disabled={!startLocation || !endLocation || walkingSession.isActive}
                >
                  🔄
                </button>
              </div>

              {/* 도착지 입력 */}
              <div className="search-input-container">
                <label>🎯 도착지</label>
                <input
                  type="text"
                  value={endLocation}
                  onChange={handleEndLocationChange}
                  placeholder="도착지를 입력하세요"
                  className="location-input"
                  disabled={walkingSession.isActive}
                />
                <SuggestionDropdown
                  suggestions={endSuggestions}
                  show={showEndSuggestions && !walkingSession.isActive}
                  onSelect={selectEndSuggestion}
                  type="end"
                />
              </div>

              {/* 현재 위치 버튼 */}
              <button 
                onClick={() => handleCurrentLocation(false)}
                disabled={loading || walkingSession.isActive}
                className="current-location-btn"
              >
                {loading ? (
                  <span className="walking-loading"></span>
                ) : (
                  '📍 현재 위치를 출발지로'
                )}
              </button>

              {/* 검색 버튼 */}
              <button 
                onClick={handleSearch}
                disabled={loading || !startCoords || !endCoords || walkingSession.isActive}
                className="search-btn"
              >
                {loading ? (
                  <span className="walking-loading"></span>
                ) : null}
                🔍 경로 검색
              </button>

              {/* 음성 네비게이션 */}
              {!walkingSession.isActive && (
                <div className="voice-navigation-section">
                  <h3>🎤 음성 안내</h3>
                  <p className="voice-description">목적지를 음성으로 말하면 자동으로 경로를 찾아드립니다.</p>
                  <AzureVoiceNavigation 
                    onRouteFound={handleVoiceRouteFound}
                    onLocationUpdate={handleVoiceLocationUpdate}
                  />
                </div>
              )}

              {/* 경로 정보 */}
              {route && (
                <div className="route-info">
                  <h3>📋 경로 정보</h3>
                  <div className="route-summary">
                    <div className="route-stat">
                      <span className="stat-label">거리</span>
                      <span className="stat-value">{formatDistance(route.distance)}</span>
                    </div>
                    <div className="route-stat">
                      <span className="stat-label">예상시간</span>
                      <span className="stat-value">{formatTime(route.estimated_time)}</span>
                    </div>
                  </div>

                  <div className="route-message">
                    <p>{route.message}</p>
                  </div>

                  {/* 우회한 위험지역 표시 */}
                  {route.avoided_zones && route.avoided_zones.length > 0 && (
                    <div className="avoided-zones">
                      <h4>⚠️ 우회한 위험지역</h4>
                      <ul>
                        {route.avoided_zones.map((zone, index) => (
                          <li key={index} className="zone-item">
                            <span className="zone-name">{zone.name}</span>
                            <span className="zone-risk">위험도 {(zone.risk * 100).toFixed(1)}%</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* 상세 경로 안내 */}
                  {route.steps && route.steps.length > 0 && (
                    <div className="route-details-toggle">
                      <button 
                        onClick={() => setShowRouteDetails(!showRouteDetails)}
                        className="details-toggle-btn"
                      >
                        {showRouteDetails ? '🔼' : '🔽'} 상세 안내
                      </button>
                      {showRouteDetails && (
                        <div className="route-steps">
                          <ol>
                            {route.steps.map((step, i) => (
                              <li key={i}>
                                {step.instruction} ({formatDistance(step.distance / 1000)})
                              </li>
                            ))}
                          </ol>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 지도 컨테이너 */}
      <div className="map-container">
        <MapContainer 
          center={startCoords || recommendBaseCoords || [37.5665, 126.9780]} 
          zoom={13} 
          style={{ height: '100%', width: '100%' }} 
          ref={mapRef}
        >
          <TileLayer 
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" 
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' 
          />
          
          {/* 출발지 마커 */}
          {startCoords && (
            <Marker position={[startCoords.lat, startCoords.lng]}>
              <Popup>
                🚩 출발지
                {walkingSession.isActive && !walkingSession.startChecked && (
                  <div style={{marginTop: '5px'}}>
                    <small>여기서 GPS 체크를 해주세요!</small>
                  </div>
                )}
              </Popup>
            </Marker>
          )}
          
          {/* 도착지 마커 */}
          {endCoords && (
            <Marker position={[endCoords.lat, endCoords.lng]}>
              <Popup>
                🎯 도착지: {endLocation}
                {walkingSession.isActive && walkingSession.startChecked && !walkingSession.endChecked && (
                  <div style={{marginTop: '5px'}}>
                    <small>도착 후 여기서 GPS 체크를 해주세요!</small>
                  </div>
                )}
              </Popup>
            </Marker>
          )}
          
          {/* 산책로 추천 기준 위치 표시 (경로가 없을 때만) */}
          {!startCoords && recommendBaseCoords && (
            <Marker position={[recommendBaseCoords.lat, recommendBaseCoords.lng]}>
              <Popup>📍 기준 위치: {recommendBaseLocation}</Popup>
            </Marker>
          )}
          
          {/* 경로 표시 */}
          {route?.waypoints && (
            <Polyline 
              positions={route.waypoints.map(wp => [wp.lat, wp.lng])} 
              color={getRouteColor(route.route_type)} 
              weight={5} 
            />
          )}
          
          {/* 우회한 위험지역 표시 */}
          {route?.avoided_zones?.map((zone, index) => (
            <CircleMarker 
              key={index}
              center={[zone.lat, zone.lng]} 
              radius={20} 
              color="#FF5722" 
              fillOpacity={0.3}
            >
              <Popup>
                <h4>⚠️ {zone.name}</h4>
                <p>위험도: {(zone.risk * 100).toFixed(1)}%</p>
              </Popup>
            </CircleMarker>
          ))}
          
          {/* 추천 산책로 코스 표시 */}
          {activeTab === 'recommend' && !walkingSession.isActive && recommendedCourses.map((course, index) => (
            <CircleMarker
              key={index}
              center={[course.center.lat, course.center.lng]}
              radius={15}
              color="#4CAF50"
              fillOpacity={0.6}
            >
              <Popup>
                <h4>🏃‍♂️ {course.name}</h4>
                <p>📍 {course.distance?.toFixed(1)}km 거리</p>
                <p>{course.description}</p>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
};

export default RouteSearch;