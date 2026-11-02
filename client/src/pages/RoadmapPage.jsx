import React, { useState, useEffect, useMemo } from 'react';
import { 
  Map as MapIcon, 
  Square, 
  Search, 
  RotateCcw, 
  Sparkles, 
  CheckCircle, 
  Bot
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import AiChatSidebar from '../components/AiChatSidebar';
import MobileChatDrawer from '../components/MobileChatDrawer';
import AcademicProgress from '../components/AcademicProgress';
import { useAcademicProgress, notifyAcademicUpdated } from '../hooks/useAcademicProgress';

const safeNumber = (val, fallback = 0) => {
  if (val === null || val === undefined || val === '') return fallback;
  if (typeof val === 'object') {
    if (val.$numberInt !== undefined) return Number(val.$numberInt);
    if (val.$numberDouble !== undefined) return Number(val.$numberDouble);
    return fallback;
  }
  const n = Number(val);
  return Number.isFinite(n) ? n : fallback;
};

export default function RoadmapPage() {
  const { user, profile, refreshUser } = useAuth();
  const { progress, error: progressError } = useAcademicProgress();
  const [actionError, setActionError] = useState('');
  const [savingPlan, setSavingPlan] = useState(false);
  const [plannedCodes, setPlannedCodes] = useState(new Set());
  const completedCodes = useMemo(() => {
    return new Set((progress?.courseStates || []).filter(c => ['passed', 'recognized'].includes(c?.status)).map(c => c?.code).filter(Boolean));
  }, [progress]);
  const statesByCode = useMemo(() => {
    return new Map((progress?.courseStates || []).filter(c => c?.code).map(c => [c.code, c]));
  }, [progress]);
  const [curriculum, setCurriculum] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isMobileChatOpen, setIsMobileChatOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSection, setSelectedSection] = useState('all');

  useEffect(() => {
    setPlannedCodes(new Set(Array.isArray(profile?.plannedCourses) ? profile.plannedCourses : []));
  }, [profile]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setActionError('');

    const targetProgram = progress?.curriculum?.program || profile?.curriculumProgram || profile?.program || 'K30 CNTT';
    const targetId = progress?.curriculum?.id || profile?.curriculumId || null;

    api.getCurriculum(targetProgram, targetId)
      .then(res => {
        if (!active) return;
        if (res && res.success && res.data) {
          setCurriculum(res.data);
        } else if (res && res.data) {
          setCurriculum(res.data);
        } else {
          api.getCurriculum('K30 CNTT')
            .then(fallbackRes => {
              if (active && fallbackRes?.data) setCurriculum(fallbackRes.data);
            })
            .catch(() => {});
        }
      })
      .catch(err => {
        if (!active) return;
        api.getCurriculum('K30 CNTT')
          .then(fallbackRes => {
            if (active && fallbackRes?.data) {
              setCurriculum(fallbackRes.data);
            } else {
              setActionError(err.message || 'Không thể tải khung đào tạo đang áp dụng.');
            }
          })
          .catch(() => {
            if (active) setActionError(err.message || 'Không thể tải khung đào tạo đang áp dụng.');
          });
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [profile?.curriculumProgram, profile?.program, profile?.curriculumId, progress?.curriculum?.id, progress?.curriculum?.program]);

  const savePlan = async next => {
    if (!user) { setActionError('Vui lòng đăng nhập để lưu kế hoạch học tập.'); return; }
    setSavingPlan(true); setActionError('');
    try {
      await api.updateMyProfile({ plannedCourses: [...next] });
      setPlannedCodes(next);
      await refreshUser();
      notifyAcademicUpdated();
    } catch (error) { setActionError(error.message); }
    finally { setSavingPlan(false); }
  };

  const handleToggleCourse = code => {
    if (!code) return;
    const state = statesByCode.get(code);
    if (completedCodes.has(code)) return;
    if (state?.locked) { setActionError(typeof state.reason === 'string' ? state.reason : 'Không thuộc chuyên ngành bạn đã chọn'); return; }
    const next = new Set(plannedCodes);
    if (next.has(code)) next.delete(code); else next.add(code);
    savePlan(next);
  };

  const handleClearAll = () => {
    if (window.confirm('Bỏ tất cả môn khỏi kế hoạch? Lịch sử điểm được giữ nguyên.')) savePlan(new Set());
  };

  // Tính toán tất cả môn học
  const allCourses = useMemo(() => {
    if (!curriculum?.sections || !Array.isArray(curriculum.sections)) return [];
    const list = [];
    curriculum.sections.forEach(sec => {
      if (Array.isArray(sec?.courses)) {
        sec.courses.forEach(c => {
          if (!c) return;
          const code = typeof c === 'string' ? c : (c.code || '');
          const name = typeof c === 'string' ? c : (c.name || code || 'Môn học');
          const credits = safeNumber(c.credits, 3);
          const prerequisites = Array.isArray(c.prerequisites) 
            ? c.prerequisites.map(p => typeof p === 'string' ? p : p?.code || String(p))
            : [];
          const priorCourses = Array.isArray(c.priorCourses)
            ? c.priorCourses.map(p => typeof p === 'string' ? p : p?.code || String(p))
            : [];

          list.push({
            ...c,
            code,
            name,
            credits,
            prerequisites,
            priorCourses,
            sectionName: sec.name || 'Học phần'
          });
        });
      }
    });
    return list;
  }, [curriculum]);

  const totalTargetCredits = safeNumber(progress?.totalCredits ?? curriculum?.totalCredits, 126);
  const earnedCredits = safeNumber(progress?.earnedCredits, 0);
  const remainingCredits = safeNumber(progress?.remainingCredits, Math.max(0, totalTargetCredits - earnedCredits));
  const percent = totalTargetCredits > 0 ? Math.min(100, Math.round(earnedCredits / totalTargetCredits * 100)) : 0;

  // Bộ lọc tìm kiếm
  const filteredCourses = useMemo(() => {
    return allCourses.filter(c => {
      const cName = (c.name || '').toLowerCase();
      const cCode = (c.code || '').toLowerCase();
      const query = (searchQuery || '').toLowerCase().trim();

      const matchesSearch = !query || cName.includes(query) || cCode.includes(query);
      const matchesSection = selectedSection === 'all' || c.sectionName === selectedSection;

      return matchesSearch && matchesSection;
    });
  }, [allCourses, searchQuery, selectedSection]);

  const sectionsList = useMemo(() => {
    if (!curriculum?.sections || !Array.isArray(curriculum.sections)) return [];
    return curriculum.sections.map(s => s?.name).filter(Boolean);
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
            <MapIcon size={24} />
          </div>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-main)' }}>
              Lộ Trình Học Tập Cá Nhân Hóa
            </h1>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Xem kết quả đã xác minh và chọn môn vào kế hoạch. Tín chỉ tích lũy lấy từ bảng điểm.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button disabled={savingPlan} onClick={handleClearAll} className="btn-secondary" style={{ fontSize: '13px' }}>
            <RotateCcw size={15} /> Xóa kế hoạch
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

      <AcademicProgress progress={progress} error={progressError} />
      {actionError && <div role="alert" style={{ color: '#dc2626', padding: '12px', marginBottom: '12px', fontSize: '13px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px' }}>{actionError}</div>}
      {savingPlan && <p role="status" style={{ fontSize: '12px' }}>Đang kiểm tra điều kiện và lưu kế hoạch…</p>}
      
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
          Đang nạp khung chương trình đào tạo đang áp dụng…
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 290px), 1fr))',
          gap: '14px',
          marginBottom: '30px'
        }}>
          {filteredCourses.map(course => {
            const isCompleted = completedCodes.has(course.code);
            const state = statesByCode.get(course.code);
            const isLocked = Boolean(state?.locked);
            const isPlanned = plannedCodes.has(course.code);
            const stateReason = typeof state?.reason === 'string' ? state.reason : '';

            return (
              <div 
                key={course.code}
                onClick={() => !savingPlan && !isLocked && handleToggleCourse(course.code)}
                role="button" tabIndex={isLocked || savingPlan ? -1 : 0}
                aria-disabled={isLocked || savingPlan || isCompleted}
                onKeyDown={event => { if (!savingPlan && !isLocked && ['Enter', ' '].includes(event.key)) { event.preventDefault(); handleToggleCourse(course.code); } }}
                style={{
                  background: isCompleted ? 'rgba(34, 197, 94, 0.05)' : 'var(--bg-card)',
                  border: isCompleted ? '1px solid #22c55e' : '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  padding: '16px',
                  cursor: isLocked || isCompleted ? 'default' : 'pointer',
                  opacity: isLocked ? 0.65 : 1,
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
                  {course.priorCourses && course.priorCourses.length > 0 && (
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '6px' }}>
                      <strong>Học trước: </strong>
                      <span>{course.priorCourses.join(', ')}</span>
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
                    {isLocked ? stateReason || 'Không thuộc chuyên ngành bạn đã chọn' : isCompleted ? '✓ Đã tích lũy' : isPlanned ? 'Đã thêm vào kế hoạch' : state?.status === 'in_progress' ? 'Đang học / chưa có điểm' : 'Chọn vào kế hoạch'}
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
          systemContext={progress ? JSON.stringify(progress) : null}
          initialMessage="Chào bạn! Mình là Cố vấn Lộ trình Học tập AI của Khoa CNTT – Đại học Văn Lang. Bạn có thể hỏi về các môn học tiếp theo, điều kiện tiên quyết và chuỗi lộ trình dẫn đến môn học nhé!"
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

    {/* Modal Drawer Chatbox toàn diện trên Mobile khi bấm nút */}
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
        systemContext={progress ? JSON.stringify(progress) : null}
        initialMessage="Chào bạn! Mình là Cố vấn Lộ trình Học tập AI của Khoa CNTT – Đại học Văn Lang. Bạn có thể hỏi về các môn học tiếp theo, điều kiện tiên quyết và chuỗi lộ trình dẫn đến môn học nhé!"
        onClose={() => setIsMobileChatOpen(false)}
      />
    </MobileChatDrawer>
    </>
  );
}
