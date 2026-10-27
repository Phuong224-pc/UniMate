import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import ChatLayout from '../layouts/ChatLayout';
import FeatureLayout from '../layouts/FeatureLayout';
import AccountLayout from '../layouts/AccountLayout';

import ChatPage from '../pages/ChatPage';
import SchedulePage from '../pages/SchedulePage';
import AdvisorPage from '../pages/AdvisorPage';
import RoadmapPage from '../pages/RoadmapPage';
import GraduationPage from '../pages/GraduationPage';
import CareerPage from '../pages/CareerPage';
import ProfilePage from '../pages/ProfilePage';
import GradesPage from '../pages/GradesPage';
import AccountSecurity from '../pages/AccountSecurity';
import AdminPage from '../pages/AdminPage';

export default function AppRoutes({
  activeChat,
  onUpdateChat,
  isSidebarCollapsed,
  setIsSidebarCollapsed,
  chatSessions,
  activeChatId,
  onSelectChat,
  onNewChat,
  onDeleteChat,
  authModalOpen,
  setAuthModalOpen,
  helpModalOpen,
  setHelpModalOpen,
  darkMode,
  setDarkMode,
  onSelectSuggestion
}) {
  return (
    <Routes>
      {/* 1. Trang chính Chatbot với ChatLayout */}
      <Route
        path="/"
        element={
          <ChatLayout
            isSidebarCollapsed={isSidebarCollapsed}
            setIsSidebarCollapsed={setIsSidebarCollapsed}
            chatSessions={chatSessions}
            activeChatId={activeChatId}
            onSelectChat={onSelectChat}
            onNewChat={onNewChat}
            onDeleteChat={onDeleteChat}
            authModalOpen={authModalOpen}
            setAuthModalOpen={setAuthModalOpen}
            helpModalOpen={helpModalOpen}
            setHelpModalOpen={setHelpModalOpen}
            darkMode={darkMode}
            setDarkMode={setDarkMode}
            onSelectSuggestion={onSelectSuggestion}
          >
            <ChatPage activeChat={activeChat} onUpdateChat={onUpdateChat} />
          </ChatLayout>
        }
      />

      {/* 2. Các trang chức năng riêng biệt với FeatureLayout (Toàn màn hình, không có sidebar chatbot) */}
      <Route
        path="/schedule"
        element={
          <FeatureLayout>
            <SchedulePage />
          </FeatureLayout>
        }
      />

      {/* Cố vấn lộ trình học tập AI */}
      <Route
        path="/advisor"
        element={
          <FeatureLayout>
            <AdvisorPage />
          </FeatureLayout>
        }
      />

      {/* Lộ trình cá nhân hóa K30 CNTT (126 tín chỉ) với Trợ lý lộ trình bot */}
      <Route
        path="/roadmap"
        element={
          <FeatureLayout>
            <RoadmapPage />
          </FeatureLayout>
        }
      />

      <Route
        path="/graduation"
        element={
          <FeatureLayout>
            <GraduationPage />
          </FeatureLayout>
        }
      />

      <Route
        path="/career"
        element={
          <FeatureLayout>
            <CareerPage />
          </FeatureLayout>
        }
      />

      {/* 3. Khu vực Tài khoản Sinh viên với AccountLayout */}
      <Route path="/account" element={<AccountLayout />}>
        <Route index element={<Navigate to="/account/profile" replace />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="grades" element={<GradesPage />} />
        <Route path="security" element={<AccountSecurity />} />
      </Route>

      {/* Chuyển hướng các route cũ sang route mới để bảo toàn liên kết */}
      <Route path="/profile" element={<Navigate to="/account/profile" replace />} />
      <Route path="/gpa" element={<Navigate to="/account/grades" replace />} />

      {/* 4. Khu vực Quản trị Admin độc lập (/admin) */}
      <Route path="/admin" element={<AdminPage />} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
