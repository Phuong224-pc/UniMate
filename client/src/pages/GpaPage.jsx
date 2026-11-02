import React, { useState, useEffect } from 'react';
import AiChatSidebar from '../components/AiChatSidebar';
import MobileChatDrawer from '../components/MobileChatDrawer';
import { 
  Calculator, 
  Search, 
  User, 
  Award, 
  AlertTriangle, 
  BookOpen, 
  TrendingUp, 
  CheckCircle2, 
  XCircle,
  HelpCircle,
  Bot
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import AcademicProgress, { formatAcademicNumber } from '../components/AcademicProgress';
import { useAcademicProgress } from '../hooks/useAcademicProgress';

export default function GpaPage() {
  const { user, profile } = useAuth();
  const { progress: ownProgress } = useAcademicProgress();
  const initialMssv = profile?.mssv || user?.mssv || '';
  const [mssvInput, setMssvInput] = useState(initialMssv);
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isMobileChatOpen, setIsMobileChatOpen] = useState(false);
  const [selectedSemester, setSelectedSemester] = useState('all');
  
  // Target GPA simulator
  const [targetGpa, setTargetGpa] = useState(3.5);
  const [futureCredits, setFutureCredits] = useState(15);
  const [requiredScore, setRequiredScore] = useState(null);
  const academic = user?.role === 'student' ? ownProgress : student?.academicProgress;

  const demoMssvs = [
    { mssv: '2474802010458', name: 'Trương Trần Thanh Phương (K30)' },
    { mssv: '2474802010414', name: 'Võ Thành Trung (K30)' },
    { mssv: '2474802010071', name: 'Võ Ngọc Duy (K30)' },
    { mssv: '2474802010419', name: 'Phan Thanh Tú (K30)' },
    { mssv: '2474802010118', name: 'Huỳnh Nhựt Hoà (K30)' }
  ];

  const handleLookup = async (code = mssvInput) => {
    const targetCode = user?.role === 'student' ? (profile?.mssv || user?.mssv || code) : code;
    if (!targetCode) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.getStudentByMssv(targetCode.trim());
      if (res.success) {
        setStudent(res.data);
      }
    } catch (err) {
      setError(err.message || "Không tìm thấy dữ liệu sinh viên");
      setStudent(null);
    } finally {
      setLoading(false);
    }
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

  // Tính toán các học kỳ có trong bảng điểm
  const semesters = student?.courses 
    ? Array.from(new Set(student.courses.map(c => c.semester))).filter(Boolean)
    : [];

  const displayedCourses = student?.courses 
    ? student.courses.filter(c => selectedSemester === 'all' || c.semester === selectedSemester)
    : [];

  // Thống kê môn rớt / môn nợ
  const failedCourses = student?.courses 
    ? student.courses.filter(c => c.status === 'Không đạt' || c.letter === 'F')
    : [];

  const lowPassedCourses = student?.courses 
    ? student.courses.filter(c => c.status === 'Đạt thấp' || c.letter === 'D' || c.letter === 'C')
    : [];

  // Tính toán GPA Simulator
  const calculateTarget = () => {
    if (!student) return;
    if (academic?.calculatedGpa4 == null || academic?.gpaCredits == null || academic?.gpaQualityPoints == null) {
      setRequiredScore('Chưa đủ dữ liệu GPA và quy tắc học lại để giả lập.');
      return;
    }
    const currentCredits = academic.gpaCredits;
    const currentQualityPoints = academic.gpaQualityPoints;
    const nextCreds = Number(futureCredits) || 0;
    const target = Number(targetGpa) || 0;

    if (nextCreds <= 0) {
      setRequiredScore("Số tín chỉ kỳ sau phải lớn hơn 0");
      return;
    }

    // Công thức: ((currentGpa * currentCredits) + (required * nextCreds)) / (currentCredits + nextCreds) = target
    const required = ((target * (currentCredits + nextCreds)) - currentQualityPoints) / nextCreds;

    if (required > 4.0) {
      setRequiredScore(`Không khả thi (Cần đạt GPA ${required.toFixed(2)}/4.0 vượt quá mức tối đa 4.0)`);
    } else if (required < 0) {
      setRequiredScore(`Đã vượt mục tiêu (Chỉ cần hoàn thành môn)`);
    } else {
      setRequiredScore(`Cần đạt GPA tối thiểu: ${required.toFixed(2)} / 4.0`);
    }
  };

  // AI Sidebar computed props
  const gpaQuickReplies = [
    { label: 'GPA hiện tại', text: 'Phân tích GPA tự tính và đối chiếu với GPA được nguồn bảng điểm ghi.' },
    { label: 'Môn cần cải thiện', text: 'Môn nào tôi cần cải thiện điểm nhất?' },
    { label: 'Tín chỉ còn thiếu', text: 'Theo khung đang áp dụng, tôi còn thiếu nhóm môn và bao nhiêu tín chỉ?' }
  ];
  const gpaSystemContext = academic ? JSON.stringify(academic) : null;
  return (
    <div className="page-container" style={{ maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
      <div className="responsive-grid-sidebar" style={{ gap: '24px', alignItems: 'start' }}>
        <div>
      {/* Top Banner & Search */}
      <div style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-lg)',
        padding: '24px',
        marginBottom: '24px',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-main)', marginBottom: '4px' }}>
              Kết Quả Học Tập & Điểm Số
            </h1>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Tra cứu bảng điểm chi tiết, GPA thang 4 / thang 10, môn cần cải thiện và giả lập điểm mục tiêu
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {user?.role === 'student' ? (
              <span className="badge badge-blue" style={{ fontSize: '12px', padding: '6px 12px' }}>
                Hồ sơ sinh viên: {profile?.fullName || user?.email} (MSSV: {profile?.mssv || user?.mssv})
              </span>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Mẫu thử:</span>
                {demoMssvs.slice(0, 3).map(d => (
                  <button key={d.mssv} onClick={() => { setMssvInput(d.mssv); handleLookup(d.mssv); }} className="btn-secondary" style={{ fontSize: '12px', padding: '4px 10px' }}>
                    MSSV: {d.mssv.slice(-5)}
                  </button>
                ))}
              </div>
            )}
            <button
              onClick={() => setIsMobileChatOpen(true)}
              className="mobile-only-chat-btn"
              title="Mở Chat box Điểm & GPA"
            >
              <Bot size={15} />
              <span>Chat box GPA</span>
            </button>
          </div>
        </div>

        {/* Input Bar */}
        <div style={{ display: 'flex', gap: '10px', maxWidth: '600px' }}>
          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            background: 'var(--bg-primary)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-sm)',
            padding: '8px 14px',
            opacity: user?.role === 'student' ? 0.8 : 1
          }}>
            <Search size={16} color="var(--text-muted)" />
            <input 
              type="text"
              placeholder="Nhập mã số sinh viên (ví dụ: 2474802010458)..."
              value={mssvInput}
              disabled={user?.role === 'student'}
              onChange={(e) => setMssvInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
              style={{
                border: 'none',
                background: 'transparent',
                outline: 'none',
                width: '100%',
                fontSize: '14px',
                color: 'var(--text-main)',
                cursor: user?.role === 'student' ? 'not-allowed' : 'text'
              }}
            />
          </div>

          <button 
            onClick={() => handleLookup()}
            disabled={loading}
            className="btn-vlu-primary"
            style={{ flexShrink: 0, opacity: loading ? 0.7 : 1 }}
          >
            {loading ? 'Đang nạp...' : (<><Search size={16} /> Tra cứu</>)}
          </button>
        </div>

        {error && (
          <div style={{ marginTop: '12px', color: '#ef4444', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <AlertTriangle size={15} />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Student Details & Summary Cards */}
      {student && (
        <>
          {/* Hero Profile Info */}
          <div className="vlu-card" style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{
                width: '56px',
                height: '56px',
                borderRadius: '16px',
                background: 'linear-gradient(135deg, var(--vlu-red) 0%, #ff5252 100%)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: '20px'
              }}>
                {student.name ? student.name.slice(0, 2).toUpperCase() : 'SV'}
              </div>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-main)', marginBottom: '2px' }}>
                  {student.name}
                </h2>
                <div style={{ display: 'flex', gap: '12px', fontSize: '13px', color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
                  <span>MSSV: <strong>{student.mssv}</strong></span>
                  <span>Khóa: <strong>{student.cohort} ({student.major})</strong></span>
                  <span>Lớp: <strong>{student.className}</strong></span>
                </div>
              </div>
            </div>

            <div className="badge badge-green" style={{ fontSize: '14px', padding: '6px 16px' }}>
              <Award size={16} />
              <span>Xếp loại: <strong>{student.officialRating || 'Khá'}</strong></span>
            </div>
          </div>

          <AcademicProgress progress={academic} />
          {/* Metric KPI Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '16px',
            marginBottom: '24px'
          }}>
            <div className="vlu-card">
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>GPA Tích Lũy (Hệ 4)</div>
              <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--vlu-red)' }}>
                {formatAcademicNumber(academic?.calculatedGpa4)}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Thang điểm 4.0 Văn Lang
              </div>
            </div>

            <div className="vlu-card">
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Tổng Tín Chỉ Đạt</div>
              <div style={{ fontSize: '28px', fontWeight: 800, color: '#3b82f6' }}>
                {academic?.earnedCredits ?? '—'} <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>/ {academic?.totalCredits ?? '—'} TC</span>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Tiến độ: {academic?.totalCredits > 0 ? Math.round(academic.earnedCredits / academic.totalCredits * 100) : '—'}%
              </div>
            </div>

            <div className="vlu-card">
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Môn Không Đạt (Rớt)</div>
              <div style={{ fontSize: '28px', fontWeight: 800, color: failedCourses.length > 0 ? '#ef4444' : '#16a34a' }}>
                {failedCourses.length} môn
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                {failedCourses.length > 0 ? 'Cần đăng ký học lại sớm' : 'Không có môn nào rớt'}
              </div>
            </div>

            <div className="vlu-card">
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Môn Có Thể Cải Thiện</div>
              <div style={{ fontSize: '28px', fontWeight: 800, color: '#ea580c' }}>
                {lowPassedCourses.length} môn
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Điểm chữ D hoặc C
              </div>
            </div>
          </div>

          {/* Grades Table */}
          <div className="vlu-card" style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-main)' }}>
                Bảng Điểm Chi Tiết
              </h3>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Lọc học kỳ:</span>
                <select 
                  value={selectedSemester} 
                  onChange={(e) => setSelectedSemester(e.target.value)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-main)',
                    fontSize: '13px'
                  }}
                >
                  <option value="all">Tất cả các học kỳ</option>
                  {semesters.map(sem => (
                    <option key={sem} value={sem}>{sem}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-color)' }}>
                    <th style={{ padding: '10px 12px', textAlign: 'left' }}>Mã môn</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left' }}>Tên môn học</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center' }}>Tín chỉ</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center' }}>Điểm hệ 10</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center' }}>Điểm hệ 4</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center' }}>Điểm chữ</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left' }}>Học kỳ</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center' }}>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedCourses.map((c, idx) => {
                    const isFail = c.status === 'Không đạt' || c.letter === 'F';
                    const isLow = c.status === 'Đạt thấp' || c.letter === 'D';
                    return (
                      <tr 
                        key={idx}
                        style={{
                          borderBottom: '1px solid var(--border-color)',
                          background: isFail ? 'rgba(239, 68, 68, 0.05)' : 'transparent'
                        }}
                      >
                        <td style={{ padding: '10px 12px', fontFamily: 'monospace', color: 'var(--text-muted)' }}>{c.code}</td>
                        <td style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--text-main)' }}>{c.name}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'center' }}>{c.credits}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 600 }}>{c.score != null ? c.score : '—'}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'center' }}>{c.point4 != null ? c.point4 : '—'}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 700, color: isFail ? '#ef4444' : isLow ? '#ea580c' : '#16a34a' }}>
                          {c.letter || '—'}
                        </td>
                        <td style={{ padding: '10px 12px', color: 'var(--text-secondary)', fontSize: '12px' }}>{c.semester}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                          <span className={`badge ${isFail ? 'badge-red' : isLow ? 'badge-orange' : 'badge-green'}`} style={{ fontSize: '11px' }}>
                            {c.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* GPA Target Simulator */}
          <div className="vlu-card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <TrendingUp size={20} color="var(--vlu-red)" />
              <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-main)' }}>
                Công Cụ Giả Lập Mục Tiêu GPA Kỳ Tới
              </h3>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Ước tính cho các môn mới cùng phạm vi tính GPA, dùng tổng điểm có trọng số do máy chủ trả về. Học lại, miễn và thay đổi quy tắc GPA cần được xác minh riêng.</p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                  GPA Mục tiêu mong muốn (Hệ 4)
                </label>
                <input 
                  type="number"
                  step="0.05"
                  min="0"
                  max="4"
                  value={targetGpa}
                  onChange={(e) => setTargetGpa(parseFloat(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-primary)',
                    color: 'var(--text-main)',
                    fontSize: '14px'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                  Số tín chỉ dự kiến học kỳ sau
                </label>
                <input 
                  type="number"
                  step="1"
                  min="1"
                  max="30"
                  value={futureCredits}
                  onChange={(e) => setFutureCredits(parseInt(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-primary)',
                    color: 'var(--text-main)',
                    fontSize: '14px'
                  }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                <button onClick={calculateTarget} className="btn-vlu-primary" style={{ width: '100%', justifyContent: 'center' }}>
                  Tính toán điểm cần đạt
                </button>
              </div>
            </div>

            {requiredScore && (
              <div style={{
                background: 'var(--vlu-red-light)',
                border: '1px solid rgba(196, 18, 48, 0.2)',
                borderRadius: 'var(--radius-sm)',
                padding: '14px 18px',
                fontSize: '14px',
                fontWeight: 700,
                color: 'var(--vlu-red)'
              }}>
                🎯 Kết quả: {requiredScore}
              </div>
            )}
          </div>
        </>
      )}
        </div>
      {/* AI Chat Sidebar (Desktop) */}
      <div className="desktop-only-chat-column" style={{ position: 'sticky', top: '20px' }}>
        <AiChatSidebar
          mode="results"
          title="Trợ lý Bảng điểm & GPA"
          subtitle="Phân tích kết quả học tập & cải thiện"
          placeholder="Hỏi về GPA, điểm chữ, môn cần cải thiện..."
          quickReplies={gpaQuickReplies}
          systemContext={gpaSystemContext}
        />
      </div>
      </div>

      {/* Nút nổi (FAB) trên Mobile để mở Chatbox ngay mà không cần lướt */}
      <button
        onClick={() => setIsMobileChatOpen(true)}
        className="mobile-floating-chat-btn"
        title="Mở Chat box Điểm & GPA"
      >
        <Bot size={18} />
        <span>Chat box GPA</span>
      </button>

      {/* Modal Drawer Chatbox trên Mobile khi bấm nút (Render qua React Portal) */}
      <MobileChatDrawer isOpen={isMobileChatOpen} onClose={() => setIsMobileChatOpen(false)}>
        <AiChatSidebar
          mode="results"
          title="Trợ lý Bảng điểm & GPA"
          subtitle="Phân tích kết quả học tập & cải thiện"
          placeholder="Hỏi về GPA, điểm chữ, môn cần cải thiện..."
          quickReplies={gpaQuickReplies}
          systemContext={gpaSystemContext}
          onClose={() => setIsMobileChatOpen(false)}
        />
      </MobileChatDrawer>
    </div>
  );
}
