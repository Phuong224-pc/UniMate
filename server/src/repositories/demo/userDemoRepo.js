import { demoStorage } from './demoStorage.js';

export const userDemoRepo = {
  async findById(id) {
    if (!id) return null;
    return demoStorage.findOne('users', u => u._id === id || String(u._id) === String(id));
  },

  async findByEmail(email) {
    if (!email) return null;
    const clean = email.trim().toLowerCase();
    return demoStorage.findOne('users', u => (u.email || '').toLowerCase() === clean);
  },

  async findByMssv(mssv) {
    if (!mssv) return null;
    const clean = mssv.trim();
    return demoStorage.findOne('users', u => u.mssv === clean);
  },

  async findOne(query) {
    return demoStorage.findOne('users', u => {
      for (const [key, val] of Object.entries(query)) {
        if (key === '$or' && Array.isArray(val)) {
          const matchOr = val.some(subQ => {
            return Object.entries(subQ).every(([k, v]) => {
              if (k === 'email') return (u.email || '').toLowerCase() === (v || '').toLowerCase();
              return u[k] === v;
            });
          });
          if (!matchOr) return false;
        } else if (key === 'email') {
          if ((u.email || '').toLowerCase() !== (val || '').toLowerCase()) return false;
        } else if (u[key] !== val) {
          return false;
        }
      }
      return true;
    });
  },

  async create(userData) {
    return demoStorage.insertOne('users', userData);
  },

  async updateById(id, data) {
    return demoStorage.updateOne('users', u => u._id === id || String(u._id) === String(id), data);
  },

  async deleteById(id) {
    return demoStorage.deleteOne('users', u => u._id === id || String(u._id) === String(id));
  },

  async findMany({ page = 1, limit = 20, search = '', role = '', status = '' } = {}) {
    let items = demoStorage.find('users');
    if (role && role !== 'all') {
      items = items.filter(u => u.role === role);
    }
    if (status && status !== 'all') {
      items = items.filter(u => u.status === status);
    }
    if (search && search.trim()) {
      const s = search.trim().toLowerCase();
      items = items.filter(u => 
        (u.email && u.email.toLowerCase().includes(s)) ||
        (u.mssv && u.mssv.includes(s)) ||
        (u.username && u.username.toLowerCase().includes(s))
      );
    }

    const total = items.length;
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.max(1, parseInt(limit, 10));
    const skip = (pageNum - 1) * limitNum;
    const paged = items.slice(skip, skip + limitNum);

    return {
      users: paged,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum) || 1
    };
  },

  async findAll(filter = {}) {
    return demoStorage.find('users', u => {
      for (const [k, v] of Object.entries(filter)) {
        if (u[k] !== v) return false;
      }
      return true;
    });
  },

  async count(filter = {}) {
    return demoStorage.count('users', u => {
      for (const [k, v] of Object.entries(filter)) {
        if (u[k] !== v) return false;
      }
      return true;
    });
  }
};

export default userDemoRepo;
