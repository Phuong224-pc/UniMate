import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  Key, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Clock, 
  User, 
  Check 
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { api } from '../services/api';
import AuthModal from '../components/AuthModal';

export default function AccountSecurity() {
  const { user, loading: authLoading } = useAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ text: '', type: '' });

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (loading) return;

    if (!oldPassword || !newPassword || !confirmPassword) {
      setMsg({ text: 'Vui lòng nhập đầy đủ các trường mật khẩu', type: 'error' });
      return;
    }

    if (newPassword.length < 6) {
      setMsg({ text: 'Mật khẩu mới phải có tối thiểu 6 ký tự', type: 'error' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setMsg({ text: 'Mật khẩu xác nhận không khớp với mật khẩu mới', type: 'error' });
      return;
    }

    setLoading(true);
    setMsg({ text: '', type: '' });

    try {
      const res = await api.changePassword(oldPassword, newPassword);
      if (res.success) {
        setMsg({ text: 'Đổi mật khẩu thành công! Mật khẩu mới đã được áp dụng.', type: 'success' });
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err) {
      setMsg({ text: err.message || 'Đổi mật khẩu thất bại. Vui lòng kiểm tra lại mật khẩu hiện tại.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '320px', gap: '16px' }}>
        <Loader2 size={32} className="spinner" style={{ color: 'var(--vlu-red)' }} />
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
          Đang tải thông tin bảo mật tài khoản...
        </p>
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{
        maxWidth: '540px',
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
          <ShieldCheck size={32} />
        </div>
        
        <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-main)', marginBottom: '8px' }}>
          Yêu Cầu Đăng Nhập
        </h2>
        
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '24px' }}>
          Bạn cần đăng nhập tài khoản sinh viên hoặc quản trị viên để quản lý bảo mật và đổi mật khẩu.
        </p>

        <button
          onClick={() => setAuthModalOpen(true)}
          className="btn-vlu-primary"
          style={{ padding: '10px 24px', fontSize: '14px', fontWeight: 700, margin: '0 auto' }}
        >
          <User size={16} />
          <span>Đăng nhập ngay</span>
        </button>

        <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
      {/* Cột trái: Form Đổi mật khẩu */}
      <div style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-color)',
        borderRadius: '16px',
        padding: '28px',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            background: 'var(--vlu-red-light)',
            color: 'var(--vlu-red)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Lock size={18} />
          </div>
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
              Đổi Mật Khẩu
            </h2>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Cập nhật mật khẩu để bảo vệ thông tin tài khoản và kết quả học tập
            </div>
          </div>
        </div>

        {msg.text && (
          <div style={{
            padding: '12px 14px',
            borderRadius: '8px',
            fontSize: '13px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: msg.type === 'error' ? '#fee2e2' : '#dcfce7',
            color: msg.type === 'error' ? '#dc2626' : '#15803d',
            border: `1px solid ${msg.type === 'error' ? '#fca5a5' : '#86efac'}`
          }}>
            {msg.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
            <span>{msg.text}</span>
          </div>
        )}

        <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Mật khẩu hiện tại
            </label>
            <input
              type="password"
              placeholder="Nhập mật khẩu đang sử dụng"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                fontSize: '13px',
                color: 'var(--text-main)'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Mật khẩu mới (tối thiểu 6 ký tự)
            </label>
            <input
              type="password"
              placeholder="Nhập mật khẩu mới"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                fontSize: '13px',
                color: 'var(--text-main)'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Xác nhận mật khẩu mới
            </label>
            <input
              type="password"
              placeholder="Nhập lại mật khẩu mới"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                fontSize: '13px',
                color: 'var(--text-main)'
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '11px',
              background: 'var(--vlu-red)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              marginTop: '6px',
              boxShadow: '0 2px 8px rgba(196, 18, 48, 0.25)'
            }}
          >
            {loading ? <Loader2 size={16} className="spinner" /> : <ShieldCheck size={16} />}
            <span>{loading ? 'Đang cập nhật...' : 'Lưu mật khẩu mới'}</span>
          </button>
        </form>
      </div>

      {/* Cột phải: Thông tin bảo mật & Trạng thái tài khoản */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Key size={17} color="var(--vlu-red)" />
            Thông Tin Tài Khoản
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '13px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid var(--border-color)' }}>
              <span style={{ color: 'var(--text-muted)' }}>Email đăng nhập:</span>
              <strong style={{ color: 'var(--text-main)' }}>{user?.email || 'N/A'}</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid var(--border-color)' }}>
              <span style={{ color: 'var(--text-muted)' }}>Mã số sinh viên (MSSV):</span>
              <strong style={{ color: 'var(--vlu-red)' }}>{user?.mssv || 'N/A'}</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid var(--border-color)' }}>
              <span style={{ color: 'var(--text-muted)' }}>Vai trò tài khoản:</span>
              <span style={{
                padding: '2px 8px',
                borderRadius: '12px',
                fontSize: '11px',
                fontWeight: 600,
                background: user?.role === 'admin' ? '#fee2e2' : '#e0e7ff',
                color: user?.role === 'admin' ? '#dc2626' : '#4338ca'
              }}>
                {user?.role === 'admin' ? 'Quản trị viên (Admin)' : (user?.role === 'lecturer' ? 'Giảng viên' : 'Sinh viên (Student)')}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Trạng thái:</span>
              <span style={{ color: '#10b981', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Check size={14} /> Đang hoạt động
              </span>
            </div>
          </div>
        </div>

        <div style={{
          background: 'var(--bg-tertiary)',
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          padding: '16px',
          fontSize: '12px',
          color: 'var(--text-secondary)',
          lineHeight: '1.6'
        }}>
          💡 <strong>Chính sách bảo mật:</strong> Mật khẩu của bạn được mã hóa một chiều bằng chuẩn <strong>bcrypt</strong> trước khi lưu vào MongoDB hoặc kho Demo. Hệ thống tuyệt đối không lưu trữ hoặc trả về mật khẩu thô dưới bất kỳ hình thức nào.
        </div>
      </div>
    </div>
  );
}
