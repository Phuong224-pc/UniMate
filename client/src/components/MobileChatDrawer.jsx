import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

/**
 * MobileChatDrawer - Component cổng hiển thị Chatbox dạng ngăn kéo di động toàn màn hình
 * Được gắn trực tiếp vào document.body qua React Portal để:
 * 1. Không bị kẹt hay cắt chữ bởi thanh cuộn của thẻ cha (main container)
 * 2. Luôn nổi lên trên cùng (z-index 999999) cao hơn cả header, subnav và bottom navigation
 * 3. Cố định khung nhập tin nhắn ở đáy màn hình chuẩn tỷ lệ di động
 */
export default function MobileChatDrawer({ isOpen, onClose, children }) {
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div 
      className="mobile-chat-drawer-overlay" 
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <div 
        className="mobile-chat-drawer-container" 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mobile-chat-drawer-handle" />
        {children}
      </div>
    </div>,
    document.body
  );
}
