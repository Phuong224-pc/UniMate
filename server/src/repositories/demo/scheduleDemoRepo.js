import { demoStorage } from './demoStorage.js';

export const scheduleDemoRepo = {
  async findById(id) {
    if (!id) return null;
    return demoStorage.findOne('schedules', s => s._id === id || String(s._id) === String(id));
  },

  async findForStudent({ mssv, semester, dayOfWeek, className, courses = [] } = {}) {
    let items = demoStorage.find('schedules');

    if (semester) {
      items = items.filter(s => s.semester === semester);
    }

    if (dayOfWeek !== undefined && dayOfWeek !== null && dayOfWeek !== 'all') {
      const d = Number(dayOfWeek);
      items = items.filter(s => Number(s.dayOfWeek) === d);
    }

    if (mssv && mssv.trim()) {
      const cleanMssv = mssv.trim();
      const targetClass = (className || 'K30 CNTT').toLowerCase();
      const targetCourses = (courses || []).map(c => (typeof c === 'string' ? c : c.code || '').toUpperCase());

      items = items.filter(s => {
        // 1. MSSV nằm trong danh sách đăng ký mssvList
        if (Array.isArray(s.mssvList) && s.mssvList.includes(cleanMssv)) return true;
        // 2. Lớp học phần khớp với lớp của sinh viên
        if (s.classSection && (s.classSection.toLowerCase().includes(targetClass) || targetClass.includes(s.classSection.toLowerCase()))) return true;
        // 3. Môn học nằm trong danh sách môn đang học
        if (s.courseCode && targetCourses.includes(s.courseCode.toUpperCase())) return true;
        return false;
      });
    }

    items.sort((a, b) => {
      if (a.dayOfWeek !== b.dayOfWeek) return (a.dayOfWeek || 0) - (b.dayOfWeek || 0);
      return (a.startPeriod || 0) - (b.startPeriod || 0);
    });

    return items;
  },

  async findMany({ semester, classSection, courseCode, page = 1, limit = 50 } = {}) {
    let items = demoStorage.find('schedules');

    if (semester) {
      items = items.filter(s => s.semester === semester);
    }

    if (classSection) {
      const cs = classSection.toLowerCase();
      items = items.filter(s => (s.classSection || '').toLowerCase().includes(cs));
    }

    if (courseCode) {
      const cc = courseCode.toUpperCase();
      items = items.filter(s => (s.courseCode || '').toUpperCase() === cc);
    }

    const total = items.length;
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.max(1, parseInt(limit, 10));
    const skip = (pageNum - 1) * limitNum;

    items.sort((a, b) => {
      if (a.semester !== b.semester) return (b.semester || '').localeCompare(a.semester || '');
      if (a.dayOfWeek !== b.dayOfWeek) return (a.dayOfWeek || 0) - (b.dayOfWeek || 0);
      return (a.startPeriod || 0) - (b.startPeriod || 0);
    });

    const paged = items.slice(skip, skip + limitNum);

    return {
      items: paged,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum) || 1
    };
  },

  async create(data) {
    const dayNames = {
      2: 'Thứ Hai',
      3: 'Thứ Ba',
      4: 'Thứ Tư',
      5: 'Thứ Năm',
      6: 'Thứ Sáu',
      7: 'Thứ Bảy',
      8: 'Chủ Nhật'
    };
    const dayOfWeek = Number(data.dayOfWeek) || 2;
    const item = {
      ...data,
      dayOfWeek,
      dayOfWeekText: data.dayOfWeekText || dayNames[dayOfWeek] || `Thứ ${dayOfWeek}`
    };
    return demoStorage.insertOne('schedules', item);
  },

  async updateById(id, data) {
    return demoStorage.updateOne('schedules', s => s._id === id || String(s._id) === String(id), data);
  },

  async deleteById(id) {
    return demoStorage.deleteOne('schedules', s => s._id === id || String(s._id) === String(id));
  },

  async getSemesters() {
    const items = demoStorage.find('schedules');
    const set = new Set();
    items.forEach(s => {
      if (s.semester) set.add(s.semester);
    });
    return Array.from(set);
  },

  async count(filter = {}) {
    return demoStorage.count('schedules', s => {
      for (const [k, v] of Object.entries(filter)) {
        if (s[k] !== v) return false;
      }
      return true;
    });
  }
};

export default scheduleDemoRepo;
