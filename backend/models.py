# models.py
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Boolean, Text
from sqlalchemy.orm import relationship  # ← 이렇게 수정
from sqlalchemy.ext.declarative import declarative_base
from database import Base
from datetime import datetime

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), nullable=False)  # name 필드
    email = Column(String(100), unique=True, index=True, nullable=False)
    password = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # 약관 동의 관련 필드들
    service_terms_agreed = Column(Boolean, default=False, nullable=False)
    privacy_policy_agreed = Column(Boolean, default=False, nullable=False)
    location_consent_agreed = Column(Boolean, default=False, nullable=False)
    marketing_consent_agreed = Column(Boolean, default=False, nullable=False)
    terms_agreed_at = Column(DateTime, default=datetime.utcnow)

    predictions = relationship("RiskPrediction", back_populates="user", cascade="all, delete-orphan")

    # 기존 predictions 줄 아래에 추가
    points = relationship("UserPoints", back_populates="user", uselist=False, cascade="all, delete-orphan")
    point_history = relationship("PointHistory", back_populates="user", cascade="all, delete-orphan")

class Location(Base):
    __tablename__ = "locations"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    address = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

class RiskPrediction(Base):
    __tablename__ = "risk_predictions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    risk_score = Column(Float, nullable=False)
    prediction_date = Column(DateTime, default=datetime.utcnow)
    
    # 관계
    user = relationship("User", back_populates="predictions")

class UserPoints(Base):
    __tablename__ = "user_points"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    points = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # 관계 설정
    user = relationship("User", back_populates="points")

class PointHistory(Base):
    __tablename__ = "point_history"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    point_type = Column(String(50), nullable=False)  # "sinkhole_report", "walking_route"
    points_earned = Column(Integer, nullable=False)
    description = Column(Text)
    earned_at = Column(DateTime, default=datetime.utcnow)
    
    # 관계 설정
    user = relationship("User", back_populates="point_history")