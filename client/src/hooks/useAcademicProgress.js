import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from './useAuth';
import { api } from '../services/api';

export const ACADEMIC_UPDATED = 'unimate:academic-updated';

export function notifyAcademicUpdated() {
  window.dispatchEvent(new Event(ACADEMIC_UPDATED));
}

export function useAcademicProgress() {
  const { user, profile } = useAuth();
  const [progress, setProgress] = useState(profile?.academicProgress || null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const requestVersion = useRef(0);
  const isStudent = user?.role === 'student';
  const accountKey = user?._id || user?.mssv || user?.email || '';
  const [progressOwner, setProgressOwner] = useState(accountKey);
  const reload = useCallback(async () => {
    const version = ++requestVersion.current;
    if (!isStudent || !accountKey) {
      setProgress(null);
      setError('');
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const result = await api.getAcademicProgress();
      if (version !== requestVersion.current) return;
      setProgress(result.data);
      setProgressOwner(accountKey);
      setError('');
    } catch (err) {
      if (version !== requestVersion.current) return;
      setProgress(null);
      setError(err.message || 'Không thể tải tiến độ học tập');
    } finally {
      if (version === requestVersion.current) setLoading(false);
    }
  }, [isStudent, accountKey]);

  useEffect(() => {
    setProgress(profile?.academicProgress || null);
    setProgressOwner(accountKey);
    reload();
    window.addEventListener(ACADEMIC_UPDATED, reload);
    window.addEventListener('focus', reload);
    return () => {
      requestVersion.current += 1;
      window.removeEventListener(ACADEMIC_UPDATED, reload);
      window.removeEventListener('focus', reload);
    };
  }, [profile, reload, accountKey]);

  return { progress: progressOwner === accountKey ? progress : null, error, loading, reload };
}
