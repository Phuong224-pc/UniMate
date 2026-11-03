import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  User, 
  BookOpen, 
  Filter, 
  Plus, 
  Trash2, 
  Edit3, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  ChevronLeft, 
  ChevronRight,
  Layers,
  Sparkles,
  Save,
  Printer,
  RefreshCw,
  Send,
  Bot,
  Sliders,
  GraduationCap,
  Info,
  CalendarCheck,
  Coffee,
  ArrowRight,
  Check,
  Zap,
  BookmarkCheck
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../hooks/useAuth';

const DAYS_OF_WEEK = [
  { value: 2, label: 'Thứ Hai', short: 'T2' },
  { value: 3, label: 'Thứ Ba', short: 'T3' },
  { value: 4, label: 'Thứ Tư', short: 'T4' },
  { value: 5, label: 'Thứ Năm', short: 'T5' },
  { value: 6, label: 'Thứ Sáu', short: 'T6' },
  { value: 7, label: 'Thứ Bảy', short: 'T7' },
  { value: 8, label: 'Chủ Nhật', short: 'CN' }
];

const VLU_SHIFTS = [
  { shift: 1, name: 'Ca 1', periods: 'Tiết 1 - 3', time: '07:00 - 09:25', session: 'morning' },
  { shift: 2, name: 'Ca 2', periods: 'Tiết 4 - 6', time: '09:35 - 12:00', session: 'morning' },
  { shift: 'lunch', name: 'Nghỉ trưa', periods: 'Khoảng nghỉ', time: '12:00 - 13:00', session: 'break', isBreak: true },
  { shift: 3, name: 'Ca 3', periods: 'Tiết 7 - 9', time: '13:00 - 15:25', session: 'afternoon' },
  { shift: 4, name: 'Ca 4', periods: 'Tiết 10 - 12', time: '15:35 - 18:00', session: 'afternoon' },
  { shift: 5, name: 'Ca 5', periods: 'Tiết 13 - 15', time: '18:05 - 21:10', session: 'evening' }
];

export default function SchedulePage() {
  const { user, profile, isAdmin } = useAuth();
  
  // Tab chính: 'roadmap' (Lộ trình & TKB cá nhân) hoặc 'current' (TKB tuần hiện tại từ MongoDB)
  const [activeTab, setActiveTab] = useState('roadmap');

  // ─────────────────────────────────────────────────────────────
  // 1. STATE CHO LỘ TRÌNH VÀ THỜI KHÓA BIỂU CÁ NHÂN (ROADMAP)
  // ─────────────────────────────────────────────────────────────
  const [roadmapLoading, setRoadmapLoading] = useState(false);
  const [roadmapError, setRoadmapError] = useState('');
  const [roadmapData, setRoadmapData] = useState(null);
  const [savedPlanMeta, setSavedPlanMeta] = useState(null);
  const [selectedPace, setSelectedPace] = useState('balanced'); // 'balanced' | 'light' | 'fast'
  const [selectedSemesterIdx, setSelectedSemesterIdx] = useState(0);

  // Form sở thích học tập & mục tiêu
  const [preferences, setPreferences] = useState({
    startSemester: '2026-2027 HK02',
    targetGraduationSemester: '2027-2028 HK02',
    pace: 'balanced',
    preferredDaysPerWeek: 4,
    preferredShifts: [1, 2, 3],
    graduationType: 'thesis', // 'thesis' (Khóa luận) | 'topics' (2 chuyên đề)
    avoidNightMorning: true,
    maxConsecutiveShifts: 2,
    blockedDays: [7, 8], // Mặc định né T7, CN nếu có thể
    includeCurrentInProgress: true
  });
  const [showPrefPanel, setShowPrefPanel] = useState(false);
  const [savingPlan, setSavingPlan] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  // Trợ lý AI Thời khóa biểu tại chỗ
  const [advisorOpen, setAdvisorOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    {
      sender: 'bot',
      text: 'Xin chào! Mình là Trợ lý AI Thời khóa biểu UniMate. Mình có thể giải thích lý do phân bổ môn học, các môn tiên quyết, hoặc cách xếp ca học tối ưu thời gian nghỉ cho bạn.'
    }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatScrollRef = useRef(null);

  // ─────────────────────────────────────────────────────────────
  // 2. STATE CHO THỜI KHÓA BIỂU TUẦN HIỆN TẠI (TRUYỀN THỐNG / ADMIN)
  // ─────────────────────────────────────────────────────────────
  const [schedules, setSchedules] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [selectedSemester, setSelectedSemester] = useState('2025-2026 HK01');
  const [selectedDay, setSelectedDay] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Modal Thêm / Sửa lịch học cho Admin
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    semester: '2025-2026 HK01',
    courseCode: '',
    courseName: '',
    classSection: 'K30 CNTT',
    lecturer: '',
    dayOfWeek: 2,
    startPeriod: 1,
    endPeriod: 3,
    startTime: '07:30',
    endTime: '10:00',
    room: 'CS3 Đặng Thùy Trâm',
    dateRange: '08/09/2025 - 27/12/2025',
    notes: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [successFlash, setSuccessFlash] = useState('');

  // ─────────────────────────────────────────────────────────────
  // LOAD DỮ LIỆU BAN ĐẦU
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    // 1. Tải danh sách học kỳ
    api.getSemesters()
      .then(res => {
        if (res.success && res.data.length > 0) {
          setSemesters(res.data);
          if (!res.data.includes(selectedSemester)) {
            setSelectedSemester(res.data[0]);
          }
        } else {
          setSemesters(['2024-2025 HK01', '2024-2025 HK02', '2025-2026 HK01', '2026-2027 HK01', '2026-2027 HK02']);
        }
      })
      .catch(() => {
        setSemesters(['2024-2025 HK01', '2024-2025 HK02', '2025-2026 HK01', '2026-2027 HK01', '2026-2027 HK02']);
      });

    // 2. Kiểm tra xem sinh viên đã có Lộ trình học tập lưu trong MongoDB chưa
    if (user?.role === 'student' || profile?.mssv) {
      loadSavedOrGenerateRoadmap();
    }
  }, [profile?.mssv]);

  // Nạp kế hoạch đã lưu hoặc tự động phát sinh
  const loadSavedOrGenerateRoadmap = async () => {
    setRoadmapLoading(true);
    setRoadmapError('');
    try {
      const savedRes = await api.getSavedStudyPlan();
      if (savedRes.success && savedRes.data) {
        setSavedPlanMeta(savedRes.data);
        if (savedRes.data.preferences) {
          setPreferences(prev => ({ ...prev, ...savedRes.data.preferences }));
        }
      }

      // Tự động generate lộ trình theo dữ liệu thật mới nhất của sinh viên
      const genRes = await api.generateScheduleRoadmap(preferences);
      if (genRes.success && genRes.data) {
        setRoadmapData(genRes.data);
        setSelectedPace(preferences.pace || 'balanced');
        setSelectedSemesterIdx(0);
      } else {
        setRoadmapError(genRes.message || 'Không thể tạo lộ trình cá nhân.');
      }
    } catch (err) {
      console.error('Error loading schedule roadmap:', err);
      setRoadmapError(err.message || 'Lỗi kết nối khi nạp dữ liệu lộ trình học tập.');
    } finally {
      setRoadmapLoading(false);
    }
  };

  // Nạp lịch học từ MongoDB cho Tab Hiện Tại
  const fetchSchedules = async () => {
    setLoading(true);
    setError('');
    try {
      const params = {
        semester: selectedSemester
      };
      if (selectedDay !== 'all') {
        params.dayOfWeek = selectedDay;
      }
      if (user?.role === 'student') {
        params.mssv = profile?.mssv || user.mssv;
      }

      const res = await api.getSchedule(params);
      if (res.success) {
        setSchedules(res.data || []);
      }
    } catch (err) {
      setError(err.message || 'Không thể tải dữ liệu thời khóa biểu');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedules();
  }, [selectedSemester, selectedDay, profile?.mssv]);

  // Cuộn chat tự động
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages, advisorOpen]);

  // ─────────────────────────────────────────────────────────────
  // HÀNH ĐỘNG TẠO & LƯU LỘ TRÌNH
  // ─────────────────────────────────────────────────────────────
  const handleGenerateRoadmap = async (e) => {
    if (e) e.preventDefault();
    setRoadmapLoading(true);
    setRoadmapError('');
    try {
      const res = await api.generateScheduleRoadmap(preferences);
      if (res.success && res.data) {
        setRoadmapData(res.data);
        setSelectedPace(preferences.pace || 'balanced');
        setSelectedSemesterIdx(0);
        setShowPrefPanel(false);
      } else {
        setRoadmapError(res.message || 'Không thể tính toán phân bổ lộ trình.');
      }
    } catch (err) {
      setRoadmapError(err.message || 'Lỗi máy chủ khi tạo lộ trình học tập.');
    } finally {
      setRoadmapLoading(false);
    }
  };

  const handleSavePlan = async () => {
    if (!currentPlanOption) return;
    setSavingPlan(true);
    try {
      const payload = {
        planName: `Lộ trình ${currentPlanOption.label} - ${new Date().toLocaleDateString('vi-VN')}`,
        targetGraduationSemester: currentPlanOption.targetEndSemester,
        pace: selectedPace,
        preferences,
        studentSummary: roadmapData.student,
        academicStatus: roadmapData.academicStatus,
        plannedSemesters: currentPlanOption.plannedSemesters
      };

      const res = await api.saveStudyPlan(payload);
      if (res.success) {
        setSavedPlanMeta(res.data);
        setSaveSuccessMsg('Đã lưu thành công lộ trình và thời khóa biểu vào tài khoản của bạn!');
        setTimeout(() => setSaveSuccessMsg(''), 4000);
      }
    } catch (err) {
      alert(`Lỗi khi lưu lộ trình: ${err.message}`);
    } finally {
      setSavingPlan(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // ─────────────────────────────────────────────────────────────
  // HỘI THOẠI TRỢ LÝ AI TẠI CHỖ
  // ─────────────────────────────────────────────────────────────
  const handleSendChat = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() || chatLoading) return;

    const userText = chatInput.trim();
    setChatInput('');
    setChatMessages(prev => [...prev, { sender: 'user', text: userText }]);
    setChatLoading(true);

    try {
      const res = await api.chatScheduleAdvisor({
        message: userText,
        currentPlan: currentPlanOption,
        preferences
      });

      if (res.success && res.data?.reply) {
        setChatMessages(prev => [...prev, { sender: 'bot', text: res.data.reply }]);
      } else {
        setChatMessages(prev => [...prev, { 
          sender: 'bot', 
          text: 'Xin lỗi, hiện tại UniMate đang gặp sự cố khi xử lý câu hỏi này. Bạn hãy thử lại sau ít phút nhé!' 
        }]);
      }
    } catch (err) {
      setChatMessages(prev => [...prev, { 
        sender: 'bot', 
        text: `Đã có lỗi xảy ra: ${err.message || 'Không thể phản hồi'}` 
      }]);
    } finally {
      setChatLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // TÍNH TOÁN DỮ LIỆU HIỂN THỊ
  // ─────────────────────────────────────────────────────────────
  const currentPlanOption = useMemo(() => {
    if (!roadmapData?.options) return null;
    return roadmapData.options[selectedPace] || roadmapData.options.balanced;
  }, [roadmapData, selectedPace]);

  const currentPlannedSemester = useMemo(() => {
    if (!currentPlanOption?.plannedSemesters?.length) return null;
    const safeIdx = Math.min(selectedSemesterIdx, currentPlanOption.plannedSemesters.length - 1);
    return currentPlanOption.plannedSemesters[safeIdx] || null;
  }, [currentPlanOption, selectedSemesterIdx]);

  // Tạo map lưới thời khóa biểu cho học kỳ được chọn: [dayOfWeek][shift] -> course
  const scheduleMatrix = useMemo(() => {
    const matrix = {};
    DAYS_OF_WEEK.forEach(d => {
      matrix[d.value] = {};
    });

    if (currentPlannedSemester?.courses) {
      currentPlannedSemester.courses.forEach(c => {
        if (c.dayOfWeek && c.shift && matrix[c.dayOfWeek]) {
          matrix[c.dayOfWeek][c.shift] = c;
        }
      });
    }
    return matrix;
  }, [currentPlannedSemester]);

  // Phân loại lịch hiện tại theo từng thứ trong tuần (Tab Hiện Tại)
  const groupedSchedules = useMemo(() => {
    const groups = {};
    DAYS_OF_WEEK.forEach(d => {
      groups[d.value] = [];
    });
    schedules.forEach(item => {
      if (groups[item.dayOfWeek]) {
        groups[item.dayOfWeek].push(item);
      }
    });
    Object.values(groups).forEach(list => {
      list.sort((a, b) => a.startPeriod - b.startPeriod);
    });
    return groups;
  }, [schedules]);

  // Xử lý nộp form Thêm / Sửa lịch học Admin
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingItem) {
        await api.updateSchedule(editingItem._id, formData);
        setSuccessFlash('Cập nhật lịch học thành công!');
      } else {
        await api.createSchedule(formData);
        setSuccessFlash('Thêm lịch học mới thành công!');
      }
      setModalOpen(false);
      setEditingItem(null);
      fetchSchedules();
      setTimeout(() => setSuccessFlash(''), 3000);
    } catch (err) {
      alert(`Lỗi: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id, courseName) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa môn "${courseName}" khỏi thời khóa biểu?`)) {
      return;
    }
    try {
      await api.deleteSchedule(id);
      setSuccessFlash('Đã xóa lịch học thành công!');
      fetchSchedules();
      setTimeout(() => setSuccessFlash(''), 3000);
    } catch (err) {
      alert(`Lỗi xóa: ${err.message}`);
    }
  };

  const openAddModal = () => {
    setEditingItem(null);
    setFormData({
      semester: selectedSemester,
      courseCode: '',
      courseName: '',
      classSection: profile?.className || 'K30 CNTT',
      lecturer: '',
      dayOfWeek: 2,
      startPeriod: 1,
      endPeriod: 3,
      startTime: '07:30',
      endTime: '10:00',
      room: 'CS3 Đặng Thùy Trâm',
      dateRange: '08/09/2025 - 27/12/2025',
      notes: ''
    });
    setModalOpen(true);
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setFormData({
      semester: item.semester,
      courseCode: item.courseCode,
      courseName: item.courseName,
      classSection: item.classSection,
      lecturer: item.lecturer || '',
      dayOfWeek: item.dayOfWeek,
      startPeriod: item.startPeriod,
      endPeriod: item.endPeriod,
      startTime: item.startTime,
      endTime: item.endTime,
      room: item.room,
      dateRange: item.dateRange || '',
      notes: item.notes || ''
    });
    setModalOpen(true);
  };

  return (
    <div style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box', position: 'relative' }}>
      {/* ─────────────────────────────────────────────────────────────
          HEADER BANNER & TAB NAVIGATION
      ───────────────────────────────────────────────────────────── */}
      <div style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-lg)',
        padding: '24px',
        marginBottom: '20px',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, var(--vlu-red) 0%, #b91c1c 100%)',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(196, 18, 48, 0.25)',
              flexShrink: 0
            }}>
              <Calendar size={26} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <h1 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                  Thời Khóa Biểu & Lộ Trình Học Tập Cá Nhân
                </h1>
                <span style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  background: 'rgba(196, 18, 48, 0.1)',
                  color: 'var(--vlu-red)',
                  padding: '3px 8px',
                  borderRadius: '12px',
                  border: '1px solid rgba(196, 18, 48, 0.2)'
                }}>
                  VLU K30 CNTT
                </span>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px', marginBottom: 0 }}>
                Hệ thống tự động phân bổ môn học còn thiếu vào từng kỳ tiếp theo và gợi ý lịch học có khoảng nghỉ tối ưu.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setAdvisorOpen(!advisorOpen)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 600,
                border: '1px solid rgba(196, 18, 48, 0.3)',
                background: advisorOpen ? 'var(--vlu-red)' : 'rgba(196, 18, 48, 0.08)',
                color: advisorOpen ? 'white' : 'var(--vlu-red)',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              <Bot size={16} /> Trợ lý AI Cố Vấn
            </button>

            {activeTab === 'current' && isAdmin && (
              <button
                onClick={openAddModal}
                className="btn-vlu-primary"
                style={{ fontSize: '13px', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Plus size={16} /> Thêm Tiết Học
              </button>
            )}

            <div style={{
              background: 'var(--bg-primary)',
              padding: '6px 14px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: 600,
              border: '1px solid var(--border-color)',
              color: 'var(--text-main)'
            }}>
              Lớp: <strong>{roadmapData?.student?.className || profile?.className || 'K30 CNTT'}</strong>
            </div>
          </div>
        </div>

        {/* Chuyển đổi giữa Chế độ Lộ trình tự động & Thời khóa biểu tuần */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginTop: '20px',
          paddingTop: '16px',
          borderTop: '1px solid var(--border-color)'
        }}>
          <button
            onClick={() => setActiveTab('roadmap')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 18px',
              borderRadius: '8px',
              fontSize: '13.5px',
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
              background: activeTab === 'roadmap' ? 'var(--vlu-red)' : 'var(--bg-primary)',
              color: activeTab === 'roadmap' ? 'white' : 'var(--text-secondary)',
              boxShadow: activeTab === 'roadmap' ? '0 2px 8px rgba(196, 18, 48, 0.25)' : 'none'
            }}
          >
            <Sparkles size={16} /> Tự Động Lập Lộ Trình Cá Nhân Hóa
          </button>

          <button
            onClick={() => setActiveTab('current')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 18px',
              borderRadius: '8px',
              fontSize: '13.5px',
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
              background: activeTab === 'current' ? 'var(--vlu-red)' : 'var(--bg-primary)',
              color: activeTab === 'current' ? 'white' : 'var(--text-secondary)',
              boxShadow: activeTab === 'current' ? '0 2px 8px rgba(196, 18, 48, 0.25)' : 'none'
            }}
          >
            <CalendarCheck size={16} /> Thời Khóa Biểu Tuần Hiện Tại (MongoDB)
          </button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          NỘI DUNG CHÍNH TAB 1: LỘ TRÌNH & TKB TỰ ĐỘNG CÁ NHÂN HÓA
      ───────────────────────────────────────────────────────────── */}
      {activeTab === 'roadmap' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* 1. THẺ THÔNG TIN TIẾN ĐỘ HỌC VỤ & BẢNG ĐIỂM THẬT */}
          {roadmapData && (
            <div style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-lg)',
              padding: '18px 22px',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '16px',
              alignItems: 'center'
            }}>
              <div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                  Sinh viên & Chuyên ngành
                </span>
                <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-main)', marginTop: '2px' }}>
                  {roadmapData.student.fullName} ({roadmapData.student.mssv})
                </div>
                <div style={{ fontSize: '12.5px', color: 'var(--vlu-red)', fontWeight: 600 }}>
                  CN: {roadmapData.student.specializationName}
                </div>
              </div>

              <div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                  Tín chỉ tích lũy chính thức
                </span>
                <div style={{ fontSize: '18px', fontWeight: 900, color: '#16a34a', marginTop: '2px' }}>
                  {roadmapData.academicStatus.earnedCredits} / {roadmapData.academicStatus.totalCredits} TC
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Đang học HK hiện tại: <strong>{roadmapData.academicStatus.inProgressCredits} TC</strong>
                </div>
              </div>

              <div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                  Môn & Tín chỉ cần hoàn thành
                </span>
                <div style={{ fontSize: '18px', fontWeight: 900, color: 'var(--vlu-red)', marginTop: '2px' }}>
                  {roadmapData.academicStatus.remainingCredits} TC ({roadmapData.academicStatus.missingCoursesCount} môn/khối)
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Đến khi dự kiến đạt 126 TC tốt nghiệp
                </div>
              </div>

              <div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                  Điều kiện bắt buộc khác
                </span>
                <div style={{ display: 'flex', gap: '8px', marginTop: '4px', flexWrap: 'wrap' }}>
                  <span style={{
                    fontSize: '11px',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    background: roadmapData.academicStatus.physicalCompleted ? 'rgba(22, 163, 74, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    color: roadmapData.academicStatus.physicalCompleted ? '#16a34a' : '#ef4444',
                    fontWeight: 700
                  }}>
                    Thể chất: {roadmapData.academicStatus.physicalCompleted ? '✓ Đạt 4/4 TC' : 'Chưa đạt'}
                  </span>
                  <span style={{
                    fontSize: '11px',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    background: roadmapData.academicStatus.defenseCompleted ? 'rgba(22, 163, 74, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    color: roadmapData.academicStatus.defenseCompleted ? '#16a34a' : '#ef4444',
                    fontWeight: 700
                  }}>
                    Quốc phòng: {roadmapData.academicStatus.defenseCompleted ? '✓ Đạt 4 HP' : 'Chưa đạt'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* 2. THANH ĐIỀU HƯỚNG TÙY CHỌN LỘ TRÌNH VÀ CÁC THAO TÁC */}
          <div style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-lg)',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '14px'
          }}>
            {/* Lựa chọn 3 phương án tốc độ */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)' }}>Phương án:</span>
              {[
                { key: 'balanced', label: 'Cân bằng (Khuyên dùng)', icon: Zap },
                { key: 'light', label: 'Giảm tải (Nhẹ)', icon: Coffee },
                { key: 'fast', label: 'Tăng tốc (Sớm)', icon: Sparkles }
              ].map(opt => {
                const IconComponent = opt.icon;
                const active = selectedPace === opt.key;
                return (
                  <button
                    key={opt.key}
                    onClick={() => {
                      setSelectedPace(opt.key);
                      setSelectedSemesterIdx(0);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '7px 14px',
                      borderRadius: '8px',
                      fontSize: '12.5px',
                      fontWeight: 600,
                      border: active ? '1px solid var(--vlu-red)' : '1px solid var(--border-color)',
                      background: active ? 'var(--vlu-red)' : 'var(--bg-primary)',
                      color: active ? 'white' : 'var(--text-main)',
                      cursor: 'pointer',
                      transition: 'all 0.15s'
                    }}
                  >
                    <IconComponent size={14} /> {opt.label}
                  </button>
                );
              })}
            </div>

            {/* Các nút hành động: Tùy chỉnh, Lưu, In */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <button
                onClick={() => setShowPrefPanel(!showPrefPanel)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 12px',
                  borderRadius: '6px',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  border: '1px solid var(--border-color)',
                  background: showPrefPanel ? 'var(--bg-tertiary)' : 'var(--bg-primary)',
                  color: 'var(--text-main)',
                  cursor: 'pointer'
                }}
              >
                <Sliders size={14} /> Tùy chỉnh mục tiêu & ca học
              </button>

              <button
                onClick={handleSavePlan}
                disabled={savingPlan || !currentPlanOption}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 14px',
                  borderRadius: '6px',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  border: 'none',
                  background: '#16a34a',
                  color: 'white',
                  cursor: 'pointer',
                  opacity: savingPlan ? 0.7 : 1
                }}
              >
                {savingPlan ? <Loader2 size={14} className="spin" /> : <Save size={14} />}
                {savedPlanMeta ? 'Cập nhật lộ trình đã lưu' : 'Lưu vào hệ thống'}
              </button>

              <button
                onClick={handlePrint}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 12px',
                  borderRadius: '6px',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-primary)',
                  color: 'var(--text-main)',
                  cursor: 'pointer'
                }}
              >
                <Printer size={14} /> In / Xuất PDF
              </button>
            </div>
          </div>

          {/* Flash thông báo lưu thành công */}
          {saveSuccessMsg && (
            <div style={{
              background: 'rgba(22, 163, 74, 0.1)',
              border: '1px solid rgba(22, 163, 74, 0.3)',
              borderRadius: '8px',
              padding: '10px 16px',
              color: '#16a34a',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <CheckCircle2 size={16} /> {saveSuccessMsg}
            </div>
          )}

          {/* 3. PANEL TÙY CHỈNH NÂNG CAO (KHI BẤM "TÙY CHỈNH MỤC TIÊU") */}
          {showPrefPanel && (
            <div style={{
              background: 'var(--bg-primary)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-lg)',
              padding: '20px',
              boxShadow: 'var(--shadow-md)'
            }}>
              <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-main)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sliders size={18} color="var(--vlu-red)" /> Thiết Lập Tiêu Chí Lập Kế Hoạch & Thời Khóa Biểu
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '6px', color: 'var(--text-secondary)' }}>
                    Học kỳ bắt đầu xếp lịch:
                  </label>
                  <select
                    value={preferences.startSemester}
                    onChange={e => setPreferences({ ...preferences, startSemester: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-main)', fontSize: '13px' }}
                  >
                    <option value="2026-2027 HK02">2026-2027 HK02 (Kỳ tiếp theo)</option>
                    <option value="2026-2027 HK03">2026-2027 HK03 (Kỳ hè / phụ)</option>
                    <option value="2027-2028 HK01">2027-2028 HK01</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '6px', color: 'var(--text-secondary)' }}>
                    Mục tiêu tốt nghiệp:
                  </label>
                  <select
                    value={preferences.targetGraduationSemester}
                    onChange={e => setPreferences({ ...preferences, targetGraduationSemester: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-main)', fontSize: '13px' }}
                  >
                    <option value="2027-2028 HK01">Tốt nghiệp sớm (2027-2028 HK01)</option>
                    <option value="2027-2028 HK02">Đúng tiến độ chuẩn (2027-2028 HK02)</option>
                    <option value="2027-2028 HK03">Giãn tiến độ (2027-2028 HK03)</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '6px', color: 'var(--text-secondary)' }}>
                    Phương án khối tốt nghiệp (6 TC):
                  </label>
                  <select
                    value={preferences.graduationType}
                    onChange={e => setPreferences({ ...preferences, graduationType: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-main)', fontSize: '13px' }}
                  >
                    <option value="thesis">Khóa luận tốt nghiệp (71ITGR40206 - 6 TC)</option>
                    <option value="topics">2 Chuyên đề tốt nghiệp (2 x 3 TC)</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '6px', color: 'var(--text-secondary)' }}>
                    Khoảng thời gian học ưu tiên:
                  </label>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {[
                      { shift: 1, label: 'Ca 1 (Sáng sớm)' },
                      { shift: 2, label: 'Ca 2 (Sáng)' },
                      { shift: 3, label: 'Ca 3 (Chiều)' },
                      { shift: 4, label: 'Ca 4 (Chiều muộn)' },
                      { shift: 5, label: 'Ca 5 (Tối)' }
                    ].map(s => {
                      const selected = preferences.preferredShifts.includes(s.shift);
                      return (
                        <button
                          key={s.shift}
                          type="button"
                          onClick={() => {
                            const next = selected 
                              ? preferences.preferredShifts.filter(x => x !== s.shift)
                              : [...preferences.preferredShifts, s.shift];
                            setPreferences({ ...preferences, preferredShifts: next });
                          }}
                          style={{
                            padding: '4px 10px',
                            borderRadius: '4px',
                            fontSize: '11.5px',
                            fontWeight: 600,
                            border: selected ? '1px solid var(--vlu-red)' : '1px solid var(--border-color)',
                            background: selected ? 'rgba(196, 18, 48, 0.1)' : 'var(--bg-secondary)',
                            color: selected ? 'var(--vlu-red)' : 'var(--text-muted)',
                            cursor: 'pointer'
                          }}
                        >
                          {selected ? '✓ ' : ''}{s.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
                <button
                  onClick={() => setShowPrefPanel(false)}
                  className="btn-secondary"
                  style={{ fontSize: '12.5px', padding: '6px 14px' }}
                >
                  Đóng
                </button>
                <button
                  onClick={handleGenerateRoadmap}
                  disabled={roadmapLoading}
                  className="btn-vlu-primary"
                  style={{ fontSize: '12.5px', padding: '6px 16px', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  {roadmapLoading ? <Loader2 size={14} className="spin" /> : <RefreshCw size={14} />}
                  Tính Toán Lại Lộ Trình
                </button>
              </div>
            </div>
          )}

          {/* 4. HIỂN THỊ CÁC HỌC KỲ TRONG LỘ TRÌNH (TIẾN TRÌNH TIMELINE) */}
          {roadmapLoading ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
              <Loader2 size={36} className="spin" style={{ margin: '0 auto 12px', color: 'var(--vlu-red)' }} />
              <p style={{ fontWeight: 600 }}>UniMate đang phân tích điều kiện tiên quyết và tính toán lộ trình tối ưu...</p>
            </div>
          ) : roadmapError ? (
            <div style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '12px',
              padding: '20px',
              color: '#ef4444',
              textAlign: 'center'
            }}>
              <AlertCircle size={28} style={{ margin: '0 auto 8px' }} />
              <p style={{ fontWeight: 600 }}>{roadmapError}</p>
            </div>
          ) : currentPlanOption && (
            <div>
              {/* Mô tả phương án đang chọn */}
              <div style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                padding: '12px 18px',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '10px'
              }}>
                <div>
                  <strong style={{ fontSize: '14px', color: 'var(--text-main)' }}>{currentPlanOption.label}: </strong>
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{currentPlanOption.description}</span>
                </div>
                <div style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--vlu-red)' }}>
                  Tổng cộng: {currentPlanOption.totalSemesters} kỳ ({currentPlanOption.totalPlannedCredits} TC) • Dự kiến kết thúc: {currentPlanOption.targetEndSemester}
                </div>
              </div>

              {/* Dải các nút chọn học kỳ (Timeline Semesters) */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${Math.max(currentPlanOption.plannedSemesters.length, 1)}, 1fr)`,
                gap: '12px',
                marginBottom: '20px'
              }}>
                {currentPlanOption.plannedSemesters.map((sem, idx) => {
                  const isSelected = selectedSemesterIdx === idx;
                  return (
                    <div
                      key={sem.semester}
                      onClick={() => setSelectedSemesterIdx(idx)}
                      style={{
                        padding: '14px 16px',
                        borderRadius: '10px',
                        border: isSelected ? '2px solid var(--vlu-red)' : '1px solid var(--border-color)',
                        background: isSelected ? 'rgba(196, 18, 48, 0.04)' : 'var(--bg-secondary)',
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                        boxShadow: isSelected ? 'var(--shadow-sm)' : 'none',
                        position: 'relative'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <span style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '12px',
                          background: isSelected ? 'var(--vlu-red)' : 'var(--bg-tertiary)',
                          color: isSelected ? 'white' : 'var(--text-secondary)'
                        }}>
                          Kỳ {idx + 1}
                        </span>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>
                          {sem.yearLabel}
                        </span>
                      </div>

                      <div style={{ fontSize: '14px', fontWeight: 800, color: isSelected ? 'var(--vlu-red)' : 'var(--text-main)', marginBottom: '4px' }}>
                        {sem.semester}
                      </div>

                      <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between' }}>
                        <span>{sem.totalCourses} môn học</span>
                        <strong style={{ color: 'var(--text-main)' }}>{sem.totalCredits} TC</strong>
                      </div>

                      <div style={{ fontSize: '11px', color: '#16a34a', fontWeight: 600, marginTop: '6px' }}>
                        Lũy kế: ~{sem.projectedCumulativeCredits}/126 TC
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* 5. CHI TIẾT HỌC KỲ ĐƯỢC CHỌN: DANH SÁCH MÔN & THỜI KHÓA BIỂU */}
              {currentPlannedSemester && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  
                  {/* Danh sách môn học được phân bổ vào kỳ này */}
                  <div style={{
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '20px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                      <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-main)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <BookOpen size={18} color="var(--vlu-red)" />
                        Danh Sách Môn Đề Xuất Cho Học Kỳ {currentPlannedSemester.semester} ({currentPlannedSemester.totalCredits} Tín Chỉ)
                      </h3>
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                        {currentPlannedSemester.notes}
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
                      {currentPlannedSemester.courses.map((course, cIdx) => (
                        <div
                          key={course.code + cIdx}
                          style={{
                            background: 'var(--bg-primary)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '8px',
                            padding: '14px',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            gap: '8px'
                          }}
                        >
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                              <span style={{
                                fontSize: '11px',
                                fontWeight: 800,
                                color: 'var(--vlu-red)',
                                background: 'rgba(196, 18, 48, 0.08)',
                                padding: '2px 6px',
                                borderRadius: '4px'
                              }}>
                                {course.code}
                              </span>
                              <span style={{
                                fontSize: '11px',
                                fontWeight: 700,
                                padding: '2px 8px',
                                borderRadius: '12px',
                                background: course.isGraduation ? 'rgba(168, 85, 247, 0.1)' : course.isInternship ? 'rgba(59, 130, 246, 0.1)' : 'rgba(22, 163, 74, 0.1)',
                                color: course.isGraduation ? '#9333ea' : course.isInternship ? '#2563eb' : '#16a34a'
                              }}>
                                {course.credits} Tín chỉ
                              </span>
                            </div>

                            <h4 style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-main)', margin: '4px 0 6px 0', lineHeight: 1.3 }}>
                              {course.name}
                            </h4>

                            <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                              Nhóm: <strong>{course.groupName || course.requirementGroup}</strong>
                            </div>
                          </div>

                          <div style={{
                            borderTop: '1px dashed var(--border-color)',
                            paddingTop: '6px',
                            fontSize: '11px',
                            color: 'var(--text-muted)'
                          }}>
                            <div>💡 Lý do: {course.reason || 'Môn bắt buộc / Tự chọn tích lũy'}</div>
                            {course.prerequisites?.length > 0 && (
                              <div style={{ color: '#d97706', marginTop: '2px' }}>
                                ⚠️ Tiên quyết: {course.prerequisites.join(', ')}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* LƯỚI THỜI KHÓA BIỂU TUẦN GỢI Ý CÓ KHOẢNG NGHỈ (CA 1 - 5 VĂN LANG) */}
                  <div style={{
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '20px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                      <div>
                        <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-main)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Clock size={18} color="var(--vlu-red)" />
                          Gợi Ý Lịch Học Tuần Có Khoảng Nghỉ Tối Ưu (Khung Chuẩn Văn Lang)
                        </h3>
                        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
                          Xếp tối đa 2 ca liên tiếp, có nghỉ trưa 12:00 - 13:00, không xếp ca tối (Ca 5) sát ca sáng sớm (Ca 1).
                        </p>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '11.5px' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: 'var(--vlu-red)' }}></span>
                          Lớp thực tế (MongoDB)
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#3b82f6' }}></span>
                          Khung gợi ý tối ưu
                        </span>
                      </div>
                    </div>

                    {/* BẢNG LƯỚI THỜI KHÓA BIỂU TUẦN */}
                    <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                      <table style={{
                        width: '100%',
                        borderCollapse: 'collapse',
                        fontSize: '12px',
                        minWidth: '720px'
                      }}>
                        <thead>
                          <tr style={{ background: 'var(--bg-tertiary)', borderBottom: '2px solid var(--border-color)' }}>
                            <th style={{ padding: '12px 10px', textAlign: 'center', width: '130px', color: 'var(--text-main)', fontWeight: 700 }}>
                              Ca học / Tiết
                            </th>
                            {DAYS_OF_WEEK.map(d => (
                              <th key={d.value} style={{ padding: '12px 8px', textAlign: 'center', color: 'var(--text-main)', fontWeight: 700 }}>
                                {d.label}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {VLU_SHIFTS.map((shiftRow) => {
                            // Dòng đặc biệt: Nghỉ trưa
                            if (shiftRow.isBreak) {
                              return (
                                <tr key="lunch-break" style={{ background: 'rgba(234, 179, 8, 0.06)', borderBottom: '1px solid var(--border-color)' }}>
                                  <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 700, color: '#ca8a04', borderRight: '1px solid var(--border-color)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                                      <Coffee size={13} /> {shiftRow.name}
                                    </div>
                                    <div style={{ fontSize: '10.5px', fontWeight: 500 }}>{shiftRow.time}</div>
                                  </td>
                                  <td colSpan={7} style={{ padding: '8px 16px', textAlign: 'center', color: '#a16207', fontStyle: 'italic', fontSize: '11.5px' }}>
                                    ☕ Thời gian nghỉ ngơi, ăn trưa và nạp năng lượng (12:00 - 13:00)
                                  </td>
                                </tr>
                              );
                            }

                            return (
                              <tr key={shiftRow.shift} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                {/* Cột thông tin Ca học */}
                                <td style={{
                                  padding: '12px 8px',
                                  textAlign: 'center',
                                  background: 'var(--bg-primary)',
                                  borderRight: '1px solid var(--border-color)'
                                }}>
                                  <strong style={{ display: 'block', color: 'var(--text-main)', fontSize: '12.5px' }}>
                                    {shiftRow.name}
                                  </strong>
                                  <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
                                    {shiftRow.periods}
                                  </span>
                                  <div style={{ fontSize: '10.5px', color: 'var(--vlu-red)', fontWeight: 600, marginTop: '2px' }}>
                                    {shiftRow.time}
                                  </div>
                                </td>

                                {/* Các ô theo từng thứ trong tuần */}
                                {DAYS_OF_WEEK.map(day => {
                                  const cellCourse = scheduleMatrix[day.value]?.[shiftRow.shift];
                                  const isActual = cellCourse?.sourceType === 'actual_class';

                                  if (cellCourse) {
                                    return (
                                      <td
                                        key={day.value}
                                        style={{
                                          padding: '8px',
                                          verticalAlign: 'top',
                                          background: isActual ? 'rgba(196, 18, 48, 0.05)' : 'rgba(59, 130, 246, 0.05)',
                                          borderRight: '1px solid var(--border-color)'
                                        }}
                                      >
                                        <div style={{
                                          background: 'var(--bg-primary)',
                                          border: isActual ? '1px solid rgba(196, 18, 48, 0.3)' : '1px solid rgba(59, 130, 246, 0.3)',
                                          borderLeft: isActual ? '3px solid var(--vlu-red)' : '3px solid #3b82f6',
                                          borderRadius: '6px',
                                          padding: '8px',
                                          display: 'flex',
                                          flexDirection: 'column',
                                          gap: '4px'
                                        }}>
                                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{
                                              fontSize: '10px',
                                              fontWeight: 800,
                                              color: isActual ? 'var(--vlu-red)' : '#2563eb'
                                            }}>
                                              {cellCourse.code}
                                            </span>
                                            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                                              {cellCourse.credits} TC
                                            </span>
                                          </div>

                                          <div style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--text-main)', lineHeight: 1.25 }}>
                                            {cellCourse.name}
                                          </div>

                                          <div style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                            <MapPin size={10} /> {cellCourse.room || 'CS3 Đặng Thùy Trâm'}
                                          </div>

                                          {cellCourse.lecturer && (
                                            <div style={{ fontSize: '10px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                              <User size={10} /> {cellCourse.lecturer}
                                            </div>
                                          )}

                                          <div style={{
                                            fontSize: '9.5px',
                                            padding: '1px 4px',
                                            borderRadius: '3px',
                                            alignSelf: 'flex-start',
                                            background: isActual ? 'rgba(196, 18, 48, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                                            color: isActual ? 'var(--vlu-red)' : '#2563eb',
                                            fontWeight: 600
                                          }}>
                                            {isActual ? 'Lớp thực tế' : 'Đề xuất tối ưu'}
                                          </div>
                                        </div>
                                      </td>
                                    );
                                  }

                                  // Ô trống
                                  return (
                                    <td
                                      key={day.value}
                                      style={{
                                        padding: '8px',
                                        textAlign: 'center',
                                        color: 'var(--text-muted)',
                                        borderRight: '1px solid var(--border-color)',
                                        background: 'var(--bg-primary)'
                                      }}
                                    >
                                      <span style={{ opacity: 0.3, fontSize: '11px' }}>-</span>
                                    </td>
                                  );
                                })}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          NỘI DUNG CHÍNH TAB 2: THỜI KHÓA BIỂU TUẦN HIỆN TẠI (MONGODB)
      ───────────────────────────────────────────────────────────── */}
      {activeTab === 'current' && (
        <div>
          {/* Bộ lọc học kỳ & thứ trong tuần */}
          <div style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-lg)',
            padding: '18px 22px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '14px'
          }}>
            {/* Học kỳ */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 600 }}>Học kỳ:</span>
              <select
                value={selectedSemester}
                onChange={(e) => setSelectedSemester(e.target.value)}
                style={{
                  padding: '8px 14px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-primary)',
                  color: 'var(--text-main)',
                  fontSize: '13px',
                  fontWeight: 600,
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                {semesters.map(sem => (
                  <option key={sem} value={sem}>{sem}</option>
                ))}
              </select>
            </div>

            {/* Chọn ngày trong tuần */}
            <div style={{
              display: 'flex',
              gap: '6px',
              overflowX: 'auto',
              WebkitOverflowScrolling: 'touch',
              paddingBottom: '4px',
              maxWidth: '100%',
              scrollbarWidth: 'none'
            }}>
              <button
                onClick={() => setSelectedDay('all')}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  border: '1px solid var(--border-color)',
                  background: selectedDay === 'all' ? 'var(--vlu-red)' : 'var(--bg-primary)',
                  color: selectedDay === 'all' ? 'white' : 'var(--text-main)',
                  cursor: 'pointer',
                  flexShrink: 0
                }}
              >
                Cả Tuần
              </button>
              {DAYS_OF_WEEK.map(d => (
                <button
                  key={d.value}
                  onClick={() => setSelectedDay(d.value)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '8px',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    border: '1px solid var(--border-color)',
                    background: selectedDay === d.value ? 'var(--vlu-red)' : 'var(--bg-primary)',
                    color: selectedDay === d.value ? 'white' : 'var(--text-main)',
                    cursor: 'pointer',
                    flexShrink: 0
                  }}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {successFlash && (
            <div style={{
              marginBottom: '16px',
              background: 'rgba(22, 163, 74, 0.1)',
              border: '1px solid rgba(22, 163, 74, 0.3)',
              borderRadius: '8px',
              padding: '10px 14px',
              color: '#16a34a',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <CheckCircle2 size={16} /> {successFlash}
            </div>
          )}

          {/* Grid hiển thị TKB tuần hiện tại từ MongoDB */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
              <Loader2 size={32} className="spin" style={{ margin: '0 auto 12px', color: 'var(--vlu-red)' }} />
              <p>Đang tải thời khóa biểu từ MongoDB...</p>
            </div>
          ) : error ? (
            <div style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '12px',
              padding: '24px',
              color: '#ef4444',
              textAlign: 'center'
            }}>
              <AlertCircle size={28} style={{ margin: '0 auto 8px' }} />
              <p style={{ fontWeight: 600 }}>{error}</p>
            </div>
          ) : schedules.length === 0 ? (
            <div style={{
              background: 'var(--bg-secondary)',
              border: '1px dashed var(--border-color)',
              borderRadius: '12px',
              padding: '48px 24px',
              textAlign: 'center'
            }}>
              <Calendar size={40} color="var(--text-muted)" style={{ margin: '0 auto 12px', opacity: 0.6 }} />
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '6px' }}>
                Không có lịch học nào trong học kỳ này
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '450px', margin: '0 auto' }}>
                Chưa có lớp học phần nào được xếp lịch cho sinh viên trong học kỳ {selectedSemester}.
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: '16px' }}>
              {DAYS_OF_WEEK.filter(d => selectedDay === 'all' || selectedDay === d.value).map(day => {
                const dayItems = groupedSchedules[day.value] || [];
                if (dayItems.length === 0 && selectedDay !== 'all') {
                  return (
                    <div key={day.value} className="vlu-card" style={{ padding: '24px', textAlign: 'center' }}>
                      <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Không có tiết học vào {day.label}</p>
                    </div>
                  );
                }
                if (dayItems.length === 0) return null;

                return (
                  <div key={day.value} className="vlu-card" style={{ padding: '0', overflow: 'hidden' }}>
                    <div style={{
                      padding: '12px 18px',
                      background: 'var(--bg-tertiary)',
                      borderBottom: '1px solid var(--border-color)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{
                          background: 'var(--vlu-red)',
                          color: 'white',
                          width: '26px',
                          height: '26px',
                          borderRadius: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '12px',
                          fontWeight: 800
                        }}>
                          {day.short}
                        </span>
                        <strong style={{ fontSize: '14px', color: 'var(--text-main)' }}>{day.label}</strong>
                      </div>
                      <span className="badge badge-blue" style={{ fontSize: '11px' }}>
                        {dayItems.length} môn
                      </span>
                    </div>

                    <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {dayItems.map(item => (
                        <div
                          key={item._id}
                          style={{
                            padding: '12px 14px',
                            background: 'var(--bg-primary)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '8px',
                            position: 'relative'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '6px' }}>
                            <div>
                              <span style={{
                                fontSize: '11px',
                                fontWeight: 700,
                                color: 'var(--vlu-red)',
                                background: 'rgba(196, 18, 48, 0.08)',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                marginRight: '6px'
                              }}>
                                {item.courseCode}
                              </span>
                              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                {item.classSection}
                              </span>
                            </div>

                            {isAdmin && (
                              <div style={{ display: 'flex', gap: '4px' }}>
                                <button
                                  onClick={() => openEditModal(item)}
                                  title="Sửa lịch học"
                                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px' }}
                                >
                                  <Edit3 size={13} />
                                </button>
                                <button
                                  onClick={() => handleDelete(item._id, item.courseName)}
                                  title="Xóa lịch học"
                                  style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '2px' }}
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            )}
                          </div>

                          <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '8px', lineHeight: 1.3 }}>
                            {item.courseName}
                          </h4>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Clock size={13} color="var(--text-muted)" />
                              <span>Tiết {item.startPeriod} - {item.endPeriod} ({item.startTime} - {item.endTime})</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <MapPin size={13} color="var(--text-muted)" />
                              <span>{item.room}</span>
                            </div>
                            {item.lecturer && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <User size={13} color="var(--text-muted)" />
                                <span>GV: <strong>{item.lecturer}</strong></span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TRỢ LÝ AI CỐ VẤN THỜI KHÓA BIỂU TẠI CHỖ (SLIDE-OVER / POPUP)
      ───────────────────────────────────────────────────────────── */}
      {advisorOpen && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          width: '380px',
          maxWidth: 'calc(100vw - 32px)',
          height: '520px',
          background: 'var(--bg-primary)',
          border: '1px solid var(--border-color)',
          borderRadius: '16px',
          boxShadow: '0 12px 36px rgba(0,0,0,0.2)',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          {/* Header Trợ lý */}
          <div style={{
            padding: '14px 18px',
            background: 'linear-gradient(135deg, var(--vlu-red) 0%, #991b1b 100%)',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Bot size={20} />
              <div>
                <strong style={{ fontSize: '14px', display: 'block' }}>Cố Vấn Lịch Học AI</strong>
                <span style={{ fontSize: '11px', opacity: 0.9 }}>Tư vấn thời khóa biểu & tiên quyết</span>
              </div>
            </div>
            <button
              onClick={() => setAdvisorOpen(false)}
              style={{
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                color: 'white',
                borderRadius: '50%',
                width: '24px',
                height: '24px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px'
              }}
            >
              ×
            </button>
          </div>

          {/* Danh sách tin nhắn */}
          <div
            ref={chatScrollRef}
            style={{
              flex: 1,
              padding: '16px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}
          >
            {chatMessages.map((msg, i) => {
              const isUser = msg.sender === 'user';
              return (
                <div
                  key={i}
                  style={{
                    alignSelf: isUser ? 'flex-end' : 'flex-start',
                    maxWidth: '85%',
                    background: isUser ? 'var(--vlu-red)' : 'var(--bg-secondary)',
                    color: isUser ? 'white' : 'var(--text-main)',
                    padding: '10px 14px',
                    borderRadius: isUser ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                    fontSize: '12.5px',
                    lineHeight: 1.45,
                    border: isUser ? 'none' : '1px solid var(--border-color)',
                    whiteSpace: 'pre-line'
                  }}
                >
                  {msg.text}
                </div>
              );
            })}
            {chatLoading && (
              <div style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '12px' }}>
                <Loader2 size={14} className="spin" /> UniMate đang suy nghĩ...
              </div>
            )}
          </div>

          {/* Form nhập chat */}
          <form
            onSubmit={handleSendChat}
            style={{
              padding: '12px',
              borderTop: '1px solid var(--border-color)',
              display: 'flex',
              gap: '8px',
              background: 'var(--bg-secondary)'
            }}
          >
            <input
              type="text"
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              placeholder="Hỏi về lý do xếp môn, ca học..."
              disabled={chatLoading}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-primary)',
                color: 'var(--text-main)',
                fontSize: '12.5px',
                outline: 'none'
              }}
            />
            <button
              type="submit"
              disabled={chatLoading || !chatInput.trim()}
              style={{
                padding: '8px 12px',
                borderRadius: '8px',
                border: 'none',
                background: 'var(--vlu-red)',
                color: 'white',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: (!chatInput.trim() || chatLoading) ? 0.6 : 1
              }}
            >
              <Send size={15} />
            </button>
          </form>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL THÊM / SỬA TIẾT HỌC ADMIN (CHO TAB HIỆN TẠI)
      ───────────────────────────────────────────────────────────── */}
      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="modal-box chatgpt-scroll" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '16px', color: 'var(--text-main)' }}>
              {editingItem ? 'Chỉnh Sửa Tiết Học' : 'Thêm Tiết Học Mới Vào Thời Khóa Biểu'}
            </h3>

            <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Học kỳ</label>
                  <input
                    type="text"
                    value={formData.semester}
                    onChange={e => setFormData({ ...formData, semester: e.target.value })}
                    required
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-main)', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Mã môn học</label>
                  <input
                    type="text"
                    value={formData.courseCode}
                    onChange={e => setFormData({ ...formData, courseCode: e.target.value })}
                    placeholder="71ITBS10203"
                    required
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-main)', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Tên môn học</label>
                <input
                  type="text"
                  value={formData.courseName}
                  onChange={e => setFormData({ ...formData, courseName: e.target.value })}
                  placeholder="Cơ sở lập trình"
                  required
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-main)', fontSize: '13px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Lớp học phần</label>
                  <input
                    type="text"
                    value={formData.classSection}
                    onChange={e => setFormData({ ...formData, classSection: e.target.value })}
                    placeholder="K30 CNTT"
                    required
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-main)', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Thứ học</label>
                  <select
                    value={formData.dayOfWeek}
                    onChange={e => setFormData({ ...formData, dayOfWeek: Number(e.target.value) })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-main)', fontSize: '13px' }}
                  >
                    {DAYS_OF_WEEK.map(d => (
                      <option key={d.value} value={d.value}>{d.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '8px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Tiết đầu</label>
                  <input
                    type="number"
                    value={formData.startPeriod}
                    onChange={e => setFormData({ ...formData, startPeriod: Number(e.target.value) })}
                    min="1" max="15"
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-main)', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Tiết cuối</label>
                  <input
                    type="number"
                    value={formData.endPeriod}
                    onChange={e => setFormData({ ...formData, endPeriod: Number(e.target.value) })}
                    min="1" max="15"
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-main)', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Giờ BĐ</label>
                  <input
                    type="text"
                    value={formData.startTime}
                    onChange={e => setFormData({ ...formData, startTime: e.target.value })}
                    placeholder="07:30"
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-main)', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Giờ KT</label>
                  <input
                    type="text"
                    value={formData.endTime}
                    onChange={e => setFormData({ ...formData, endTime: e.target.value })}
                    placeholder="10:00"
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-main)', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Phòng học</label>
                  <input
                    type="text"
                    value={formData.room}
                    onChange={e => setFormData({ ...formData, room: e.target.value })}
                    placeholder="Lab B.03.04 CS3"
                    required
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-main)', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Giảng viên</label>
                  <input
                    type="text"
                    value={formData.lecturer}
                    onChange={e => setFormData({ ...formData, lecturer: e.target.value })}
                    placeholder="TS. Lê Thành An"
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-main)', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Ghi chú</label>
                <input
                  type="text"
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Lý thuyết hoặc thực hành lab"
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-main)', fontSize: '13px' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="btn-secondary"
                  style={{ padding: '8px 16px' }}
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-vlu-primary"
                  style={{ padding: '8px 20px', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  {submitting && <Loader2 size={14} className="spin" />}
                  {editingItem ? 'Lưu Thay Đổi' : 'Tạo Tiết Học'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
