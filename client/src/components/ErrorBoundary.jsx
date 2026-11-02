import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Unhandled React Error caught by ErrorBoundary:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          background: 'var(--bg-main, #f8fafc)',
          color: 'var(--text-main, #1e293b)'
        }}>
          <div style={{
            maxWidth: '540px',
            width: '100%',
            background: 'var(--bg-card, #ffffff)',
            borderRadius: '16px',
            border: '1px solid var(--border-color, #e2e8f0)',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
            padding: '32px',
            textAlign: 'center'
          }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: '#fee2e2',
              color: '#dc2626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto'
            }}>
              <AlertTriangle size={28} />
            </div>

            <h2 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '8px', color: '#b91c1c' }}>
              Đã có lỗi xảy ra khi tải trang
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary, #64748b)', marginBottom: '20px', lineHeight: 1.5 }}>
              Hệ thống phát hiện lỗi hiển thị giao diện. Bạn có thể thử tải lại trang hoặc quay về trang chủ.
            </p>

            {this.state.error && (
              <div style={{
                textAlign: 'left',
                background: 'var(--bg-tertiary, #f1f5f9)',
                padding: '12px 16px',
                borderRadius: '8px',
                fontSize: '12px',
                fontFamily: 'monospace',
                color: '#dc2626',
                marginBottom: '24px',
                overflowX: 'auto',
                maxHeight: '120px'
              }}>
                {this.state.error.toString()}
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={this.handleReload}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 20px',
                  background: 'var(--vlu-red, #c41230)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                <RefreshCw size={16} /> Tải lại trang
              </button>
              <button
                onClick={this.handleGoHome}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 20px',
                  background: 'var(--bg-secondary, #f1f5f9)',
                  color: 'var(--text-main, #334155)',
                  border: '1px solid var(--border-color, #cbd5e1)',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                <Home size={16} /> Về trang chủ
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
