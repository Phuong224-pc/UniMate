import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Mic, 
  MicOff, 
  Plus, 
  Image as ImageIcon, 
  Sparkles, 
  Brain, 
  Globe, 
  BookOpen, 
  FileEdit, 
  X, 
  ArrowDown, 
  Calculator, 
  BookMarked, 
  HelpCircle,
  Copy,
  Check
} from 'lucide-react';
import { 
  GraduationCap, 
  Compass, 
  Route, 
  Bot, 
  Zap, 
  ChevronRight 
} from 'lucide-react';
import { marked } from 'marked';
import prism from 'prismjs';
import { api } from '../services/api';


const BOTS = [
  {
    id: 'default',
    name: 'VLU Toàn Diện',
    icon: Bot,
    badge: 'Đa năng',
    desc: 'Tư vấn thông tin trường, quy chế, học phí & tuyển sinh',
    color: 'var(--vlu-red)',
    placeholder: 'Hỏi VLU Chatbot bất cứ điều gì về trường Văn Lang... (Enter để gửi)',
    suggestions: [
      { title: 'Các cơ sở đào tạo', desc: 'CS3 Đặng Thùy Trâm, CS1 Q.1, CS2 Q.6', query: 'Trường Đại học Văn Lang có những cơ sở nào tại TP.HCM?' },
      { title: 'Học phí & Học bổng', desc: 'Chính sách miễn giảm và thời hạn', query: 'Lịch đóng học phí trường Văn Lang năm học 2025-2026' },
      { title: 'Khung đào tạo K30', desc: 'Chương trình 126 tín chỉ', query: 'Khung chương trình đào tạo Khoa CNTT K30 Văn Lang' },
      { title: 'Cẩm nang sinh viên', desc: 'Quy định thi và điểm rèn luyện', query: 'Cẩm nang sinh viên Đại học Văn Lang mới nhất' }
    ]
  },
  {
    id: 'graduation',
    name: 'Dự Báo Tốt Nghiệp',
    icon: GraduationCap,
    badge: 'Xét tốt nghiệp',
    desc: 'Kiểm tra 126 tín chỉ K30, chuẩn ngoại ngữ & tin học ra trường',
    color: '#10b981',
    placeholder: 'Nhập MSSV hoặc hỏi điều kiện tốt nghiệp... (Enter để gửi)',
    suggestions: [
      { title: 'Tiến độ SV 2474802010458', desc: 'Kiểm tra tín chỉ và môn còn nợ', query: 'Xem tiến độ và điều kiện tốt nghiệp của sinh viên MSSV 2474802010458' },
      { title: 'Điều kiện tốt nghiệp K30', desc: '126 tín chỉ, MOS, TOEIC, GDQP', query: 'Điều kiện tốt nghiệp ngành CNTT K30 Đại học Văn Lang gồm những gì?' },
      { title: 'Chuẩn đầu ra ngoại ngữ', desc: 'TOEIC / IELTS quy định', query: 'Chuẩn đầu ra ngoại ngữ và tin học để xét tốt nghiệp tại VLU là gì?' },
      { title: 'Khóa luận & Môn thay thế', desc: 'Điều kiện làm khóa luận tốt nghiệp', query: 'Điều kiện để được làm Khóa luận tốt nghiệp hoặc học môn thay thế?' }
    ]
  },
  {
    id: 'results',
    name: 'Kết Quả & GPA',
    icon: Calculator,
    badge: 'Học vụ & Điểm',
    desc: 'Phân tích bảng điểm, cảnh báo môn nợ, tính GPA mục tiêu',
    color: '#3b82f6',
    placeholder: 'Hỏi về điểm môn học, cách tính GPA, cảnh báo học vụ... (Enter để gửi)',
    suggestions: [
      { title: 'Bảng điểm SV 2474802010458', desc: 'Xem GPA và xếp loại học tập', query: 'Phân tích bảng điểm và xếp loại học tập của sinh viên MSSV 2474802010458' },
      { title: 'Kế hoạch nâng GPA', desc: 'Cách kéo GPA lên 3.2 Giỏi', query: 'Hiện tại GPA của tôi là 2.8, kỳ tới học 15 tín chỉ thì cần bao nhiêu điểm để đạt 3.2?' },
      { title: 'Quy chế điểm & Cảnh báo', desc: 'Điểm F, điểm D, học lại môn', query: 'Quy chế tính điểm hệ 4 và quy định cảnh báo học vụ tại Văn Lang như thế nào?' },
      { title: 'Học cải thiện môn nào', desc: 'Tối ưu thời gian và chi phí', query: 'Gợi ý các môn nên đăng ký học cải thiện để tăng GPA nhanh nhất' }
    ]
  },
  {
    id: 'advisor',
    name: 'Cố Vấn Lộ Trình',
    icon: Route,
    badge: 'Lộ trình K30',
    desc: 'Tư vấn đăng ký môn học, kiểm tra điều kiện tiên quyết',
    color: '#8b5cf6',
    placeholder: 'Hỏi môn tiên quyết, thứ tự đăng ký môn học... (Enter để gửi)',
    suggestions: [
      { title: 'Môn nên học kỳ tới', desc: 'Theo tiến độ chuẩn K30 CNTT', query: 'Tôi là sinh viên K30 CNTT năm 2, kỳ tới nên đăng ký những môn nào?' },
      { title: 'Điều kiện môn tiên quyết', desc: 'CSDL, Cấu trúc dữ liệu', query: 'Môn Cấu trúc dữ liệu và giải thuật cần học trước môn nào?' },
      { title: 'Lộ trình ra trường 3.5 năm', desc: 'Chiến lược học vượt kỳ phụ', query: 'Làm thế nào để sinh viên CNTT Văn Lang có thể tốt nghiệp sớm trong 3.5 năm?' },
      { title: 'Chuyên ngành Kỹ thuật phần mềm', desc: 'Danh sách môn chuyên ngành', query: 'Các môn học thuộc chuyên ngành Kỹ thuật phần mềm trong khung K30 gồm những gì?' }
    ]
  },
  {
    id: 'future',
    name: 'Định Hướng Nghề Nghiệp',
    icon: Compass,
    badge: 'Career & Tech',
    desc: 'Tư vấn hướng đi nghề nghiệp, tech stack, roadmap 90 ngày',
    color: '#f59e0b',
    placeholder: 'Hỏi về định hướng việc làm, công nghệ cần học... (Enter để gửi)',
    suggestions: [
      { title: 'Lộ trình Fullstack Web', desc: 'React, Node.js, SQL, Cloud', query: 'Lộ trình 90 ngày tự học để trở thành Fullstack Web Developer cho sinh viên VLU' },
      { title: 'Kỹ sư AI / Data Science', desc: 'Xu hướng thị trường việc làm', query: 'Sinh viên năm 2 muốn theo hướng Trí tuệ nhân tạo (AI) thì cần chuẩn bị kiến thức gì?' },
      { title: 'Chuẩn bị thực tập', desc: 'CV, GitHub portfolio, phỏng vấn', query: 'Cần chuẩn bị những gì để ứng tuyển thực tập thực tế (Internship) tại doanh nghiệp?' },
      { title: 'So sánh Web vs Mobile vs AI', desc: 'Nên chọn hướng nào phù hợp', query: 'So sánh cơ hội việc làm giữa Lập trình Web, Mobile App và AI tại TP.HCM' }
    ]
  }
];

export default function ChatPage({ activeChat, onUpdateChat }) {
  const [messages, setMessages] = useState(activeChat?.messages || []);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [attachedImage, setAttachedImage] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [attachMenuOpen, setAttachMenuOpen] = useState(false);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [selectedBotId, setSelectedBotId] = useState(activeChat?.mode || 'default');
  const [copiedIndex, setCopiedIndex] = useState(null);
  const currentBot = BOTS.find(b => b.id === selectedBotId) || BOTS[0];

  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const fileInputRef = useRef(null);
  const recognitionRef = useRef(null);

  // Đồng bộ với activeChat khi chuyển session
  useEffect(() => {
    setMessages(activeChat?.messages || []);
    if (activeChat?.mode) {
      setSelectedBotId(activeChat.mode);
    }
  }, [activeChat?.id]);

  useEffect(() => {
    scrollToBottom();
    prism.highlightAll();
  }, [messages, loading]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleScroll = () => {
    if (!chatContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
    setShowScrollBottom(scrollHeight - scrollTop - clientHeight > 150);
  };

  // Web Speech API
  const toggleSpeechRecognition = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert("Trình duyệt của bạn không hỗ trợ nhận diện giọng nói Web Speech API.");
      return;
    }

    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'vi-VN';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setIsRecording(true);
    recognition.onend = () => setIsRecording(false);
    recognition.onerror = () => setIsRecording(false);
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInput(prev => (prev ? prev + ' ' + transcript : transcript));
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setAttachedImage({
        name: file.name,
        mimeType: file.type,
        data: event.target.result
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
    setAttachMenuOpen(false);
  };

  const handleSend = async (customText = null) => {
    const textToSend = (customText || input).trim();
    if (!textToSend && !attachedImage) return;

    const userMsg = {
      role: 'user',
      content: textToSend,
      image: attachedImage?.data || null,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    const currentImg = attachedImage;
    setAttachedImage(null);
    setLoading(true);

    try {
      const validHistory = newMessages
        .filter(m => !m.isError && m.content && !m.content.startsWith('⚠️ Lỗi kết nối AI'))
        .map(m => ({ role: m.role, content: m.content }));

      const response = await api.chat({
        messages: validHistory,
        mode: currentBot.id,
        image: currentImg
      });

      const assistantMsg = {
        role: 'assistant',
        content: response.reply,
        model: response.model,
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
      };

      const finalMessages = [...newMessages, assistantMsg];
      setMessages(finalMessages);

      if (onUpdateChat) {
        onUpdateChat(finalMessages, userMsg.content, currentBot.id);
      }
    } catch (err) {
      const errorMsg = {
        role: 'assistant',
        content: `⚠️ Lỗi kết nối AI: ${err.message || 'Hệ thống đang quá tải'}. Vui lòng thử lại sau vài giây!`,
        isError: true,
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
      };
      setMessages([...newMessages, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const copyToClipboard = (text, index) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
      {/* Bot Selector Header Bar */}
      <div style={{
        background: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border-color)',
        padding: '10px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        overflowX: 'auto',
        scrollbarWidth: 'none',
        flexShrink: 0,
        zIndex: 10
      }}>
        <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.5px', whiteSpace: 'nowrap', marginRight: '4px' }}>
          Chọn Bot:
        </div>
        {BOTS.map((bot) => {
          const Icon = bot.icon;
          const isSelected = bot.id === selectedBotId;
          return (
            <button
              key={bot.id}
              onClick={() => setSelectedBotId(bot.id)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '7px 12px',
                borderRadius: '20px',
                border: isSelected ? `1.5px solid ${bot.color}` : '1px solid var(--border-color)',
                background: isSelected ? 'rgba(196, 18, 48, 0.08)' : 'var(--bg-primary)',
                color: isSelected ? (bot.id === 'default' ? 'var(--vlu-red)' : bot.color) : 'var(--text-secondary)',
                fontSize: '12px',
                fontWeight: isSelected ? 700 : 500,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
                boxShadow: isSelected ? 'var(--shadow-sm)' : 'none'
              }}
              title={bot.desc}
            >
              <Icon size={14} color={isSelected ? (bot.id === 'default' ? 'var(--vlu-red)' : bot.color) : 'var(--text-muted)'} />
              <span>{bot.name}</span>
              {isSelected && (
                <span style={{
                  fontSize: '10px',
                  padding: '1px 6px',
                  borderRadius: '10px',
                  background: bot.id === 'default' ? 'var(--vlu-red)' : bot.color,
                  color: 'white',
                  fontWeight: 600
                }}>
                  {bot.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Messages Scroll Area */}
      <div 
        ref={chatContainerRef}
        onScroll={handleScroll}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px 20px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}
      >
        <div style={{ width: '100%', maxWidth: '840px' }}>
          {messages.length === 0 ? (
            /* Dynamic Welcome Screen theo Bot được chọn */
            <div style={{ textAlign: 'center', marginTop: '30px', animation: 'fadeIn 0.35s ease-out' }}>
              <div style={{
                width: '68px',
                height: '68px',
                borderRadius: '22px',
                background: 'var(--vlu-red-light)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '14px',
                border: '1px solid rgba(196, 18, 48, 0.2)'
              }}>
                <img src="/img/logovanlang.png" alt="VLU" style={{ width: '44px', height: '44px', objectFit: 'contain' }} />
              </div>
              
              <h1 style={{ fontSize: '26px', fontWeight: 800, marginBottom: '6px' }}>
                <span className="gradient-text">{currentBot.name}</span>
              </h1>
              
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', maxWidth: '540px', margin: '0 auto 24px', lineHeight: 1.6 }}>
                {currentBot.desc}. Hãy đặt câu hỏi hoặc bấm vào gợi ý bên dưới để bắt đầu ngay!
              </p>

              {/* Suggestion Cards */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '12px',
                textAlign: 'left'
              }}>
                {currentBot.suggestions.map((sug, idx) => (
                  <div 
                    key={idx}
                    className="vlu-card"
                    onClick={() => handleSend(sug.query)}
                    style={{ 
                      cursor: 'pointer', 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '12px', 
                      padding: '14px',
                      transition: 'transform 0.15s, border-color 0.15s'
                    }}
                  >
                    <div style={{ 
                      padding: '8px', 
                      borderRadius: '8px', 
                      background: 'rgba(196, 18, 48, 0.08)', 
                      color: currentBot.id === 'default' ? 'var(--vlu-red)' : currentBot.color 
                    }}>
                      <Zap size={18} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {sug.title}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {sug.desc}
                      </div>
                    </div>
                    <ChevronRight size={14} color="var(--text-muted)" />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* Messages List */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {messages.map((msg, index) => {
                const isUser = msg.role === 'user';
                return (
                  <div 
                    key={index}
                    style={{
                      display: 'flex',
                      gap: '12px',
                      justifyContent: isUser ? 'flex-end' : 'flex-start',
                      animation: 'fadeIn 0.2s ease-out'
                    }}
                  >
                    {!isUser && (
                      <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        background: 'var(--vlu-red-light)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        border: '1px solid rgba(196, 18, 48, 0.2)'
                      }}>
                        <img src="/img/logovanlang.png" alt="Bot" style={{ width: '22px', height: '22px', objectFit: 'contain' }} />
                      </div>
                    )}

                    <div style={{
                      maxWidth: '78%',
                      background: isUser ? 'var(--vlu-red)' : 'var(--bg-secondary)',
                      color: isUser ? '#ffffff' : 'var(--text-main)',
                      padding: '14px 18px',
                      borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                      border: isUser ? 'none' : '1px solid var(--border-color)',
                      boxShadow: 'var(--shadow-sm)',
                      position: 'relative'
                    }}>
                      {/* Hiển thị ảnh kèm nếu có */}
                      {msg.image && (
                        <div style={{ marginBottom: '10px', borderRadius: '8px', overflow: 'hidden' }}>
                          <img src={msg.image} alt="Upload" style={{ maxHeight: '240px', maxWidth: '100%', objectFit: 'cover', borderRadius: '8px' }} />
                        </div>
                      )}

                      {/* Content */}
                      {isUser ? (
                        <div style={{ whiteSpace: 'pre-wrap', fontSize: '14px', lineHeight: 1.6 }}>{msg.content}</div>
                      ) : (
                        <div 
                          className="markdown-body"
                          dangerouslySetInnerHTML={{ __html: marked.parse(msg.content || '') }}
                        />
                      )}

                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginTop: '6px',
                        fontSize: '11px',
                        opacity: 0.7
                      }}>
                        <span>{msg.timestamp}</span>
                        {!isUser && (
                          <button
                            onClick={() => copyToClipboard(msg.content)}
                            style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: '2px 4px' }}
                            title="Sao chép nội dung"
                          >
                            <Copy size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Loading Indicator */}
              {loading && (
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: 'var(--vlu-red-light)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <img src="/img/logovanlang.png" alt="Bot" style={{ width: '22px', height: '22px', objectFit: 'contain' }} />
                  </div>
                  <div style={{
                    padding: '12px 18px',
                    borderRadius: '18px',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '13px',
                    color: 'var(--text-muted)'
                  }}>
                    <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: 'var(--vlu-red)', animation: 'pulseGlow 1.2s infinite' }}></span>
                    <span>VLU AI đang soạn thảo câu trả lời...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* Scroll to bottom button */}
      {showScrollBottom && (
        <button
          onClick={scrollToBottom}
          style={{
            position: 'absolute',
            bottom: '100px',
            right: '30px',
            width: '38px',
            height: '38px',
            borderRadius: '50%',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            boxShadow: 'var(--shadow-md)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: 'var(--text-main)'
          }}
        >
          <ArrowDown size={18} />
        </button>
      )}

      {/* Input Area */}
      <div style={{
        padding: '16px 20px',
        backgroundColor: 'var(--bg-secondary)',
        borderTop: '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
      }}>
        <div style={{ width: '100%', maxWidth: '840px' }}>
          {/* Image Preview if attached */}
          {attachedImage && (
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 10px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--bg-tertiary)',
              marginBottom: '10px',
              border: '1px solid var(--border-color)'
            }}>
              <img src={attachedImage.data} alt="Preview" style={{ width: '32px', height: '32px', objectFit: 'cover', borderRadius: '4px' }} />
              <span style={{ fontSize: '12px', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {attachedImage.name}
              </span>
              <button
                onClick={() => setAttachedImage(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={15} />
              </button>
            </div>
          )}

                    {/* Quick chips above input */}
          {messages.length > 0 && (
            <div style={{
              display: 'flex',
              gap: '6px',
              overflowX: 'auto',
              scrollbarWidth: 'none',
              paddingBottom: '8px',
              whiteSpace: 'nowrap'
            }}>
              {currentBot.suggestions.slice(0, 3).map((sug, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(sug.query)}
                  style={{
                    fontSize: '11px',
                    padding: '4px 10px',
                    borderRadius: '16px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-primary)',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <Zap size={11} color="var(--vlu-red)" />
                  <span>{sug.title}</span>
                </button>
              ))}
            </div>
          )}

          <div style={{
            display: 'flex',
            alignItems: 'flex-end',
            gap: '10px',
            background: 'var(--bg-primary)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            padding: '8px 12px',
            position: 'relative'
          }}>
            {/* Plus button & Menu */}
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setAttachMenuOpen(!attachMenuOpen)}
                style={{
                  background: 'var(--bg-tertiary)',
                  border: 'none',
                  width: '34px',
                  height: '34px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: 'var(--text-main)',
                  transition: 'var(--transition)'
                }}
                title="Tính năng mở rộng & Đính kèm"
              >
                <Plus size={18} />
              </button>

              {attachMenuOpen && (
                <div style={{
                  position: 'absolute',
                  bottom: '120%',
                  left: 0,
                  width: '230px',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  boxShadow: 'var(--shadow-lg)',
                  padding: '6px',
                  zIndex: 100
                }}>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-tertiary)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <ImageIcon size={16} color="var(--vlu-red)" />
                    <span>Thêm ảnh và tệp</span>
                  </div>

                  <div
                    onClick={() => {
                      setInput(prev => prev + " [Yêu cầu nghiên cứu chuyên sâu]: ");
                      setAttachMenuOpen(false);
                    }}
                    style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-tertiary)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <Brain size={16} color="#8b5cf6" />
                    <span>Nghiên cứu chuyên sâu</span>
                  </div>

                  <div
                    onClick={() => {
                      setInput(prev => prev + " [Phân tích logic]: ");
                      setAttachMenuOpen(false);
                    }}
                    style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-tertiary)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <Sparkles size={16} color="#f59e0b" />
                    <span>Suy nghĩ từng bước</span>
                  </div>
                </div>
              )}
            </div>

            {/* Hidden file input */}
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
              accept="image/*,.pdf,.txt" 
              style={{ display: 'none' }} 
            />

            {/* Main Textarea */}
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={currentBot.placeholder}
              rows={1}
              style={{
                flex: 1,
                border: 'none',
                background: 'transparent',
                outline: 'none',
                resize: 'none',
                fontSize: '14px',
                color: 'var(--text-main)',
                maxHeight: '140px',
                padding: '6px 4px',
                fontFamily: 'inherit'
              }}
            />

            {/* Mic & Send */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                type="button"
                onClick={toggleSpeechRecognition}
                style={{
                  background: isRecording ? 'rgba(239, 68, 68, 0.15)' : 'none',
                  border: 'none',
                  color: isRecording ? '#ef4444' : 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '6px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center'
                }}
                title={isRecording ? "Đang ghi âm (Bấm để dừng)" : "Nhập bằng giọng nói"}
              >
                {isRecording ? <MicOff size={18} /> : <Mic size={18} />}
              </button>

              <button
                type="button"
                onClick={() => handleSend()}
                disabled={(!input.trim() && !attachedImage) || loading}
                style={{
                  background: (input.trim() || attachedImage) && !loading ? 'var(--vlu-red)' : 'var(--border-color)',
                  color: 'white',
                  border: 'none',
                  width: '34px',
                  height: '34px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: (input.trim() || attachedImage) && !loading ? 'pointer' : 'default',
                  transition: 'var(--transition)'
                }}
                title="Gửi tin nhắn (Enter)"
              >
                <Send size={16} />
              </button>
            </div>
          </div>

          <div style={{ textAlign: 'center', fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>
            VLU Chatbot có thể đưa ra thông tin chưa cập nhật. Hãy đối chiếu lịch đào tạo chính thức trên cổng thông tin sinh viên Văn Lang.
          </div>
        </div>
      </div>
    </div>
  );
}
