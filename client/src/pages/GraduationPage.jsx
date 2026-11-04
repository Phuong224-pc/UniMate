import React, { useState, useEffect } from 'react';
import { Search, CheckCircle2, Clock, Award, AlertCircle, FileCheck, ShieldCheck, Activity, Bot } from 'lucide-react';
import AiChatSidebar from '../components/AiChatSidebar';
import MobileChatDrawer from '../components/MobileChatDrawer';
import { api } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { useAcademicProgress } from '../hooks/useAcademicProgress';

export default function GraduationPage() {
  const { user, profile } = useAuth();
  const { progress: ownProgress, error: progressError } = useAcademicProgress();
  const initialMssv = profile?.mssv || user?.mssv || '';
  const [mssvInput, setMssvInput] = useState(initialMssv);
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isMobileChatOpen, setIsMobileChatOpen] = useState(false);

  const handleLookup = async (code = mssvInput) => {
    const targetCode = user?.role === 'student' ? (profile?.mssv || user?.mssv || code) : code;
    if (!targetCode) return;
    setLoading(true); setError('');
    try {
      const res = await api.getStudentByMssv(targetCode.trim());
      if (res.success) setStudent(res.data);
    } catch (err) {
      setError(err.message || 'Không tìm thấy dữ liệu sinh viên'); setStudent(null);
    } finally { setLoading(false); }
  };

  useEffect(() => { 
    const activeCode = profile?.mssv || user?.mssv || '';
    setMssvInput(activeCode);
    if (activeCode) {
      handleLookup(activeCode); 
    } else {
      setStudent(null);
    }
  }, [profile?.mssv, user?.mssv]);

  const academic = user?.role === 'student' ? ownProgress : student?.academicProgress;
  const totalCredits = academic?.totalCredits ?? 0;
  const currentCredits = academic?.earnedCredits ?? 0;
  const remainingCredits = academic?.remainingCredits ?? 0;
  const progressPercent = totalCredits > 0 ? Math.min(100, Math.round((currentCredits / totalCredits) * 100)) : 0;
  const degreeGroups = Object.values(academic?.groups || {}).filter(group => group.active !== false && group.countsTowardDegree);

  const conditions = [
    { id: 1, title: 'Tín chỉ và các nhóm thuộc chương trình', status: totalCredits > 0 && remainingCredits === 0 && degreeGroups.length > 0 && degreeGroups.every(group => group.complete) ? 'passed' : 'in_progress', desc: `${currentCredits}/${totalCredits || '—'} TC; còn ${remainingCredits} TC. Cần hoàn thành riêng từng nhóm.`, icon: Award },
    { id: 2, title: 'GPA tối thiểu và chuẩn đầu ra ngoại ngữ', status: 'unknown', desc: 'Chưa đủ dữ liệu để kiểm tra', icon: FileCheck },
    { id: 3, title: 'Chuẩn tin học và các điều kiện khác', status: 'unknown', desc: 'Chưa đủ dữ liệu để kiểm tra', icon: ShieldCheck },
    { id: 4, active: Boolean(academic?.groups?.defense) && academic.groups.defense.active !== false, title: 'Giáo dục Quốc phòng & An ninh', status: academic?.groups?.defense?.complete ? 'passed' : 'in_progress', desc: 'Theo dõi đủ các học phần theo quy tắc của khung, tách khỏi tín chỉ chương trình.', icon: ShieldCheck },
    { id: 5, active: Boolean(academic?.groups?.TC002) && academic.groups.TC002.active !== false || Boolean(academic?.groups?.TC102) && academic.groups.TC102.active !== false, title: 'Giáo dục Thể chất', status: academic?.groups?.TC002?.complete && academic?.groups?.TC102?.complete ? 'passed' : 'in_progress', desc: 'Cần hoàn thành riêng cả hai nhóm TC002 và TC102.', icon: Activity },
  ].filter(condition => condition.active !== false);

  const gradQuickReplies = [
    { label: 'Còn thiếu gì?', text: 'Dựa trên kết quả học tập đã xác minh, tôi còn thiếu những nhóm và điều kiện nào?' },
    { label: 'Khi nào tốt nghiệp?', text: 'Dữ liệu hiện tại đã đủ để dự báo thời điểm tốt nghiệp chưa? Cần xác minh thêm điều gì?' },
    { label: 'Môn cần ưu tiên', text: 'Tôi nên học môn nào trước để đảm bảo tốt nghiệp đúng hạn?' },
  ];
  const gradSystemContext = academic ? `Kết quả do máy chủ tính: ${JSON.stringify(academic)}. Không tự tính lại hoặc kết luận đủ điều kiện tốt nghiệp khi còn quy tắc chưa xác minh.` : null;

  return (
    <div style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
      <div className="responsive-grid-sidebar">

        <div>
          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '24px', marginBottom: '24px', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '18px' }}>
              <div>
                <h1 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-main)', marginBottom: '4px' }}>Dự Báo & Xét Tiến Độ Tốt Nghiệp</h1>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Đối chiếu tín chỉ, nhóm môn và các điều kiện tốt nghiệp có dữ liệu xác minh</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                {user?.role === 'student' ? (
                  <span className="badge badge-blue" style={{ fontSize: '12px', padding: '6px 12px' }}>
                    Hồ sơ sinh viên: {profile?.fullName || user?.email} (MSSV: {profile?.mssv || user?.mssv})
                  </span>
                ) : (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {['2474802010458', '2474802010414', '2474802010071'].map(code => (
                      <button key={code} onClick={() => { setMssvInput(code); handleLookup(code); }} className="btn-secondary" style={{ fontSize: '12px', padding: '4px 10px' }}>
                        MSSV: {code.slice(-5)}
                      </button>
                    ))}
                  </div>
                )}
                <button
                  onClick={() => setIsMobileChatOpen(true)}
                  className="mobile-only-chat-btn"
                  title="Mở Chat box Dự báo tốt nghiệp"
                >
                  <Bot size={15} />
                  <span>Chat box tốt nghiệp</span>
                </button>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px', maxWidth: '540px' }}>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '8px 14px', opacity: user?.role === 'student' ? 0.8 : 1 }}>
                <Search size={16} color="var(--text-muted)" />
                <input
                  type="text"
                  placeholder="Nhập MSSV để kiểm tra tiến độ tốt nghiệp..."
                  value={mssvInput}
                  disabled={user?.role === 'student'}
                  onChange={(e) => setMssvInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
                  style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '14px', color: 'var(--text-main)', cursor: user?.role === 'student' ? 'not-allowed' : 'text' }}
                />
              </div>
              <button onClick={() => handleLookup()} disabled={loading} className="btn-vlu-primary" style={{ opacity: loading ? 0.7 : 1 }}>
                {loading ? 'Đang nạp...' : (<><Search size={16} /> Kiểm tra</>)}
              </button>
            </div>
            {error && <div style={{ marginTop: '12px', color: '#ef4444', fontSize: '13px' }}>{error}</div>}
          </div>

          {student && (
            <>
              <div className="vlu-card" style={{ background: 'linear-gradient(135deg, rgba(196,18,48,0.06) 0%, rgba(30,41,59,0.04) 100%)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '24px', marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
                  <div>
                    <span className="badge badge-red" style={{ marginBottom: '8px' }}>Dự báo thời gian ra trường</span>
                    <h2 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-main)', marginTop: '4px' }}>
                      <span style={{ color: 'var(--vlu-red)' }}>{academic?.graduation?.message || 'Chưa đủ dữ liệu để kiểm tra'}</span>
                    </h2>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      Sinh viên: <strong>{student.fullName || student.name}</strong> · Niên khóa {student.cohort || 'chưa cập nhật'}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Tiến độ tích lũy tín chỉ</div>
                    <div style={{ fontSize: '28px', fontWeight: 800, color: '#16a34a' }}>{currentCredits} / {totalCredits} TC</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Còn thiếu: <strong>{remainingCredits} tín chỉ</strong></div>
                  </div>
                </div>
                <div style={{ width: '100%', height: '10px', borderRadius: '9999px', background: 'var(--border-color)', overflow: 'hidden', marginTop: '20px' }}>
                  <div style={{ width: progressPercent + '%', height: '100%', background: 'linear-gradient(90deg, var(--vlu-red) 0%, #16a34a 100%)', borderRadius: '9999px' }} />
                </div>
              </div>

              <div className="vlu-card" style={{ padding: '24px', marginBottom: '24px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-main)', marginBottom: '18px' }}>Bảng Đánh Giá Các Điều Kiện Tốt Nghiệp Chuẩn VLU</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {conditions.map((item) => {
                    const Icon = item.icon;
                    const isPassed = item.status === 'passed';
                    const isInProgress = item.status === 'in_progress';
                    return (
                      <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', flexWrap: 'wrap', gap: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                          <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: isPassed ? 'rgba(34,197,94,0.15)' : isInProgress ? 'rgba(59,130,246,0.15)' : 'rgba(239,68,68,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: isPassed ? '#16a34a' : isInProgress ? '#3b82f6' : '#ef4444' }}>
                            <Icon size={18} />
                          </div>
                          <div>
                            <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '2px' }}>{item.title}</h4>
                            <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{item.desc}</p>
                          </div>
                        </div>
                        <div>
                          {isPassed
                            ? <span className="badge badge-green" style={{ fontSize: '12px' }}><CheckCircle2 size={14} /> Đạt tiêu chuẩn</span>
                            : isInProgress
                            ? <span className="badge badge-blue" style={{ fontSize: '12px' }}><Clock size={14} /> Đang hoàn thiện</span>
                            : <span className="badge badge-orange" style={{ fontSize: '12px' }}><AlertCircle size={14} /> {item.status === 'unknown' ? 'Chưa đủ dữ liệu để kiểm tra' : 'Cần bổ sung'}</span>
                          }
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="desktop-only-chat-column" style={{ position: 'sticky', top: '20px' }}>
          <AiChatSidebar
            mode="graduation"
            title="Trợ lý xét tốt nghiệp"
            subtitle="Dự báo & kiểm tra điều kiện"
            placeholder="Hỏi về điều kiện tốt nghiệp, tín chỉ còn thiếu..."
            quickReplies={gradQuickReplies}
            systemContext={gradSystemContext}
          />
        </div>

      </div>

      {/* Nút nổi (FAB) trên Mobile để mở Chatbox ngay mà không cần lướt */}
      <button
        onClick={() => setIsMobileChatOpen(true)}
        className="mobile-floating-chat-btn"
        title="Mở Chat box Xét tốt nghiệp"
      >
        <Bot size={18} />
        <span>Chat box tốt nghiệp</span>
      </button>

      {/* Modal Drawer Chatbox trên Mobile khi bấm nút (Render qua React Portal) */}
      <MobileChatDrawer isOpen={isMobileChatOpen} onClose={() => setIsMobileChatOpen(false)}>
        <AiChatSidebar
          mode="graduation"
          title="Trợ lý xét tốt nghiệp"
          subtitle="Dự báo & kiểm tra điều kiện"
          placeholder="Hỏi về điều kiện tốt nghiệp, tín chỉ còn thiếu..."
          quickReplies={gradQuickReplies}
          systemContext={gradSystemContext}
          onClose={() => setIsMobileChatOpen(false)}
        />
      </MobileChatDrawer>
    </div>
  );
}
