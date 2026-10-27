import React from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import AuthModal from '../components/AuthModal';
import HelpModal from '../components/HelpModal';

export default function MainLayout({
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
  return (
    <div className="app-shell">
      <Sidebar
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
        chatSessions={chatSessions}
        activeChatId={activeChatId}
        onSelectChat={onSelectChat}
        onNewChat={onNewChat}
        onDeleteChat={onDeleteChat}
        onOpenAuth={() => setAuthModalOpen(true)}
        onOpenHelp={() => setHelpModalOpen(true)}
      />

      <div className="main-view">
        <Header
          onToggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          darkMode={darkMode}
          setDarkMode={setDarkMode}
          onSelectSuggestion={onSelectSuggestion}
        />

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {children}
        </div>
      </div>

      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
      <HelpModal isOpen={helpModalOpen} onClose={() => setHelpModalOpen(false)} />
    </div>
  );
}
