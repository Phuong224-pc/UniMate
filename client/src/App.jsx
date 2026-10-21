import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import AuthModal from './components/AuthModal';
import HelpModal from './components/HelpModal';

import ChatPage from './pages/ChatPage';
import AdvisorPage from './pages/AdvisorPage';
import RoadmapPage from './pages/RoadmapPage';
import GpaPage from './pages/GpaPage';
import GraduationPage from './pages/GraduationPage';
import CareerPage from './pages/CareerPage';
import ProfilePage from './pages/ProfilePage';
import AdminPage from './pages/AdminPage';

const SESSIONS_STORAGE_KEY = 'vlu_chatbot_sessions';
const DARK_MODE_KEY = 'vlu_theme_dark';

function AppContent() {
  const navigate = useNavigate();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [helpModalOpen, setHelpModalOpen] = useState(false);

  // Dark mode
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem(DARK_MODE_KEY) === 'true';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
    localStorage.setItem(DARK_MODE_KEY, darkMode);
  }, [darkMode]);

  // Chat sessions state
  const [chatSessions, setChatSessions] = useState(() => {
    try {
      const saved = localStorage.getItem(SESSIONS_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    const initId = 'chat_' + Date.now();
    return [{ id: initId, title: 'Cuộc trò chuyện mới', messages: [], createdAt: Date.now() }];
  });

  const [activeChatId, setActiveChatId] = useState(() => {
    return chatSessions[0]?.id || 'chat_' + Date.now();
  });

  const activeChat = chatSessions.find(s => s.id === activeChatId) || chatSessions[0];

  const handleUpdateChat = (newMessages, firstPrompt, mode) => {
    setChatSessions(prev => {
      const updated = prev.map(session => {
        if (session.id === activeChatId) {
          const title = (session.title === 'Cuộc trò chuyện mới' || session.title?.startsWith('Cu')) && firstPrompt 
            ? firstPrompt.slice(0, 30) 
            : session.title;
          return { ...session, messages: newMessages, title, mode: mode || session.mode || 'default' };
        }
        return session;
      });
      localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const handleNewChat = () => {
    const newId = 'chat_' + Date.now();
    const newSession = {
      id: newId,
      title: 'Cuộc trò chuyện mới',
      messages: [],
      createdAt: Date.now()
    };
    const updated = [newSession, ...chatSessions];
    setChatSessions(updated);
    setActiveChatId(newId);
    localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(updated));
    navigate('/');
  };

  const handleDeleteChat = (id) => {
    const remaining = chatSessions.filter(s => s.id !== id);
    if (remaining.length === 0) {
      const freshId = 'chat_' + Date.now();
      const fresh = [{ id: freshId, title: 'Cuộc trò chuyện mới', messages: [], createdAt: Date.now() }];
      setChatSessions(fresh);
      setActiveChatId(freshId);
      localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(fresh));
    } else {
      setChatSessions(remaining);
      if (activeChatId === id) {
        setActiveChatId(remaining[0].id);
      }
      localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(remaining));
    }
  };

  const handleSelectChat = (id) => {
    setActiveChatId(id);
    navigate('/');
  };

  const handleSelectSuggestion = (suggestionText) => {
    navigate('/');
    // Tự động gửi câu hỏi gợi ý qua ChatPage
    setTimeout(() => {
      const textarea = document.querySelector('textarea');
      if (textarea) {
        textarea.value = suggestionText;
        textarea.focus();
      }
    }, 100);
  };

  return (
    <div className="app-shell">
      <Sidebar
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
        chatSessions={chatSessions}
        activeChatId={activeChatId}
        onSelectChat={handleSelectChat}
        onNewChat={handleNewChat}
        onDeleteChat={handleDeleteChat}
        onOpenAuth={() => setAuthModalOpen(true)}
        onOpenHelp={() => setHelpModalOpen(true)}
      />

      <div className="main-view">
        <Header
          onToggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          darkMode={darkMode}
          setDarkMode={setDarkMode}
          onSelectSuggestion={handleSelectSuggestion}
        />

        <div style={{ flex: 1, overflowY: 'auto' }}>
          <Routes>
            <Route 
              path="/" 
              element={<ChatPage activeChat={activeChat} onUpdateChat={handleUpdateChat} />} 
            />
            <Route path="/advisor" element={<AdvisorPage />} />
            <Route path="/roadmap" element={<RoadmapPage />} />
            <Route path="/gpa" element={<GpaPage />} />
            <Route path="/graduation" element={<GraduationPage />} />
            <Route path="/career" element={<CareerPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="*" element={<ChatPage activeChat={activeChat} onUpdateChat={handleUpdateChat} />} />
          </Routes>
        </div>
      </div>

      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
      <HelpModal isOpen={helpModalOpen} onClose={() => setHelpModalOpen(false)} />
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}
