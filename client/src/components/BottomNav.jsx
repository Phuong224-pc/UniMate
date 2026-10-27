import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  Bot, 
  Calendar, 
  Map, 
  Calculator, 
  User,
  ShieldAlert,
  ShieldCheck 
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export default function BottomNav() {
  const location = useLocation();
  const { isAdmin } = useAuth();

  const items = isAdmin ? [
    { to: '/', label: 'Chatbot', icon: Bot, exact: true },
    { to: '/schedule', label: 'TKB', icon: Calendar },
    { to: '/roadmap', label: 'Lộ trình', icon: Map },
    { to: '/admin', label: 'Quản trị', icon: ShieldAlert },
    { to: '/account/security', label: 'Bảo mật', icon: ShieldCheck }
  ] : [
    { to: '/', label: 'Chatbot', icon: Bot, exact: true },
    { to: '/schedule', label: 'TKB', icon: Calendar },
    { to: '/roadmap', label: 'Lộ trình', icon: Map },
    { to: '/account/grades', label: 'Bảng điểm', icon: Calculator },
    { to: '/account/profile', label: 'Hồ sơ', icon: User }
  ];

  const isItemActive = (item) => {
    if (item.exact) return location.pathname === item.to;
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
