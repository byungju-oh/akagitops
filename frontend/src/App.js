// App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import 'leaflet/dist/leaflet.css';

// AuthProvider 추가
import AuthProvider from './contexts/AuthContext';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import RiskMap from './pages/RiskMap';
import RouteSearch from './pages/RouteSearch';
import ReportChatbot from './pages/ReportChatbot';
import Points from './pages/Points'; // 포인트 페이지 추가
import NotFound from './pages/NotFound';
import './styles/App.css';
import VoiceAssistantWidget from './components/VoiceAssistantWidget';

function App() {
  return (
    <AuthProvider>
      <Router future={{ v7_startTransition: true }}>
        <div className="App">
          <Navbar />
          <main className="main-content">
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/map" element={<RiskMap />} />
              <Route path="/route" element={<RouteSearch />} />
              <Route path="/report" element={<ReportChatbot />} />
              <Route path="/points" element={<Points />} /> {/* 포인트 페이지 라우트 추가 */}
              
              <Route path="/" element={<Navigate to="/dashboard" />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
            <VoiceAssistantWidget />
          </main>
          
          <ToastContainer position="top-right" autoClose={3000} />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;