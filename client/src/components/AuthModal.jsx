import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Mail, Lock, User, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export default function AuthModal({ isOpen, onClose }) {
  const navigate = useNavigate();
  const { login, register } = useAuth();
  const [isLoginTab, setIsLoginTab] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [fullName, setFullName] = useState('');
  const [mssv, setMssv] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return; // Chống bấm gửi biểu mẫu nhiều lần khi đang xử lý

    setError('');
    setSuccessMsg('');

    if (isLoginTab) {
      if (!email || !password) {
        setError('Vui lòng điền đầy đủ email hoặc MSSV và mật khẩu.');
        return;
      }
      setLoading(true);
      try {
        const authData = await login(email, password);
        setSuccessMsg('Đăng nhập thành công!');
        setTimeout(() => {
          onClose();
          if (authData?.user?.role === 'admin') {
            navigate('/admin');
          } else {
            navigate('/');
          }
        }, 500);
      } catch (err) {
        setError(err.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.');
      } finally {
        setLoading(false);
      }
    } else {
      if (!fullName || !email || !password) {
        setError('Vui lòng điền đầy đủ họ tên, email và mật khẩu.');
        return;
      }
      if (password.length < 6) {
        setError('Mật khẩu phải có tối thiểu 6 ký tự.');
        return;
      }
      if (password !== confirmPass) {
        setError('Mật khẩu xác nhận không khớp.');
        return;
      }
      setLoading(true);
      try {
        await register(fullName, email, password, mssv || null);
        setSuccessMsg('Đăng ký tài khoản thành công!');
        setTimeout(() => {
          onClose();
          navigate('/');
        }, 500);
      } catch (err) {
        setError(err.message || 'Đăng ký thất bại. Vui lòng kiểm tra lại thông tin.');
      } finally {
        setLoading(false);
      }
    }
  };

  const fillDemoAccount = (accEmail, accPass) => {
    setEmail(accEmail);
    setPassword(accPass);
    setIsLoginTab(true);
    setError('');
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box chatgpt-scroll" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px' }}>
        <button 
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            padding: '8px',
            width: '40px',
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '50%'
          }}
          title="Đóng"
        >
          <X size={20} />
        </button>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', marginBottom: '20px' }}>
          <button
            type="button"
            onClick={() => { setIsLoginTab(true); setError(''); setSuccessMsg(''); }}
            style={{
              flex: 1,
              padding: '12px',
              background: 'none',
              border: 'none',
              borderBottom: isLoginTab ? '2px solid var(--vlu-red)' : 'none',
              color: isLoginTab ? 'var(--vlu-red)' : 'var(--text-muted)',
              fontWeight: isLoginTab ? 700 : 500,
              cursor: 'pointer',
              fontSize: '15px'
            }}
          >
            Đăng nhập
          </button>
          <button
            type="button"
            onClick={() => { setIsLoginTab(false); setError(''); setSuccessMsg(''); }}
            style={{
              flex: 1,
              padding: '12px',
              background: 'none',
              border: 'none',
              borderBottom: !isLoginTab ? '2px solid var(--vlu-red)' : 'none',
              color: !isLoginTab ? 'var(--vlu-red)' : 'var(--text-muted)',
              fontWeight: !isLoginTab ? 700 : 500,
              cursor: 'pointer',
              fontSize: '15px'
            }}
          >
            Đăng ký tài khoản
          </button>
        </div>

        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 'var(--radius-sm)',
            padding: '10px 12px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: '#ef4444',
            fontSize: '13px'
          }}>
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div style={{
            background: 'rgba(22, 163, 74, 0.1)',
            border: '1px solid rgba(22, 163, 74, 0.3)',
            borderRadius: 'var(--radius-sm)',
            padding: '10px 12px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: '#16a34a',
            fontSize: '13px'
          }}>
            <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {!isLoginTab && (
            <>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Họ và tên</label>
                <div style={{ position: 'relative' }}>
                  <User size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
                  <input 
                    type="text"
                    placeholder="Trương Trần Thanh Phương"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '10px 12px 10px 38px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-primary)',
                      color: 'var(--text-main)',
                      fontSize: '14px'
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Mã số sinh viên (MSSV nếu có)</label>
                <div style={{ position: 'relative' }}>
                  <User size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
                  <input 
                    type="text"
                    placeholder="2474802010458 (Để trống hệ thống sẽ tự sinh)"
                    value={mssv}
                    onChange={(e) => setMssv(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px 10px 38px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-primary)',
                      color: 'var(--text-main)',
                      fontSize: '14px'
                    }}
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
              {isLoginTab ? "Email hoặc Mã số sinh viên (MSSV)" : "Email sinh viên"}
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
              <input 
                type="text"
                placeholder={isLoginTab ? "2474802010458 hoặc email@vanlanguni.vn" : "email@vanlanguni.vn hoặc email trường/cá nhân"}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '10px 12px 10px 38px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-primary)',
                  color: 'var(--text-main)',
                  fontSize: '14px'
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Mật khẩu</label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
              <input 
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '10px 12px 10px 38px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-primary)',
                  color: 'var(--text-main)',
                  fontSize: '14px'
                }}
              />
            </div>
          </div>

          {!isLoginTab && (
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Xác nhận mật khẩu</label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
                <input 
                  type="password"
                  placeholder="••••••••"
                  value={confirmPass}
                  onChange={(e) => setConfirmPass(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px 10px 38px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-primary)',
                    color: 'var(--text-main)',
                    fontSize: '14px'
                  }}
                />
              </div>
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading}
            className="btn-vlu-primary" 
            style={{ width: '100%', justifyContent: 'center', marginTop: '6px', opacity: loading ? 0.7 : 1 }}
          >
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Loader2 size={16} className="spin" /> Đang xử lý...
              </span>
            ) : isLoginTab ? (
              "Đăng nhập ngay"
            ) : (
              "Tạo tài khoản sinh viên"
            )}
          </button>
        </form>

        {isLoginTab && (
          <div style={{ marginTop: '18px', paddingTop: '14px', borderTop: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px', textAlign: 'center' }}>
              Tài khoản mẫu có sẵn (Hoạt động cả Demo & MongoDB):
            </div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => fillDemoAccount('2474802010458', 'Vlu@2025!')}
                style={{ fontSize: '11.5px', padding: '6px 10px', minHeight: '34px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-main)', cursor: 'pointer' }}
                title="Sinh viên Trương Trần Thanh Phương (K30)"
              >
                SV Thanh Phương
              </button>
              <button
                type="button"
                onClick={() => fillDemoAccount('2474802010414', 'Vlu@2025!')}
                style={{ fontSize: '11.5px', padding: '6px 10px', minHeight: '34px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-main)', cursor: 'pointer' }}
                title="Sinh viên Võ Thành Trung (K30)"
              >
                SV Thành Trung
              </button>
              <button
                type="button"
                onClick={() => fillDemoAccount('admin@vanlanguni.vn', 'Admin@2025!')}
                style={{ fontSize: '11.5px', padding: '6px 10px', minHeight: '34px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'rgba(196,18,48,0.1)', color: 'var(--vlu-red)', fontWeight: 600, cursor: 'pointer' }}
                title="Quản trị viên hệ thống VLU"
              >
                Admin Quản Trị
              </button>
              <button
                type="button"
                onClick={() => fillDemoAccount('gv.hoangnam@vanlanguni.vn', 'Gv@2025!')}
                style={{ fontSize: '11.5px', padding: '6px 10px', minHeight: '34px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: '#2563eb', cursor: 'pointer' }}
                title="Giảng viên ThS. Hoàng Trọng Nam"
              >
                GV Hoàng Nam
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
