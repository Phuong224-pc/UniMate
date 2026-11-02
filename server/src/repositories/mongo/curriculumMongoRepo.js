import { Curriculum } from '../../models/Curriculum.js';

function formatCurriculum(doc) {
  if (!doc) return null;
  const obj = typeof doc.toObject === 'function' ? doc.toObject() : { ...doc };
  if (obj._id) obj._id = obj._id.toString();
  delete obj.__v;
  return obj;
}
const scopeFilter = (scope = {}) => Object.fromEntries(['schoolId', 'majorCode', 'cohort', 'version'].map(key => [`scope.${key}`, scope?.[key] || { $exists: false }]));

export const curriculumMongoRepo = {
  async findByProgram(programName = 'K30 CNTT', scope = null) {
    if (scope) return formatCurriculum(await Curriculum.findOne({ program: programName, ...scopeFilter(scope) }).lean());
    const items = await Curriculum.find({ program: programName }).lean();
    const match = items.find(c => !c.scope) || (items.length === 1 ? items[0] : null);
    return formatCurriculum(match || { program: programName, sections: [], verificationStatus: items.length > 1 ? 'ambiguous_version' : 'missing_curriculum' });
  },
  async findById(id) { return formatCurriculum(await Curriculum.findById(id).lean()); },
  async findMany() { return (await Curriculum.find({}).lean()).map(formatCurriculum); },
  async upsert(data, { expectedRevision } = {}) {
    const { _id, createdAt, updatedAt, ...updates } = data;
    if (_id) {
      const existing = await Curriculum.findById(_id).lean();
      const changedScope = existing?.scope && data.scope && ['schoolId', 'majorCode', 'cohort', 'version'].some(key => (existing.scope[key] || '') !== (data.scope[key] || ''));
      if (existing && ((data.program && data.program !== existing.program) || changedScope)) { const error = new Error('Tạo khung riêng để lưu phiên bản/phạm vi mới; không đổi phạm vi khung đang được sử dụng.'); error.statusCode = 400; throw error; }
    }
    const filter = _id ? { _id } : { program: data.program, ...scopeFilter(data.scope) };
    if (expectedRevision !== undefined) filter.$or = [{ revision: expectedRevision }, ...(expectedRevision === 1 ? [{ revision: { $exists: false } }] : [])];
    const mutation = { $set: updates, ...(data.revision === undefined ? { $inc: { revision: 1 } } : {}) };
    const updated = await Curriculum.findOneAndUpdate(filter, mutation, { upsert: expectedRevision === undefined, new: true, runValidators: true, setDefaultsOnInsert: false }).lean();
    if (!updated) { const error = new Error('Khung đã thay đổi; tải lại bản xem trước.'); error.statusCode = 409; throw error; }
    return formatCurriculum(updated);
  },
  async count() { return Curriculum.countDocuments(); }
};
export default curriculumMongoRepo;
