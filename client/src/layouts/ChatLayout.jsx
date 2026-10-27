import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import BottomNav from '../components/BottomNav';
import AuthModal from '../components/AuthModal';
import HelpModal from '../components/HelpModal';

export default function ChatLayout({
  children,
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
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  const handleToggleSidebar = () => {
    if (window.innerWidth <= 768) {
      setIsMobileDrawerOpen(prev => !prev);
    } else {
      setIsSidebarCollapsed(!isSidebarCollapsed);
    }
  };

  return (
    <div className="app-shell">
      {/* Mobile Backdrop Overlay */}
      <div 
        className={`sidebar-overlay ${isMobileDrawerOpen ? 'active' : ''}`}
        onClick={() => setIsMobileDrawerOpen(false)}
        aria-hidden="true"
      />

      <Sidebar
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
        isMobileOpen={isMobileDrawerOpen}
        onCloseMobile={() => setIsMobileDrawerOpen(false)}
        chatSessions={chatSessions}
        activeChatId={activeChatId}
        onSelectChat={onSelectChat}
        onNewChat={onNewChat}
        onDeleteChat={onDeleteChat}
        onOpenAuth={() => setAuthModalOpen(true)}
        onOpenHelp={() => setHelpModalOpen(true)}
      />

      <div className="main-view has-bottom-nav">
        <Header
          onToggleSidebar={handleToggleSidebar}
          darkMode={darkMode}
          setDarkMode={setDarkMode}
          onSelectSuggestion={onSelectSuggestion}
        />

        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          {children}
        </div>
      </div>

      <BottomNav />

      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
      <HelpModal isOpen={helpModalOpen} onClose={() => setHelpModalOpen(false)} />
    </div>
  );
}
