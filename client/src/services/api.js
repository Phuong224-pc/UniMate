const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';
const TOKEN_KEY = 'vlu_auth_token';

function getAuthHeaders(isFormData = false) {
  const headers = {};
  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const isFormData = options.body instanceof FormData;

  const config = {
    ...options,
    headers: {
      ...getAuthHeaders(isFormData),
      ...(options.headers || {})
    }
  };

  const res = await fetch(url, config);
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const errorMsg = data.error || `Lỗi máy chủ (${res.status})`;
    const error = new Error(errorMsg);
    error.status = res.status;
    error.details = data.details;
    throw error;
  }

  return data;
}

export const api = {
  // ─── AUTHENTICATION ───
  async register({ fullName, email, password, mssv }) {
    return request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ fullName, email, password, mssv })
    });
  },

  async login(identifier, password) {
    return request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password })
    });
  },

  async getMe() {
    return request('/auth/me');
  },

  async changePassword(oldPassword, newPassword) {
    return request('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ oldPassword, newPassword })
    });
  },

  async logout() {
    return request('/auth/logout', { method: 'POST' });
  },

  // ─── HỒ SƠ CÁ NHÂN (MONGODB / DEMO) ───
  async getMyProfile() {
    return request('/profile/me');
  },

  async updateMyProfile(profileData) {
    return request('/profile/me', {
      method: 'PUT',
      body: JSON.stringify(profileData)
    });
  },

  async extractProfileFromImage(imageData, mimeType = 'image/jpeg') {
    return request('/profile/extract-from-image', {
      method: 'POST',
      body: JSON.stringify({ image: { data: imageData, mimeType } })
    });
  },

  // ─── SINH VIÊN & BẢNG ĐIỂM (MONGODB / DEMO) ───
  async getStudents(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return request(`/students${qs ? '?' + qs : ''}`);
  },

  async getStudentByMssv(mssv) {
    return request(`/students/${encodeURIComponent(mssv)}`);
  },

  async updateStudent(mssv, data) {
    return request(`/students/${encodeURIComponent(mssv)}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  async createStudent(data) {
    return request('/students', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async deleteStudent(mssv, force = false) {
    return request(`/students/${encodeURIComponent(mssv)}?force=${force}`, {
      method: 'DELETE'
    });
  },

  // ─── OCR & BẢNG ĐIỂM THÔNG MINH ───
  async ocrTranscript(fileOrPayload) {
    if (fileOrPayload instanceof FormData) {
      return request('/students/ocr-transcript', {
        method: 'POST',
        body: fileOrPayload
      });
    }

    if (fileOrPayload instanceof File || fileOrPayload instanceof Blob) {
      const formData = new FormData();
      formData.append('file', fileOrPayload);
      return request('/students/ocr-transcript', {
        method: 'POST',
        body: formData
      });
    }

    return request('/students/ocr-transcript', {
      method: 'POST',
      body: JSON.stringify(fileOrPayload)
    });
  },

  async scanTranscriptPdf(formDataOrFile) {
    return this.ocrTranscript(formDataOrFile);
  },

  async scanTranscript(payloadOrFile) {
    return this.ocrTranscript(payloadOrFile);
  },

  async scanStudentIdCard(payload) {
    const data = payload?.data || payload;
    const mimeType = payload?.mimeType || 'image/jpeg';
    return this.extractProfileFromImage(data, mimeType);
  },

  async confirmTranscript({ mssv, courses, source } = {}) {
    return request('/students/confirm-transcript', {
      method: 'POST',
      body: JSON.stringify({ mssv, courses, source })
    });
  },

  async updateMyCourses(courses) {
    return this.confirmTranscript({ courses });
  },

  // ─── THỜI KHÓA BIỂU (MONGODB / DEMO) ───
  async getSchedule(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return request(`/schedule${qs ? '?' + qs : ''}`);
  },

  async getSemesters() {
    return request('/schedule/semesters');
  },

  async createSchedule(data) {
    return request('/schedule', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async updateSchedule(id, data) {
    return request(`/schedule/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  async deleteSchedule(id) {
    return request(`/schedule/${id}`, {
      method: 'DELETE'
    });
  },

  // ─── CHƯƠNG TRÌNH ĐÀO TẠO K30 ───
  async getCurriculum(program = 'K30 CNTT') {
    return request(`/curriculum?program=${encodeURIComponent(program)}`);
  },

  async searchCourses(query) {
    return request(`/curriculum/search?q=${encodeURIComponent(query || '')}`);
  },

  // ─── CHATBOT & TRỢ LÝ AI (GEMINI) ───
  async chat({ messages, mode = 'default', image = null, systemPromptOverride = null }) {
    return request('/chat', {
      method: 'POST',
      body: JSON.stringify({ messages, mode, image, systemPromptOverride })
    });
  },

  // ─── ADMIN KHU VỰC QUẢN TRỊ ───
  async getAdminDashboard() {
    return request('/admin/dashboard');
  },

  async getAdminUsers(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return request(`/admin/users${qs ? '?' + qs : ''}`);
  },

  async createAdminUser(data) {
    return request('/admin/users', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async updateAdminUser(id, data) {
    return request(`/admin/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  async deleteAdminUser(id) {
    return request(`/admin/users/${id}`, {
      method: 'DELETE'
    });
  },

  async getAdminCourses(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return request(`/admin/courses${qs ? '?' + qs : ''}`);
  },

  async createAdminCourse(data) {
    return request('/admin/courses', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async updateAdminCourse(id, data) {
    return request(`/admin/courses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  async deleteAdminCourse(id) {
    return request(`/admin/courses/${id}`, {
      method: 'DELETE'
    });
  },

  async getAdminCurriculum(program = 'K30 CNTT') {
    return request(`/admin/curriculum?program=${encodeURIComponent(program)}`);
  },

  async updateAdminCurriculum(data) {
    return request('/admin/curriculum', {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  async getAdminSchedules(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return request(`/admin/schedules${qs ? '?' + qs : ''}`);
  },

  async createAdminSchedule(data) {
    return request('/admin/schedules', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async updateAdminSchedule(id, data) {
    return request(`/admin/schedules/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  async deleteAdminSchedule(id) {
    return request(`/admin/schedules/${id}`, {
      method: 'DELETE'
    });
  },

  async getAdminPrompts() {
    return request('/admin/prompts');
  },

  async updateAdminPrompts(prompts) {
    return request('/admin/prompts', {
      method: 'POST',
      body: JSON.stringify(prompts)
    });
  },

  async checkHealth() {
    return request('/admin/health');
  },

  // ─── ADMIN BULK IMPORT (EXCEL & PDF) ───
  async downloadAdminImportTemplate(dataType) {
    const token = localStorage.getItem(TOKEN_KEY);
    const res = await fetch(`${API_BASE}/admin/import/template/${dataType}`, {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    });
    if (!res.ok) throw new Error('Không thể tải file mẫu');
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Mau_Nhap_${dataType}_UniMate.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  },

  async previewAdminImport(formData) {
    return request('/admin/import/preview', {
      method: 'POST',
      body: formData
    });
  },

  async confirmAdminImport({ dataType, rows, conflictMode, defaultProgram }) {
    return request('/admin/import/confirm', {
      method: 'POST',
      body: JSON.stringify({ dataType, rows, conflictMode, defaultProgram })
    });
  },

  // ─── TRẠNG THÁI HỆ THỐNG & CHẾ ĐỘ DỮ LIỆU (DEMO / MONGODB) ───
  async getStatus() {
    return request('/status');
  }
};

export default api;
