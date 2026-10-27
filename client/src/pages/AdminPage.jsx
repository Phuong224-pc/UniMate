import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  Save, 
  CheckCircle2, 
  RotateCcw,
  Bot, 
  Users, 
  Search, 
  Trash2, 
  Plus, 
  Loader2, 
  AlertTriangle, 
  Database,
  BarChart3,
  GraduationCap,
  BookOpen,
  Calendar,
  Lock,
  Unlock,
  Edit3,
  X,
  Filter,
  Eye,
  Check,
  FileSpreadsheet,
  UploadCloud
} from 'lucide-react';
import AdminLayout from '../layouts/AdminLayout';
import AdminImportModal from '../components/AdminImportModal';
import { api } from '../services/api';
import { useAuth } from '../hooks/useAuth';

export default function AdminPage() {
  const { user: currentUser } = useAuth();
  const [activeSection, setActiveSection] = useState('dashboard');
  const [actionMsg, setActionMsg] = useState({ text: '', type: '' });

  // Bulk Import Modal State
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importDataType, setImportDataType] = useState('courses');

  const handleOpenImport = (type) => {
    setImportDataType(type);
    setImportModalOpen(true);
  };

  // ─── 1. DASHBOARD STATE ───
  const [dashboardData, setDashboardData] = useState(null);
  const [loadingDashboard, setLoadingDashboard] = useState(false);

  const loadDashboard = async () => {
    setLoadingDashboard(true);
    try {
      const res = await api.getAdminDashboard();
      if (res.success) setDashboardData(res.data);
    } catch (err) {
      console.error('Lỗi tải dashboard:', err);
    } finally {
      setLoadingDashboard(false);
    }
  };

  // ─── 2. USERS MANAGEMENT STATE ───
  const [usersList, setUsersList] = useState([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [userPage, setUserPage] = useState(1);
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('all');
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Add User Modal
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    role: 'student',
    mssv: '',
    fullName: '',
    className: 'K30 CNTT',
    major: 'Kỹ thuật Phần mềm'
  });
  const [addingUser, setAddingUser] = useState(false);

  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const res = await api.getAdminUsers({
        page: userPage,
        limit: 15,
        search: userSearch,
        role: userRoleFilter
      });
      if (res.success) {
        setUsersList(res.data.users || []);
        setTotalUsers(res.data.total || 0);
      }
    } catch (err) {
      console.error('Lỗi tải người dùng:', err);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!newUser.email || !newUser.password) {
      setActionMsg({ text: 'Vui lòng nhập email và mật khẩu', type: 'error' });
      return;
    }
    setAddingUser(true);
    try {
      const res = await api.createAdminUser(newUser);
      if (res.success) {
        setActionMsg({ text: `Tạo tài khoản ${newUser.email} thành công!`, type: 'success' });
        setShowAddUserModal(false);
        setNewUser({ email: '', password: '', role: 'student', mssv: '', fullName: '', className: 'K30 CNTT', major: 'Kỹ thuật Phần mềm' });
        loadUsers();
        loadDashboard();
      }
    } catch (err) {
      setActionMsg({ text: err.message || 'Lỗi tạo tài khoản', type: 'error' });
    } finally {
      setAddingUser(false);
    }
  };

  const handleToggleUserStatus = async (user) => {
    const nextStatus = user.status === 'locked' ? 'active' : 'locked';
    try {
      const res = await api.updateAdminUser(user._id, { status: nextStatus });
      if (res.success) {
        setActionMsg({ text: `Đã ${nextStatus === 'locked' ? 'khóa' : 'mở khóa'} tài khoản ${user.email}`, type: 'success' });
        loadUsers();
      }
    } catch (err) {
      setActionMsg({ text: err.message || 'Lỗi cập nhật trạng thái tài khoản', type: 'error' });
    }
  };

  // ─── 3. STUDENTS MANAGEMENT STATE ───
  const [students, setStudents] = useState([]);
  const [totalStudents, setTotalStudents] = useState(0);
  const [searchStudent, setSearchStudent] = useState('');
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [newStudent, setNewStudent] = useState({
    mssv: '',
    fullName: '',
    email: '',
    className: 'K30 CNTT',
    major: 'Kỹ thuật Phần mềm',
    cohort: '2024 - 2028',
    officialCumulativeGpa4: 0,
    officialCumulativeCredits: 0
  });

  const loadStudents = async () => {
    setLoadingStudents(true);
    try {
      const res = await api.getStudents({ search: searchStudent, limit: 30 });
      if (res.success) {
        setStudents(res.data.students || []);
        setTotalStudents(res.data.total || 0);
      }
    } catch (err) {
      console.error('Lỗi tải sinh viên:', err);
    } finally {
      setLoadingStudents(false);
    }
  };

  const handleCreateStudent = async (e) => {
    e.preventDefault();
    if (!newStudent.mssv || !newStudent.fullName || !newStudent.email) {
      setActionMsg({ text: 'Vui lòng điền MSSV, Họ tên và Email', type: 'error' });
      return;
    }
    try {
      const res = await api.createStudent(newStudent);
      if (res.success) {
        setActionMsg({ text: `Thêm sinh viên ${newStudent.fullName} (${newStudent.mssv}) thành công!`, type: 'success' });
        setShowAddStudentModal(false);
        setNewStudent({ mssv: '', fullName: '', email: '', className: 'K30 CNTT', major: 'Kỹ thuật Phần mềm', cohort: '2024 - 2028', officialCumulativeGpa4: 0, officialCumulativeCredits: 0 });
        loadStudents();
      }
    } catch (err) {
      setActionMsg({ text: err.message || 'Lỗi tạo sinh viên', type: 'error' });
    }
  };

  const handleDeleteStudent = async (mssv, name) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa/vô hiệu hóa hồ sơ sinh viên ${name} (${mssv})?`)) return;
    try {
      const res = await api.deleteStudent(mssv);
      if (res.success) {
        setActionMsg({ text: res.message || 'Thao tác thành công', type: 'success' });
        loadStudents();
      }
    } catch (err) {
      setActionMsg({ text: err.message || 'Lỗi xóa sinh viên', type: 'error' });
    }
  };

  // ─── 4. COURSES & CURRICULUM STATE ───
  const [courses, setCourses] = useState([]);
  const [courseQuery, setCourseQuery] = useState('');
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [showAddCourseModal, setShowAddCourseModal] = useState(false);
  const [newCourse, setNewCourse] = useState({
    code: '',
    name: '',
    credits: 3,
    type: 'Cơ sở ngành',
    program: 'K30 CNTT',
    required: true,
    prerequisites: []
  });

  const loadCourses = async () => {
    setLoadingCourses(true);
    try {
      const res = await api.getAdminCourses({ query: courseQuery });
      if (res.success) setCourses(res.data || []);
    } catch (err) {
      console.error('Lỗi tải môn học:', err);
    } finally {
      setLoadingCourses(false);
    }
  };

  const handleCreateCourse = async (e) => {
    e.preventDefault();
    if (!newCourse.code || !newCourse.name) {
      setActionMsg({ text: 'Vui lòng nhập mã môn và tên môn học', type: 'error' });
      return;
    }
    try {
      const res = await api.createAdminCourse(newCourse);
      if (res.success) {
        setActionMsg({ text: `Thêm môn học ${newCourse.code} thành công!`, type: 'success' });
        setShowAddCourseModal(false);
        setNewCourse({ code: '', name: '', credits: 3, type: 'Cơ sở ngành', program: 'K30 CNTT', required: true, prerequisites: [] });
        loadCourses();
      }
    } catch (err) {
      setActionMsg({ text: err.message || 'Lỗi thêm môn học', type: 'error' });
    }
  };

  const handleDeleteCourse = async (id, code, name) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa môn học ${code} - ${name}?`)) return;
    try {
      const res = await api.deleteAdminCourse(id || code);
      if (res.success) {
        setActionMsg({ text: `Đã xóa môn học ${code} thành công`, type: 'success' });
        loadCourses();
      }
    } catch (err) {
      setActionMsg({ text: err.message || 'Lỗi xóa môn học', type: 'error' });
    }
  };

  // ─── 5. SCHEDULES STATE ───
  const [schedules, setSchedules] = useState([]);
  const [scheduleSemester, setScheduleSemester] = useState('2025-2026 HK01');
  const [loadingSchedules, setLoadingSchedules] = useState(false);
  const [showAddScheduleModal, setShowAddScheduleModal] = useState(false);
  const [newSchedule, setNewSchedule] = useState({
    semester: '2025-2026 HK01',
    courseCode: '',
    courseName: '',
    classSection: 'K30 CNTT',
    lecturer: 'ThS. Hoàng Trọng Nam',
    room: 'CS3.A.04.01',
    dayOfWeek: 2,
    startPeriod: 1,
    endPeriod: 3,
    credits: 3
  });

  const loadSchedules = async () => {
    setLoadingSchedules(true);
    try {
      const res = await api.getAdminSchedules({ semester: scheduleSemester });
      if (res.success) setSchedules(res.data.items || []);
    } catch (err) {
      console.error('Lỗi tải lịch học:', err);
    } finally {
      setLoadingSchedules(false);
    }
  };

  const handleCreateSchedule = async (e) => {
    e.preventDefault();
    if (!newSchedule.courseCode || !newSchedule.courseName) {
      setActionMsg({ text: 'Vui lòng nhập mã và tên môn học cho lịch', type: 'error' });
      return;
    }
    try {
      const res = await api.createAdminSchedule(newSchedule);
      if (res.success) {
        setActionMsg({ text: `Thêm lịch học môn ${newSchedule.courseName} thành công!`, type: 'success' });
        setShowAddScheduleModal(false);
        loadSchedules();
      }
    } catch (err) {
      setActionMsg({ text: err.message || 'Lỗi thêm lịch học', type: 'error' });
    }
  };

  const handleDeleteSchedule = async (id) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa tiết học này?')) return;
    try {
      const res = await api.deleteAdminSchedule(id);
      if (res.success) {
        setActionMsg({ text: 'Đã xóa lịch học thành công', type: 'success' });
        loadSchedules();
      }
    } catch (err) {
      setActionMsg({ text: err.message || 'Lỗi xóa lịch học', type: 'error' });
    }
  };

  // ─── 6. PROMPTS STATE ───
  const [prompts, setPrompts] = useState({
    default: '',
    roadmap: '',
    results: '',
    graduation: '',
    future: '',
    advisor: ''
  });
  const [loadingPrompts, setLoadingPrompts] = useState(false);
  const [savingPrompts, setSavingPrompts] = useState(false);

  const loadPrompts = async () => {
    setLoadingPrompts(true);
    try {
      const res = await api.getAdminPrompts();
      if (res.success && res.data) {
        setPrompts(prev => ({ ...prev, ...res.data }));
      }
    } catch (err) {
      console.error('Lỗi tải prompts:', err);
    } finally {
      setLoadingPrompts(false);
    }
  };

  const handleSavePrompts = async () => {
    setSavingPrompts(true);
    try {
      const res = await api.updateAdminPrompts(prompts);
      if (res.success) {
        setActionMsg({ text: 'Đã lưu cấu hình AI Prompts thành công vào cơ sở dữ liệu!', type: 'success' });
      }
    } catch (err) {
      setActionMsg({ text: err.message || 'Lỗi lưu prompts', type: 'error' });
    } finally {
      setSavingPrompts(false);
    }
  };

  // Initial load according to active section
  useEffect(() => {
    if (activeSection === 'dashboard') loadDashboard();
    else if (activeSection === 'users') loadUsers();
    else if (activeSection === 'students') loadStudents();
    else if (activeSection === 'curriculum') loadCourses();
    else if (activeSection === 'schedules') loadSchedules();
    else if (activeSection === 'prompts') loadPrompts();
  }, [activeSection, userPage, userRoleFilter, scheduleSemester]);

  return (
    <AdminLayout activeSection={activeSection} onSelectSection={setActiveSection}>
      {/* Toast Feedback Message */}
      {actionMsg.text && (
        <div style={{
          padding: '12px 18px',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '13px',
          fontWeight: 500,
          marginBottom: '20px',
          background: actionMsg.type === 'error' ? '#fee2e2' : '#dcfce7',
          color: actionMsg.type === 'error' ? '#dc2626' : '#15803d',
          border: `1px solid ${actionMsg.type === 'error' ? '#fca5a5' : '#86efac'}`
        }}>
          {actionMsg.type === 'error' ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
          <span>{actionMsg.text}</span>
          <button onClick={() => setActionMsg({ text: '', type: '' })} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}>
            <X size={15} />
          </button>
        </div>
      )}

      {/* ─── 1. SECTION: DASHBOARD ─── */}
      {activeSection === 'dashboard' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {loadingDashboard ? (
            <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--text-secondary)' }}>
              <Loader2 className="spinner" size={28} style={{ margin: '0 auto 12px' }} />
              <div>Đang tải số liệu thống kê...</div>
            </div>
          ) : dashboardData && (
            <>
              {/* Stat Cards Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Tổng Tài Khoản</span>
                    <Users size={18} color="var(--vlu-red)" />
                  </div>
                  <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--vlu-red)' }}>{dashboardData.counts?.users || 0}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>Sinh viên, Giảng viên, Admin</div>
                </div>

                <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Hồ Sơ Sinh Viên</span>
                    <GraduationCap size={18} color="#10b981" />
                  </div>
                  <div style={{ fontSize: '28px', fontWeight: 800, color: '#10b981' }}>{dashboardData.counts?.students || 0}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>Đầy đủ bảng điểm và GPA</div>
                </div>

                <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Danh Mục Môn Học</span>
                    <BookOpen size={18} color="#3b82f6" />
                  </div>
                  <div style={{ fontSize: '28px', fontWeight: 800, color: '#3b82f6' }}>{dashboardData.counts?.courses || 0}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>Khóa K30 Khoa CNTT</div>
                </div>

                <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Lớp Học Phần TKB</span>
                    <Calendar size={18} color="#f59e0b" />
                  </div>
                  <div style={{ fontSize: '28px', fontWeight: 800, color: '#f59e0b' }}>{dashboardData.counts?.schedules || 0}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>Tiết học & phòng học thực tế</div>
                </div>
              </div>

              {/* Roles Breakdown & Recent Registrations */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
                <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '20px' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '16px' }}>
                    Phân Bổ Vai Trò & Trạng Thái
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid var(--border-color)' }}>
                      <span style={{ color: 'var(--text-muted)' }}>🎓 Sinh viên (Students):</span>
                      <strong>{dashboardData.roleBreakdown?.student || 0}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid var(--border-color)' }}>
                      <span style={{ color: 'var(--text-muted)' }}>👨‍🏫 Giảng viên (Lecturers):</span>
                      <strong>{dashboardData.roleBreakdown?.lecturer || 0}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid var(--border-color)' }}>
                      <span style={{ color: 'var(--text-muted)' }}>🛡️ Quản trị viên (Admins):</span>
                      <strong>{dashboardData.roleBreakdown?.admin || 0}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '4px' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Đang hoạt động / Bị khóa:</span>
                      <span style={{ color: '#10b981', fontWeight: 600 }}>
                        {dashboardData.statusBreakdown?.active || 0} active / {dashboardData.statusBreakdown?.locked || 0} locked
                      </span>
                    </div>
                  </div>
                </div>

                <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '20px' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '16px' }}>
                    Tài Khoản Đăng Ký Mới Nhất
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {dashboardData.recentUsers?.map((u, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', background: 'var(--bg-tertiary)', borderRadius: '8px', fontSize: '12px' }}>
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{u.email}</div>
                          <div style={{ color: 'var(--text-muted)', fontSize: '11px' }}>MSSV: {u.mssv || 'N/A'}</div>
                        </div>
                        <span style={{ padding: '2px 8px', borderRadius: '12px', fontSize: '10px', fontWeight: 700, background: u.role === 'admin' ? '#fee2e2' : '#e0e7ff', color: u.role === 'admin' ? '#dc2626' : '#4338ca' }}>
                          {u.role}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ─── 2. SECTION: USERS MANAGEMENT ─── */}
      {activeSection === 'users' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Header Controls */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', width: '280px' }}>
                <Search size={15} color="var(--text-muted)" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  placeholder="Tìm email, MSSV..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && loadUsers()}
                  style={{ width: '100%', padding: '7px 12px 7px 32px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', fontSize: '13px', color: 'var(--text-main)' }}
                />
              </div>

              <select
                value={userRoleFilter}
                onChange={(e) => setUserRoleFilter(e.target.value)}
                style={{ padding: '7px 12px', borderRadius: '8px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', fontSize: '13px', color: 'var(--text-main)' }}
              >
                <option value="all">Tất cả vai trò</option>
                <option value="student">Sinh viên</option>
                <option value="lecturer">Giảng viên</option>
                <option value="admin">Quản trị viên</option>
              </select>

              <button onClick={loadUsers} className="btn-secondary" style={{ padding: '7px 12px', fontSize: '13px' }}>
                Lọc
              </button>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={() => handleOpenImport('students')}
                className="btn-secondary"
                style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
                title="Nhập danh sách người dùng từ Excel (.xlsx) hoặc PDF"
              >
                <FileSpreadsheet size={15} color="#10b981" />
                <span>Nhập từ PDF/Excel</span>
              </button>
              <button
                onClick={() => setShowAddUserModal(true)}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: 'var(--vlu-red)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
              >
                <Plus size={16} /> Thêm tài khoản mới
              </button>
            </div>
          </div>

          {/* Users Table */}
          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '14px', overflow: 'hidden' }}>
            <div className="table-responsive">
              <table style={{ width: '100%', minWidth: '650px', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                    <th style={{ padding: '12px 14px' }}>Email</th>
                    <th style={{ padding: '12px 14px' }}>MSSV</th>
                    <th style={{ padding: '12px 14px' }}>Vai Trò</th>
                    <th style={{ padding: '12px 14px' }}>Trạng Thái</th>
                    <th style={{ padding: '12px 14px' }}>Ngày Tạo</th>
                    <th style={{ padding: '12px 14px', textAlign: 'center' }}>Thao Tác</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingUsers ? (
                    <tr><td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải danh sách người dùng...</td></tr>
                  ) : usersList.length === 0 ? (
                    <tr><td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Không tìm thấy người dùng phù hợp</td></tr>
                  ) : usersList.map((u) => (
                    <tr key={u._id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--text-main)' }}>{u.email}</td>
                      <td style={{ padding: '12px 14px', color: 'var(--vlu-red)', fontFamily: 'monospace' }}>{u.mssv || '--'}</td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{ padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 600, background: u.role === 'admin' ? '#fee2e2' : '#e0e7ff', color: u.role === 'admin' ? '#dc2626' : '#4338ca' }}>
                          {u.role}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{ padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 600, background: u.status === 'locked' ? '#fee2e2' : '#dcfce7', color: u.status === 'locked' ? '#dc2626' : '#15803d' }}>
                          {u.status === 'locked' ? 'Bị khóa' : 'Hoạt động'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', color: 'var(--text-muted)', fontSize: '12px' }}>
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString('vi-VN') : '--'}
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        {u.role !== 'admin' && (
                          <button
                            onClick={() => handleToggleUserStatus(u)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '4px 10px',
                              borderRadius: '6px',
                              border: '1px solid var(--border-color)',
                              background: u.status === 'locked' ? '#dcfce7' : '#fee2e2',
                              color: u.status === 'locked' ? '#15803d' : '#dc2626',
                              fontSize: '11px',
                              fontWeight: 600,
                              cursor: 'pointer'
                            }}
                          >
                            {u.status === 'locked' ? <Unlock size={12} /> : <Lock size={12} />}
                            <span>{u.status === 'locked' ? 'Mở khóa' : 'Khóa'}</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal Add User */}
      {showAddUserModal && (
        <div className="modal-overlay" onClick={() => setShowAddUserModal(false)}>
          <div className="modal-box chatgpt-scroll" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>Tạo Tài Khoản Mới</h3>
              <button onClick={() => setShowAddUserModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
            </div>

            <form onSubmit={handleCreateUser} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Email đăng nhập *</label>
                <input type="email" required value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} style={{ width: '100%', padding: '8px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-main)', marginTop: '4px' }} />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Mật khẩu ban đầu *</label>
                <input type="password" required value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} style={{ width: '100%', padding: '8px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-main)', marginTop: '4px' }} />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Vai trò</label>
                <select value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value })} style={{ width: '100%', padding: '8px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-main)', marginTop: '4px' }}>
                  <option value="student">Sinh viên (Student)</option>
                  <option value="lecturer">Giảng viên (Lecturer)</option>
                  <option value="admin">Quản trị viên (Admin)</option>
                </select>
              </div>
              {newUser.role === 'student' && (
                <>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Mã số sinh viên (MSSV)</label>
                    <input type="text" placeholder="247480201xxxx" value={newUser.mssv} onChange={e => setNewUser({ ...newUser, mssv: e.target.value })} style={{ width: '100%', padding: '8px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-main)', marginTop: '4px' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Họ và tên</label>
                    <input type="text" value={newUser.fullName} onChange={e => setNewUser({ ...newUser, fullName: e.target.value })} style={{ width: '100%', padding: '8px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-main)', marginTop: '4px' }} />
                  </div>
                </>
              )}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button type="button" onClick={() => setShowAddUserModal(false)} style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-tertiary)', cursor: 'pointer' }}>Hủy</button>
                <button type="submit" disabled={addingUser} style={{ padding: '8px 18px', borderRadius: '6px', background: 'var(--vlu-red)', color: 'white', border: 'none', fontWeight: 600, cursor: 'pointer' }}>
                  {addingUser ? 'Đang tạo...' : 'Tạo tài khoản'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── 3. SECTION: STUDENTS MANAGEMENT ─── */}
      {activeSection === 'students' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ position: 'relative', width: '320px' }}>
              <Search size={15} color="var(--text-muted)" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                placeholder="Tìm sinh viên theo họ tên, MSSV..."
                value={searchStudent}
                onChange={(e) => setSearchStudent(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && loadStudents()}
                style={{ width: '100%', padding: '7px 12px 7px 32px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', fontSize: '13px', color: 'var(--text-main)' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={() => handleOpenImport('students')}
                className="btn-secondary"
                style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
                title="Nhập hồ sơ sinh viên từ Excel (.xlsx) hoặc PDF"
              >
                <FileSpreadsheet size={15} color="#10b981" />
                <span>Nhập từ PDF/Excel</span>
              </button>
              <button
                onClick={() => setShowAddStudentModal(true)}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: 'var(--vlu-red)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
              >
                <Plus size={16} /> Thêm hồ sơ sinh viên
              </button>
            </div>
          </div>

          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '14px', overflow: 'hidden' }}>
            <div className="table-responsive">
              <table style={{ width: '100%', minWidth: '700px', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                    <th style={{ padding: '12px 14px' }}>MSSV</th>
                    <th style={{ padding: '12px 14px' }}>Họ và Tên</th>
                    <th style={{ padding: '12px 14px' }}>Lớp & Ngành</th>
                    <th style={{ padding: '12px 14px', textAlign: 'center' }}>GPA 4</th>
                    <th style={{ padding: '12px 14px', textAlign: 'center' }}>Tín Chỉ</th>
                    <th style={{ padding: '12px 14px', textAlign: 'center' }}>Số Môn</th>
                    <th style={{ padding: '12px 14px', textAlign: 'center' }}>Thao Tác</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingStudents ? (
                    <tr><td colSpan="7" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải sinh viên...</td></tr>
                  ) : students.length === 0 ? (
                    <tr><td colSpan="7" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Không có sinh viên nào</td></tr>
                  ) : students.map((s) => (
                    <tr key={s._id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--vlu-red)', fontFamily: 'monospace' }}>{s.mssv}</td>
                      <td style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--text-main)' }}>{s.fullName}</td>
                      <td style={{ padding: '12px 14px', color: 'var(--text-secondary)' }}>{s.className} &bull; {s.major}</td>
                      <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 700, color: s.officialCumulativeGpa4 >= 3.0 ? '#10b981' : 'var(--text-main)' }}>
                        {s.officialCumulativeGpa4?.toFixed(2) || '0.00'}
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 600 }}>
                        {s.officialCumulativeCredits || 0} / 126
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        {(s.courses || []).length}
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        <button
                          onClick={() => handleDeleteStudent(s.mssv, s.fullName)}
                          style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                          title="Xóa/Vô hiệu hóa an toàn"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal Add Student */}
      {showAddStudentModal && (
        <div className="modal-overlay" onClick={() => setShowAddStudentModal(false)}>
          <div className="modal-box chatgpt-scroll" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>Thêm Hồ Sơ Sinh Viên</h3>
              <button onClick={() => setShowAddStudentModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <form onSubmit={handleCreateStudent} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>MSSV *</label>
                <input type="text" required value={newStudent.mssv} onChange={e => setNewStudent({ ...newStudent, mssv: e.target.value })} style={{ width: '100%', padding: '8px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-main)', marginTop: '4px' }} />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Họ và tên *</label>
                <input type="text" required value={newStudent.fullName} onChange={e => setNewStudent({ ...newStudent, fullName: e.target.value })} style={{ width: '100%', padding: '8px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-main)', marginTop: '4px' }} />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Email sinh viên *</label>
                <input type="email" required value={newStudent.email} onChange={e => setNewStudent({ ...newStudent, email: e.target.value })} style={{ width: '100%', padding: '8px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-main)', marginTop: '4px' }} />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Lớp</label>
                <input type="text" value={newStudent.className} onChange={e => setNewStudent({ ...newStudent, className: e.target.value })} style={{ width: '100%', padding: '8px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-main)', marginTop: '4px' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button type="button" onClick={() => setShowAddStudentModal(false)} style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-tertiary)', cursor: 'pointer' }}>Hủy</button>
                <button type="submit" style={{ padding: '8px 18px', borderRadius: '6px', background: 'var(--vlu-red)', color: 'white', border: 'none', fontWeight: 600, cursor: 'pointer' }}>Lưu sinh viên</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── 4. SECTION: CURRICULUM & COURSES ─── */}
      {activeSection === 'curriculum' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ position: 'relative', width: '320px' }}>
              <Search size={15} color="var(--text-muted)" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                placeholder="Tìm mã hoặc tên môn học..."
                value={courseQuery}
                onChange={(e) => setCourseQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && loadCourses()}
                style={{ width: '100%', padding: '7px 12px 7px 32px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', fontSize: '13px', color: 'var(--text-main)' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={() => handleOpenImport('courses')}
                className="btn-secondary"
                style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
                title="Nhập danh mục môn học hoặc khung chương trình từ Excel (.xlsx) hoặc PDF"
              >
                <FileSpreadsheet size={15} color="#10b981" />
                <span>Nhập từ PDF/Excel</span>
              </button>
              <button
                onClick={() => setShowAddCourseModal(true)}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: 'var(--vlu-red)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
              >
                <Plus size={16} /> Thêm môn học mới
              </button>
            </div>
          </div>

          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '14px', overflow: 'hidden' }}>
            <div className="table-responsive">
              <table style={{ width: '100%', minWidth: '700px', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                    <th style={{ padding: '12px 14px' }}>Mã Môn</th>
                    <th style={{ padding: '12px 14px' }}>Tên Môn Học</th>
                    <th style={{ padding: '12px 14px', textAlign: 'center' }}>Số TC</th>
                    <th style={{ padding: '12px 14px' }}>Khối Kiến Thức / Chuyên Ngành</th>
                    <th style={{ padding: '12px 14px' }}>Môn Tiên Quyết</th>
                    <th style={{ padding: '12px 14px', textAlign: 'center' }}>Xóa</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingCourses ? (
                    <tr><td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Đang nạp danh mục môn học...</td></tr>
                  ) : courses.length === 0 ? (
                    <tr><td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Không có môn học nào</td></tr>
                  ) : courses.map((c) => (
                    <tr key={c._id || c.code} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--vlu-red)', fontFamily: 'monospace' }}>{c.code}</td>
                      <td style={{ padding: '12px 14px', fontWeight: 500, color: 'var(--text-main)' }}>{c.name}</td>
                      <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 700 }}>{c.credits}</td>
                      <td style={{ padding: '12px 14px', color: 'var(--text-secondary)' }}>{c.sectionName || c.type || 'Đại cương'}</td>
                      <td style={{ padding: '12px 14px', color: 'var(--text-muted)', fontSize: '12px' }}>
                        {(c.prerequisites || []).length > 0 ? c.prerequisites.join(', ') : 'Không'}
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        <button
                          onClick={() => handleDeleteCourse(c._id, c.code, c.name)}
                          style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                          title="Xóa môn học"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal Add Course */}
      {showAddCourseModal && (
        <div className="modal-overlay" onClick={() => setShowAddCourseModal(false)}>
          <div className="modal-box chatgpt-scroll" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>Thêm Môn Học Mới</h3>
              <button onClick={() => setShowAddCourseModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <form onSubmit={handleCreateCourse} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Mã môn học *</label>
                <input type="text" required placeholder="ví dụ: 71ITSE41403" value={newCourse.code} onChange={e => setNewCourse({ ...newCourse, code: e.target.value.toUpperCase() })} style={{ width: '100%', padding: '8px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-main)', marginTop: '4px' }} />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Tên môn học *</label>
                <input type="text" required placeholder="ví dụ: Lập trình Web nâng cao" value={newCourse.name} onChange={e => setNewCourse({ ...newCourse, name: e.target.value })} style={{ width: '100%', padding: '8px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-main)', marginTop: '4px' }} />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Số tín chỉ</label>
                <input type="number" required min="1" max="10" value={newCourse.credits} onChange={e => setNewCourse({ ...newCourse, credits: Number(e.target.value) })} style={{ width: '100%', padding: '8px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-main)', marginTop: '4px' }} />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Khối kiến thức / Chuyên ngành</label>
                <input type="text" value={newCourse.type} onChange={e => setNewCourse({ ...newCourse, type: e.target.value })} style={{ width: '100%', padding: '8px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-main)', marginTop: '4px' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button type="button" onClick={() => setShowAddCourseModal(false)} style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-tertiary)', cursor: 'pointer' }}>Hủy</button>
                <button type="submit" style={{ padding: '8px 18px', borderRadius: '6px', background: 'var(--vlu-red)', color: 'white', border: 'none', fontWeight: 600, cursor: 'pointer' }}>Lưu môn học</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── 5. SECTION: SCHEDULES MANAGEMENT ─── */}
      {activeSection === 'schedules' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>Học kỳ:</span>
              <select
                value={scheduleSemester}
                onChange={(e) => setScheduleSemester(e.target.value)}
                style={{ padding: '7px 12px', borderRadius: '8px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', fontSize: '13px', color: 'var(--text-main)' }}
              >
                <option value="2025-2026 HK01">2025-2026 HK01</option>
                <option value="2025-2026 HK02">2025-2026 HK02</option>
                <option value="2024-2025 HK01">2024-2025 HK01</option>
                <option value="2024-2025 HK02">2024-2025 HK02</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={() => handleOpenImport('schedules')}
                className="btn-secondary"
                style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
                title="Nhập thời khóa biểu từ Excel (.xlsx) hoặc PDF"
              >
                <FileSpreadsheet size={15} color="#10b981" />
                <span>Nhập từ PDF/Excel</span>
              </button>
              <button
                onClick={() => setShowAddScheduleModal(true)}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: 'var(--vlu-red)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
              >
                <Plus size={16} /> Thêm tiết học mới
              </button>
            </div>
          </div>

          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '14px', overflow: 'hidden' }}>
            <div className="table-responsive">
              <table style={{ width: '100%', minWidth: '700px', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                    <th style={{ padding: '12px 14px' }}>Mã Môn</th>
                    <th style={{ padding: '12px 14px' }}>Tên Học Phần</th>
                    <th style={{ padding: '12px 14px' }}>Thứ / Tiết</th>
                    <th style={{ padding: '12px 14px' }}>Phòng Học</th>
                    <th style={{ padding: '12px 14px' }}>Giảng Viên</th>
                    <th style={{ padding: '12px 14px' }}>Lớp Học Phần</th>
                    <th style={{ padding: '12px 14px', textAlign: 'center' }}>Xóa</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingSchedules ? (
                    <tr><td colSpan="7" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Đang nạp lịch học...</td></tr>
                  ) : schedules.length === 0 ? (
                    <tr><td colSpan="7" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Không có lịch học trong học kỳ này</td></tr>
                  ) : schedules.map((sc) => (
                    <tr key={sc._id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--vlu-red)', fontFamily: 'monospace' }}>{sc.courseCode}</td>
                      <td style={{ padding: '12px 14px', fontWeight: 500, color: 'var(--text-main)' }}>{sc.courseName}</td>
                      <td style={{ padding: '12px 14px', color: 'var(--text-secondary)' }}>
                        {sc.dayOfWeekText || `Thứ ${sc.dayOfWeek}`} (Tiết {sc.startPeriod}-{sc.endPeriod})
                      </td>
                      <td style={{ padding: '12px 14px', fontWeight: 600, color: '#10b981' }}>{sc.room}</td>
                      <td style={{ padding: '12px 14px' }}>{sc.lecturer}</td>
                      <td style={{ padding: '12px 14px', color: 'var(--text-muted)' }}>{sc.classSection}</td>
                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        <button
                          onClick={() => handleDeleteSchedule(sc._id)}
                          style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                          title="Xóa tiết học"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal Add Schedule */}
      {showAddScheduleModal && (
        <div className="modal-overlay" onClick={() => setShowAddScheduleModal(false)}>
          <div className="modal-box chatgpt-scroll" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>Thêm Tiết Học Vào TKB</h3>
              <button onClick={() => setShowAddScheduleModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <form onSubmit={handleCreateSchedule} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Học kỳ</label>
                <input type="text" required value={newSchedule.semester} onChange={e => setNewSchedule({ ...newSchedule, semester: e.target.value })} style={{ width: '100%', padding: '8px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-main)', marginTop: '4px' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Mã môn *</label>
                  <input type="text" required placeholder="71ITSE30503" value={newSchedule.courseCode} onChange={e => setNewSchedule({ ...newSchedule, courseCode: e.target.value.toUpperCase() })} style={{ width: '100%', padding: '8px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-main)', marginTop: '4px' }} />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Tên môn học *</label>
                  <input type="text" required placeholder="Lập trình ứng dụng web" value={newSchedule.courseName} onChange={e => setNewSchedule({ ...newSchedule, courseName: e.target.value })} style={{ width: '100%', padding: '8px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-main)', marginTop: '4px' }} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Thứ (2-8)</label>
                  <input type="number" min="2" max="8" value={newSchedule.dayOfWeek} onChange={e => setNewSchedule({ ...newSchedule, dayOfWeek: Number(e.target.value) })} style={{ width: '100%', padding: '8px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-main)', marginTop: '4px' }} />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Tiết bắt đầu</label>
                  <input type="number" min="1" max="15" value={newSchedule.startPeriod} onChange={e => setNewSchedule({ ...newSchedule, startPeriod: Number(e.target.value) })} style={{ width: '100%', padding: '8px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-main)', marginTop: '4px' }} />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Tiết kết thúc</label>
                  <input type="number" min="1" max="15" value={newSchedule.endPeriod} onChange={e => setNewSchedule({ ...newSchedule, endPeriod: Number(e.target.value) })} style={{ width: '100%', padding: '8px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-main)', marginTop: '4px' }} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Phòng học</label>
                  <input type="text" value={newSchedule.room} onChange={e => setNewSchedule({ ...newSchedule, room: e.target.value })} style={{ width: '100%', padding: '8px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-main)', marginTop: '4px' }} />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Giảng viên</label>
                  <input type="text" value={newSchedule.lecturer} onChange={e => setNewSchedule({ ...newSchedule, lecturer: e.target.value })} style={{ width: '100%', padding: '8px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-main)', marginTop: '4px' }} />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button type="button" onClick={() => setShowAddScheduleModal(false)} style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-tertiary)', cursor: 'pointer' }}>Hủy</button>
                <button type="submit" style={{ padding: '8px 18px', borderRadius: '6px', background: 'var(--vlu-red)', color: 'white', border: 'none', fontWeight: 600, cursor: 'pointer' }}>Lưu lịch học</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── 6. SECTION: PROMPTS CONFIGURATION ─── */}
      {activeSection === 'prompts' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 4px 0', color: 'var(--text-main)' }}>Cấu Hình System Prompts AI Trợ Lý</h2>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>Tùy chỉnh ngữ cảnh hướng dẫn và phong cách trả lời cho từng phân hệ Bot</p>
            </div>
            <button
              onClick={handleSavePrompts}
              disabled={savingPrompts}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 20px', background: 'var(--vlu-red)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: savingPrompts ? 'not-allowed' : 'pointer', boxShadow: '0 2px 8px rgba(196, 18, 48, 0.25)' }}
            >
              {savingPrompts ? <Loader2 size={16} className="spinner" /> : <Save size={16} />}
              <span>{savingPrompts ? 'Đang lưu...' : 'Lưu tất cả Prompts'}</span>
            </button>
          </div>

          {loadingPrompts ? (
            <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--text-secondary)' }}>
              <Loader2 className="spinner" size={28} style={{ margin: '0 auto 12px' }} />
              <div>Đang tải cấu hình Prompts...</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
              {[
                { key: 'default', title: '1. AI Trợ Lý VLU Toàn Diện (Trang Chủ)' },
                { key: 'roadmap', title: '2. Cố Vấn Lộ Trình & Khung Đào Tạo K30' },
                { key: 'results', title: '3. Phân Tích Kết Quả & Điểm GPA' },
                { key: 'graduation', title: '4. Cố Vấn Điều Kiện Tốt Nghiệp' },
                { key: 'future', title: '5. Định Hướng Nghề Nghiệp & Tech Stack' },
                { key: 'advisor', title: '6. Cố Vấn Học Vụ Chuyên Sâu (Advisor)' }
              ].map(p => (
                <div key={p.key} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '18px' }}>
                  <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--vlu-red)', marginBottom: '8px' }}>
                    {p.title}
                  </div>
                  <textarea
                    rows={8}
                    value={prompts[p.key] || ''}
                    onChange={(e) => setPrompts({ ...prompts, [p.key]: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      background: 'var(--bg-tertiary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      fontSize: '12px',
                      color: 'var(--text-main)',
                      lineHeight: '1.6',
                      fontFamily: 'monospace'
                    }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Bulk Data Import Modal (PDF & Excel) */}
      <AdminImportModal
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        initialDataType={importDataType}
        onImportSuccess={(res) => {
          setActionMsg({ text: res.message || 'Đã nhập dữ liệu thành công', type: 'success' });
          loadDashboard();
          loadUsers();
          loadStudents();
          loadCourses();
          loadSchedules();
        }}
      />
    </AdminLayout>
  );
}
