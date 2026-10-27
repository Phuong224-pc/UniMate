// Quản lý trạng thái đăng nhập sinh viên (Local State + Firebase tương thích)

const AUTH_STORAGE_KEY = 'vlu_auth_user';

export const authService = {
  getCurrentUser() {
    try {
      const saved = localStorage.getItem(AUTH_STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  },

  login(email, password) {
    // Demo đăng nhập sinh viên hoặc admin
    const isAdmin = email.includes('admin') || 
                    email === 'ngocduyprc2006@gmail.com' || 
                    email === 'duy.2474802010071@vanlanguni.vn' ||
                    email === 'phuongtruong121204@gmail.com';

    const user = {
      email,
      name: email.split('@')[0].toUpperCase(),
      role: isAdmin ? 'admin' : 'student',
      loginTime: new Date().toISOString()
    };

    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    window.dispatchEvent(new Event('authChange'));
    return user;
  },

  loginMicrosoft() {
    // Đăng nhập Mail trường Văn Lang
    const user = {
      email: 'sinhvien@vanlanguni.vn',
      name: 'Sinh viên',
      role: 'student',
      loginTime: new Date().toISOString(),
      provider: 'Microsoft'
    };
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    window.dispatchEvent(new Event('authChange'));
    return user;
  },

  register(fullName, email, password) {
    const user = {
      email,
      name: fullName,
      role: 'student',
      loginTime: new Date().toISOString()
    };
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    window.dispatchEvent(new Event('authChange'));
    return user;
  },

  logout() {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    window.dispatchEvent(new Event('authChange'));
  },

  onAuthChange(callback) {
    const handler = () => callback(this.getCurrentUser());
    window.addEventListener('authChange', handler);
    return () => window.removeEventListener('authChange', handler);
  }
};
