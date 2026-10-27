import { StudentProfile } from '../../models/StudentProfile.js';

function formatStudent(doc) {
  if (!doc) return null;
  const obj = typeof doc.toObject === 'function' ? doc.toObject() : { ...doc };
  if (obj._id) obj._id = obj._id.toString();
  if (obj.userId) obj.userId = obj.userId.toString();
  delete obj.__v;
  return obj;
}

export const studentMongoRepo = {
  async findById(id) {
    if (!id) return null;
    try {
      const student = await StudentProfile.findById(id).lean();
      return formatStudent(student);
    } catch {
      return null;
    }
  },

  async findByMssv(mssv) {
    if (!mssv) return null;
    const clean = mssv.trim();
    const student = await StudentProfile.findOne({ mssv: clean }).lean();
    return formatStudent(student);
  },

  async findByEmail(email) {
    if (!email) return null;
    const clean = email.trim().toLowerCase();
    const student = await StudentProfile.findOne({ email: clean }).lean();
    return formatStudent(student);
  },

  async findByUserId(userId) {
    if (!userId) return null;
    try {
      const student = await StudentProfile.findOne({ userId }).lean();
      return formatStudent(student);
    } catch {
      return null;
    }
  },

  async findOne(query) {
    const student = await StudentProfile.findOne(query).lean();
    return formatStudent(student);
  },

  async findMany({ page = 1, limit = 20, search = '', className = '', cohort = '', status = 'active' } = {}) {
    const query = {};

    if (search && search.trim()) {
      const s = search.trim();
      query.$or = [
        { mssv: { $regex: s, $options: 'i' } },
        { fullName: { $regex: s, $options: 'i' } },
        { email: { $regex: s, $options: 'i' } }
      ];
    }

    if (className) query.className = className;
    if (cohort) query.cohort = cohort;

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const [total, students] = await Promise.all([
      StudentProfile.countDocuments(query),
      StudentProfile.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean()
    ]);

    return {
      students: students.map(formatStudent),
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum) || 1
    };
  },

  async create(studentData) {
    const student = await StudentProfile.create(studentData);
    return formatStudent(student);
  },

  async updateByMssv(mssv, data) {
    const clean = mssv.trim();
    const updated = await StudentProfile.findOneAndUpdate(
      { mssv: clean },
      { $set: data },
      { new: true, runValidators: true }
    ).lean();
    return formatStudent(updated);
  },

  async deleteByMssv(mssv) {
    const clean = mssv.trim();
    const student = await StudentProfile.findOneAndDelete({ mssv: clean }).lean();
    return formatStudent(student);
  },

  async count(filter = {}) {
    return StudentProfile.countDocuments(filter);
  }
};

export default studentMongoRepo;
