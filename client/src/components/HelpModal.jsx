import React from 'react';
import { X, Lightbulb, CheckCircle2, MessageSquare, Route, Trash2 } from 'lucide-react';

export default function HelpModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  const steps = [
    {
      num: 1,
      title: "Làm mới & Quay về trang chủ",
      desc: "Bấm trực tiếp vào logo UniMate ở góc trên thanh bên (Sidebar) để làm mới cuộc hội thoại và quay về trang chủ ban đầu.",
      icon: MessageSquare
    },
    {
      num: 2,
      title: "Kích hoạt trợ lý chuyên gia theo nhu cầu",
      desc: "Chọn các tính năng chuyên sâu ở thanh bên như Cố vấn lộ trình (đọc ảnh bảng điểm), Lộ trình cá nhân (tính 126 tín chỉ), Kết quả học tập (tra cứu MSSV), Dự báo tốt nghiệp để có thông tin chính xác nhất.",
      icon: Route
    },
    {
      num: 3,
      title: "Quản lý lịch sử hội thoại",
      desc: "Mọi phiên trò chuyện đều được lưu tự động trên trình duyệt. Bạn có thể xóa riêng lẻ từng phiên chat bằng cách bấm vào biểu tượng Thùng rác nhỏ ngay cạnh dòng lịch sử.",
      icon: Trash2
    },
    {
      num: 4,
      title: "Nhập liệu đa phương thức",
      desc: "Trợ lý hỗ trợ nhập liệu bằng giọng nói (Microphone), gửi ảnh bảng điểm trực tiếp (Vision AI) để nhận diện môn học và tính tín chỉ tự động.",
      icon: CheckCircle2
    }
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box chatgpt-scroll" style={{ maxWidth: '540px' }} onClick={(e) => e.stopPropagation()}>
        <button 
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            padding: '4px'
          }}
        >
          <X size={20} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            background: 'var(--vlu-red-light)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--vlu-red)'
          }}>
            <Lightbulb size={22} />
          </div>
          <div>
            <h2 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text-main)' }}>HƯỚNG DẪN SỬ DỤNG UNIMATE</h2>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Các mẹo để sử dụng trợ lý học tập UniMate hiệu quả nhất (Dữ liệu demo: VLU)</p>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <div 
                key={step.num}
                style={{
                  display: 'flex',
                  gap: '14px',
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-color)'
                }}
              >
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: 'var(--vlu-red)',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '13px',
                  flexShrink: 0
                }}>
                  {step.num}
                </div>
                <div>
                  <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>
                    {step.title}
                  </h3>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    {step.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <button 
          onClick={onClose}
          className="btn-vlu-primary"
          style={{ width: '100%', justifyContent: 'center', marginTop: '20px' }}
        >
          Đã hiểu, bắt đầu sử dụng
        </button>
      </div>
    </div>
  );
}
