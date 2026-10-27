import React, { useState, useEffect } from 'react';
import { GraduationCap, Search, CheckCircle2, Clock, Award, AlertCircle, FileCheck, ShieldCheck, Activity, Bot } from 'lucide-react';
import AiChatSidebar from '../components/AiChatSidebar';
import { api } from '../services/api';
import { useAuth } from '../hooks/useAuth';

export default function GraduationPage() {
  const { user, profile } = useAuth();
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

  const totalCredits = 126;
  const currentCredits = student?.officialCumulativeCredits || 0;
  const progressPercent = Math.min(100, Math.round((currentCredits / totalCredits) * 100));
  const hasGdqp = student?.courses?.some(c => c.code.startsWith('71NAD') && (c.status === 'Dat' || c.status === '\u0110\u1ea1t'));
  const hasGdtc = student?.courses?.some(c => c.code.startsWith('71PE') && (c.status === 'Dat' || c.status === '\u0110\u1ea1t'));
  const hasAvPass = student?.courses?.some(c => (c.code.includes('ENG4') || c.code.includes('ENG5')) && (c.status === 'Dat' || c.status === '\u0110\u1ea1t' || c.status === 'Dat thap'));

  const conditions = [
    { id: 1, title: 'Tich luy toi thieu 126 Tin chi Khung K30', status: currentCredits >= 126 ? 'passed' : 'in_progress', desc: 'Hien da tich luy ' + currentCredits + '/126 tin chi (' + progressPercent + '%)', icon: Award },
    { id: 2, title: 'Chung chi Ngoai ngu (TOEIC 500+ / IELTS 5.0+)', status: hasAvPass ? 'passed' : 'pending', desc: hasAvPass ? 'Da hoan thanh Anh van chuyen nganh' : 'Can nop chung chi truoc dot xet tot nghiep', icon: FileCheck },
    { id: 3, title: 'Chung chi Tin hoc MOS (Word, Excel, PowerPoint)', status: 'in_progress', desc: 'Khoa CNTT xet mien mot so phan hoac nop chung chi chuan', icon: ShieldCheck },
    { id: 4, title: 'Chung chi Giao duc Quoc phong & An ninh (GDQP 1-4)', status: hasGdqp ? 'passed' : 'pending', desc: hasGdqp ? 'Da hoan thanh GDQP' : 'Can hoan thanh cac hoc phan GDQP', icon: ShieldCheck },
    { id: 5, title: 'Chung chi Giao duc The chat (GDTC)', status: hasGdtc ? 'passed' : 'pending', desc: hasGdtc ? 'Da hoan thanh GDTC' : 'Can hoan thanh cac hoc phan GDTC', icon: Activity },
  ];

  const gradQuickReplies = [
    { label: 'Con thieu gi?', text: student ? ('Toi co ' + currentCredits + '/126 tin chi, con thieu ' + (126 - currentCredits) + ' tin chi. Toi can nhung gi de tot nghiep?') : 'Toi can thieu gi de tot nghiep?' },
    { label: 'Khi nao tot nghiep?', text: student ? ('GPA toi la ' + student.officialCumulativeGpa4 + ', da hoc ' + currentCredits + '/126 TC. Du kien khi nao toi tot nghiep?') : 'Du kien khi nao toi tot nghiep?' },
    { label: 'Mon can uu tien', text: 'Toi nen hoc mon nao truoc de dam bao tot nghiep dung han?' },
  ];
  const gradSystemContext = student
    ? ('Sinh vien: ' + student.name + ', MSSV: ' + student.mssv + ', GPA: ' + student.officialCumulativeGpa4 + '/4.0, TC: ' + currentCredits + '/126, Con thieu: ' + (126 - currentCredits) + ' TC. Ngoai ngu: ' + (hasAvPass ? 'Da dat' : 'Chua dat') + ', GDQP: ' + (hasGdqp ? 'Da dat' : 'Chua dat') + ', GDTC: ' + (hasGdtc ? 'Da dat' : 'Chua dat'))
    : null;

  return (
    <div style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
      <div className="responsive-grid-sidebar">

        <div>
          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '24px', marginBottom: '24px', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '18px' }}>
              <div>
                <h1 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-main)', marginBottom: '4px' }}>Du Bao & Xet Tien Do Tot Nghiep</h1>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Danh gia 5 dieu kien tot nghiep cot loi va du bao thoi gian ra truong Dai hoc Van Lang</p>
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
                    <span className="badge badge-red" style={{ marginBottom: '8px' }}>Du bao thoi gian ra truong</span>
                    <h2 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-main)', marginTop: '4px' }}>
                      Du kien Tot nghiep: <span style={{ color: 'var(--vlu-red)' }}>Dot 1 / Nam 2028</span>
                    </h2>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      Sinh vien: <strong>{student.name}</strong> - Nien khoa 2024-2028
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Tien do tich luy tin chi</div>
                    <div style={{ fontSize: '28px', fontWeight: 800, color: '#16a34a' }}>{currentCredits} / {totalCredits} TC</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Con thieu: <strong>{totalCredits - currentCredits} tin chi</strong></div>
                  </div>
                </div>
                <div style={{ width: '100%', height: '10px', borderRadius: '9999px', background: 'var(--border-color)', overflow: 'hidden', marginTop: '20px' }}>
                  <div style={{ width: progressPercent + '%', height: '100%', background: 'linear-gradient(90deg, var(--vlu-red) 0%, #16a34a 100%)', borderRadius: '9999px' }} />
                </div>
              </div>

              <div className="vlu-card" style={{ padding: '24px', marginBottom: '24px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-main)', marginBottom: '18px' }}>Bang Danh Gia Cac Dieu Kien Tot Nghiep Chuan VLU</h3>
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
                            ? <span className="badge badge-green" style={{ fontSize: '12px' }}><CheckCircle2 size={14} /> Dat tieu chuan</span>
                            : isInProgress
                            ? <span className="badge badge-blue" style={{ fontSize: '12px' }}><Clock size={14} /> Dang hoan thien</span>
                            : <span className="badge badge-orange" style={{ fontSize: '12px' }}><AlertCircle size={14} /> Can bo sung</span>
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

      {/* Modal Drawer Chatbox trên Mobile khi bấm nút */}
      {isMobileChatOpen && (
        <div className="mobile-chat-drawer-overlay" onClick={() => setIsMobileChatOpen(false)}>
          <div className="mobile-chat-drawer-container" onClick={e => e.stopPropagation()}>
            <AiChatSidebar
              mode="graduation"
              title="Trợ lý xét tốt nghiệp"
              subtitle="Dự báo & kiểm tra điều kiện"
              placeholder="Hỏi về điều kiện tốt nghiệp, tín chỉ còn thiếu..."
              quickReplies={gradQuickReplies}
              systemContext={gradSystemContext}
              onClose={() => setIsMobileChatOpen(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}