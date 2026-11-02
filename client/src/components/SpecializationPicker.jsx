import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { notifyAcademicUpdated } from '../hooks/useAcademicProgress';
import { SPECIALIZATIONS, specializationName } from './AcademicProgress';

export default function SpecializationPicker({ progress }) {
  const { profile, refreshUser } = useAuth();
  const current = profile?.specialization || null;
  const [selected, setSelected] = useState(current);
  const [changing, setChanging] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => { setSelected(current); setConfirming(false); }, [current]);
  const save = async () => {
    setSaving(true); setMessage('');
    try {
      await api.selectSpecialization(selected, changing);
      await refreshUser();
      notifyAcademicUpdated();
      setChanging(false); setConfirming(false);
      setMessage('Đã lưu chuyên ngành. Tiến độ được tính lại theo lựa chọn của bạn.');
    } catch (error) {
      setMessage(error.message);
    } finally { setSaving(false); }
  };
  if (!progress || progress.groups?.specializationRequired?.active === false) return null;
  return <section className="vlu-card" style={{ padding: '20px' }}>
    <h2 style={{ fontSize: '16px', margin: '0 0 8px' }}>Chuyên ngành đào tạo</h2>
    <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>{specializationName(current)}. Bạn có thể xem giới thiệu cả ba nhánh trước khi xác nhận.</p>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 210px), 1fr))', gap: '12px', margin: '14px 0' }}>
      {SPECIALIZATIONS.map(item => <button key={item.id} type="button" onClick={() => { if (!current || changing) { setSelected(item.id); setConfirming(false); } }} aria-pressed={selected === item.id} style={{ textAlign: 'left', padding: '16px', borderRadius: '10px', border: `1px solid ${selected === item.id ? 'var(--vlu-red)' : 'var(--border-color)'}`, background: selected === item.id ? 'var(--vlu-red-light)' : 'var(--bg-secondary)', color: 'var(--text-main)', cursor: !current || changing ? 'pointer' : 'default' }}>
        <strong style={{ display: 'block', marginBottom: '8px' }}>{item.name}</strong><span style={{ fontSize: '12px', lineHeight: 1.5 }}>{item.description}</span>
        {current && current !== item.id && <span style={{ display: 'block', marginTop: '10px', color: 'var(--text-muted)', fontSize: '11px' }}>Không thuộc chuyên ngành bạn đã chọn</span>}
      </button>)}
    </div>
    {current && !changing ? <button type="button" className="btn-secondary" onClick={() => { setChanging(true); setMessage(''); }}>Đổi chuyên ngành</button> : <>
      {changing && <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Lịch sử điểm được giữ nguyên. Nếu đã có dữ liệu liên quan, quản trị viên cần xử lý thay đổi theo quyền.</p>}
      {confirming ? <div role="alert" style={{ padding: '12px', background: 'var(--bg-tertiary)', borderRadius: '8px' }}><p style={{ fontSize: '13px', margin: '0 0 10px' }}>Xác nhận {changing ? 'đổi sang' : 'chọn'} <strong>{specializationName(selected)}</strong>? Các môn bắt buộc và lộ trình sẽ được xét theo nhánh này.</p><button type="button" className="btn-vlu-primary" disabled={saving} onClick={save}>{saving ? 'Đang lưu…' : 'Xác nhận và lưu'}</button> <button type="button" className="btn-secondary" disabled={saving} onClick={() => setConfirming(false)}>Quay lại</button></div> : <button type="button" className="btn-vlu-primary" disabled={!selected || saving || selected === current} onClick={() => setConfirming(true)}>Xác nhận lựa chọn</button>}
      {changing && <button type="button" className="btn-secondary" disabled={saving} onClick={() => { setChanging(false); setSelected(current); setConfirming(false); }}>Hủy đổi</button>}
    </>}
    {message && <p role="status" style={{ fontSize: '13px', marginBottom: 0 }}>{message}</p>}
  </section>;
}
