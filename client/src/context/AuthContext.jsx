import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

const TOKEN_KEY = 'vlu_auth_token';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Nạp thông tin tài khoản hiện tại từ MongoDB qua JWT Token
  const refreshUser = useCallback(async () => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setUser(null);
      setProfile(null);
      setLoading(false);
      return;
    }

    try {
      const res = await api.getMe();
      if (res && res.success) {
        setUser(res.data.user);
        setProfile(res.data.profile);
      } else {
        localStorage.removeItem(TOKEN_KEY);
        setUser(null);
        setProfile(null);
      }
    } catch (err) {
      console.warn('Phiên đăng nhập đã hết hạn hoặc không hợp lệ:', err.message);
      localStorage.removeItem(TOKEN_KEY);
      setUser(null);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = async (identifier, password) => {
    const res = await api.login(identifier, password);
    if (res && res.success) {
      localStorage.setItem(TOKEN_KEY, res.data.token);
      setUser(res.data.user);
      setProfile(res.data.profile);
      return res.data;
    }
    throw new Error(res?.error || 'Đăng nhập thất bại');
  };

  const register = async (fullName, email, password, mssv = null) => {
    const res = await api.register({ fullName, email, password, mssv });
    if (res && res.success) {
      localStorage.setItem(TOKEN_KEY, res.data.token);
      setUser(res.data.user);
      setProfile(res.data.profile);
      return res.data;
    }
    throw new Error(res?.error || 'Đăng ký thất bại');
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch {}
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
    setProfile(null);
  };

  const updateProfileData = async (data) => {
    const res = await api.updateMyProfile(data);
    if (res && res.success) {
      setProfile(res.data);
      return res.data;
    }
    throw new Error(res?.error || 'Cập nhật hồ sơ thất bại');
  };

  const value = {
    user,
    profile,
    loading,
    isAuthenticated: Boolean(user),
    isAdmin: user?.role === 'admin',
    login,
    register,
    logout,
    refreshUser,
    updateProfileData
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
