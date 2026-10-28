import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, Sparkles, RefreshCw, AlertCircle, Check, X } from 'lucide-react';
import { marked } from 'marked';
import { api } from '../services/api';

/**
 * Standard Unified Support Chatbox Component
 * Modeled after "Trợ lý xét tốt nghiệp"
 *
 * Props:
 * - mode: string ('graduation' | 'roadmap' | 'results' | 'advisor' | 'future')
 * - title: string (e.g. "Trợ lý xét tốt nghiệp", "Trợ lý Lộ trình Học tập")
 * - subtitle: string
 * - placeholder: string
 * - icon: LucideIcon (optional, default Bot)
 * - quickReplies: Array<{ label: string, text: string }> | string[]
 * - systemContext: string (optional page-specific context injected into system prompt)
 * - initialMessage: string (custom greeting)
 * - onCustomSend: function(text, messages) -> Promise<string> (optional custom API handler)
 * - onClose: function (optional callback to close chatbox modal on mobile)
 */
export default function AiChatSidebar({
  mode = 'results',
  title = 'Trợ lý học vụ AI',
  subtitle = 'UniMate Assistant',
  placeholder = 'Nhập câu hỏi của bạn...',
  icon: IconComponent = Bot,
  quickReplies = [],
  systemContext = null,
  initialMessage = null,
  onCustomSend = null,
  onClose = null
}) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [lastFailedMessage, setLastFailedMessage] = useState(null);
  const bottomRef = useRef(null);

  // Set greeting on mount or mode change
  useEffect(() => {
    let greeting = initialMessage;
    if (!greeting) {
      const defaultGreetings = {
        graduation: 'Xin chào! Hãy nhập MSSV hoặc hỏi mình, mình sẽ kiểm tra các điều kiện tốt nghiệp (tín chỉ, GDQP, tiếng Anh, học phí) của bạn.',
        results: 'Xin chào! Mình có thể phân tích điểm GPA, gợi ý cải thiện điểm chữ và tính toán điểm mục tiêu cho bạn.',
        roadmap: 'Xin chào! Mình là Trợ lý Lộ trình Học tập. Bạn có thể hỏi về các môn học tiếp theo, điều kiện tiên quyết và cách sắp xếp 126 tín chỉ K30.',
        advisor: 'Xin chào! Mình có thể tư vấn định hướng công nghệ, lộ trình 90 ngày và kỹ năng cần chuẩn bị cho công việc bạn quan tâm.'
      };
      greeting = defaultGreetings[mode] || defaultGreetings.results;
    }
    setMessages([{ role: 'assistant', content: greeting, ts: Date.now() }]);
    setLastFailedMessage(null);
  }, [mode, initialMessage]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const send = async (textToSend) => {
    const msg = (textToSend !== undefined ? textToSend : input).trim();
    if (!msg || loading) return;

    setLastFailedMessage(null);
    const userMsg = { role: 'user', content: msg, ts: Date.now() };
    const newMsgs = [...messages, userMsg];
    setMessages(newMsgs);
    setInput('');
    setLoading(true);

    try {
      let replyText = '';
      if (typeof onCustomSend === 'function') {
        replyText = await onCustomSend(msg, newMsgs);
      } else {
        const apiMessages = newMsgs
          .filter(m => !m.isError)
          .filter((m, i) => !(m.role === 'assistant' && i === 0))
          .map(m => ({ role: m.role, content: m.content }));

        const res = await api.chat({
          messages: apiMessages,
          mode,
          systemPromptOverride: systemContext || undefined
        });
        replyText = res.reply || 'Đã nhận được phản hồi.';
      }

      setMessages(prev => [...prev, { role: 'assistant', content: replyText, ts: Date.now() }]);
    } catch (err) {
      console.error('Lỗi phản hồi trợ lý AI:', err);
      setLastFailedMessage(msg);
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: '⚠️ Không thể nhận phản hồi: ' + (err.message || 'Lỗi kết nối máy chủ'),
          ts: Date.now(),
          isError: true
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    if (lastFailedMessage) {
      // Remove the last error message and re-send
      setMessages(prev => prev.filter(m => !m.isError));
      send(lastFailedMessage);
    }
  };

  const renderContent = (content) => {
    try {
      return marked.parse(content || '');
    } catch {
      return (content || '').replace(/\n/g, '<br/>');
    }
  };

  const normalizedQuickReplies = (quickReplies || []).map(qr => {
    if (typeof qr === 'string') return { label: qr, text: qr };
    return qr;
  });

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      minHeight: 0,
      maxHeight: onClose ? '100%' : '620px',
      background: 'var(--bg-secondary)',
      border: onClose ? 'none' : '1px solid var(--border-color)',
      borderRadius: onClose ? '0' : 'var(--radius-lg)',
      overflow: 'hidden',
      boxShadow: onClose ? 'none' : 'var(--shadow-sm)',
      position: 'relative',
      flex: 1
    }}>
      {/* ── 1. Unified Gradient Header ── */}
      <div style={{
        padding: '14px 16px',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        background: 'linear-gradient(135deg, var(--vlu-red) 0%, #a80f28 100%)',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        flexShrink: 0
      }}>
        <div style={{
          width: '34px',
          height: '34px',
          borderRadius: '10px',
          background: 'rgba(255,255,255,0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}>
          <IconComponent size={18} color="white" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '13.5px', fontWeight: 700, color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {title}
          </div>
          {subtitle && (
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.8)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {subtitle}
            </div>
          )}
        </div>
        <Sparkles size={15} color="rgba(255,255,255,0.7)" style={{ flexShrink: 0 }} />
        {onClose && (
          <button
            onClick={onClose}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '6px 10px',
              background: 'rgba(255,255,255,0.25)',
              border: 'none',
              borderRadius: '8px',
              color: 'white',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              flexShrink: 0,
              transition: 'background 0.15s'
            }}
            title="Đóng chat box"
          >
            <X size={15} />
            <span>Đóng</span>
          </button>
        )}
      </div>

      {/* ── 2. Quick Suggestion Pills ── */}
      {normalizedQuickReplies.length > 0 && (
        <div style={{
          display: 'flex',
          gap: '6px',
          padding: '8px 12px',
          flexWrap: 'nowrap',
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
          borderBottom: '1px solid var(--border-color)',
          flexShrink: 0,
          background: 'var(--bg-primary)'
        }}>
          {normalizedQuickReplies.map((qr, i) => (
            <button
              key={i}
              onClick={() => send(qr.text)}
              disabled={loading}
              style={{
                fontSize: '11.5px',
                padding: '5px 12px',
                borderRadius: '20px',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-secondary)',
                color: 'var(--text-secondary)',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap',
                flexShrink: 0
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.currentTarget.style.borderColor = 'var(--vlu-red)';
                  e.currentTarget.style.color = 'var(--vlu-red)';
                }
              }}
              onMouseLeave={(e) => {
                if (!loading) {
                  e.currentTarget.style.borderColor = 'var(--border-color)';
                  e.currentTarget.style.color = 'var(--text-secondary)';
                }
              }}
            >
              {qr.label}
            </button>
          ))}
        </div>
      )}

      {/* ── 3. Scrollable Message Feed ── */}
      <div 
        className="chatgpt-scroll"
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          padding: '14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}
      >
        {messages.map((msg, i) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={i}
              style={{
                display: 'flex',
                justifyContent: isUser ? 'flex-end' : 'flex-start'
              }}
            >
              <div style={{
                maxWidth: '88%',
                padding: '10px 14px',
                borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                background: isUser
                  ? 'linear-gradient(135deg, var(--vlu-red) 0%, #c41230 100%)'
                  : msg.isError
                  ? 'rgba(239,68,68,0.08)'
                  : 'var(--bg-primary)',
                color: isUser
                  ? 'white'
                  : msg.isError
                  ? '#ef4444'
                  : 'var(--text-main)',
                fontSize: '13px',
                lineHeight: '1.55',
                border: isUser
                  ? 'none'
                  : msg.isError
                  ? '1px solid rgba(239,68,68,0.25)'
                  : '1px solid var(--border-color)',
                boxShadow: isUser ? '0 2px 8px rgba(196,18,48,0.25)' : 'var(--shadow-sm)',
                wordBreak: 'break-word'
              }}>
                {isUser ? (
                  <div style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</div>
                ) : (
                  <div>
                    <div 
                      className="markdown-body custom-markdown"
                      style={{ fontSize: '13px', lineHeight: '1.55' }}
                      dangerouslySetInnerHTML={{ __html: renderContent(msg.content) }}
                    />
                    {msg.isError && lastFailedMessage && (
                      <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'flex-end' }}>
                        <button
                          onClick={handleRetry}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            background: '#ef4444',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '4px 8px',
                            fontSize: '11px',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          <RefreshCw size={11} /> Thử lại
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Typing bounce dots */}
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{
              padding: '10px 14px',
              borderRadius: '16px 16px 16px 4px',
              background: 'var(--bg-primary)',
              border: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginRight: '4px' }}>UniMate đang trả lời</span>
              {[0, 1, 2].map(d => (
                <div
                  key={d}
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: 'var(--vlu-red)',
                    animation: 'bounce 1.2s infinite',
                    animationDelay: (d * 0.2) + 's'
                  }}
                />
              ))}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ── 4. Bottom Input Bar (Fixed at bottom) ── */}
      <div style={{
        padding: '10px 12px max(12px, env(safe-area-inset-bottom, 12px)) 12px',
        borderTop: '1px solid var(--border-color)',
        background: 'var(--bg-primary)',
        flexShrink: 0,
        position: 'sticky',
        bottom: 0,
        zIndex: 10,
        display: 'flex',
        gap: '8px',
        alignItems: 'center',
        boxShadow: '0 -2px 10px rgba(0,0,0,0.03)',
        boxSizing: 'border-box'
      }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder={placeholder}
          disabled={loading}
          style={{
            flex: 1,
            padding: '10px 14px',
            minHeight: '42px',
            boxSizing: 'border-box',
            fontSize: '14px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-color)',
            background: 'var(--bg-secondary)',
            color: 'var(--text-main)',
            outline: 'none'
          }}
        />
        <button
          onClick={() => send()}
          disabled={loading || !input.trim()}
          style={{
            width: '42px',
            height: '42px',
            borderRadius: '10px',
            background: (loading || !input.trim()) ? 'var(--bg-tertiary)' : 'var(--vlu-red)',
            border: 'none',
            cursor: (loading || !input.trim()) ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background 0.2s ease',
            flexShrink: 0
          }}
          title="Gửi câu hỏi"
        >
          <Send size={16} color={(loading || !input.trim()) ? 'var(--text-muted)' : 'white'} />
        </button>
      </div>
    </div>
  );
}
