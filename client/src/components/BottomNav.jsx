import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  Bot, 
  Map, 
  User,
  ShieldAlert
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export default function BottomNav() {
  const location = useLocation();
  const { isAdmin } = useAuth();

  // Trên Mobile:
  // 1. TKB & Lộ trình gộp thành: "Lộ trình & Học vụ"
  // 2. Bảng điểm & Hồ sơ gộp thành: "Hồ sơ sinh viên"
  // 3. Bảo mật được đưa vào trong menu Quản trị
  const items = isAdmin ? [
    { to: '/', label: 'Chatbot', icon: Bot, exact: true },
    { 
      to: '/roadmap', 
      label: 'Lộ trình & Học vụ', 
      icon: Map, 
      matchPaths: ['/roadmap', '/schedule', '/advisor', '/graduation', '/career'] 
    },
    { to: '/admin', label: 'Quản trị', icon: ShieldAlert, matchPaths: ['/admin'] }
  ] : [
    { to: '/', label: 'Chatbot', icon: Bot, exact: true },
    { 
      to: '/roadmap', 
      label: 'Lộ trình & Học vụ', 
      icon: Map, 
      matchPaths: ['/roadmap', '/schedule', '/advisor', '/graduation', '/career'] 
    },
    { 
      to: '/account/profile', 
      label: 'Hồ sơ sinh viên', 
      icon: User, 
      matchPaths: ['/account', '/profile', '/gpa'] 
    }
  ];

  const isItemActive = (item) => {
    if (item.exact) return location.pathname === item.to;
    if (item.matchPaths) {
      return item.matchPaths.some(p => location.pathname === p || location.pathname.startsWith(p + '/') || location.pathname.startsWith(p + '?'));
    }
    return location.pathname.startsWith(item.to);
  };

  return (
    <nav className="mobile-bottom-nav" aria-label="Điều hướng chính trên mobile">
      {items.map((item) => {
        const Icon = item.icon;
        const active = isItemActive(item);
        return (
          <NavLink
            key={item.to}
            to={item.to}
            className={`bottom-nav-item ${active ? 'active' : ''}`}
          >
            <Icon size={20} className="bottom-nav-icon" />
            <span>{item.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}
