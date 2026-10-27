import { demoStorage } from './demoStorage.js';

export const studentDemoRepo = {
  async findById(id) {
    if (!id) return null;
    return demoStorage.findOne('students', s => s._id === id || String(s._id) === String(id));
  },

  async findByMssv(mssv) {
    if (!mssv) return null;
    const clean = mssv.trim();
    return demoStorage.findOne('students', s => s.mssv === clean);
  },

  async findByEmail(email) {
    if (!email) return null;
    const clean = email.trim().toLowerCase();
    return demoStorage.findOne('students', s => (s.email || '').toLowerCase() === clean);
  },

  async findByUserId(userId) {
    if (!userId) return null;
    return demoStorage.findOne('students', s => s.userId === userId || String(s.userId) === String(userId));
  },

  async findOne(query) {
    return demoStorage.findOne('students', s => {
      for (const [key, val] of Object.entries(query)) {
        if (key === '$or' && Array.isArray(val)) {
          const matchOr = val.some(subQ => {
            return Object.entries(subQ).every(([k, v]) => {
              if (k === 'email') return (s.email || '').toLowerCase() === (v || '').toLowerCase();
              if (k === 'userId') return s.userId === v || String(s.userId) === String(v);
              return s[k] === v;
            });
          });
          if (!matchOr) return false;
        } else if (key === 'email') {
          if ((s.email || '').toLowerCase() !== (val || '').toLowerCase()) return false;
        } else if (key === 'userId') {
          if (s.userId !== val && String(s.userId) !== String(val)) return false;
        } else if (s[key] !== val) {
          return false;
        }
      }
      return true;
    });
  },

  async findMany({ page = 1, limit = 20, search = '', className = '', cohort = '', status = 'active' } = {}) {
    let items = demoStorage.find('students');

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      items = items.filter(s => 
        (s.mssv && s.mssv.toLowerCase().includes(q)) ||
        (s.fullName && s.fullName.toLowerCase().includes(q)) ||
        (s.email && s.email.toLowerCase().includes(q))
      );
    }

    if (className) {
      items = items.filter(s => s.className === className);
    }

    if (cohort) {
      items = items.filter(s => s.cohort === cohort);
    }

    const total = items.length;
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    // Sort newest first
    items.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    const paged = items.slice(skip, skip + limitNum);

    return {
      students: paged,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum) || 1
    };
  },

  async create(studentData) {
    return demoStorage.insertOne('students', studentData);
  },

  async updateByMssv(mssv, data) {
    const clean = mssv.trim();
    return demoStorage.updateOne('students', s => s.mssv === clean, data);
  },

  async deleteByMssv(mssv) {
    const clean = mssv.trim();
    return demoStorage.deleteOne('students', s => s.mssv === clean);
  },

  async count(filter = {}) {
    return demoStorage.count('students', s => {
      for (const [k, v] of Object.entries(filter)) {
        if (s[k] !== v) return false;
      }
      return true;
    });
  }
};

export default studentDemoRepo;
