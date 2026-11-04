import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  User, 
  BookOpen, 
  Plus, 
  Trash2, 
  Edit3, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Sparkles, 
  Save, 
  Printer, 
  RefreshCw, 
  Send, 
  Bot, 
  Sliders, 
  CalendarCheck, 
  Coffee, 
  ArrowRight, 
  ChevronDown,
  ChevronUp,
  Layers,
  Check,
  RotateCw,
  Search,
  Filter
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
  { shift: 'lunch', name: 'Nghỉ trưa', periods: 'Nghỉ ngơi', time: '12:00 - 13:00', session: 'break', isBreak: true },
  { shift: 3, name: 'Ca 3', periods: 'Tiết 7 - 9', time: '13:00 - 15:25', session: 'afternoon' },
  { shift: 4, name: 'Ca 4', periods: 'Tiết 10 - 12', time: '15:35 - 18:00', session: 'afternoon' },
  { shift: 5, name: 'Ca 5', periods: 'Tiết 13 - 16', time: '18:05 - 21:10', session: 'evening' }
];

export default function SchedulePage() {
  const { user, profile, isAdmin } = useAuth();
  
  // Tab chính: 'roadmap' (Lộ trình & TKB cá nhân) hoặc 'current' (TKB tuần hiện tại từ MongoDB)
  const [activeTab, setActiveTab] = useState('roadmap');

  // Ref cuộn mượt đến vùng kết quả sau khi tạo lộ trình
  const resultsRef = useRef(null);
  const chatScrollRef = useRef(null);

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
    includeCurrentInProgress: true,
    selectedElectiveTC309: null
  });
  const [showPrefPanel, setShowPrefPanel] = useState(false);
  const [savingPlan, setSavingPlan] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  // Modal đổi môn tự chọn (TC309)
  const [electiveModalOpen, setElectiveModalOpen] = useState(false);

  // Accordion đối chiếu toàn bộ môn học trong khung
  const [showAuditTable, setShowAuditTable] = useState(false);
  const [auditFilter, setAuditFilter] = useState('all'); // 'all' | 'in_progress' | 'planned' | 'passed' | 'not_selected_elective'

  // Trợ lý AI Thời khóa biểu tại chỗ
  const [advisorOpen, setAdvisorOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    {
      sender: 'bot',
      text: 'Xin chào! Mình là Trợ lý AI Thời khóa biểu UniMate. Mình có thể giải thích lý do phân bổ môn học, các môn tiên quyết, hoặc hỗ trợ đổi môn tự chọn cho bạn.'
    }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

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

    // 2. Tự động kiểm tra kế hoạch đã lưu hoặc nạp phương án ban đầu
    if (user?.role === 'student' || profile?.mssv) {
      loadInitialPlan();
    }
  }, [profile?.mssv]);

  const loadInitialPlan = async () => {
    try {
      const savedRes = await api.getSavedStudyPlan();
      if (savedRes.success && savedRes.data) {
        setSavedPlanMeta(savedRes.data);
        if (savedRes.data.preferences) {
          setPreferences(prev => ({ ...prev, ...savedRes.data.preferences }));
        }
      }
      // Nạp phương án tính toán mới nhất từ backend
      await fetchRoadmap(preferences, false);
    } catch (err) {
      console.warn('Initial roadmap check:', err);
    }
  };

  // Nạp lịch học từ MongoDB cho Tab Hiện Tại
  const fetchSchedules = async () => {
    setLoading(true);
    setError('');
    try {
      const params = { semester: selectedSemester };
      if (selectedDay !== 'all') params.dayOfWeek = selectedDay;
      if (user?.role === 'student') params.mssv = profile?.mssv || user.mssv;

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
    if (activeTab === 'current') {
      fetchSchedules();
    }
  }, [activeTab, selectedSemester, selectedDay, profile?.mssv]);

  // Cuộn chat tự động
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages, advisorOpen]);

  // ─────────────────────────────────────────────────────────────
  // HÀNH ĐỘNG GỌI BACKEND TẠO LỘ TRÌNH THỰC TẾ
  // ─────────────────────────────────────────────────────────────
  const fetchRoadmap = async (prefPayload, shouldScroll = true) => {
    setRoadmapLoading(true);
    setRoadmapError('');
    try {
      const payloadToSend = {
        ...preferences,
        ...(prefPayload || {})
      };
      const res = await api.generateScheduleRoadmap(payloadToSend);
      if (res.success && res.data) {
        setRoadmapData(res.data);
        setSelectedPace(payloadToSend.pace || 'balanced');
        setSelectedSemesterIdx(0);

        if (res.data.availableElectives?.currentSelectedCode) {
          setPreferences(prev => ({
            ...prev,
            selectedElectiveTC309: res.data.availableElectives.currentSelectedCode
          }));
        }

        if (shouldScroll) {
          setTimeout(() => {
            resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 150);
        }
      } else {
        setRoadmapError(res.message || 'Không thể tính toán phân bổ lộ trình.');
      }
    } catch (err) {
      setRoadmapError(err.message || 'Lỗi kết nối khi gửi yêu cầu tạo lộ trình học tập.');
    } finally {
      setRoadmapLoading(false);
    }
  };

  // Nút chính "Gợi ý lộ trình & thời khóa biểu"
  const handlePrimaryGenerateClick = () => {
    setShowPrefPanel(true);
  };

  // Nút "Tạo phương án" trong form tùy chọn
  const handleExecuteGenerate = (e) => {
    if (e) e.preventDefault();
    fetchRoadmap(preferences, true);
  };

  // Nút "Gợi ý lại" luân chuyển môn tự chọn hợp lệ
  const handleRegenerateWithCycle = () => {
    const currentCode = preferences.selectedElectiveTC309 || roadmapData?.availableElectives?.currentSelectedCode;
    const cyclePayload = {
      ...preferences,
      cycleElective: true,
      currentElectiveTC309: currentCode
    };
    fetchRoadmap(cyclePayload, true);
    setSaveSuccessMsg('🔄 Đã tạo phương án mới với môn tự chọn luân chuyển hợp lệ!');
    setTimeout(() => setSaveSuccessMsg(''), 4000);
  };

  // Chọn môn tự chọn cụ thể từ Modal
  const handleSelectSpecificElective = (courseCode) => {
    const updatedPref = {
      ...preferences,
      selectedElectiveTC309: courseCode
    };
    setPreferences(updatedPref);
    setElectiveModalOpen(false);
    fetchRoadmap(updatedPref, true);
    setSaveSuccessMsg(`✓ Đã đổi sang môn tự chọn: ${courseCode}`);
    setTimeout(() => setSaveSuccessMsg(''), 4000);
  };

  // Lưu kế hoạch vào MongoDB
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
        setSaveSuccessMsg('Đã lưu thành công lộ trình và thời khóa biểu vào hệ thống!');
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
  const sendChatMessage = async (userText) => {
    if (!userText || !userText.trim() || chatLoading) return;

    const trimmed = userText.trim();
    setChatMessages(prev => [...prev, { sender: 'user', text: trimmed }]);
    setChatLoading(true);

    try {
      const res = await api.chatScheduleAdvisor({
        message: trimmed,
        currentPlan: currentPlanOption,
        preferences
      });

      if (res.success && res.data?.reply) {
        setChatMessages(prev => [...prev, { sender: 'bot', text: res.data.reply }]);

        // Xử lý gợi ý hành động tự động từ AI (nếu có)
        if (res.data?.suggestedAction) {
          const action = res.data.suggestedAction;
          if (action.type === 'CHANGE_PACE' && action.pace) {
            setSelectedPace(action.pace);
            setPreferences(prev => ({ ...prev, pace: action.pace }));
          } else if (action.type === 'APPLY_PREFERENCES' && action.preferences) {
            const updatedPref = { ...preferences, ...action.preferences };
            setPreferences(updatedPref);
            fetchRoadmap(updatedPref, true);
          }
        }
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

  const handleSendChat = (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const txt = chatInput;
    setChatInput('');
    sendChatMessage(txt);
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
        const day = c.dayOfWeek || c.suggestedSchedule?.dayOfWeek;
        const shift = c.shift || c.suggestedSchedule?.shift;
        if (day && shift && matrix[day]) {
          matrix[day][shift] = c;
        }
      });
    }
    return matrix;
  }, [currentPlannedSemester]);

  // Lọc các môn không xếp được vào ca học chuẩn (ví dụ: Thực tập doanh nghiệp cả tuần)
  const nonGridCourses = useMemo(() => {
    if (!currentPlannedSemester?.courses) return [];
    return currentPlannedSemester.courses.filter(c => {
      const shift = c.shift || c.suggestedSchedule?.shift;
      return !shift || shift === 0 || c.isInternship;
    });
  }, [currentPlannedSemester]);

  // Danh sách các môn tự chọn TC309 từ backend
  const availableTC309 = useMemo(() => {
    return roadmapData?.availableElectives?.TC309 || [];
  }, [roadmapData]);

  // Lọc bảng đối chiếu toàn bộ môn học trong khung
  const filteredAuditCourses = useMemo(() => {
    const list = roadmapData?.fullCurriculumAudit || [];
    if (auditFilter === 'all') return list;
    return list.filter(c => c.status === auditFilter);
  }, [roadmapData, auditFilter]);

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
          1. HEADER BANNER CHÍNH & NÚT GỢI Ý LỘ TRÌNH & THỜI KHÓA BIỂU
      ───────────────────────────────────────────────────────────── */}
      <div style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-lg)',
        padding: '22px 24px',
        marginBottom: '20px',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          
          {/* Tiêu đề & Logo */}
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
                  Thời Khóa Biểu Học Tập
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

          {/* Cụm Nút Hành Động Ở Đầu Trang */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {/* NÚT CHÍNH YÊU CẦU: GỢI Ý LỘ TRÌNH & THỜI KHÓA BIỂU */}
            <button
              onClick={handlePrimaryGenerateClick}
              disabled={roadmapLoading}
              className="btn-vlu-primary"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 20px',
                fontSize: '13.5px',
                fontWeight: 700,
                borderRadius: '8px',
                boxShadow: '0 4px 14px rgba(196, 18, 48, 0.3)',
                cursor: 'pointer'
              }}
            >
              {roadmapLoading ? <Loader2 size={16} className="spin" /> : <Sparkles size={16} />}
              Gợi ý lộ trình & thời khóa biểu
            </button>

            <button
              onClick={() => setAdvisorOpen(!advisorOpen)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '9px 14px',
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
              <Bot size={16} /> Cố Vấn AI
            </button>

            {activeTab === 'current' && isAdmin && (
              <button
                onClick={openAddModal}
                className="btn-vlu-primary"
                style={{ fontSize: '13px', padding: '9px 16px', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Plus size={16} /> Thêm Tiết Học
              </button>
            )}
          </div>
        </div>

        {/* Tab chuyển đổi: Lộ trình cá nhân hóa vs Thời khóa biểu tuần hiện tại */}
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
              padding: '9px 16px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
              background: activeTab === 'roadmap' ? 'var(--vlu-red)' : 'var(--bg-primary)',
              color: activeTab === 'roadmap' ? 'white' : 'var(--text-secondary)',
              boxShadow: activeTab === 'roadmap' ? '0 2px 8px rgba(196, 18, 48, 0.25)' : 'none'
            }}
          >
            <Sparkles size={15} /> Lộ Trình & Lịch Học Các Kỳ Tiếp Theo
          </button>

          <button
            onClick={() => setActiveTab('current')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '9px 16px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
              background: activeTab === 'current' ? 'var(--vlu-red)' : 'var(--bg-primary)',
              color: activeTab === 'current' ? 'white' : 'var(--text-secondary)',
              boxShadow: activeTab === 'current' ? '0 2px 8px rgba(196, 18, 48, 0.25)' : 'none'
            }}
          >
            <CalendarCheck size={15} /> Thời Khóa Biểu Tuần Hiện Tại (MongoDB)
          </button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. PANEL TÙY CHỈNH MONG MUỐN HỌC TẬP (MỞ KHI BẤM NÚT CHÍNH)
      ───────────────────────────────────────────────────────────── */}
      {showPrefPanel && (
        <div style={{
          background: 'var(--bg-primary)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-lg)',
          padding: '20px 24px',
          marginBottom: '20px',
          boxShadow: 'var(--shadow-md)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-main)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sliders size={18} color="var(--vlu-red)" /> Thiết Lập Tiêu Chí Lập Kế Hoạch & Thời Khóa Biểu
            </h3>
            <button
              onClick={() => setShowPrefPanel(false)}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '13px', cursor: 'pointer', fontWeight: 600 }}
            >
              Thu gọn ✕
            </button>
          </div>

          <form onSubmit={handleExecuteGenerate}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
              
              {/* 1. Kỳ bắt đầu */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '6px', color: 'var(--text-secondary)' }}>
                  Học kỳ bắt đầu:
                </label>
                <select
                  value={preferences.startSemester}
                  onChange={e => setPreferences({ ...preferences, startSemester: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-main)', fontSize: '13px' }}
                >
                  <option value="2026-2027 HK02">2026-2027 HK02 (Học kỳ tiếp theo)</option>
                  <option value="2026-2027 HK03">2026-2027 HK03 (Học kỳ hè)</option>
                  <option value="2027-2028 HK01">2027-2028 HK01</option>
                </select>
              </div>

              {/* 2. Mục tiêu hoàn thành */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '6px', color: 'var(--text-secondary)' }}>
                  Mục tiêu hoàn thành:
                </label>
                <select
                  value={preferences.targetGraduationSemester}
                  onChange={e => setPreferences({ ...preferences, targetGraduationSemester: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-main)', fontSize: '13px' }}
                >
                  <option value="2027-2028 HK01">Ưu tiên hoàn thành sớm (2027-2028 HK01)</option>
                  <option value="2027-2028 HK02">Hoàn thành đúng hạn chuẩn (2027-2028 HK02)</option>
                  <option value="2027-2028 HK03">Giãn tiến độ học tập (2027-2028 HK03)</option>
                </select>
              </div>

              {/* 3. Mức học */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '6px', color: 'var(--text-secondary)' }}>
                  Mức học mong muốn:
                </label>
                <select
                  value={preferences.pace}
                  onChange={e => setPreferences({ ...preferences, pace: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-main)', fontSize: '13px' }}
                >
                  <option value="balanced">Cân bằng (Kỳ 1: 4 môn, Kỳ 2: Khóa luận)</option>
                  <option value="light">Nhẹ hơn (Kỳ 1: 3 môn, Kỳ 2: Thực tập, Kỳ 3: Khóa luận)</option>
                  <option value="fast">Ưu tiên hoàn thành sớm (Tối đa môn theo tiên quyết)</option>
                </select>
              </div>

              {/* 4. Hình thức tốt nghiệp */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '6px', color: 'var(--text-secondary)' }}>
                  Hình thức khối tốt nghiệp:
                </label>
                <select
                  value={preferences.graduationType}
                  onChange={e => setPreferences({ ...preferences, graduationType: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-main)', fontSize: '13px' }}
                >
                  <option value="thesis">Khóa luận tốt nghiệp</option>
                  <option value="topics">2 Chuyên đề tốt nghiệp thay thế</option>
                </select>
              </div>

              {/* 5. Ca ưu tiên */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '6px', color: 'var(--text-secondary)' }}>
                  Ca học ưu tiên:
                </label>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {[
                    { shift: 1, label: 'Ca 1 (Sáng)' },
                    { shift: 2, label: 'Ca 2 (Trưa)' },
                    { shift: 3, label: 'Ca 3 (Chiều)' },
                    { shift: 4, label: 'Ca 4 (Chiều muộn)' },
                    { shift: 5, label: 'Ca 5 (Tối)' }
                  ].map(s => {
                    const active = preferences.preferredShifts.includes(s.shift);
                    return (
                      <button
                        key={s.shift}
                        type="button"
                        onClick={() => {
                          const next = active 
                            ? preferences.preferredShifts.filter(x => x !== s.shift)
                            : [...preferences.preferredShifts, s.shift];
                          setPreferences({ ...preferences, preferredShifts: next });
                        }}
                        style={{
                          padding: '5px 9px',
                          borderRadius: '4px',
                          fontSize: '11.5px',
                          fontWeight: 600,
                          border: active ? '1px solid var(--vlu-red)' : '1px solid var(--border-color)',
                          background: active ? 'rgba(196, 18, 48, 0.1)' : 'var(--bg-secondary)',
                          color: active ? 'var(--vlu-red)' : 'var(--text-muted)',
                          cursor: 'pointer'
                        }}
                      >
                        {active ? '✓ ' : ''}{s.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 6. Khoảng nghỉ & Tránh ca tối */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '6px', color: 'var(--text-secondary)' }}>
                  Khoảng nghỉ & Sức khỏe:
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-main)', cursor: 'pointer', marginBottom: '6px' }}>
                  <input
                    type="checkbox"
                    checked={preferences.avoidNightMorning}
                    onChange={e => setPreferences({ ...preferences, avoidNightMorning: e.target.checked })}
                  />
                  <span>Tránh học Ca 5 (tối) rồi Ca 1 (sáng hôm sau)</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-main)', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={preferences.includeCurrentInProgress}
                    onChange={e => setPreferences({ ...preferences, includeCurrentInProgress: e.target.checked })}
                  />
                  <span>Giả định các môn đang học kỳ này sẽ thi ĐẠT</span>
                </label>
              </div>
            </div>

            {/* Nút Thực hiện tạo phương án */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '18px', paddingTop: '14px', borderTop: '1px solid var(--border-color)' }}>
              <button
                type="button"
                onClick={() => setShowPrefPanel(false)}
                className="btn-secondary"
                style={{ fontSize: '13px', padding: '8px 16px' }}
              >
                Đóng
              </button>
              <button
                type="submit"
                disabled={roadmapLoading}
                className="btn-vlu-primary"
                style={{
                  fontSize: '13px',
                  padding: '8px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  opacity: roadmapLoading ? 0.7 : 1
                }}
              >
                {roadmapLoading ? <Loader2 size={15} className="spin" /> : <RefreshCw size={15} />}
                Tạo phương án
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          3. NỘI DUNG CHÍNH: LỘ TRÌNH & THỜI KHÓA BIỂU CÁ NHÂN
      ───────────────────────────────────────────────────────────── */}
      {activeTab === 'roadmap' && (
        <div ref={resultsRef} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Thông báo lưu thành công hoặc luân chuyển thành công */}
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

          {/* Thanh lựa chọn 3 Phương án học tập (Không hiển thị tín chỉ / GPA) */}
          <div style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-lg)',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            {/* 3 Mức học */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)', marginRight: '4px' }}>
                Phương án:
              </span>
              {[
                { key: 'balanced', label: 'Cân bằng (Khuyên dùng)' },
                { key: 'light', label: 'Nhẹ hơn mỗi kỳ' },
                { key: 'fast', label: 'Ưu tiên hoàn thành sớm' }
              ].map(opt => {
                const active = selectedPace === opt.key;
                return (
                  <button
                    key={opt.key}
                    onClick={() => {
                      setSelectedPace(opt.key);
                      setSelectedSemesterIdx(0);
                    }}
                    style={{
                      padding: '8px 14px',
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
                    {opt.label}
                  </button>
                );
              })}
            </div>

            {/* Các nút: Gợi ý lại, Điều chỉnh, Lưu, In */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <button
                onClick={handleRegenerateWithCycle}
                disabled={roadmapLoading}
                title="Luân chuyển sang môn tự chọn hợp lệ tiếp theo"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-primary)',
                  color: 'var(--text-main)',
                  cursor: 'pointer'
                }}
              >
                <RotateCw size={13} className={roadmapLoading ? 'spin' : ''} /> Gợi ý lại
              </button>

              <button
                onClick={() => setShowPrefPanel(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-primary)',
                  color: 'var(--text-main)',
                  cursor: 'pointer'
                }}
              >
                <Sliders size={13} /> Điều chỉnh mong muốn
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
                  fontSize: '12px',
                  fontWeight: 600,
                  border: 'none',
                  background: '#16a34a',
                  color: 'white',
                  cursor: 'pointer',
                  opacity: savingPlan ? 0.7 : 1
                }}
              >
                {savingPlan ? <Loader2 size={13} className="spin" /> : <Save size={13} />}
                Lưu vào hệ thống
              </button>

              <button
                onClick={handlePrint}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-primary)',
                  color: 'var(--text-main)',
                  cursor: 'pointer'
                }}
              >
                <Printer size={13} /> In / Xuất PDF
              </button>
            </div>
          </div>

          {/* Loading hoặc Lỗi */}
          {roadmapLoading ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
              <Loader2 size={36} className="spin" style={{ margin: '0 auto 12px', color: 'var(--vlu-red)' }} />
              <p style={{ fontWeight: 600, fontSize: '14px' }}>
                UniMate đang đọc dữ liệu thật từ MongoDB, phân tích điều kiện tiên quyết và lập lịch tối ưu...
              </p>
            </div>
          ) : roadmapError ? (
            <div style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '12px',
              padding: '24px',
              color: '#ef4444',
              textAlign: 'center'
            }}>
              <AlertCircle size={30} style={{ margin: '0 auto 10px' }} />
              <p style={{ fontWeight: 700, fontSize: '14px', marginBottom: '10px' }}>{roadmapError}</p>
              <button
                onClick={() => fetchRoadmap(preferences, true)}
                className="btn-vlu-primary"
                style={{ fontSize: '12.5px', padding: '6px 16px', margin: '0 auto' }}
              >
                Thử lại
              </button>
            </div>
          ) : currentPlanOption && (
            <div>
              {/* Mô tả chi tiết phương án (Không hiển thị tín chỉ / GPA) */}
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
                gap: '8px'
              }}>
                <div>
                  <strong style={{ fontSize: '13.5px', color: 'var(--text-main)' }}>{currentPlanOption.label}: </strong>
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{currentPlanOption.description}</span>
                </div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--vlu-red)' }}>
                  Dự kiến hoàn thành trong {currentPlanOption.totalSemesters} học kỳ • Kỳ tốt nghiệp: {currentPlanOption.targetEndSemester}
                </div>
              </div>

              {/* Dải các nút chọn học kỳ tiếp theo (Timeline Semesters) - Kèm tóm tắt tên môn */}
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
                        <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)' }}>
                          {sem.yearLabel}
                        </span>
                      </div>

                      <div style={{ fontSize: '14px', fontWeight: 800, color: isSelected ? 'var(--vlu-red)' : 'var(--text-main)', marginBottom: '4px' }}>
                        {sem.semester}
                      </div>

                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: '6px' }}>
                        {sem.totalCourses} môn học
                      </div>

                      {/* Tóm tắt tên các môn học của kỳ */}
                      <div style={{
                        fontSize: '11px',
                        color: 'var(--text-muted)',
                        lineHeight: 1.35,
                        borderTop: '1px dashed var(--border-color)',
                        paddingTop: '6px'
                      }}>
                        {sem.courses.map(c => c.courseName).join(', ')}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Chi tiết học kỳ đang chọn: Danh sách môn & Lưới thời khóa biểu */}
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
                      <div>
                        {/* Chỉ báo "Đang xem Kỳ X trong Y kỳ" */}
                        <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--vlu-red)', marginBottom: '4px' }}>
                          📍 Đang xem Kỳ {selectedSemesterIdx + 1} / {currentPlanOption.plannedSemesters.length} kỳ ({currentPlannedSemester.semester})
                        </div>
                        <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-main)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <BookOpen size={18} color="var(--vlu-red)" />
                          Danh Sách Môn Đề Xuất Cho Học Kỳ {currentPlannedSemester.semester} ({currentPlannedSemester.totalCourses} Môn Học)
                        </h3>
                      </div>

                      <button
                        onClick={() => {
                          setAdvisorOpen(true);
                          sendChatMessage(`Tư vấn lịch học và điều kiện tiên quyết cho học kỳ ${currentPlannedSemester.semester}`);
                        }}
                        style={{
                          fontSize: '12px',
                          padding: '6px 14px',
                          borderRadius: '6px',
                          border: '1px solid rgba(196, 18, 48, 0.3)',
                          background: 'rgba(196, 18, 48, 0.08)',
                          color: 'var(--vlu-red)',
                          cursor: 'pointer',
                          fontWeight: 600
                        }}
                      >
                        💬 Tư vấn lịch học kỳ này
                      </button>
                    </div>

                    <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', margin: '0 0 16px 0', fontStyle: 'italic' }}>
                      {currentPlannedSemester.notes}
                    </p>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
                      {currentPlannedSemester.courses.map((course, cIdx) => (
                        <div
                          key={(course.courseCode || course.code) + cIdx}
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
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                              <span style={{
                                fontSize: '11px',
                                fontWeight: 800,
                                color: 'var(--vlu-red)',
                                background: 'rgba(196, 18, 48, 0.08)',
                                padding: '2px 6px',
                                borderRadius: '4px'
                              }}>
                                {course.courseCode || course.code}
                              </span>

                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  padding: '2px 8px',
                                  borderRadius: '12px',
                                  background: course.isGraduation ? 'rgba(168, 85, 247, 0.1)' : course.isInternship ? 'rgba(59, 130, 246, 0.1)' : 'rgba(22, 163, 74, 0.1)',
                                  color: course.isGraduation ? '#9333ea' : course.isInternship ? '#2563eb' : '#16a34a'
                                }}>
                                  {course.groupName || 'Môn học'}
                                </span>

                                {/* Nút đổi môn tự chọn nếu là nhóm TC309 */}
                                {course.groupCode === 'TC309' && (
                                  <button
                                    onClick={() => setElectiveModalOpen(true)}
                                    title="Đổi sang môn tự chọn chuyên ngành khác"
                                    style={{
                                      fontSize: '10.5px',
                                      padding: '2px 6px',
                                      borderRadius: '4px',
                                      border: '1px solid rgba(196, 18, 48, 0.3)',
                                      background: 'var(--bg-secondary)',
                                      color: 'var(--vlu-red)',
                                      cursor: 'pointer',
                                      fontWeight: 600,
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '3px'
                                    }}
                                  >
                                    <RotateCw size={10} /> Đổi môn
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Tên môn học đầy đủ */}
                            <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-main)', margin: '4px 0 6px 0', lineHeight: 1.35 }}>
                              {course.courseName || course.name}
                            </h4>

                            <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                              Thứ tự: <strong>Môn thứ {cIdx + 1} trong kỳ</strong>
                            </div>
                          </div>

                          <div style={{
                            borderTop: '1px dashed var(--border-color)',
                            paddingTop: '6px',
                            fontSize: '11.5px',
                            color: 'var(--text-muted)'
                          }}>
                            <div>💡 {course.reason || 'Môn bắt buộc theo chuyên ngành đã chọn'}</div>
                            {course.conditionText ? (
                              <div style={{ color: '#d97706', marginTop: '3px', fontWeight: 500 }}>
                                📌 {course.conditionText}
                              </div>
                            ) : course.priorCourses?.length > 0 ? (
                              <div style={{ color: '#d97706', marginTop: '3px' }}>
                                🟡 Môn học trước: {course.priorCourses.join(', ')}
                              </div>
                            ) : null}
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
                          Gợi Ý Lịch Học Tuần Có Khoảng Nghỉ (Khung Chuẩn Văn Lang)
                        </h3>
                        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
                          Nghỉ trưa 12:00 - 13:00, giải lao giữa các ca, tối đa 2 ca liên tiếp, không xếp Ca 5 (tối: Tiết 13-16) sát Ca 1 (sáng sớm).
                        </p>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '11.5px' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: 'var(--vlu-red)' }}></span>
                          Lớp thực tế (MongoDB)
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#3b82f6' }}></span>
                          Lịch đề xuất tối ưu
                        </span>
                      </div>
                    </div>

                    {/* BẢNG LƯỚI THỜI KHÓA BIỂU TUẦN */}
                    <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                      <table style={{
                        width: '100%',
                        borderCollapse: 'collapse',
                        fontSize: '12px',
                        minWidth: '740px'
                      }}>
                        <thead>
                          <tr style={{ background: 'var(--bg-tertiary)', borderBottom: '2px solid var(--border-color)' }}>
                            <th style={{ padding: '12px 10px', textAlign: 'center', width: '135px', color: 'var(--text-main)', fontWeight: 700 }}>
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
                            // Dòng đặc biệt: Nghỉ trưa 12:00 - 13:00
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
                                    ☕ Khoảng nghỉ trưa, ăn uống và nạp năng lượng (12:00 - 13:00)
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
                                  const isActual = cellCourse?.sourceType === 'actual_class' || cellCourse?.isActualClass;

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
                                              fontSize: '10.5px',
                                              fontWeight: 800,
                                              color: isActual ? 'var(--vlu-red)' : '#2563eb'
                                            }}>
                                              {cellCourse.courseCode || cellCourse.code}
                                            </span>
                                          </div>

                                          {/* Tên môn học đầy đủ trên ô lịch */}
                                          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-main)', lineHeight: 1.3 }}>
                                            {cellCourse.courseName || cellCourse.name}
                                          </div>

                                          <div style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                            <MapPin size={10} /> {cellCourse.room || (isActual ? 'Phòng học chính thức' : 'Phòng học CS3 (Gợi ý)')}
                                          </div>

                                          {cellCourse.lecturer && (
                                            <div style={{ fontSize: '10px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                              <User size={10} /> {cellCourse.lecturer}
                                            </div>
                                          )}

                                          <div style={{
                                            fontSize: '9.5px',
                                            padding: '1px 5px',
                                            borderRadius: '3px',
                                            alignSelf: 'flex-start',
                                            background: isActual ? 'rgba(196, 18, 48, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                                            color: isActual ? 'var(--vlu-red)' : '#2563eb',
                                            fontWeight: 600
                                          }}>
                                            {isActual ? 'Lớp thực tế (MongoDB)' : 'Lịch đề xuất — chưa mở lớp chính thức'}
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
                                      <span style={{ opacity: 0.25, fontSize: '11px' }}>-</span>
                                    </td>
                                  );
                                })}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Môn thực tập hoặc môn đặc thù không chiếm ca cố định */}
                    {nonGridCourses.length > 0 && (
                      <div style={{ marginTop: '16px', padding: '12px 16px', background: 'var(--bg-tertiary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                        <strong style={{ fontSize: '12.5px', color: 'var(--text-main)', display: 'block', marginBottom: '6px' }}>
                          🏢 Học phần thực tập / đặc thù:
                        </strong>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {nonGridCourses.map((c, i) => (
                            <div key={i} style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                              • <strong>{c.courseCode || c.code} - {c.courseName || c.name}</strong> ({c.groupName}): {c.reason || 'Thực hiện tại doanh nghiệp liên kết, thời gian linh hoạt.'}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* ─────────────────────────────────────────────────────────────
                      ACCORDION: ĐỐI CHIẾU TOÀN BỘ MÔN HỌC & VÌ SAO MÔN KHÁC KHÔNG XẾP
                  ───────────────────────────────────────────────────────────── */}
                  <div style={{
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-lg)',
                    overflow: 'hidden'
                  }}>
                    <button
                      onClick={() => setShowAuditTable(!showAuditTable)}
                      style={{
                        width: '100%',
                        padding: '16px 20px',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        textAlign: 'left'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Layers size={18} color="var(--vlu-red)" />
                        <strong style={{ fontSize: '14px', color: 'var(--text-main)' }}>
                          Bảng Đối Chiếu Toàn Bộ Môn Học Khung K30 & Vì Sao Các Môn Khác Không Được Đề Xuất?
                        </strong>
                      </div>
                      {showAuditTable ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </button>

                    {showAuditTable && (
                      <div style={{ padding: '0 20px 20px 20px', borderTop: '1px solid var(--border-color)' }}>
                        
                        {/* Lời giải thích tổng quan */}
                        <div style={{
                          padding: '12px 16px',
                          background: 'rgba(59, 130, 246, 0.08)',
                          borderRadius: '8px',
                          border: '1px solid rgba(59, 130, 246, 0.2)',
                          fontSize: '12.5px',
                          color: 'var(--text-main)',
                          margin: '16px 0',
                          lineHeight: 1.45
                        }}>
                          <strong>💡 Căn cứ phân bổ học phần:</strong>
                          <div style={{ marginTop: '4px' }}>
                            • <strong>88 tín chỉ đã đạt</strong>: Đã tích lũy hợp lệ trong lịch sử học tập, không đề xuất học lại.<br/>
                            • <strong>19 tín chỉ đang học</strong>: Đang theo học tại HK hiện tại, được <em>giả định thi ĐẠT</em> để mở môn học trước cho các kỳ tiếp theo.<br/>
                            • <strong>19 tín chỉ còn lại được phân bổ</strong>: Gồm 2 môn BB chuyên ngành CNPM (Phân tích thiết kế HT HĐT, Quản lý dự án phần mềm), 1 môn TC309 còn thiếu, Đồ án thực tập và Khóa luận tốt nghiệp.<br/>
                            • <strong>Các môn không xuất hiện</strong>: Là môn tự chọn tương đương chưa được chọn hoặc thuộc chuyên ngành khác (Trí tuệ Nhân tạo, Công nghệ Dữ liệu).
                          </div>
                        </div>

                        {/* Bộ lọc bảng đối chiếu */}
                        <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', flexWrap: 'wrap' }}>
                          {[
                            { key: 'all', label: 'Tất cả học phần' },
                            { key: 'planned', label: 'Được xếp vào kế hoạch' },
                            { key: 'in_progress', label: 'Đang học (Giả định đạt)' },
                            { key: 'not_selected_elective', label: 'Tự chọn chưa chọn' },
                            { key: 'passed', label: 'Đã hoàn thành' }
                          ].map(f => (
                            <button
                              key={f.key}
                              onClick={() => setAuditFilter(f.key)}
                              style={{
                                padding: '5px 12px',
                                borderRadius: '6px',
                                fontSize: '11.5px',
                                fontWeight: 600,
                                border: auditFilter === f.key ? '1px solid var(--vlu-red)' : '1px solid var(--border-color)',
                                background: auditFilter === f.key ? 'var(--vlu-red)' : 'var(--bg-primary)',
                                color: auditFilter === f.key ? 'white' : 'var(--text-secondary)',
                                cursor: 'pointer'
                              }}
                            >
                              {f.label}
                            </button>
                          ))}
                        </div>

                        {/* Bảng danh sách chi tiết */}
                        <div style={{ overflowX: 'auto', maxHeight: '420px', overflowY: 'auto' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                            <thead>
                              <tr style={{ background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-color)', position: 'sticky', top: 0 }}>
                                <th style={{ padding: '8px 10px', textAlign: 'left' }}>Mã môn</th>
                                <th style={{ padding: '8px 10px', textAlign: 'left' }}>Tên môn học</th>
                                <th style={{ padding: '8px 10px', textAlign: 'left' }}>Nhóm yêu cầu</th>
                                <th style={{ padding: '8px 10px', textAlign: 'left' }}>Trạng thái</th>
                                <th style={{ padding: '8px 10px', textAlign: 'left' }}>Kỳ xếp</th>
                                <th style={{ padding: '8px 10px', textAlign: 'left' }}>Lý do / Giải thích</th>
                              </tr>
                            </thead>
                            <tbody>
                              {filteredAuditCourses.map((c, i) => (
                                <tr key={c.code + i} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                  <td style={{ padding: '8px 10px', fontWeight: 700, color: 'var(--vlu-red)' }}>{c.code}</td>
                                  <td style={{ padding: '8px 10px', fontWeight: 600, color: 'var(--text-main)' }}>{c.name}</td>
                                  <td style={{ padding: '8px 10px', color: 'var(--text-secondary)' }}>{c.groupName}</td>
                                  <td style={{ padding: '8px 10px' }}>
                                    <span style={{
                                      fontSize: '10.5px',
                                      padding: '2px 6px',
                                      borderRadius: '4px',
                                      fontWeight: 700,
                                      background: c.status === 'passed' ? 'rgba(22, 163, 74, 0.1)' : c.status === 'in_progress' ? 'rgba(59, 130, 246, 0.1)' : c.status === 'planned' ? 'rgba(196, 18, 48, 0.1)' : 'var(--bg-tertiary)',
                                      color: c.status === 'passed' ? '#16a34a' : c.status === 'in_progress' ? '#2563eb' : c.status === 'planned' ? 'var(--vlu-red)' : 'var(--text-muted)'
                                    }}>
                                      {c.statusText}
                                    </span>
                                  </td>
                                  <td style={{ padding: '8px 10px', color: 'var(--text-main)' }}>{c.plannedSemester || '—'}</td>
                                  <td style={{ padding: '8px 10px', color: 'var(--text-muted)' }}>{c.reason}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          4. NỘI DUNG CHÍNH TAB 2: THỜI KHÓA BIỂU TUẦN HIỆN TẠI (MONGODB)
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
          5. MODAL ĐỔI MÔN TỰ CHỌN CHUYÊN NGÀNH (TC309)
      ───────────────────────────────────────────────────────────── */}
      {electiveModalOpen && (
        <div className="modal-overlay" onClick={() => setElectiveModalOpen(false)}>
          <div className="modal-box chatgpt-scroll" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '560px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                  Đổi Môn Tự Chọn Chuyên Ngành (TC309)
                </h3>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Định mức: 3 môn (9 TC). Bạn đã có 2 môn (1 môn đã đạt, 1 môn đang học). Hãy chọn môn thứ 3:
                </span>
              </div>
              <button
                onClick={() => setElectiveModalOpen(false)}
                style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {availableTC309.map(c => {
                const isCurrent = c.code === (preferences.selectedElectiveTC309 || roadmapData?.availableElectives?.currentSelectedCode);
                const disabled = !c.eligible;

                return (
                  <div
                    key={c.code}
                    style={{
                      padding: '12px 14px',
                      borderRadius: '8px',
                      border: isCurrent ? '2px solid var(--vlu-red)' : '1px solid var(--border-color)',
                      background: isCurrent ? 'rgba(196, 18, 48, 0.04)' : disabled ? 'var(--bg-tertiary)' : 'var(--bg-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      opacity: disabled ? 0.6 : 1,
                      gap: '12px'
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--vlu-red)' }}>
                          {c.code}
                        </span>
                        <strong style={{ fontSize: '13.5px', color: 'var(--text-main)' }}>
                          {c.name}
                        </strong>
                      </div>
                      <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                        {c.reason}
                      </div>
                    </div>

                    <div>
                      {isCurrent ? (
                        <span style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--vlu-red)', padding: '4px 10px', background: 'rgba(196, 18, 48, 0.1)', borderRadius: '6px' }}>
                          ✓ Đang chọn
                        </span>
                      ) : disabled ? (
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                          {c.isPassed ? 'Đã học' : c.isInProgress ? 'Đang học' : 'Chưa đủ ĐK'}
                        </span>
                      ) : (
                        <button
                          onClick={() => handleSelectSpecificElective(c.code)}
                          className="btn-vlu-primary"
                          style={{ fontSize: '12px', padding: '6px 12px' }}
                        >
                          Chọn môn này
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          6. TRỢ LÝ AI CỐ VẤN THỜI KHÓA BIỂU TẠI CHỖ (SLIDE-OVER)
      ───────────────────────────────────────────────────────────── */}
      {advisorOpen && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          width: '390px',
          maxWidth: 'calc(100vw - 32px)',
          height: '540px',
          background: 'var(--bg-primary)',
          border: '1px solid var(--border-color)',
          borderRadius: '16px',
          boxShadow: '0 12px 36px rgba(0,0,0,0.25)',
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

          {/* Gợi ý câu hỏi nhanh */}
          <div style={{
            padding: '8px 12px',
            background: 'var(--bg-tertiary)',
            borderTop: '1px solid var(--border-color)',
            display: 'flex',
            gap: '6px',
            overflowX: 'auto',
            whiteSpace: 'nowrap',
            scrollbarWidth: 'none'
          }}>
            {[
              'Vì sao môn giống nhau?',
              'Đổi môn tự chọn.',
              'Kỳ tới giảm một môn.',
              'Tôi muốn nghỉ cuối tuần.',
              'Đừng xếp ca 5.'
            ].map((q, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => sendChatMessage(q)}
                style={{
                  fontSize: '11px',
                  padding: '4px 8px',
                  borderRadius: '12px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-primary)',
                  color: 'var(--text-main)',
                  cursor: 'pointer'
                }}
              >
                {q}
              </button>
            ))}
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
          7. MODAL THÊM / SỬA TIẾT HỌC ADMIN (CHO TAB HIỆN TẠI)
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
                    min="1" max="16"
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-main)', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Tiết cuối</label>
                  <input
                    type="number"
                    value={formData.endPeriod}
                    onChange={e => setFormData({ ...formData, endPeriod: Number(e.target.value) })}
                    min="1" max="16"
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
