import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { 
  Home, 
  ArrowLeft, 
  Calendar, 
  Map, 
  GraduationCap, 
  Compass, 
  User, 
  Sun, 
  Moon, 
  ShieldAlert, 
  LogOut, 
  Database,
  UserCheck,
  Route
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import AuthModal from '../components/AuthModal';
import BottomNav from '../components/BottomNav';
import { api } from '../services/api';

export default function FeatureLayout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile, logout, isAdmin } = useAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [dataStatus, setDataStatus] = useState({ isDemo: false, dataMode: 'mongodb' });

  // Dark mode
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('vlu_theme_dark') === 'true';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
    localStorage.setItem('vlu_theme_dark', darkMode);
  }, [darkMode]);

  useEffect(() => {
    api.getStatus()
      .then(res => {
        if (res && res.status === 'ok') {
          setDataStatus({ isDemo: res.isDemo, dataMode: res.dataMode });
        }
      })
      .catch(() => {});
  }, []);

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  const navLinks = [
    { path: '/schedule', label: 'Thời khóa biểu', icon: Calendar },
    { path: '/advisor', label: 'Cố vấn lộ trình', icon: Route },
    { path: '/roadmap', label: 'Lộ trình cá nhân hóa', icon: Map },
    { path: '/graduation', label: 'Dự báo tốt nghiệp', icon: GraduationCap },
    { path: '/career', label: 'Định hướng tương lai', icon: Compass }
  ];

  return (
    <div style={{ height: '100%', maxHeight: '100vh', width: '100%', flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-main)', overflow: 'hidden' }}>
      {/* Top Standalone Header */}
      <header className="top-header-bar">
        {/* Left: Brand + Navigation controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
          <div 
            onClick={() => navigate('/')} 
            style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', flexShrink: 0 }}
            title="Về trang chủ UniMate"
          >
            <img 
              src="/img/unimate-logo.svg" 
              alt="UniMate Logo" 
              style={{ width: '34px', height: '34px', objectFit: 'contain', flexShrink: 0 }} 
            />
            <div className="brand-text-container" style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontWeight: 800, fontSize: '16px', color: 'var(--vlu-red)', lineHeight: '1.2', letterSpacing: '0.3px', whiteSpace: 'nowrap' }}>
                UNIMATE
              </div>
              <div className="hide-on-mobile" style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
                <span>Trợ lý học tập</span>
                <span style={{ fontSize: '9px', background: 'var(--vlu-red-light)', color: 'var(--vlu-red)', padding: '0 4px', borderRadius: '3px', fontWeight: 600 }}>VLU</span>
              </div>
            </div>
          </div>

          {/* Về trang chủ - CHỈ HIỆN TRÊN DESKTOP, ẨN HOÀN TOÀN TRÊN MOBILE THEO YÊU CẦU */}
          <div className="hide-on-mobile" style={{ width: '1px', height: '24px', background: 'var(--border-color)', margin: '0 4px' }} />

          <button
            onClick={() => navigate('/')}
            className="hide-on-mobile"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              background: 'var(--vlu-red-light)',
              color: 'var(--vlu-red)',
              border: '1px solid rgba(196, 18, 48, 0.2)',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.15s ease'
            }}
            title="Quay về trang chủ UniMate"
          >
            <Home size={15} />
            <span>Về trang chủ</span>
          </button>
        </div>

        {/* Right: Status badge + Dark mode + User Account */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Data Mode Indicator */}
          {dataStatus.isDemo ? (
            <div 
              className="hide-on-mobile"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '4px 10px',
                background: '#fef3c7',
                border: '1px solid #f59e0b',
                color: '#b45309',
                borderRadius: '20px',
                fontSize: '11px',
                fontWeight: 600
              }}
              title="Hệ thống đang hoạt động trên kho lưu trữ Demo Local không cần MongoDB"
            >
              <Database size={12} />
              <span>Chế độ demo — dữ liệu mẫu</span>
            </div>
          ) : (
            <div 
              className="hide-on-mobile"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '4px 9px',
                background: '#dcfce7',
                border: '1px solid #22c55e',
                color: '#15803d',
                borderRadius: '20px',
                fontSize: '11px',
                fontWeight: 600
              }}
              title="Đang lưu trữ trực tiếp trên MongoDB"
            >
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e' }} />
              <span>MongoDB</span>
            </div>
          )}

          {/* Theme toggle */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            style={{
              padding: '7px',
              borderRadius: '8px',
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-main)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center'
            }}
            title={darkMode ? 'Giao diện sáng' : 'Giao diện tối'}
          >
            {darkMode ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          {/* Admin shortcut if admin */}
          {isAdmin && (
            <button
              onClick={() => navigate('/admin')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 10px',
                background: 'rgba(245, 158, 11, 0.1)',
                border: '1px solid #f59e0b',
                color: '#d97706',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
              title="Truy cập khu vực Quản trị Admin"
            >
              <ShieldAlert size={14} />
              <span className="hide-on-mobile">Quản trị</span>
            </button>
          )}

          {/* User profile / Login */}
          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={() => navigate(isAdmin ? '/admin' : '/account/profile')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 12px',
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '20px',
                  color: 'var(--text-main)',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
                title={isAdmin ? "Trang Quản trị Hệ thống" : "Hồ sơ sinh viên & Bảng điểm"}
              >
                <div style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: 'var(--vlu-red)',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px'
                }}>
                  {(profile?.fullName || user.email || 'U').charAt(0).toUpperCase()}
                </div>
                <span className="hide-on-mobile" style={{ maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {profile?.fullName || user.email}
                </span>
              </button>

              <button
                onClick={logout}
                style={{
                  padding: '7px',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  borderRadius: '6px'
                }}
                title="Đăng xuất"
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setAuthModalOpen(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 14px',
                background: 'var(--vlu-red)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <User size={14} />
              <span>Đăng nhập</span>
            </button>
          )}
        </div>
      </header>

      {/* Feature Sub-navigation Tabs */}
      <div className="feature-subnav">
        <div className="feature-subnav-scroll">
          {navLinks.map(link => {
            const Icon = link.icon;
            const isActive = location.pathname === link.path;
            return (
              <NavLink
                key={link.path}
                to={link.path}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '11px 4px',
                  color: isActive ? 'var(--vlu-red)' : 'var(--text-secondary)',
                  borderBottom: isActive ? '3px solid var(--vlu-red)' : '3px solid transparent',
                  textDecoration: 'none',
                  fontSize: '13px',
                  fontWeight: isActive ? 600 : 500,
                  transition: 'all 0.15s ease',
                  whiteSpace: 'nowrap',
                  flexShrink: 0
                }}
              >
                <Icon size={15} color={isActive ? 'var(--vlu-red)' : 'currentColor'} />
                <span>{link.label}</span>
              </NavLink>
            );
          })}
        </div>
      </div>

      {/* Main Feature Content Container (Scrollable Full Width) */}
      <main className="chatgpt-scroll has-bottom-nav" style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden', padding: '16px 16px 48px 16px', width: '100%', maxWidth: '100%', boxSizing: 'border-box', WebkitOverflowScrolling: 'touch' }}>
        {children}
      </main>

      <BottomNav />

      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </div>
  );
}
