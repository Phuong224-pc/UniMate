import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { 
  ShieldAlert, 
  BarChart3, 
  Users, 
  GraduationCap, 
  BookOpen, 
  Calendar, 
  Bot, 
  Home, 
  LogOut, 
  Sun, 
  Moon, 
  Database,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Menu,
  X
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { api } from '../services/api';

export default function AdminLayout({ children, activeSection, onSelectSection }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile, logout, isAdmin, loading } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [dataStatus, setDataStatus] = useState({ isDemo: false, dataMode: 'mongodb' });

  const handleToggleSidebar = () => {
    if (window.innerWidth <= 768) {
      setIsMobileDrawerOpen(prev => !prev);
    } else {
      setIsCollapsed(prev => !prev);
    }
  };

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

  // Protected Route Check
  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg-main)' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" style={{ margin: '0 auto 16px' }} />
          <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Đang kiểm tra quyền quản trị...</div>
        </div>
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-main)', padding: '20px' }}>
        <div style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: '16px',
          padding: '40px',
          maxWidth: '480px',
          width: '100%',
          textAlign: 'center',
          boxShadow: 'var(--shadow-lg)'
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: '#fee2e2',
            color: '#dc2626',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px'
          }}>
            <ShieldAlert size={32} />
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '8px' }}>
            Truy Cập Bị Từ Chối
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '24px' }}>
            Khu vực Quản trị Hệ thống (/admin) chỉ dành riêng cho tài khoản có vai trò <strong>Quản trị viên (Admin)</strong>.
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button
              onClick={() => navigate('/')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 20px',
                background: 'var(--vlu-red)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <Home size={16} />
              <span>Về trang chủ Chatbot</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const adminMenu = [
    { id: 'dashboard', label: 'Tổng quan hệ thống', icon: BarChart3 },
    { id: 'users', label: 'Quản lý Tài khoản & Phân quyền', icon: Users },
    { id: 'students', label: 'Hồ sơ & Bảng điểm sinh viên', icon: GraduationCap },
    { id: 'curriculum', label: 'Đào tạo & Môn học K30', icon: BookOpen },
    { id: 'schedules', label: 'Quản lý Thời khóa biểu', icon: Calendar },
    { id: 'prompts', label: 'Cấu hình Trợ lý AI (Prompts)', icon: Bot },
    { id: 'security', label: 'Bảo mật tài khoản', icon: ShieldCheck }
  ];

  return (
    <div style={{ display: 'flex', width: '100%', flex: 1, height: '100vh', background: 'var(--bg-main)', overflow: 'hidden', position: 'relative' }}>
      {/* Mobile Backdrop Overlay */}
      <div 
        className={`admin-sidebar-overlay ${isMobileDrawerOpen ? 'active' : ''}`}
        onClick={() => setIsMobileDrawerOpen(false)}
        aria-hidden="true"
      />

      {/* Admin Dedicated Sidebar */}
      <aside 
        className={`admin-sidebar ${isMobileDrawerOpen ? 'mobile-open' : ''}`}
        style={{
          width: isCollapsed ? '72px' : '260px',
          background: 'var(--sidebar-bg)',
          borderRight: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          transition: 'width 0.2s ease, transform 0.28s cubic-bezier(0.4, 0, 0.2, 1)',
          flexShrink: 0
        }}
      >
        {/* Brand */}
        <div style={{
          padding: '18px 16px',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          justifyContent: isCollapsed ? 'center' : 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', overflow: 'hidden' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'var(--vlu-red)',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <ShieldCheck size={20} />
            </div>
            {!isCollapsed && (
              <div>
                <div style={{ fontWeight: 800, fontSize: '15px', color: 'var(--vlu-red)', letterSpacing: '-0.3px' }}>
                  VLU ADMIN
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  Hệ thống Quản trị Đào tạo
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Menu Navigation */}
        <div style={{ flex: 1, padding: '14px 10px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {adminMenu.map(item => {
            const Icon = item.icon;
            const isSelected = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelectSection(item.id);
                  setIsMobileDrawerOpen(false);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: 'none',
                  background: isSelected ? 'var(--vlu-red-light)' : 'transparent',
                  color: isSelected ? 'var(--vlu-red)' : 'var(--text-secondary)',
                  fontSize: '13px',
                  fontWeight: isSelected ? 600 : 500,
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s ease',
                  justifyContent: isCollapsed ? 'center' : 'flex-start',
                  minHeight: '42px'
                }}
                title={item.label}
              >
                <Icon size={18} color={isSelected ? 'var(--vlu-red)' : 'currentColor'} />
                {!isCollapsed && <span>{item.label}</span>}
              </button>
            );
          })}
        </div>

        {/* Footer: Collapse + Back to User Portal */}
        <div style={{ padding: '12px', borderTop: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <button
            onClick={() => navigate('/')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              width: '100%',
              padding: '9px 12px',
              borderRadius: '8px',
              border: '1px solid rgba(196, 18, 48, 0.2)',
              background: 'var(--vlu-red-light)',
              color: 'var(--vlu-red)',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              justifyContent: isCollapsed ? 'center' : 'flex-start',
              minHeight: '40px'
            }}
            title="Quay về trang người dùng / Chatbot"
          >
            <Home size={16} />
            {!isCollapsed && <span>Xem trang chính</span>}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        {/* Top Header */}
        <header className="admin-header" style={{
          height: '64px',
          background: 'var(--bg-secondary)',
          borderBottom: '1px solid var(--border-color)',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
            <button
              onClick={handleToggleSidebar}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-main)',
                cursor: 'pointer',
                padding: '8px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: '40px',
                minHeight: '40px'
              }}
              title={isCollapsed ? "Mở rộng thanh bên" : "Thu gọn thanh bên"}
            >
              <Menu size={22} />
            </button>
            <h1 className="admin-header-title" style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-main)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {adminMenu.find(m => m.id === activeSection)?.label || 'Bảng điều khiển Quản trị'}
            </h1>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
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
                <span>MongoDB Active</span>
              </div>
            )}

            <button
              onClick={() => setDarkMode(!darkMode)}
              style={{
                padding: '8px',
                borderRadius: '8px',
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-main)',
                cursor: 'pointer',
                minWidth: '38px',
                minHeight: '38px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title={darkMode ? "Giao diện sáng" : "Giao diện tối"}
            >
              {darkMode ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingLeft: '8px', borderLeft: '1px solid var(--border-color)' }}>
              <div className="admin-header-user hide-on-mobile" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>
                {user.email} (Admin)
              </div>
              <button
                onClick={logout}
                style={{
                  padding: '8px',
                  background: 'none',
                  border: 'none',
                  color: '#ef4444',
                  cursor: 'pointer',
                  borderRadius: '6px',
                  minWidth: '38px',
                  minHeight: '38px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                title="Đăng xuất"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </header>

        {/* Scrollable View Area */}
        <div className="admin-main-content chatgpt-scroll" style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden', padding: '24px', WebkitOverflowScrolling: 'touch' }}>
          {children}
        </div>
      </div>
    </div>
  );
}
