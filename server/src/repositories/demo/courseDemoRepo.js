import { demoStorage } from './demoStorage.js';

export const courseDemoRepo = {
  async findByCode(code) {
    if (!code) return null;
    const clean = code.trim().toUpperCase();
    return demoStorage.findOne('courses', c => (c.code || '').toUpperCase() === clean);
  },

  async findMany({ query = '', program = '' } = {}) {
    let items = demoStorage.find('courses');

    if (program) {
      const p = program.toLowerCase();
      items = items.filter(c => (c.program || '').toLowerCase() === p);
    }

    if (query && query.trim()) {
      const q = query.trim().toLowerCase();
      items = items.filter(c => 
        (c.code && c.code.toLowerCase().includes(q)) ||
        (c.name && c.name.toLowerCase().includes(q)) ||
        (c.sectionName && c.sectionName.toLowerCase().includes(q))
      );
    }

    items.sort((a, b) => (a.code || '').localeCompare(b.code || ''));
    return items;
  },

  async create(data) {
    const code = (data.code || '').toUpperCase().trim();
    const existing = await this.findByCode(code);
    if (existing) {
      throw new Error(`Môn học có mã ${code} đã tồn tại`);
    }
    return demoStorage.insertOne('courses', {
      ...data,
      code
    });
  },

  async updateByCode(code, data) {
    const clean = code.trim().toUpperCase();
    const updated = await demoStorage.updateOne('courses', c => (c.code || '').toUpperCase() === clean, data);
    if (!updated) throw new Error(`Không tìm thấy môn học có mã: ${code}`);
    return updated;
  },

  async deleteByCode(code) {
    const clean = code.trim().toUpperCase();
    const removed = await demoStorage.deleteOne('courses', c => (c.code || '').toUpperCase() === clean);
    if (!removed) throw new Error(`Không tìm thấy môn học có mã: ${code}`);
    return removed;
  },

  async findById(id) {
    if (!id) return null;
    return demoStorage.findOne('courses', c => c._id === id || String(c._id) === String(id));
  },

  async findAll(filter = {}) {
    let items = demoStorage.find('courses');
    for (const [k, v] of Object.entries(filter)) {
      items = items.filter(c => c[k] === v);
    }
    items.sort((a, b) => (a.code || '').localeCompare(b.code || ''));
    return items;
  },

  async updateById(id, data) {
    const updated = await demoStorage.updateOne('courses', c => c._id === id || String(c._id) === String(id), data);
    if (!updated) throw new Error(`Không tìm thấy môn học có ID: ${id}`);
    return updated;
  },

  async deleteById(id) {
    const removed = await demoStorage.deleteOne('courses', c => c._id === id || String(c._id) === String(id));
    if (!removed) throw new Error(`Không tìm thấy môn học có ID: ${id}`);
    return removed;
  },

  async count(filter = {}) {
    return demoStorage.count('courses', c => {
      for (const [k, v] of Object.entries(filter)) {
        if (c[k] !== v) return false;
      }
      return true;
    });
  }
};

export default courseDemoRepo;
