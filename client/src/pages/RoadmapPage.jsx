import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Map, 
  CheckSquare, 
  Square, 
  Search, 
  RotateCcw, 
  Sparkles, 
  AlertCircle, 
  CheckCircle, 
  Layers,
  ChevronRight,
  Bot,
  Send,
  Loader2,
  FileSpreadsheet
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import AiChatSidebar from '../components/AiChatSidebar';
import MobileChatDrawer from '../components/MobileChatDrawer';

const STORAGE_COMPLETED_KEY = 'vlu_roadmap_completed_courses';

export default function RoadmapPage() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [curriculum, setCurriculum] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isMobileChatOpen, setIsMobileChatOpen] = useState(false);
  const [completedCodes, setCompletedCodes] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_COMPLETED_KEY);
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  // Đồng bộ với completedCourses từ MongoDB profile nếu có
  useEffect(() => {
    if (profile && Array.isArray(profile.completedCourses) && profile.completedCourses.length > 0) {
      setCompletedCodes(new Set(profile.completedCourses));
    }
  }, [profile]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSection, setSelectedSection] = useState('all');

  useEffect(() => {
    api.getCurriculum()
      .then(res => {
        if (res.success) {
          setCurriculum(res.data);
        }
      })
      .catch(err => console.error("Lỗi nạp khung đào tạo:", err))
      .finally(() => setLoading(false));
  }, []);

  const handleToggleCourse = (code) => {
    setCompletedCodes(prev => {
      const isCurrentlyCompleted = prev.has(code);
      
      // Tính năng ràng buộc môn tiên quyết (nếu đang muốn đánh dấu là Đã học)
      if (!isCurrentlyCompleted) {
        const course = allCourses.find(c => c.code === code);
        if (course && course.prerequisites && course.prerequisites.length > 0) {
          const unmetPrereqs = course.prerequisites.filter(p => !prev.has(p));
          if (unmetPrereqs.length > 0) {
            const ok = window.confirm(`Môn này có học phần trước là ${unmetPrereqs.join(', ')}.\nBạn vẫn muốn đánh dấu là đã học?`);
            if (!ok) return prev; // Hủy thao tác nếu người dùng chọn Cancel
          }
        }
      }

      const next = new Set(prev);
      if (isCurrentlyCompleted) {
        next.delete(code);
      } else {
        next.add(code);
      }
      localStorage.setItem(STORAGE_COMPLETED_KEY, JSON.stringify([...next]));
      if (user) {
        api.updateMyProfile({ completedCourses: [...next] }).catch(() => {});
      }
      return next;
    });
  };

  const handleClearAll = () => {
    if (window.confirm("Bạn có chắc chắn muốn bỏ chọn tất cả các môn đã tích?")) {
      setCompletedCodes(new Set());
      localStorage.removeItem(STORAGE_COMPLETED_KEY);
    }
  };

  // Tính toán tất cả môn học
  const allCourses = useMemo(() => {
    if (!curriculum?.sections) return [];
    const list = [];
    curriculum.sections.forEach(sec => {
      sec.courses?.forEach(c => {
        list.push({
          ...c,
          sectionName: sec.name
        });
      });
    });
    return list;
  }, [curriculum]);

  // Tính toán tổng số tín chỉ tích lũy
  const totalTargetCredits = 126;
  const earnedCredits = useMemo(() => {
    return allCourses
      .filter(c => completedCodes.has(c.code))
      .reduce((sum, c) => sum + (Number(c.credits) || 0), 0);
  }, [allCourses, completedCodes]);

  const remainingCredits = Math.max(0, totalTargetCredits - earnedCredits);
  const percent = Math.min(100, Math.round((earnedCredits / totalTargetCredits) * 100));

  // Kích hoạt pháo giấy confetti khi đạt 100%
  useEffect(() => {
    if (percent === 100 && earnedCredits > 0) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    }
  }, [percent, earnedCredits]);

  // Bộ lọc tìm kiếm
  const filteredCourses = useMemo(() => {
    return allCourses.filter(c => {
      const matchesSearch = 
        !searchQuery || 
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        c.code.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesSection = 
        selectedSection === 'all' || 
        c.sectionName === selectedSection;

      return matchesSearch && matchesSection;
    });
  }, [allCourses, searchQuery, selectedSection]);

  const sectionsList = useMemo(() => {
    if (!curriculum?.sections) return [];
    return curriculum.sections.map(s => s.name);
  }, [curriculum]);

  return (
    <>
      <div className="two-column-split" style={{ width: '100%', height: 'calc(100vh - 120px)', borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
      {/* Cột trái: Lộ trình môn học */}
      <div className="chatgpt-scroll fade-in" style={{ flex: 1, padding: '24px', overflowY: 'auto', borderRight: '1px solid var(--border-color)', background: 'var(--bg-main)' }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '20px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: 'var(--vlu-red)',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
            <Map size={24} />
          </div>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-main)' }}>
              Lộ Trình Học Tập Cá Nhân Hóa
            </h1>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Tích chọn các môn bạn đã học để hệ thống tính toán tín chỉ và đề xuất lộ trình tối ưu
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button onClick={handleClearAll} className="btn-secondary" style={{ fontSize: '13px' }}>
            <RotateCcw size={15} /> Bỏ chọn tất cả
          </button>
          <button
            onClick={() => setIsMobileChatOpen(true)}
            className="mobile-only-chat-btn"
            title="Mở Chat box Trợ lý Lộ trình"
          >
            <Bot size={15} />
            <span>Chat box lộ trình</span>
          </button>
        </div>
      </div>

      {/* Progress Card */}
      <div className="vlu-card" style={{ marginBottom: '24px', padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Tiến trình tích lũy: </span>
            <strong style={{ fontSize: '18px', color: 'var(--vlu-red)' }}>{earnedCredits}</strong>
            <span style={{ color: 'var(--text-muted)' }}> / {totalTargetCredits} Tín chỉ</span>
          </div>

          <div style={{ display: 'flex', gap: '16px', fontSize: '13px' }}>
            <span>Còn thiếu: <strong>{remainingCredits} TC</strong></span>
            <span>Tỷ lệ hoàn thành: <strong style={{ color: '#16a34a' }}>{percent}%</strong></span>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{
          width: '100%',
          height: '12px',
          borderRadius: '9999px',
          background: 'var(--border-color)',
          overflow: 'hidden',
          marginBottom: '10px'
        }}>
          <div style={{
            width: `${percent}%`,
            height: '100%',
            background: 'linear-gradient(90deg, var(--vlu-red) 0%, #ff5252 50%, #16a34a 100%)',
            borderRadius: '9999px',
            transition: 'width 0.4s ease'
          }} />
        </div>

        <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Sparkles size={14} color="var(--vlu-red)" />
          <span>Mẹo: Bạn nên ưu tiên đăng ký các môn tiên quyết cơ sở khối ngành trước để mở khóa các môn chuyên sâu kỳ sau.</span>
        </div>
      </div>

      {/* Toolbar Search & Filter */}
      <div style={{
        display: 'flex',
        gap: '12px',
        marginBottom: '20px',
        flexWrap: 'wrap'
      }}>
        <div style={{
          flex: 1,
          minWidth: '240px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-sm)',
          padding: '8px 12px'
        }}>
          <Search size={16} color="var(--text-muted)" />
          <input 
            type="text"
            placeholder="Tìm theo tên môn hoặc mã học phần (ví dụ: 71ITBS10203, Lập trình)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              border: 'none',
              background: 'transparent',
              outline: 'none',
              width: '100%',
              fontSize: '13px',
              color: 'var(--text-main)'
            }}
          />
        </div>

        {sectionsList.length > 1 && (
          <select
            value={selectedSection}
            onChange={(e) => setSelectedSection(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-secondary)',
              color: 'var(--text-main)',
              fontSize: '13px'
            }}
          >
            <option value="all">Tất cả phân nhóm kiến thức</option>
            {sectionsList.map(sec => (
              <option key={sec} value={sec}>{sec}</option>
            ))}
          </select>
        )}
      </div>

      {/* Courses List Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
          Đang nạp Khung chương trình đào tạo K30 CNTT...
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '14px',
          marginBottom: '30px'
        }}>
          {filteredCourses.map(course => {
            const isCompleted = completedCodes.has(course.code);
            return (
              <div 
                key={course.code}
                onClick={() => handleToggleCourse(course.code)}
                style={{
                  background: isCompleted ? 'rgba(34, 197, 94, 0.05)' : 'var(--bg-card)',
                  border: isCompleted ? '1px solid #22c55e' : '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  padding: '16px',
                  cursor: 'pointer',
                  transition: 'var(--transition)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: isCompleted ? '0 0 10px rgba(34, 197, 94, 0.1)' : 'var(--shadow-sm)'
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <span style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--text-muted)', fontWeight: 600 }}>
                      {course.code}
                    </span>
                    <span className={`badge ${isCompleted ? 'badge-green' : 'badge-orange'}`} style={{ fontSize: '11px' }}>
                      {course.credits} TC
                    </span>
                  </div>

                  <h3 style={{
                    fontSize: '14px',
                    fontWeight: 700,
                    color: isCompleted ? '#16a34a' : 'var(--text-main)',
                    marginBottom: '8px',
                    lineHeight: 1.4
                  }}>
                    {course.name}
                  </h3>

                  {course.prerequisites && course.prerequisites.length > 0 && (
                    <div style={{ fontSize: '11px', color: '#ea580c', marginTop: '6px' }}>
                      <strong>Tiên quyết: </strong>
                      <span>{course.prerequisites.join(', ')}</span>
                    </div>
                  )}
                </div>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginTop: '14px',
                  paddingTop: '10px',
                  borderTop: '1px solid var(--border-color)',
                  fontSize: '12px'
                }}>
                  <span style={{ color: isCompleted ? '#16a34a' : 'var(--text-muted)' }}>
                    {isCompleted ? '✓ Đã tích lũy' : 'Chưa học'}
                  </span>
                  {isCompleted ? (
                    <CheckCircle size={18} color="#22c55e" />
                  ) : (
                    <Square size={18} color="var(--text-muted)" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
      </div>

      {/* Cột phải: Chatbot Trợ lý lộ trình (Chỉ hiện trên desktop, mobile mở qua nút bấm) */}
      <div className="desktop-only-chat-column" style={{ width: '380px', flexShrink: 0, height: '100%', padding: '16px', boxSizing: 'border-box' }}>
        <AiChatSidebar
          mode="roadmap"
          title="Trợ lý Lộ trình Học tập"
          subtitle={`K30 CNTT • Đã tích lũy ${earnedCredits}/${totalTargetCredits} TC`}
          placeholder="Hỏi về môn tiếp theo, điều kiện tiên quyết..."
          quickReplies={[
            { label: 'Môn nên học tiếp theo?', text: `Tôi đã tích lũy ${earnedCredits}/${totalTargetCredits} tín chỉ. Học kỳ tới tôi nên ưu tiên đăng ký môn nào?` },
            { label: 'Điều kiện tiên quyết?', text: 'Các môn học nào có chuỗi tiên quyết dài nhất cần hoàn thành sớm?' },
            { label: 'Tín chỉ còn thiếu?', text: `Tôi còn thiếu ${remainingCredits} tín chỉ, hãy phân tích khối kiến thức tôi cần học.` }
          ]}
          systemContext={`Sinh viên đang xem Lộ trình Khóa 30 CNTT. Đã tích lũy: ${earnedCredits}/${totalTargetCredits} tín chỉ. Các môn đã đánh dấu học xong: ${[...completedCodes].join(', ') || 'Chưa tích lũy môn nào'}. Tín chỉ còn thiếu: ${remainingCredits}.`}
          initialMessage="Chào bạn! Mình là Trợ lý Lộ trình Học tập K30 (126 tín chỉ). Bạn có thể tích các môn đã học bên trái rồi hỏi mình về môn tiếp theo hoặc điều kiện tiên quyết nhé!"
        />
      </div>
    </div>

    {/* Nút nổi (FAB) trên Mobile để mở Chatbox ngay mà không cần lướt */}
    <button
      onClick={() => setIsMobileChatOpen(true)}
      className="mobile-floating-chat-btn"
      title="Mở Chat box Lộ trình"
    >
      <Bot size={18} />
      <span>Chat box lộ trình</span>
    </button>

    {/* Modal Drawer Chatbox toàn diện trên Mobile khi bấm nút (Render qua React Portal chống che chữ / mất khung nhắn) */}
    <MobileChatDrawer isOpen={isMobileChatOpen} onClose={() => setIsMobileChatOpen(false)}>
      <AiChatSidebar
        mode="roadmap"
        title="Trợ lý Lộ trình Học tập"
        subtitle={`K30 CNTT • Đã tích lũy ${earnedCredits}/${totalTargetCredits} TC`}
        placeholder="Hỏi về môn tiếp theo, điều kiện tiên quyết..."
        quickReplies={[
          { label: 'Môn nên học tiếp theo?', text: `Tôi đã tích lũy ${earnedCredits}/${totalTargetCredits} tín chỉ. Học kỳ tới tôi nên ưu tiên đăng ký môn nào?` },
          { label: 'Điều kiện tiên quyết?', text: 'Các môn học nào có chuỗi tiên quyết dài nhất cần hoàn thành sớm?' },
          { label: 'Tín chỉ còn thiếu?', text: `Tôi còn thiếu ${remainingCredits} tín chỉ, hãy phân tích khối kiến thức tôi cần học.` }
        ]}
        systemContext={`Sinh viên đang xem Lộ trình Khóa 30 CNTT. Đã tích lũy: ${earnedCredits}/${totalTargetCredits} tín chỉ. Các môn đã đánh dấu học xong: ${[...completedCodes].join(', ') || 'Chưa tích lũy môn nào'}. Tín chỉ còn thiếu: ${remainingCredits}.`}
        initialMessage="Chào bạn! Mình là Trợ lý Lộ trình Học tập K30 (126 tín chỉ). Bạn có thể tích các môn đã học bên trái rồi hỏi mình về môn tiếp theo hoặc điều kiện tiên quyết nhé!"
        onClose={() => setIsMobileChatOpen(false)}
      />
    </MobileChatDrawer>
    </>
  );
}
