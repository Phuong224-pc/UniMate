import React, { useState, useEffect } from 'react';
import { 
  Menu, 
  Moon, 
  Sun, 
  ChevronDown, 
  GraduationCap, 
  Briefcase, 
  Calendar, 
  FileText, 
  Edit3,
  Bot,
  Database,
  Sparkles
} from 'lucide-react';
import { api } from '../services/api';

export default function Header({ 
  onToggleSidebar, 
  darkMode, 
  setDarkMode, 
  onSelectSuggestion,
  title = "UniMate Chatbot"
}) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [systemStatus, setSystemStatus] = useState(null);

  useEffect(() => {
    let isMounted = true;
    api.getStatus()
      .then(res => {
        if (isMounted && res) {
          setSystemStatus(res);
        }
      })
      .catch(() => {
        // Fallback kiểm tra /health
        api.checkHealth()
          .then(res => {
            if (isMounted && res) setSystemStatus(res);
          })
          .catch(() => {});
      });

    return () => { isMounted = false; };
  }, []);

  const suggestions = [
    { label: "Điều kiện tốt nghiệp", query: "Điều kiện xét tốt nghiệp đại học Văn Lang", icon: GraduationCap },
    { label: "Cơ hội việc làm", query: "Thông báo tuyển dụng thực tập Khoa CNTT Văn Lang", icon: Briefcase },
    { label: "Hoạt động sự kiện", query: "Lịch công tác tuần và sự kiện trường Văn Lang", icon: Calendar },
    { label: "Lịch thi & Phòng thi", query: "Lịch thi học kỳ và phòng thi trường Văn Lang", icon: FileText },
    { label: "Đăng ký học phần", query: "Thông báo thời gian đăng ký học phần môn học Văn Lang", icon: Edit3 },
  ];

  return (
    <header 
      style={{
        height: '60px',
        borderBottom: '1px solid var(--border-color)',
        backgroundColor: 'var(--bg-secondary)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        zIndex: 40,
        flexShrink: 0
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button
          onClick={onToggleSidebar}
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
          title="Đóng / Mở menu"
        >
          <Menu size={22} />
        </button>

        {/* Model Title & Dropdown Suggestions */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-color)',
              padding: '6px 14px',
              borderRadius: '20px',
              color: 'var(--text-main)',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <Bot size={16} color="var(--vlu-red)" />
            <span>{title}</span>
            <ChevronDown size={14} color="var(--text-muted)" />
          </button>

          {dropdownOpen && (
            <div
              style={{
                position: 'absolute',
                top: '110%',
                left: 0,
                width: '320px',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--shadow-lg)',
                padding: '8px',
                zIndex: 100
              }}
            >
              <div style={{ padding: '6px 8px', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Gợi ý tra cứu phổ biến
              </div>
              {suggestions.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <div
                    key={idx}
                    onClick={() => {
                      if (onSelectSuggestion) onSelectSuggestion(item.query);
                      setDropdownOpen(false);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer',
                      fontSize: '13px',
                      color: 'var(--text-main)',
                      transition: 'background 0.15s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-tertiary)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <Icon size={16} color="var(--vlu-red)" />
                    <span style={{ fontWeight: 500 }}>{item.label}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Right controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>


        {systemStatus?.isDemo ? (
          <div 
            className="hide-on-mobile"
            title="Đang chạy chế độ DEMO LOCAL: Lưu trữ dữ liệu an toàn trên máy, không cần MongoDB"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(234, 179, 8, 0.12)',
              border: '1px solid rgba(234, 179, 8, 0.35)',
              color: '#d97706',
              padding: '4px 10px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: 600
            }}
          >
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#f59e0b', animation: 'pulse 2s infinite' }}></span>
            <span>Chế độ demo — dữ liệu mẫu</span>
          </div>
        ) : systemStatus && !systemStatus.isDemo ? (
          <div 
            className="hide-on-mobile"
            title="Đang kết nối cơ sở dữ liệu MongoDB chính thức"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(22, 163, 74, 0.12)',
              border: '1px solid rgba(22, 163, 74, 0.35)',
              color: '#16a34a',
              padding: '4px 10px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: 600
            }}
          >
            <Database size={13} color="#16a34a" />
            <span>MongoDB Connected</span>
          </div>
        ) : null}

        <button
          onClick={() => setDarkMode(!darkMode)}
          style={{
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-main)',
            width: '38px',
            height: '38px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'var(--transition)'
          }}
          title={darkMode ? "Chuyển sang chế độ Sáng" : "Chuyển sang chế độ Tối"}
        >
          {darkMode ? <Sun size={17} color="#f59e0b" /> : <Moon size={17} />}
        </button>
      </div>
    </header>
  );
}
