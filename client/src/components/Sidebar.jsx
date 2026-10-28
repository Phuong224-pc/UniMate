import React, { useState, useEffect, useMemo } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { 
  MessageSquarePlus, 
  Map, 
  Compass, 
  GraduationCap, 
  Calculator, 
  IdCard, 
  ShieldAlert, 
  ShieldCheck, 
  HelpCircle, 
  Trash2, 
  ChevronDown, 
  UserCheck, 
  UserCircle, 
  LogOut,
  ChevronLeft,
  ChevronRight,
  Route,
  Pin,
  PinOff,
  Calendar,
  Search,
  X
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export default function Sidebar({ 
  isCollapsed, 
  setIsCollapsed, 
  isMobileOpen = false,
  onCloseMobile,
  chatSessions, 
  activeChatId, 
  onSelectChat, 
  onNewChat, 
  onDeleteChat,
  onOpenAuth,
  onOpenHelp 
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user: currentUser, profile: currentProfile, logout: handleLogout, isAdmin } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [academicMenuOpen, setAcademicMenuOpen] = useState(false);
  const [pinnedChats, setPinnedChats] = useState(() => {
    try { return JSON.parse(localStorage.getItem('vlu_pinned_chats') || '[]'); }
    catch { return []; }
  });
  const [chatSearchQuery, setChatSearchQuery] = useState('');

  const togglePin = (e, sessionId) => {
    e.stopPropagation();
    setPinnedChats(prev => {
      const next = prev.includes(sessionId)
        ? prev.filter(id => id !== sessionId)
        : [...prev, sessionId];
      localStorage.setItem('vlu_pinned_chats', JSON.stringify(next));
      return next;
    });
  };

  const handleSelectSession = (sessionId) => {
    onSelectChat(sessionId);
    if (onCloseMobile) onCloseMobile();
  };

  const handleNewChatClick = () => {
    onNewChat();
    if (onCloseMobile) onCloseMobile();
  };

  const handleNavClick = () => {
    if (onCloseMobile) onCloseMobile();
  };

  const filteredChatSessions = useMemo(() => {
    if (!chatSessions) return [];
    let list = [...chatSessions];
    if (chatSearchQuery.trim()) {
      const q = chatSearchQuery.toLowerCase().trim();
      list = list.filter(s => {
        const titleMatch = s.title && s.title.toLowerCase().includes(q);
        const msgMatch = s.messages && s.messages.some(m => m.content && m.content.toLowerCase().includes(q));
        return titleMatch || msgMatch;
      });
    }
    return list.sort((a, b) => {
      const aPin = pinnedChats.includes(a.id);
      const bPin = pinnedChats.includes(b.id);
      if (aPin && !bPin) return -1;
      if (!aPin && bPin) return 1;
      return 0;
    });
  }, [chatSessions, chatSearchQuery, pinnedChats]);

  const navItems = [
    { path: '/schedule', label: 'Thời khóa biểu', icon: Calendar, title: 'Thời khóa biểu học tập K30' },
    { path: '/advisor', label: 'Cố vấn lộ trình', icon: Route, title: 'AI Cố vấn bảng điểm & điều kiện tiên quyết K30' },
    { path: '/roadmap', label: 'Lộ trình cá nhân hóa', icon: Map, title: 'Khung đào tạo 126 tín chỉ K30' },
    { path: '/graduation', label: 'Dự báo tốt nghiệp', icon: GraduationCap, title: 'Tiến độ và điều kiện tốt nghiệp' },
    { path: '/career', label: 'Định hướng tương lai', icon: Compass, title: 'Gợi ý nghề nghiệp & stack' },
  ];

  return (
    <aside 
      className={`app-sidebar ${isMobileOpen ? 'mobile-open' : ''}`}
      style={{
        width: isCollapsed ? '72px' : '280px',
        backgroundColor: 'var(--sidebar-bg)',
        borderRight: '1px solid var(--sidebar-border)',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        transition: 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        zIndex: 300,
        position: 'relative'
      }}
    >
      {/* Brand Header */}
      <div 
        style={{
          padding: '16px 14px',
          borderBottom: '1px solid var(--sidebar-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: isCollapsed ? 'center' : 'space-between',
          cursor: 'pointer'
        }}
        onClick={() => { navigate('/'); handleNavClick(); }}
        title="Quay về Trang chủ UniMate"
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
          <img 
            src="/img/unimate-logo.svg" 
            alt="UniMate Logo" 
            style={{ width: '38px', height: '38px', objectFit: 'contain', flexShrink: 0 }} 
          />
          {!isCollapsed && (
            <div>
              <div style={{ fontWeight: 800, fontSize: '16px', color: 'var(--vlu-red)', letterSpacing: '-0.3px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                UNIMATE
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Trợ lý học tập thông minh
              </div>
            </div>
          )}
        </div>
      </div>

      {/* New Chat Button */}
      <div style={{ padding: '12px 10px 8px 10px' }}>
        <button
          onClick={handleNewChatClick}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: isCollapsed ? 'center' : 'center',
            gap: '8px',
            padding: '10px 14px',
            background: 'var(--vlu-red)',
            color: 'white',
            border: 'none',
            borderRadius: 'var(--radius-sm)',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 600,
            transition: 'var(--transition)',
            boxShadow: '0 2px 6px rgba(196, 18, 48, 0.25)'
          }}
          title="Tạo phiên chat mới"
        >
          <MessageSquarePlus size={18} />
          {!isCollapsed && <span>Đoạn chat mới</span>}
        </button>
      </div>

      {/* Collapsible Lộ trình & Học vụ (Chỉ hiện trên desktop, ẩn trên mobile) */}
      <div className="hide-on-mobile" style={{ padding: '0 8px', marginBottom: '8px' }}>
        {!isCollapsed && (
          <div 
            onClick={() => setAcademicMenuOpen(!academicMenuOpen)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '6px 8px',
              fontSize: '11px',
              fontWeight: 700,
              textTransform: 'uppercase',
              color: 'var(--text-muted)',
              letterSpacing: '0.5px',
              cursor: 'pointer',
              borderRadius: '6px'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--sidebar-hover)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          >
            <span>Lộ trình & Học vụ</span>
            <ChevronDown size={14} style={{ transform: academicMenuOpen ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.2s' }} />
          </div>
        )}

        {(academicMenuOpen || isCollapsed) && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '4px' }}>
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = location.pathname === item.path;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  title={item.title}
                  onClick={handleNavClick}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '7px 10px',
                    borderRadius: 'var(--radius-sm)',
                    textDecoration: 'none',
                    fontSize: '12.5px',
                    fontWeight: active ? 600 : 500,
                    color: active ? 'var(--vlu-red)' : 'var(--text-main)',
                    background: active ? 'var(--vlu-red-light)' : 'transparent',
                    transition: 'var(--transition)',
                    justifyContent: isCollapsed ? 'center' : 'flex-start'
                  }}
                >
                  <Icon size={16} color={active ? 'var(--vlu-red)' : 'var(--text-secondary)'} />
                  {!isCollapsed && <span>{item.label}</span>}
                </NavLink>
              );
            })}
          </div>
        )}
      </div>

      {/* Main Chat History Area - Fills all available vertical height like ChatGPT */}
      {!isCollapsed ? (
        <div 
          style={{ 
            flex: 1, 
            minHeight: 0, 
            display: 'flex', 
            flexDirection: 'column', 
            overflow: 'hidden', 
            padding: '4px 8px 8px 8px',
            borderTop: '1px solid var(--sidebar-border)'
          }}
        >
          {/* Header & Count */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '6px 8px 4px 8px',
            fontSize: '11px',
            fontWeight: 700,
            textTransform: 'uppercase',
            color: 'var(--text-muted)',
            letterSpacing: '0.5px'
          }}>
            <span>Gần đây</span>
            {chatSessions && chatSessions.length > 0 && (
              <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600 }}>
                ({filteredChatSessions.length})
              </span>
            )}
          </div>

          {/* Chat Search Bar */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--sidebar-border)',
            borderRadius: '6px',
            padding: '6px 8px',
            margin: '4px 2px 8px 2px'
          }}>
            <Search size={13} color="var(--text-muted)" style={{ flexShrink: 0 }} />
            <input
              type="text"
              placeholder="Tìm kiếm cuộc trò chuyện..."
              value={chatSearchQuery}
              onChange={(e) => setChatSearchQuery(e.target.value)}
              style={{
                border: 'none',
                background: 'transparent',
                outline: 'none',
                width: '100%',
                fontSize: '12px',
                color: 'var(--text-main)',
                padding: 0
              }}
            />
            {chatSearchQuery && (
              <button
                onClick={() => setChatSearchQuery('')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}
                title="Xóa tìm kiếm"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* ChatGPT-Style Full-Height Scrollable Chat List with visible sleek scrollbar */}
          <div 
            className="chatgpt-scroll"
            style={{
              flex: 1,
              minHeight: 0,
              paddingRight: '4px',
              display: 'flex',
              flexDirection: 'column',
              gap: '2px'
            }}
          >
            {filteredChatSessions.length > 0 ? (
              filteredChatSessions.map((session) => {
                const isPinned = pinnedChats.includes(session.id);
                const isActive = session.id === activeChatId;
                return (
                  <div
                    key={session.id}
                    onClick={() => handleSelectSession(session.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      background: isActive ? 'var(--bg-tertiary)' : 'transparent',
                      color: isActive ? 'var(--vlu-red)' : 'var(--text-secondary)',
                      fontWeight: isActive ? 600 : 400,
                      borderLeft: isPinned ? '3px solid var(--vlu-red)' : '3px solid transparent',
                      transition: 'all 0.15s'
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) e.currentTarget.style.background = 'var(--sidebar-hover)';
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    {isPinned && (
                      <Pin size={12} style={{ color: 'var(--vlu-red)', flexShrink: 0, marginRight: '6px' }} />
                    )}
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                      {session.title || 'Cuộc trò chuyện'}
                    </span>
                    <div style={{ display: 'flex', gap: '3px', flexShrink: 0, marginLeft: '6px' }}>
                      <button
                        onClick={(e) => togglePin(e, session.id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: isPinned ? 'var(--vlu-red)' : 'var(--text-muted)',
                          cursor: 'pointer',
                          padding: '3px',
                          borderRadius: '4px',
                          opacity: isPinned ? 1 : 0.6
                        }}
                        title={isPinned ? 'Bỏ ghim' : 'Ghim cuộc trò chuyện'}
                      >
                        {isPinned ? <PinOff size={13} /> : <Pin size={13} />}
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); onDeleteChat(session.id); }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--text-muted)',
                          cursor: 'pointer',
                          padding: '3px',
                          borderRadius: '4px',
                          opacity: 0.6
                        }}
                        title="Xóa phiên chat này"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{ padding: '16px 8px', fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center' }}>
                {chatSearchQuery ? 'Không tìm thấy cuộc trò chuyện phù hợp' : 'Chưa có lịch sử hội thoại'}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div style={{ flex: 1 }} />
      )}

      {/* Bottom Section: User Profile & Controls (Anchored at bottom like ChatGPT) */}
      <div style={{ borderTop: '1px solid var(--sidebar-border)', padding: '8px 10px', position: 'relative' }}>
        {/* User Auth Profile (ChatGPT Style at bottom) */}
        {currentUser ? (
          <div style={{ position: 'relative', marginBottom: '4px' }}>
            {showUserMenu && (
              <>
                <div 
                  style={{ position: 'fixed', inset: 0, zIndex: 490 }} 
                  onClick={() => setShowUserMenu(false)} 
                />
                <div 
                  style={{
                    position: 'absolute',
                    bottom: isCollapsed ? '0' : '100%',
                    left: isCollapsed ? 'calc(100% + 12px)' : '0',
                    right: isCollapsed ? 'auto' : '0',
                    width: isCollapsed ? '210px' : '100%',
                    minWidth: '190px',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-sm)',
                    boxShadow: 'var(--shadow-lg)',
                    padding: '6px',
                    zIndex: 500,
                    marginBottom: isCollapsed ? '0' : '8px'
                  }}
                >
                  {!isAdmin ? (
                    <button
                      onClick={() => { navigate('/account/profile'); setShowUserMenu(false); handleNavClick(); }}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 10px',
                        background: 'none',
                        border: 'none',
                        borderRadius: '6px',
                        color: 'var(--text-main)',
                        fontSize: '13px',
                        cursor: 'pointer',
                        textAlign: 'left',
                        whiteSpace: 'nowrap'
                      }}
                      onMouseEnter={(e) => e.target.style.background = 'var(--bg-tertiary)'}
                      onMouseLeave={(e) => e.target.style.background = 'none'}
                    >
                      <IdCard size={15} style={{ flexShrink: 0 }} />
                      <span>Hồ sơ sinh viên</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => { navigate('/admin'); setShowUserMenu(false); handleNavClick(); }}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 10px',
                        background: 'none',
                        border: 'none',
                        borderRadius: '6px',
                        color: 'var(--vlu-red)',
                        fontWeight: 600,
                        fontSize: '13px',
                        cursor: 'pointer',
                        textAlign: 'left',
                        whiteSpace: 'nowrap'
                      }}
                      onMouseEnter={(e) => e.target.style.background = 'var(--bg-tertiary)'}
                      onMouseLeave={(e) => e.target.style.background = 'none'}
                    >
                      <ShieldAlert size={15} style={{ flexShrink: 0 }} />
                      <span>Quản trị hệ thống</span>
                    </button>
                  )}
                  <button
                    onClick={() => { navigate('/account/security'); setShowUserMenu(false); handleNavClick(); }}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 10px',
                      background: 'none',
                      border: 'none',
                      borderRadius: '6px',
                      color: 'var(--text-main)',
                      fontSize: '13px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      whiteSpace: 'nowrap'
                    }}
                    onMouseEnter={(e) => e.target.style.background = 'var(--bg-tertiary)'}
                    onMouseLeave={(e) => e.target.style.background = 'none'}
                  >
                    <ShieldCheck size={15} style={{ flexShrink: 0 }} />
                    <span>Bảo mật tài khoản</span>
                  </button>
                  <button
                    onClick={handleLogout}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 10px',
                      background: 'none',
                      border: 'none',
                      borderRadius: '6px',
                      color: '#ef4444',
                      fontSize: '13px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      whiteSpace: 'nowrap'
                    }}
                    onMouseEnter={(e) => e.target.style.background = 'var(--bg-tertiary)'}
                    onMouseLeave={(e) => e.target.style.background = 'none'}
                  >
                    <LogOut size={15} style={{ flexShrink: 0 }} />
                    <span>Đăng xuất</span>
                  </button>
                </div>
              </>
            )}

            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: isCollapsed ? 'center' : 'space-between',
                padding: '8px 10px',
                background: 'var(--sidebar-hover)',
                border: '1px solid var(--sidebar-border)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-main)',
                cursor: 'pointer',
                fontSize: '13px',
                transition: 'all 0.15s'
              }}
              title={currentProfile?.fullName || currentUser.email}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                <div style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '50%',
                  background: 'var(--vlu-red)',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '11px',
                  fontWeight: 700,
                  flexShrink: 0
                }}>
                  {(currentProfile?.fullName || currentUser.email || 'U').charAt(0).toUpperCase()}
                </div>
                {!isCollapsed && (
                  <div style={{ textAlign: 'left', overflow: 'hidden' }}>
                    <div style={{ fontSize: '12.5px', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {currentProfile?.fullName || currentUser.email.split('@')[0]}
                    </div>
                    <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
                      {isAdmin ? 'Quản trị viên' : 'Sinh viên'}
                    </div>
                  </div>
                )}
              </div>
              {!isCollapsed && <ChevronDown size={14} color="var(--text-muted)" />}
            </button>
          </div>
        ) : (
          <button
            onClick={onOpenAuth}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: isCollapsed ? 'center' : 'flex-start',
              gap: '8px',
              padding: '8px 12px',
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-main)',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 500,
              marginBottom: '4px'
            }}
          >
            <UserCircle size={18} />
            {!isCollapsed && <span>Đăng nhập / Đăng ký</span>}
          </button>
        )}

        {/* System Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <button
            onClick={onOpenHelp}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '6px 10px',
              background: 'none',
              border: 'none',
              borderRadius: '6px',
              color: 'var(--text-secondary)',
              fontSize: '12.5px',
              cursor: 'pointer',
              justifyContent: isCollapsed ? 'center' : 'flex-start'
            }}
            title="Trợ giúp & Hướng dẫn"
          >
            <HelpCircle size={16} />
            {!isCollapsed && <span>Trợ giúp & Hướng dẫn</span>}
          </button>
        </div>
      </div>
    </aside>
  );
}
