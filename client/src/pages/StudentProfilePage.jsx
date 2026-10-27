import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  IdCard, User, Mail, Phone, MapPin, Calendar, Award, Camera,
  UploadCloud, CheckCircle2, FileText, Edit3, Save, X, Plus,
  Trash2, Download, BookOpen, Star, Shield, Loader2, Sparkles,
  GraduationCap, Briefcase, Image as ImageIcon, AlertCircle,
  ChevronRight, Globe, Users, Clock, BadgeCheck, FileSpreadsheet,
  Calculator, Search, Filter, RefreshCw, TrendingUp, HelpCircle
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { api } from '../services/api';
import AuthModal from '../components/AuthModal';

// ───────────────────────────────────────────────
// Defaults
// ───────────────────────────────────────────────
const DEFAULT_PROFILE = {
  fullName: "",
  mssv: "",
  cohort: "",
  className: "",
  faculty: "",
  major: "",
  status: "",
  email: "",
  phone: "",
  dob: "",
  gender: "",
  ethnicity: "",
  nationality: "Việt Nam",
  address: "",
  idNumber: "",
  trainingCourse: ""
};

const DEFAULT_ACTIVITIES = [];

const DEFAULT_CERTS = [];

const INFO_SUBTABS = [
  { key: 'info', label: 'Thông tin cá nhân', icon: User },
  { key: 'activities', label: 'Hoạt động & Kỹ năng', icon: Star },
  { key: 'certs', label: 'Chứng chỉ', icon: Award },
  { key: 'docs', label: 'Minh chứng', icon: FileText },
];

// ───────────────────────────────────────────────
// Editable Field Component
// ───────────────────────────────────────────────
function EditableField({ label, value, fieldKey, onSave, multiline = false, icon: Icon }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef(null);

  useEffect(() => { setDraft(value); }, [value]);
  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  const commit = () => { onSave(fieldKey, draft); setEditing(false); };
  const cancel = () => { setDraft(value); setEditing(false); };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
        {Icon && <Icon size={11} />} {label}
      </div>
      {editing ? (
        <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-start' }}>
          {multiline ? (
            <textarea
              ref={inputRef}
              value={draft}
              onChange={e => setDraft(e.target.value)}
              rows={2}
              style={{
                flex: 1, padding: '6px 8px', borderRadius: '6px',
                border: '1.5px solid var(--vlu-red)', background: 'var(--bg-primary)',
                color: 'var(--text-main)', fontSize: '13px', fontFamily: 'inherit',
                resize: 'vertical'
              }}
            />
          ) : (
            <input
              ref={inputRef}
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') cancel(); }}
              style={{
                flex: 1, padding: '6px 8px', borderRadius: '6px',
                border: '1.5px solid var(--vlu-red)', background: 'var(--bg-primary)',
                color: 'var(--text-main)', fontSize: '13px'
              }}
            />
          )}
          <button onClick={commit} style={{ padding: '6px', background: '#16a34a', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }} title="Lưu">
            <CheckCircle2 size={13} />
          </button>
          <button onClick={cancel} style={{ padding: '6px', background: 'var(--bg-tertiary)', color: 'var(--text-muted)', border: 'none', borderRadius: '6px', cursor: 'pointer' }} title="Hủy">
            <X size={13} />
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', group: true }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)', wordBreak: 'break-word' }}>
            {value || <em style={{ color: 'var(--text-muted)', fontWeight: 400 }}>Chưa cập nhật</em>}
          </span>
          <button
            onClick={() => setEditing(true)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)',
              padding: '2px 4px', borderRadius: '4px', opacity: 0.7, transition: 'opacity 0.15s'
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = '1'}
            onMouseLeave={e => e.currentTarget.style.opacity = '0.7'}
            title="Chỉnh sửa"
          >
            <Edit3 size={12} />
          </button>
        </div>
      )}
    </div>
  );
}

// ───────────────────────────────────────────────
// OCR Confirmation Banner
// ───────────────────────────────────────────────
function OcrBanner({ fields, onApply, onDismiss }) {
  const [selected, setSelected] = useState(() => Object.keys(fields).filter(k => Boolean(fields[k])));

  const toggle = (k) => {
    setSelected(prev => prev.includes(k) ? prev.filter(x => x !== k) : [...prev, k]);
  };

  const handleApply = () => {
    const toApply = {};
    selected.forEach(k => { toApply[k] = fields[k]; });
    onApply(toApply);
  };

  const labels = {
    fullName: 'Họ và tên', mssv: 'MSSV', dob: 'Ngày sinh',
    gender: 'Giới tính', idNumber: 'Số CCCD', className: 'Lớp', faculty: 'Khoa'
  };

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(196,18,48,0.06) 0%, rgba(59,130,246,0.06) 100%)',
      border: '1.5px solid var(--vlu-red)', borderRadius: '12px', padding: '16px 20px',
      marginBottom: '20px', animation: 'slideIn 0.3s ease'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sparkles size={18} color="var(--vlu-red)" />
          <strong style={{ fontSize: '14px', color: 'var(--text-main)' }}>AI đã nhận diện thông tin từ ảnh tải lên</strong>
          <span style={{ fontSize: '11px', background: 'var(--vlu-red-light)', color: 'var(--vlu-red)', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>OCR Vision</span>
        </div>
        <button onClick={onDismiss} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
          <X size={16} />
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '8px', marginBottom: '14px' }}>
        {Object.entries(fields).filter(([, v]) => Boolean(v)).map(([k, v]) => (
          <label key={k} style={{
            display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 10px',
            background: 'var(--bg-secondary)', borderRadius: '6px', border: '1px solid var(--border-color)',
            cursor: 'pointer', fontSize: '12px'
          }}>
            <input type="checkbox" checked={selected.includes(k)} onChange={() => toggle(k)} />
            <div>
              <div style={{ color: 'var(--text-muted)', fontSize: '10px' }}>{labels[k] || k}</div>
              <strong style={{ color: 'var(--text-main)' }}>{v}</strong>
            </div>
          </label>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
        <button onClick={onDismiss} style={{ padding: '6px 14px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', color: 'var(--text-main)' }}>
          Bỏ qua
        </button>
        <button onClick={handleApply} style={{ padding: '6px 16px', background: 'var(--vlu-red)', color: 'white', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <CheckCircle2 size={13} /> Áp dụng vào hồ sơ ({selected.length})
        </button>
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────
// Main Component
// ───────────────────────────────────────────────
export default function StudentProfilePage({ defaultTab = 'info' }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile: authProfile, refreshUser, isAdmin, loading: authLoading } = useAuth();

  // Chuyển hướng Quản trị viên sang trang Quản trị (Admin không có hồ sơ sinh viên và bảng điểm cá nhân)
  useEffect(() => {
    if (!authLoading && isAdmin) {
      navigate('/admin', { replace: true });
    }
  }, [isAdmin, authLoading, navigate]);

  // Primary Tab State: 'info' (Thông tin cá nhân) | 'grades' (Bảng điểm & GPA)
  const [activeMainTab, setActiveMainTab] = useState(() => {
    if (location.pathname.includes('/grades') || location.search.includes('tab=grades') || defaultTab === 'grades') {
      return 'grades';
    }
    return 'info';
  });

  useEffect(() => {
    if (location.pathname.includes('/grades') || location.search.includes('tab=grades')) {
      setActiveMainTab('grades');
    } else if (location.pathname.includes('/profile') || location.search.includes('tab=info')) {
      setActiveMainTab('info');
    }
  }, [location.pathname, location.search]);

  // Tab switch with URL sync
  const handleSwitchMainTab = (tab) => {
    setActiveMainTab(tab);
    if (tab === 'grades') {
      navigate('/account/grades', { replace: true });
    } else {
      navigate('/account/profile', { replace: true });
    }
  };

  // ─── 1. PERSONAL INFO STATE ───
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [infoSubTab, setInfoSubTab] = useState('info');
  const [profile, setProfile] = useState(() => ({
    ...DEFAULT_PROFILE,
    ...(authProfile || {}),
    email: authProfile?.email || user?.email || '',
    mssv: authProfile?.mssv || user?.mssv || '',
    fullName: authProfile?.fullName || user?.fullName || '',
  }));

  const [avatarUrl, setAvatarUrl] = useState(() => authProfile?.avatar || null);
  const [activities, setActivities] = useState(() => authProfile?.activities || DEFAULT_ACTIVITIES);
  const [certs, setCerts] = useState(() => authProfile?.certs || DEFAULT_CERTS);
  const [docs, setDocs] = useState(() => authProfile?.docs || []);
  const [ocrResult, setOcrResult] = useState(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrError, setOcrError] = useState(null);
  const [savedFlash, setSavedFlash] = useState(false);

  // Sync authProfile
  useEffect(() => {
    if (authProfile) {
      setProfile(prev => ({
        ...prev,
        ...authProfile,
        email: authProfile.email || user?.email || prev.email,
        mssv: authProfile.mssv || user?.mssv || prev.mssv,
        fullName: authProfile.fullName || user?.fullName || prev.fullName
      }));
      if (authProfile.avatar) setAvatarUrl(authProfile.avatar);
      if (authProfile.activities?.length) setActivities(authProfile.activities);
      if (authProfile.certs?.length) setCerts(authProfile.certs);
      if (authProfile.docs?.length) setDocs(authProfile.docs);
    }
  }, [authProfile, user]);

  const saveField = async (key, val) => {
    const updated = { ...profile, [key]: val };
    setProfile(updated);
    try {
      await api.updateMyProfile({ [key]: val });
      flashSaved();
    } catch {
      localStorage.setItem('vlu_profile_draft', JSON.stringify(updated));
      flashSaved();
    }
  };

  const flashSaved = () => {
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 2000);
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const b64 = ev.target.result;
      setAvatarUrl(b64);
      try {
        await api.updateMyProfile({ avatar: b64 });
        flashSaved();
      } catch {
        localStorage.setItem('vlu_avatar', b64);
        flashSaved();
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleOcrUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setOcrLoading(true);
    setOcrError(null);
    setOcrResult(null);

    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const res = await api.scanStudentIdCard({
          name: file.name,
          mimeType: file.type,
          data: ev.target.result
        });
        if (res.success && res.data) {
          setOcrResult(res.data);
        } else {
          setOcrError(res.message || 'Không thể nhận diện thông tin từ ảnh. Vui lòng thử lại.');
        }
      } catch (err) {
        setOcrError(err.message || 'Lỗi xử lý OCR ảnh CCCD / Thẻ sinh viên.');
      } finally {
        setOcrLoading(false);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const applyOcrResult = async (fields) => {
    const updated = { ...profile, ...fields };
    setProfile(updated);
    setOcrResult(null);
    try {
      await api.updateMyProfile(fields);
      flashSaved();
    } catch {
      localStorage.setItem('vlu_profile_draft', JSON.stringify(updated));
      flashSaved();
    }
  };

  const handleDocUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const newDocs = files.map(f => ({
      id: Date.now() + Math.random(),
      name: f.name,
      size: f.size,
      type: f.type,
      uploadedAt: new Date().toLocaleDateString('vi-VN')
    }));
    const updated = [...docs, ...newDocs];
    setDocs(updated);
    api.updateMyProfile({ docs: updated }).catch(() => {});
    e.target.value = '';
  };

  const removeDoc = (id) => {
    const updated = docs.filter(d => d.id !== id);
    setDocs(updated);
    api.updateMyProfile({ docs: updated }).catch(() => {});
  };

  const handlePrint = () => {
    window.print();
  };

  // ─── 2. GRADES & GPA STATE ───
  const [courses, setCourses] = useState([]);
  const [loadingGrades, setLoadingGrades] = useState(true);
  const [selectedSemester, setSelectedSemester] = useState('all');
  const [filterQuery, setFilterQuery] = useState('');
  const [actionMsg, setActionMsg] = useState({ text: '', type: '' });

  // OCR Transcript State
  const [gradesOcrLoading, setGradesOcrLoading] = useState(false);
  const [draftResult, setDraftResult] = useState(null);
  const [selectedDraftRows, setSelectedDraftRows] = useState(new Set());
  const [hasUnsavedDraft, setHasUnsavedDraft] = useState(false);

  // Camera State
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const videoRef = useRef(null);
  const fileInputRef = useRef(null);

  const loadGrades = async () => {
    if (!user) {
      setCourses([]);
      setLoadingGrades(false);
      return;
    }
    setLoadingGrades(true);
    try {
      if (authProfile && authProfile.courses && authProfile.courses.length > 0) {
        setCourses(authProfile.courses);
      } else if (user?.mssv) {
        const res = await api.getStudentByMssv(user.mssv);
        if (res.success && res.data) {
          setCourses(res.data.courses || []);
        }
      }
    } catch (err) {
      console.error('Lỗi tải bảng điểm:', err);
    } finally {
      setLoadingGrades(false);
    }
  };

  useEffect(() => {
    if (activeMainTab === 'grades' && user) {
      loadGrades();
    }
  }, [activeMainTab, authProfile, user]);

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedDraft) {
        e.preventDefault();
        e.returnValue = 'Bạn có bản nháp bảng điểm chưa lưu. Bạn có chắc chắn muốn rời đi?';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedDraft]);

  const semestersList = useMemo(() => {
    const set = new Set();
    courses.forEach(c => {
      if (c.semester) set.add(c.semester);
    });
    return Array.from(set).sort();
  }, [courses]);

  const filteredCourses = useMemo(() => {
    return courses.filter(c => {
      const matchSem = selectedSemester === 'all' || c.semester === selectedSemester;
      const q = filterQuery.toLowerCase().trim();
      const matchQuery = !q ||
        (c.name && c.name.toLowerCase().includes(q)) ||
        (c.code && c.code.toLowerCase().includes(q));
      return matchSem && matchQuery;
    });
  }, [courses, selectedSemester, filterQuery]);

  // GPA Stats
  const stats = useMemo(() => {
    let totalCredits = 0;
    let earnedCredits = 0;
    let totalScore10 = 0;
    let totalScore4 = 0;
    let countScore = 0;
    let passedCount = 0;

    courses.forEach(c => {
      const cr = Number(c.credits) || 0;
      totalCredits += cr;
      const isPassed = c.status === 'Đạt' || c.status === 'Đạt thấp' || c.status === 'Miễn/ bảo lưu' || (c.score !== null && c.score >= 4.0);
      if (isPassed) {
        earnedCredits += cr;
        passedCount++;
      }
      if (c.score !== null && c.score !== undefined && !isNaN(c.score)) {
        totalScore10 += Number(c.score) * cr;
        totalScore4 += Number(c.point4 || 0) * cr;
        countScore += cr;
      }
    });

    const gpa10 = countScore > 0 ? (totalScore10 / countScore).toFixed(2) : '0.00';
    const gpa4 = countScore > 0 ? (totalScore4 / countScore).toFixed(2) : '0.00';

    return { totalCredits, earnedCredits, gpa10, gpa4, passedCount, totalCount: courses.length };
  }, [courses]);

  // Camera Handlers
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } }
      });
      setCameraStream(stream);
      setCameraOpen(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 100);
    } catch {
      setActionMsg({ text: 'Không thể truy cập camera. Vui lòng cấp quyền trong cài đặt trình duyệt hoặc tải file ảnh có sẵn.', type: 'error' });
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setCameraOpen(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 1280;
    canvas.height = videoRef.current.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    stopCamera();
    handleProcessOcrImage(dataUrl, 'camera_capture.jpg');
  };

  const handleImageFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      handleProcessOcrImage(event.target.result, file.name);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleProcessOcrImage = async (dataUrl, fileName) => {
    setGradesOcrLoading(true);
    setActionMsg({ text: 'AI đang quét và đối chiếu khung CTĐT...', type: 'info' });
    try {
      const res = await api.scanTranscript({
        name: fileName,
        mimeType: 'image/jpeg',
        data: dataUrl
      });
      if (res.success && res.data) {
        initDraftFromOcr(res.data);
      } else {
        setActionMsg({ text: res.message || 'Không thể trích xuất bảng điểm từ ảnh này.', type: 'error' });
      }
    } catch (err) {
      setActionMsg({ text: err.message || 'Lỗi xử lý OCR bảng điểm.', type: 'error' });
    } finally {
      setGradesOcrLoading(false);
    }
  };

  const handlePdfUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setGradesOcrLoading(true);
    setActionMsg({ text: 'AI đang phân tích file PDF bảng điểm...', type: 'info' });
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.scanTranscriptPdf(formData);
      if (res.success && res.data) {
        initDraftFromOcr(res.data);
      } else {
        setActionMsg({ text: res.message || 'Không thể đọc dữ liệu từ file PDF.', type: 'error' });
      }
    } catch (err) {
      setActionMsg({ text: err.message || 'Lỗi xử lý PDF bảng điểm.', type: 'error' });
    } finally {
      setGradesOcrLoading(false);
      e.target.value = '';
    }
  };

  const initDraftFromOcr = (data) => {
    setDraftResult(data);
    setHasUnsavedDraft(true);
    const allRowKeys = new Set();
    data.semesters?.forEach((sem, sIdx) => {
      sem.courses?.forEach((_, cIdx) => {
        allRowKeys.add(`${sIdx}_${cIdx}`);
      });
    });
    setSelectedDraftRows(allRowKeys);
    setActionMsg({ text: 'Trích xuất thành công! Vui lòng kiểm tra kỹ bảng nháp trước khi lưu.', type: 'success' });
  };

  const toggleSelectRow = (key) => {
    setSelectedDraftRows(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleDraftCellChange = (sIdx, cIdx, field, val) => {
    setDraftResult(prev => {
      if (!prev) return prev;
      const next = JSON.parse(JSON.stringify(prev));
      const row = next.semesters[sIdx].courses[cIdx];
      row[field] = val;
      return next;
    });
  };

  const handleAddDraftRow = (sIdx) => {
    setDraftResult(prev => {
      if (!prev) return prev;
      const next = JSON.parse(JSON.stringify(prev));
      const newIdx = next.semesters[sIdx].courses.length;
      next.semesters[sIdx].courses.push({
        code: '', name: 'Môn học mới', credits: 3, score: null,
        point4: null, letter: '', status: 'Đang học', isOfficialMatch: false
      });
      setSelectedDraftRows(r => new Set(r).add(`${sIdx}_${newIdx}`));
      return next;
    });
  };

  const handleRemoveDraftRow = (sIdx, cIdx) => {
    setDraftResult(prev => {
      if (!prev) return prev;
      const next = JSON.parse(JSON.stringify(prev));
      next.semesters[sIdx].courses.splice(cIdx, 1);
      return next;
    });
  };

  const handleConfirmSave = async () => {
    if (!draftResult) return;
    setGradesOcrLoading(true);
    try {
      const selectedCourses = [];
      draftResult.semesters?.forEach((sem, sIdx) => {
        sem.courses?.forEach((c, cIdx) => {
          if (selectedDraftRows.has(`${sIdx}_${cIdx}`)) {
            selectedCourses.push({
              code: c.code,
              name: c.name,
              credits: Number(c.credits) || 0,
              score: c.score !== null ? Number(c.score) : null,
              point4: c.point4 !== null ? Number(c.point4) : null,
              letter: c.letter || '',
              status: c.status || 'Đạt',
              semester: sem.semesterName
            });
          }
        });
      });

      const res = await api.updateMyCourses(selectedCourses);
      if (res.success) {
        setActionMsg({ text: `Đã lưu thành công ${selectedCourses.length} môn học vào hồ sơ sinh viên!`, type: 'success' });
        setDraftResult(null);
        setHasUnsavedDraft(false);
        if (refreshUser) await refreshUser();
        await loadGrades();
      }
    } catch (err) {
      setActionMsg({ text: err.message || 'Lỗi khi lưu bảng điểm vào cơ sở dữ liệu.', type: 'error' });
    } finally {
      setGradesOcrLoading(false);
    }
  };

  const cardStyle = {
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border-color)',
    borderRadius: '12px',
    padding: '20px'
  };

  const btnSecondary = {
    padding: '7px 14px', background: 'var(--bg-tertiary)', color: 'var(--text-main)',
    border: '1px solid var(--border-color)', borderRadius: '8px', cursor: 'pointer',
    fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '5px',
    transition: 'all 0.15s'
  };

  if (authLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '380px', gap: '16px' }}>
        <Loader2 size={36} className="spinner" style={{ color: 'var(--vlu-red)' }} />
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
          Đang đồng bộ dữ liệu sinh viên từ máy chủ MongoDB...
        </p>
      </div>
    );
  }

  if (isAdmin) {
    return null;
  }

  if (!user) {
    return (
      <div style={{
        maxWidth: '560px',
        margin: '40px auto',
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-color)',
        borderRadius: '16px',
        padding: '36px 24px',
        textAlign: 'center',
        boxShadow: 'var(--shadow-md)'
      }}>
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          background: 'var(--vlu-red-light)',
          color: 'var(--vlu-red)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 18px auto'
        }}>
          <Shield size={32} />
        </div>
        
        <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-main)', marginBottom: '8px' }}>
          Yêu Cầu Đăng Nhập Tài Khoản Sinh Viên
        </h2>
        
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '24px' }}>
          Hồ sơ cá nhân và kết quả học tập được bảo mật và liên kết trực tiếp với cơ sở dữ liệu MongoDB. Vui lòng đăng nhập bằng MSSV hoặc email trường để xem dữ liệu của bạn.
        </p>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => setAuthModalOpen(true)}
            className="btn-vlu-primary"
            style={{ padding: '10px 24px', fontSize: '14px', fontWeight: 700 }}
          >
            <User size={16} />
            <span>Đăng nhập ngay</span>
          </button>
          <button
            onClick={() => navigate('/')}
            className="btn-secondary"
            style={{ padding: '10px 20px', fontSize: '14px' }}
          >
            Về trang chủ
          </button>
        </div>

        <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
      </div>
    );
  }

  return (
    <div style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
      
      {/* ── Top Unified Hub Header ── */}
      <div style={{
        background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
        borderRadius: '16px', padding: '20px 24px', marginBottom: '20px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '46px', height: '46px', borderRadius: '12px',
            background: 'var(--vlu-red)', color: 'white',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(196, 18, 48, 0.25)', flexShrink: 0
          }}>
            <IdCard size={24} />
          </div>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-main)', margin: '0 0 4px 0' }}>
              Hồ Sơ Sinh Viên
            </h1>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
              Quản lý thông tin học vụ, lý lịch cá nhân và kết quả học tập & GPA toàn khóa
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {savedFlash && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#16a34a', fontSize: '13px', fontWeight: 600 }}>
              <CheckCircle2 size={15} /> Đã cập nhật!
            </div>
          )}
          <button onClick={handlePrint} style={btnSecondary} title="Xuất PDF hồ sơ sinh viên">
            <Download size={14} /> Xuất PDF
          </button>
          <div className="badge badge-green" style={{ fontSize: '13px', padding: '6px 14px' }}>
            <CheckCircle2 size={15} /> {profile.status || 'Đang học'}
          </div>
        </div>
      </div>

      {/* ── TWO PRIMARY TABS: [Thông tin cá nhân] | [Bảng điểm & GPA] ── */}
      <div style={{
        display: 'flex', gap: '8px', marginBottom: '20px',
        borderBottom: '2px solid var(--border-color)', paddingBottom: '2px',
        overflowX: 'auto', WebkitOverflowScrolling: 'touch',
        scrollbarWidth: 'none'
      }}>
        <button
          onClick={() => handleSwitchMainTab('info')}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '12px 20px', borderRadius: '10px 10px 0 0',
            border: 'none', cursor: 'pointer',
            background: activeMainTab === 'info' ? 'var(--vlu-red)' : 'var(--bg-secondary)',
            color: activeMainTab === 'info' ? 'white' : 'var(--text-secondary)',
            fontSize: '14px', fontWeight: 700, transition: 'all 0.2s ease',
            boxShadow: activeMainTab === 'info' ? '0 2px 8px rgba(196, 18, 48, 0.25)' : 'none'
          }}
        >
          <User size={17} />
          <span>Thông tin cá nhân</span>
        </button>

        <button
          onClick={() => handleSwitchMainTab('grades')}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '12px 20px', borderRadius: '10px 10px 0 0',
            border: 'none', cursor: 'pointer',
            background: activeMainTab === 'grades' ? 'var(--vlu-red)' : 'var(--bg-secondary)',
            color: activeMainTab === 'grades' ? 'white' : 'var(--text-secondary)',
            fontSize: '14px', fontWeight: 700, transition: 'all 0.2s ease',
            boxShadow: activeMainTab === 'grades' ? '0 2px 8px rgba(196, 18, 48, 0.25)' : 'none'
          }}
        >
          <FileSpreadsheet size={17} />
          <span>Bảng điểm & GPA</span>
          {courses.length > 0 && (
            <span style={{
              background: activeMainTab === 'grades' ? 'rgba(255,255,255,0.25)' : 'var(--vlu-red-light)',
              color: activeMainTab === 'grades' ? 'white' : 'var(--vlu-red)',
              padding: '2px 7px', borderRadius: '10px', fontSize: '11px', fontWeight: 800
            }}>
              {courses.length}
            </span>
          )}
        </button>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          TAB 1: THÔNG TIN CÁ NHÂN
          ───────────────────────────────────────────────────────────── */}
      {activeMainTab === 'info' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* OCR Banner */}
          {ocrResult && (
            <OcrBanner fields={ocrResult} onApply={applyOcrResult} onDismiss={() => setOcrResult(null)} />
          )}
          {ocrError && (
            <div style={{
              background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '10px',
              padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '8px', color: '#dc2626', fontSize: '13px'
            }}>
              <AlertCircle size={16} /> {ocrError}
              <button onClick={() => setOcrError(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626' }}><X size={14} /></button>
            </div>
          )}

          {/* Top: Avatar Card + Quick Info */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', width: '100%' }}>
            {/* Avatar Card */}
            <div style={{ ...cardStyle, textAlign: 'center', padding: '28px 16px' }}>
              <div style={{ position: 'relative', display: 'inline-block', marginBottom: '14px' }}>
                <div style={{
                  width: '110px', height: '110px', borderRadius: '50%', overflow: 'hidden', margin: '0 auto',
                  border: '3px solid var(--vlu-red)', background: 'var(--bg-tertiary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  {avatarUrl
                    ? <img src={avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <User size={52} color="var(--text-muted)" />}
                </div>
                <label style={{
                  position: 'absolute', bottom: '4px', right: '4px', width: '30px', height: '30px',
                  borderRadius: '50%', background: 'var(--vlu-red)', color: 'white',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                }} title="Đổi ảnh đại diện">
                  <Camera size={14} />
                  <input type="file" accept="image/*" onChange={handleAvatarChange} style={{ display: 'none' }} />
                </label>
              </div>
              <h2 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-main)', marginBottom: '2px' }}>{profile.fullName}</h2>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '14px' }}>
                MSSV: <strong style={{ color: 'var(--text-main)' }}>{profile.mssv}</strong>
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', textAlign: 'left', borderTop: '1px solid var(--border-color)', paddingTop: '14px' }}>
                {[
                  { label: 'Khoa', val: profile.faculty },
                  { label: 'Ngành', val: profile.major },
                  { label: 'Lớp', val: profile.className },
                ].map(r => (
                  <div key={r.label} style={{ fontSize: '12px', display: 'flex', justifyContent: 'space-between', gap: '6px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>{r.label}:</span>
                    <strong style={{ textAlign: 'right', color: 'var(--text-main)' }}>{r.val}</strong>
                  </div>
                ))}
              </div>

              {/* OCR upload button */}
              <div style={{ marginTop: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '14px' }}>
                <label style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
                  padding: '10px', border: '1.5px dashed var(--border-color)', borderRadius: '8px',
                  cursor: ocrLoading ? 'not-allowed' : 'pointer', transition: 'border-color 0.15s',
                  background: 'var(--bg-primary)'
                }}
                  onMouseEnter={e => !ocrLoading && (e.currentTarget.style.borderColor = 'var(--vlu-red)')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border-color)')}
                >
                  {ocrLoading
                    ? <><Loader2 size={20} color="var(--vlu-red)" style={{ animation: 'spin 1s linear infinite' }} />
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center' }}>AI đang đọc ảnh...</span></>
                    : <><Sparkles size={20} color="var(--vlu-red)" />
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.4 }}>
                        Upload CCCD / Thẻ SV<br /><span style={{ color: 'var(--vlu-red)', fontWeight: 600 }}>AI tự cập nhật hồ sơ</span>
                      </span></>
                  }
                  <input type="file" accept="image/*" onChange={handleOcrUpload} style={{ display: 'none' }} disabled={ocrLoading} />
                </label>
              </div>
            </div>

            {/* Right: Sub-Tabs Content */}
            <div>
              {/* Tab Nav */}
              <div style={{
                display: 'flex', gap: '4px', marginBottom: '16px',
                background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
                borderRadius: '10px', padding: '4px'
              }}>
                {INFO_SUBTABS.map(tab => {
                  const Icon = tab.icon;
                  const active = infoSubTab === tab.key;
                  return (
                    <button key={tab.key} onClick={() => setInfoSubTab(tab.key)} style={{
                      flex: 1, padding: '8px 4px', borderRadius: '7px', border: 'none', cursor: 'pointer',
                      background: active ? 'var(--vlu-red)' : 'transparent',
                      color: active ? 'white' : 'var(--text-muted)',
                      fontSize: '11px', fontWeight: active ? 700 : 500, transition: 'all 0.2s',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px'
                    }}>
                      <Icon size={13} />
                      <span className="hide-on-mobile">{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Sub-tab 1: Thông tin chi tiết */}
              {infoSubTab === 'info' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={cardStyle}>
                    <h3 style={{ fontSize: '13px', fontWeight: 800, color: 'var(--vlu-red)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <User size={14} /> Thông tin cá nhân
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '14px' }}>
                      <EditableField label="Họ và tên" value={profile.fullName} fieldKey="fullName" onSave={saveField} icon={User} />
                      <EditableField label="MSSV" value={profile.mssv} fieldKey="mssv" onSave={saveField} icon={IdCard} />
                      <EditableField label="Ngày sinh" value={profile.dob} fieldKey="dob" onSave={saveField} icon={Calendar} />
                      <EditableField label="Giới tính" value={profile.gender} fieldKey="gender" onSave={saveField} icon={User} />
                      <EditableField label="Niên khóa" value={profile.cohort} fieldKey="cohort" onSave={saveField} icon={Calendar} />
                      <EditableField label="Khóa đào tạo" value={profile.trainingCourse} fieldKey="trainingCourse" onSave={saveField} icon={GraduationCap} />
                      <EditableField label="Email sinh viên" value={profile.email} fieldKey="email" onSave={saveField} icon={Mail} />
                      <EditableField label="Số điện thoại" value={profile.phone} fieldKey="phone" onSave={saveField} icon={Phone} />
                      <EditableField label="Dân tộc" value={profile.ethnicity} fieldKey="ethnicity" onSave={saveField} icon={Users} />
                      <EditableField label="Quốc tịch" value={profile.nationality} fieldKey="nationality" onSave={saveField} icon={Globe} />
                      <EditableField label="Số CCCD" value={profile.idNumber} fieldKey="idNumber" onSave={saveField} icon={Shield} />
                    </div>
                  </div>

                  <div style={cardStyle}>
                    <h3 style={{ fontSize: '13px', fontWeight: 800, color: 'var(--vlu-red)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <BookOpen size={14} /> Thông tin đào tạo & Địa chỉ
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '14px' }}>
                      <EditableField label="Khoa" value={profile.faculty} fieldKey="faculty" onSave={saveField} icon={BookOpen} />
                      <EditableField label="Ngành" value={profile.major} fieldKey="major" onSave={saveField} icon={GraduationCap} />
                      <EditableField label="Lớp học phần" value={profile.className} fieldKey="className" onSave={saveField} icon={Users} />
                      <EditableField label="Địa chỉ liên hệ" value={profile.address} fieldKey="address" onSave={saveField} multiline icon={MapPin} />
                    </div>
                  </div>
                </div>
              )}

              {/* Sub-tab 2: Hoạt động */}
              {infoSubTab === 'activities' && (
                <div style={cardStyle}>
                  <h3 style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-main)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Star size={15} color="var(--vlu-red)" /> Hoạt động ngoại khóa & Kỹ năng
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {activities.map(act => (
                      <div key={act.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                        <span style={{ fontSize: '18px' }}>{act.icon}</span>
                        <div style={{ flex: 1 }}>
                          <strong style={{ fontSize: '13px', color: 'var(--text-main)' }}>{act.name}</strong>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{act.role || act.level} &bull; {act.year || '2024'}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sub-tab 3: Chứng chỉ */}
              {infoSubTab === 'certs' && (
                <div style={cardStyle}>
                  <h3 style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-main)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Award size={15} color="var(--vlu-red)" /> Chứng chỉ đạt được
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {certs.map(c => (
                      <div key={c.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                        <div>
                          <strong style={{ fontSize: '13px', color: 'var(--text-main)' }}>{c.name}</strong>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{c.issuer}</div>
                        </div>
                        <span className="badge badge-orange" style={{ fontSize: '11px' }}>{c.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sub-tab 4: Minh chứng */}
              {infoSubTab === 'docs' && (
                <div style={cardStyle}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <FileText size={15} color="var(--vlu-red)" /> Tài liệu & Minh chứng
                    </h3>
                    <label style={{ padding: '6px 12px', background: 'var(--vlu-red)', color: 'white', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Plus size={13} /> Tải lên
                      <input type="file" multiple accept=".pdf,.docx,.jpg,.jpeg,.png" onChange={handleDocUpload} style={{ display: 'none' }} />
                    </label>
                  </div>
                  {docs.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '13px' }}>
                      Chưa có tài liệu minh chứng nào được tải lên.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {docs.map(doc => (
                        <div key={doc.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                          <FileText size={16} color="var(--vlu-red)" />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{doc.name}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{doc.uploadedAt}</div>
                          </div>
                          <button onClick={() => removeDoc(doc.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 2: BẢNG ĐIỂM & GPA
          ───────────────────────────────────────────────────────────── */}
      {activeMainTab === 'grades' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {actionMsg.text && (
            <div style={{
              padding: '12px 18px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '10px',
              fontSize: '13px', fontWeight: 500,
              background: actionMsg.type === 'error' ? '#fee2e2' : actionMsg.type === 'success' ? '#dcfce7' : '#eff6ff',
              color: actionMsg.type === 'error' ? '#dc2626' : actionMsg.type === 'success' ? '#15803d' : '#1d4ed8',
              border: `1px solid ${actionMsg.type === 'error' ? '#fca5a5' : actionMsg.type === 'success' ? '#86efac' : '#93c5fd'}`
            }}>
              {actionMsg.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
              <span>{actionMsg.text}</span>
              <button onClick={() => setActionMsg({ text: '', type: '' })} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}><X size={15} /></button>
            </div>
          )}

          {/* GPA Summary KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 150px), 1fr))', gap: '12px' }}>
            <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '18px 20px', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>GPA Hệ 10</span>
                <Calculator size={18} color="var(--vlu-red)" />
              </div>
              <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--vlu-red)' }}>{stats.gpa10}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>Điểm trung bình hệ 10</div>
            </div>

            <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '18px 20px', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>GPA Hệ 4.0</span>
                <TrendingUp size={18} color="#10b981" />
              </div>
              <div style={{ fontSize: '28px', fontWeight: 800, color: '#10b981' }}>{stats.gpa4}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>Quy đổi hệ 4 chuẩn xét tốt nghiệp</div>
            </div>

            <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '18px 20px', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Tín chỉ tích lũy</span>
                <Award size={18} color="#3b82f6" />
              </div>
              <div style={{ fontSize: '28px', fontWeight: 800, color: '#3b82f6' }}>{stats.earnedCredits} / 126</div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>Khóa 30 - Kỹ thuật phần mềm</div>
            </div>

            <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '18px 20px', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Học phần đạt</span>
                <CheckCircle2 size={18} color="#f59e0b" />
              </div>
              <div style={{ fontSize: '28px', fontWeight: 800, color: '#f59e0b' }}>{stats.passedCount} / {stats.totalCount}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>Số môn đã vượt qua</div>
            </div>
          </div>

          {/* Action Header: OCR & Upload options */}
          <div style={{
            background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
            borderRadius: '16px', padding: '20px 24px', display: 'flex',
            alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-main)', margin: '0 0 4px 0' }}>
                Trích xuất & Cập nhật Bảng Điểm
              </h2>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
                Chụp ảnh bảng điểm trực tiếp hoặc tải file PDF / Ảnh bảng điểm từ cổng sinh viên
              </p>
            </div>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button
                onClick={startCamera}
                disabled={gradesOcrLoading}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px',
                  background: 'var(--vlu-red)', color: 'white', border: 'none', borderRadius: '8px',
                  fontSize: '13px', fontWeight: 600, cursor: 'pointer', boxShadow: '0 2px 8px rgba(196, 18, 48, 0.25)'
                }}
              >
                <Camera size={16} />
                <span>Chụp bảng điểm</span>
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={gradesOcrLoading}
                style={btnSecondary}
              >
                <UploadCloud size={16} color="var(--vlu-red)" />
                <span>Tải ảnh / PDF bảng điểm</span>
              </button>

              <input
                type="file"
                ref={fileInputRef}
                accept="image/*,.pdf"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  if (file.type === 'application/pdf') {
                    handlePdfUpload(e);
                  } else {
                    handleImageFile(e);
                  }
                }}
                style={{ display: 'none' }}
              />
            </div>
          </div>

          {/* Camera Modal */}
          {cameraOpen && (
            <div className="modal-overlay" onClick={stopCamera}>
              <div className="modal-box chatgpt-scroll" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '640px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>Chụp Ảnh Bảng Điểm</h3>
                  <button onClick={stopCamera} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
                </div>
                <video ref={videoRef} autoPlay playsInline style={{ width: '100%', borderRadius: '10px', background: '#000', maxHeight: '380px', objectFit: 'cover' }} />
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '14px' }}>
                  <button onClick={stopCamera} style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-tertiary)', cursor: 'pointer' }}>Hủy</button>
                  <button onClick={capturePhoto} style={{ padding: '8px 20px', borderRadius: '6px', background: 'var(--vlu-red)', color: 'white', border: 'none', fontWeight: 600, cursor: 'pointer' }}>Chụp & Quét</button>
                </div>
              </div>
            </div>
          )}

          {/* Draft Preview Table (if OCR scanned) */}
          {draftResult && (
            <div style={{
              background: 'var(--bg-secondary)', border: '2px solid var(--vlu-red)',
              borderRadius: '16px', padding: '24px', boxShadow: 'var(--shadow-md)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#fee2e2', color: 'var(--vlu-red)', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', marginBottom: '6px' }}>
                    Bản Nháp Trích Xuất (Chưa Lưu Vào Database)
                  </div>
                  <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
                    Kiểm Tra & Hiệu Chỉnh Dữ Liệu Bảng Điểm
                  </h3>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
                    Vui lòng kiểm tra lại từng dòng. Bạn có thể sửa trực tiếp ô mã môn, tên môn, tín chỉ, điểm số hoặc bấm dấu X để bỏ dòng đọc sai.
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={() => {
                      if (window.confirm('Bạn có chắc chắn muốn hủy bản nháp này?')) {
                        setDraftResult(null);
                        setHasUnsavedDraft(false);
                      }
                    }}
                    disabled={gradesOcrLoading}
                    style={{ padding: '8px 16px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', fontWeight: 500 }}
                  >
                    Hủy bản nháp
                  </button>

                  <button
                    onClick={handleConfirmSave}
                    disabled={gradesOcrLoading}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 20px',
                      background: '#10b981', color: 'white', border: 'none', borderRadius: '8px',
                      fontSize: '13px', fontWeight: 700, cursor: gradesOcrLoading ? 'not-allowed' : 'pointer',
                      boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)'
                    }}
                  >
                    {gradesOcrLoading ? <Loader2 size={16} className="spinner" /> : <Save size={16} />}
                    <span>Xác nhận lưu ({selectedDraftRows.size} môn)</span>
                  </button>
                </div>
              </div>

              {/* Render Semesters in Draft */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                {draftResult.semesters?.map((sem, sIdx) => (
                  <div key={sIdx} style={{ background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                      <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--vlu-red)' }}>
                        📅 {sem.semesterName} ({(sem.courses || []).length} môn)
                      </div>
                      <button
                        onClick={() => handleAddDraftRow(sIdx)}
                        style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '6px', fontSize: '11px', color: 'var(--text-main)', cursor: 'pointer' }}
                      >
                        <Plus size={13} /> Thêm môn thiếu
                      </button>
                    </div>

                    <div className="table-responsive">
                      <table style={{ width: '100%', minWidth: '680px', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                        <thead>
                          <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
                            <th style={{ padding: '8px', width: '36px' }}>Chọn</th>
                            <th style={{ padding: '8px' }}>Mã Môn</th>
                            <th style={{ padding: '8px' }}>Tên Học Phần</th>
                            <th style={{ padding: '8px', width: '60px' }}>TC</th>
                            <th style={{ padding: '8px', width: '70px' }}>Điểm 10</th>
                            <th style={{ padding: '8px', width: '70px' }}>Điểm 4</th>
                            <th style={{ padding: '8px', width: '70px' }}>Chữ</th>
                            <th style={{ padding: '8px', width: '100px' }}>Kết Quả</th>
                            <th style={{ padding: '8px', width: '40px' }}>Xóa</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sem.courses?.map((c, cIdx) => {
                            const rowKey = `${sIdx}_${cIdx}`;
                            const isChecked = selectedDraftRows.has(rowKey);
                            return (
                              <tr key={cIdx} style={{ borderBottom: '1px solid var(--border-color)', opacity: isChecked ? 1 : 0.4 }}>
                                <td style={{ padding: '6px 8px' }}>
                                  <input type="checkbox" checked={isChecked} onChange={() => toggleSelectRow(rowKey)} />
                                </td>
                                <td style={{ padding: '6px 8px' }}>
                                  <input
                                    type="text" value={c.code}
                                    onChange={(e) => handleDraftCellChange(sIdx, cIdx, 'code', e.target.value)}
                                    style={{ width: '95px', padding: '4px 6px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '4px', fontWeight: 600, fontSize: '11px', color: 'var(--text-main)' }}
                                  />
                                </td>
                                <td style={{ padding: '6px 8px' }}>
                                  <input
                                    type="text" value={c.name}
                                    onChange={(e) => handleDraftCellChange(sIdx, cIdx, 'name', e.target.value)}
                                    style={{ width: '100%', padding: '4px 6px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '4px', fontSize: '12px', color: 'var(--text-main)' }}
                                  />
                                </td>
                                <td style={{ padding: '6px 8px' }}>
                                  <input
                                    type="number" value={c.credits || ''}
                                    onChange={(e) => handleDraftCellChange(sIdx, cIdx, 'credits', e.target.value)}
                                    style={{ width: '45px', padding: '4px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '4px', textAlign: 'center', fontSize: '11px', color: 'var(--text-main)' }}
                                  />
                                </td>
                                <td style={{ padding: '6px 8px' }}>
                                  <input
                                    type="number" step="0.1" value={c.score !== null ? c.score : ''} placeholder="--"
                                    onChange={(e) => handleDraftCellChange(sIdx, cIdx, 'score', e.target.value === '' ? null : e.target.value)}
                                    style={{ width: '55px', padding: '4px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '4px', textAlign: 'center', fontWeight: 600, fontSize: '11px', color: 'var(--text-main)' }}
                                  />
                                </td>
                                <td style={{ padding: '6px 8px' }}>
                                  <input
                                    type="number" step="0.01" value={c.point4 !== null ? c.point4 : ''} placeholder="--"
                                    onChange={(e) => handleDraftCellChange(sIdx, cIdx, 'point4', e.target.value === '' ? null : e.target.value)}
                                    style={{ width: '55px', padding: '4px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '4px', textAlign: 'center', fontSize: '11px', color: 'var(--text-main)' }}
                                  />
                                </td>
                                <td style={{ padding: '6px 8px' }}>
                                  <input
                                    type="text" value={c.letter || ''}
                                    onChange={(e) => handleDraftCellChange(sIdx, cIdx, 'letter', e.target.value)}
                                    style={{ width: '40px', padding: '4px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '4px', textAlign: 'center', fontWeight: 700, fontSize: '11px', color: 'var(--text-main)' }}
                                  />
                                </td>
                                <td style={{ padding: '6px 8px' }}>
                                  <select
                                    value={c.status}
                                    onChange={(e) => handleDraftCellChange(sIdx, cIdx, 'status', e.target.value)}
                                    style={{ padding: '3px 6px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '4px', fontSize: '11px', color: 'var(--text-main)' }}
                                  >
                                    <option value="Đạt">Đạt</option>
                                    <option value="Đạt thấp">Đạt thấp</option>
                                    <option value="Không đạt">Không đạt</option>
                                    <option value="Miễn/ bảo lưu">Miễn/ bảo lưu</option>
                                    <option value="Đang học">Đang học</option>
                                  </select>
                                </td>
                                <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                                  <button onClick={() => handleRemoveDraftRow(sIdx, cIdx)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '2px' }}>
                                    <Trash2 size={14} />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Official Saved Transcript Table */}
          <div style={{
            background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
            borderRadius: '16px', padding: '24px', boxShadow: 'var(--shadow-sm)'
          }}>
            {/* Controls Bar: Semester Filter & Search */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  <Filter size={15} />
                  <span>Học kỳ:</span>
                </div>
                <select
                  value={selectedSemester}
                  onChange={(e) => setSelectedSemester(e.target.value)}
                  style={{ padding: '7px 12px', borderRadius: '8px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', fontSize: '13px', color: 'var(--text-main)', fontWeight: 500 }}
                >
                  <option value="all">Tất cả các học kỳ ({courses.length} môn)</option>
                  {semestersList.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div style={{ position: 'relative', width: '280px' }}>
                <Search size={15} color="var(--text-muted)" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text" placeholder="Tìm theo mã môn hoặc tên môn..."
                  value={filterQuery} onChange={(e) => setFilterQuery(e.target.value)}
                  style={{ width: '100%', padding: '7px 12px 7px 32px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '8px', fontSize: '13px', color: 'var(--text-main)' }}
                />
              </div>
            </div>

            {/* Table Content */}
            {loadingGrades ? (
              <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--text-secondary)' }}>
                <Loader2 className="spinner" size={28} style={{ margin: '0 auto 12px' }} />
                <div>Đang tải kết quả học tập...</div>
              </div>
            ) : filteredCourses.length === 0 ? (
              <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--text-secondary)' }}>
                <FileSpreadsheet size={40} color="var(--text-muted)" style={{ margin: '0 auto 12px', opacity: 0.5 }} />
                <div style={{ fontWeight: 600, fontSize: '15px', color: 'var(--text-main)' }}>Chưa có môn học nào trong bảng điểm</div>
                <p style={{ fontSize: '13px', margin: '6px 0 16px 0' }}>
                  Hãy bấm <strong>"Chụp bảng điểm"</strong> hoặc <strong>"Tải ảnh / PDF"</strong> ở phía trên để AI tự động trích xuất kết quả học tập cho bạn.
                </p>
              </div>
            ) : (
              <div className="table-responsive">
                <table style={{ width: '100%', minWidth: '680px', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontWeight: 600 }}>
                      <th style={{ padding: '12px 14px', width: '40px' }}>#</th>
                      <th style={{ padding: '12px 14px' }}>Mã Môn</th>
                      <th style={{ padding: '12px 14px' }}>Tên Học Phần</th>
                      <th style={{ padding: '12px 14px' }}>Học Kỳ</th>
                      <th style={{ padding: '12px 14px', textAlign: 'center' }}>Số TC</th>
                      <th style={{ padding: '12px 14px', textAlign: 'center' }}>Điểm 10</th>
                      <th style={{ padding: '12px 14px', textAlign: 'center' }}>Điểm 4</th>
                      <th style={{ padding: '12px 14px', textAlign: 'center' }}>Điểm Chữ</th>
                      <th style={{ padding: '12px 14px', textAlign: 'center' }}>Kết Quả</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCourses.map((c, idx) => {
                      const isPassed = c.status === 'Đạt' || c.status === 'Đạt thấp' || c.status === 'Miễn/ bảo lưu' || (c.score !== null && c.score >= 4.0);
                      return (
                        <tr
                          key={idx}
                          style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.15s ease' }}
                          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-tertiary)'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                          <td style={{ padding: '12px 14px', color: 'var(--text-muted)' }}>{idx + 1}</td>
                          <td style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--vlu-red)', fontFamily: 'monospace' }}>{c.code}</td>
                          <td style={{ padding: '12px 14px', fontWeight: 500, color: 'var(--text-main)' }}>{c.name}</td>
                          <td style={{ padding: '12px 14px', color: 'var(--text-secondary)' }}>{c.semester || 'Điểm bảo lưu'}</td>
                          <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 600 }}>{c.credits || 0}</td>
                          <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 700, color: c.score !== null ? (c.score >= 8.0 ? '#10b981' : (c.score >= 5.0 ? 'var(--text-main)' : '#ef4444')) : 'var(--text-muted)' }}>
                            {c.score !== null && c.score !== undefined ? c.score : '--'}
                          </td>
                          <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 600 }}>
                            {c.point4 !== null && c.point4 !== undefined ? c.point4 : '--'}
                          </td>
                          <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 700 }}>{c.letter || '--'}</td>
                          <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                            <span style={{
                              display: 'inline-block', padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 600,
                              background: isPassed ? '#dcfce7' : '#fee2e2', color: isPassed ? '#15803d' : '#dc2626'
                            }}>
                              {c.status || (isPassed ? 'Đạt' : 'Chưa đạt')}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── CSS for print ── */}
      <style>{`
        @keyframes slideIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
        @media print {
          .app-shell > *:not(.main-view) { display: none !important; }
          .main-view > *:first-child { display: none !important; }
          button, label[for] { display: none !important; }
        }
      `}</style>
    </div>
  );
}
