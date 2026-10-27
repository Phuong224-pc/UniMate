import { Course } from '../../models/Course.js';

function formatCourse(doc) {
  if (!doc) return null;
  const obj = typeof doc.toObject === 'function' ? doc.toObject() : { ...doc };
  if (obj._id) obj._id = obj._id.toString();
  delete obj.__v;
  return obj;
}

export const courseMongoRepo = {
  async findByCode(code) {
    if (!code) return null;
    const clean = code.trim().toUpperCase();
    const course = await Course.findOne({ code: clean }).lean();
    return formatCourse(course);
  },

  async findMany({ query = '', program = '' } = {}) {
    const searchFilter = {};

    if (program) {
      searchFilter.program = program;
    }

    if (query && query.trim()) {
      const cleanQ = query.trim();
      searchFilter.$or = [
        { code: { $regex: cleanQ, $options: 'i' } },
        { name: { $regex: cleanQ, $options: 'i' } },
        { sectionName: { $regex: cleanQ, $options: 'i' } }
      ];
    }

    const courses = await Course.find(searchFilter).sort({ code: 1 }).lean();
    return courses.map(formatCourse);
  },

  async create(data) {
    const course = await Course.create({
      ...data,
      code: (data.code || '').toUpperCase().trim()
    });
    return formatCourse(course);
  },

  async updateByCode(code, data) {
    const clean = code.trim().toUpperCase();
    const course = await Course.findOneAndUpdate(
      { code: clean },
      data,
      { new: true, runValidators: true }
    ).lean();
    if (!course) throw new Error(`Không tìm thấy môn học có mã: ${code}`);
    return formatCourse(course);
  },

  async deleteByCode(code) {
    const clean = code.trim().toUpperCase();
    const course = await Course.findOneAndDelete({ code: clean }).lean();
    if (!course) throw new Error(`Không tìm thấy môn học có mã: ${code}`);
    return formatCourse(course);
  },

  async findById(id) {
    if (!id) return null;
    const course = await Course.findById(id).lean();
    return formatCourse(course);
  },

  async findAll(filter = {}) {
    const courses = await Course.find(filter).sort({ code: 1 }).lean();
    return courses.map(formatCourse);
  },

  async updateById(id, data) {
    const course = await Course.findByIdAndUpdate(id, data, { new: true, runValidators: true }).lean();
    if (!course) throw new Error(`Không tìm thấy môn học có ID: ${id}`);
    return formatCourse(course);
  },

  async deleteById(id) {
    const course = await Course.findByIdAndDelete(id).lean();
    if (!course) throw new Error(`Không tìm thấy môn học có ID: ${id}`);
    return formatCourse(course);
  },

  async count(filter = {}) {
    return Course.countDocuments(filter);
  }
};

export default courseMongoRepo;
