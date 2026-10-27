import React, { useState, useEffect, useMemo } from 'react';
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
  Layers
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

export default function SchedulePage() {
  const { user, profile, isAdmin } = useAuth();
  
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

  // Nạp danh sách học kỳ
  useEffect(() => {
    api.getSemesters()
      .then(res => {
        if (res.success && res.data.length > 0) {
          setSemesters(res.data);
          if (!res.data.includes(selectedSemester)) {
            setSelectedSemester(res.data[0]);
          }
        } else {
          setSemesters(['2024-2025 HK01', '2024-2025 HK02', '2025-2026 HK01']);
        }
      })
      .catch(() => {
        setSemesters(['2024-2025 HK01', '2024-2025 HK02', '2025-2026 HK01']);
      });
  }, []);

  // Nạp lịch học từ MongoDB
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

  // Phân loại lịch theo từng thứ trong tuần
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
    // Sắp xếp theo tiết bắt đầu
    Object.values(groups).forEach(list => {
      list.sort((a, b) => a.startPeriod - b.startPeriod);
    });
    return groups;
  }, [schedules]);

  // Xử lý nộp form Thêm / Sửa lịch học
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
    <div style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
      {/* Header Banner */}
      <div style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-lg)',
        padding: '24px',
        marginBottom: '24px',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, var(--vlu-red) 0%, #b91c1c 100%)',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(196, 18, 48, 0.25)'
            }}>
              <Calendar size={24} />
            </div>
            <div>
              <h1 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-main)', marginBottom: '4px' }}>
                Thời Khóa Biểu Học Tập
              </h1>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                Dữ liệu lịch học chính thức lưu trữ tại MongoDB - Đại học Văn Lang (Khoa CNTT K30)
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {isAdmin && (
              <button
                onClick={openAddModal}
                className="btn-vlu-primary"
                style={{ fontSize: '13px', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Plus size={16} /> Thêm Lịch Học
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
              Lớp: <strong>{profile?.className || 'K30 CNTT'}</strong>
            </div>
          </div>
        </div>

        {/* Bộ lọc học kỳ & thứ trong tuần */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '14px',
          marginTop: '20px',
          paddingTop: '16px',
          borderTop: '1px solid var(--border-color)'
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

          {/* Chọn ngày trong tuần - vuốt ngang trên mobile */}
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
                flexShrink: 0,
                minHeight: '38px'
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
                  flexShrink: 0,
                  minHeight: '38px'
                }}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        {successFlash && (
          <div style={{
            marginTop: '14px',
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
      </div>

      {/* Main Content */}
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
            Chưa có lớp học phần nào được xếp lịch cho sinh viên hoặc lớp này trong học kỳ {selectedSemester}.
          </p>
        </div>
      ) : (
        /* Grid hiển thị các ngày trong tuần */
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
                {/* Header ngày */}
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

                {/* Danh sách ca học */}
                <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {dayItems.map(item => (
                    <div
                      key={item._id}
                      style={{
                        padding: '12px 14px',
                        background: 'var(--bg-primary)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                        position: 'relative',
                        transition: 'transform 0.15s, box-shadow 0.15s'
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
                        {item.notes && (
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic', marginTop: '2px' }}>
                            * {item.notes}
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

      {/* Modal Thêm / Sửa Lịch học */}
      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="modal-box chatgpt-scroll" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '16px', color: 'var(--text-main)' }}>
              {editingItem ? 'Chỉnh Sửa Lịch Học' : 'Thêm Tiết Học Mới Vào Thời Khóa Biểu'}
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
