import { demoStorage } from './demoStorage.js';

const sameScope = (left = {}, right = {}) => ['schoolId', 'majorCode', 'cohort', 'version'].every(key => (left?.[key] || '') === (right?.[key] || ''));
const copy = value => value ? structuredClone(value) : value;

export const curriculumDemoRepo = {
  async findByProgram(programName = 'K30 CNTT', scope = null) {
    const clean = programName.trim().toLowerCase();
    const items = demoStorage.find('curriculum', c => (c.program || '').toLowerCase() === clean);
    const match = scope ? items.find(c => sameScope(c.scope, scope)) : items.find(c => !c.scope) || (items.length === 1 ? items[0] : null);
    return copy(match || { program: programName, sections: [], verificationStatus: items.length > 1 ? 'ambiguous_version' : 'missing_curriculum' });
  },
  async findById(id) { return copy(demoStorage.findOne('curriculum', c => String(c._id) === String(id))); },
  async findMany() { return copy(demoStorage.find('curriculum')); },
  async upsert(data, { expectedRevision } = {}) {
    const existing = data._id ? demoStorage.findOne('curriculum', c => String(c._id) === String(data._id)) : demoStorage.findOne('curriculum', c => c.program === data.program && sameScope(c.scope, data.scope));
    if (existing) {
      if ((data.program && data.program !== existing.program) || (existing.scope && data.scope && !sameScope(existing.scope, data.scope))) { const error = new Error('Tạo khung riêng để lưu phiên bản/phạm vi mới; không đổi phạm vi khung đang được sử dụng.'); error.statusCode = 400; throw error; }
      if (expectedRevision !== undefined && (existing.revision || 1) !== expectedRevision) { const error = new Error('Khung đã thay đổi; tải lại bản xem trước.'); error.statusCode = 409; throw error; }
      return copy(await demoStorage.updateOne('curriculum', c => c._id === existing._id, { ...copy(data), revision: data.revision ?? (existing.revision || 1) + 1 }));
    }
    return copy(await demoStorage.insertOne('curriculum', { revision: 1, ...copy(data) }));
  },
  async count() { return demoStorage.count('curriculum'); }
};
export default curriculumDemoRepo;
