import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation, Outlet } from 'react-router-dom';
import { 
  Home, 
  ArrowLeft, 
  User, 
  Award, 
  ShieldCheck, 
  ShieldAlert,
  LogOut, 
  Database, 
  Sun, 
  Moon,
  IdCard,
  FileSpreadsheet
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import AuthModal from '../components/AuthModal';
import BottomNav from '../components/BottomNav';
import { api } from '../services/api';

export default function AccountLayout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile, logout, isAuthenticated, isAdmin, loading } = useAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [dataStatus, setDataStatus] = useState({ isDemo: false, dataMode: 'mongodb' });

  // Tự động chuyển hướng Admin sang /admin nếu truy cập vào hồ sơ sinh viên hoặc bảng điểm
  useEffect(() => {
    if (!loading && isAdmin && (location.pathname === '/account/profile' || location.pathname === '/account/grades' || location.pathname === '/account')) {
      navigate('/admin', { replace: true });
    }
  }, [isAdmin, loading, location.pathname, navigate]);

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

  const tabs = isAdmin ? [
    { path: '/admin', label: 'Quản trị hệ thống', icon: ShieldAlert },
    { path: '/account/security', label: 'Bảo mật tài khoản', icon: ShieldCheck }
  ] : [
    { path: '/account/profile', label: 'Hồ sơ sinh viên', icon: IdCard, alias: '/account/grades' },
    { path: '/account/security', label: 'Bảo mật tài khoản', icon: ShieldCheck }
  ];

  return (
    <div style={{ height: '100%', maxHeight: '100vh', width: '100%', flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-main)', overflow: 'hidden' }}>
      {/* Top Header */}
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
                <span style={{ fontSize: '9px', background: 'var(--vlu-red-light)', color: 'var(--vlu-red)', padding: '0 4px', borderRadius: '3px', fontWeight: 600 }}>Demo: VLU</span>
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
              whiteSpace: 'nowrap'
            }}
            title="Quay về trang chủ UniMate"
          >
            <Home size={15} />
            <span>Về trang chủ</span>
          </button>
        </div>

        {/* Right: Data Mode, Theme, Logout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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
            >
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e' }} />
              <span>MongoDB</span>
            </div>
          )}

          <button
            onClick={() => setDarkMode(!darkMode)}
            style={{
              padding: '7px',
              borderRadius: '8px',
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-main)',
              cursor: 'pointer'
            }}
          >
            {darkMode ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          {user && (
            <button
              onClick={logout}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                color: '#ef4444',
                fontSize: '13px',
                cursor: 'pointer',
                fontWeight: 500
              }}
              title="Đăng xuất tài khoản"
            >
              <LogOut size={15} />
              <span className="hide-on-mobile">Đăng xuất</span>
            </button>
          )}
        </div>
      </header>

      {/* Sub-navigation Tabs */}
      <div className="feature-subnav">
        <div className="feature-subnav-scroll">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = location.pathname === tab.path || (tab.alias && location.pathname === tab.alias);
            return (
              <NavLink
                key={tab.path}
                to={tab.path}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 4px',
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
                <Icon size={16} color={isActive ? 'var(--vlu-red)' : 'currentColor'} />
                <span>{tab.label}</span>
              </NavLink>
            );
          })}
        </div>
      </div>

      {/* Content Body (Scrollable Full Width) */}
      <main className="chatgpt-scroll has-bottom-nav" style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden', padding: '16px 16px 48px 16px', width: '100%', maxWidth: '100%', boxSizing: 'border-box', WebkitOverflowScrolling: 'touch' }}>
        {children || <Outlet />}
      </main>

      <BottomNav />

      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </div>
  );
}
