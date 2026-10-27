import { Schedule } from '../../models/Schedule.js';

function formatSchedule(doc) {
  if (!doc) return null;
  const obj = typeof doc.toObject === 'function' ? doc.toObject() : { ...doc };
  if (obj._id) obj._id = obj._id.toString();
  delete obj.__v;
  return obj;
}

export const scheduleMongoRepo = {
  async findById(id) {
    if (!id) return null;
    try {
      const schedule = await Schedule.findById(id).lean();
      return formatSchedule(schedule);
    } catch {
      return null;
    }
  },

  async findForStudent({ mssv, semester, dayOfWeek, className, courses = [] } = {}) {
    const query = {};

    if (semester) {
      query.semester = semester;
    }

    if (dayOfWeek !== undefined && dayOfWeek !== null && dayOfWeek !== 'all') {
      query.dayOfWeek = Number(dayOfWeek);
    }

    if (mssv && mssv.trim()) {
      const cleanMssv = mssv.trim();
      const targetClass = className || 'K30 CNTT';
      const courseCodes = (courses || []).map(c => (typeof c === 'string' ? c : c.code || ''));

      query.$or = [
        { mssvList: cleanMssv },
        { classSection: targetClass },
        { classSection: { $regex: new RegExp(`^${targetClass}`, 'i') } },
        { courseCode: { $in: courseCodes } }
      ];
    }

    const items = await Schedule.find(query)
      .sort({ dayOfWeek: 1, startPeriod: 1 })
      .lean();

    return items.map(formatSchedule);
  },

  async findMany({ semester, classSection, courseCode, page = 1, limit = 50 } = {}) {
    const query = {};
    if (semester) query.semester = semester;
    if (classSection) query.classSection = { $regex: classSection, $options: 'i' };
    if (courseCode) query.courseCode = courseCode.toUpperCase();

    const skip = (Math.max(1, page) - 1) * limit;

    const [total, items] = await Promise.all([
      Schedule.countDocuments(query),
      Schedule.find(query)
        .sort({ semester: -1, dayOfWeek: 1, startPeriod: 1 })
        .skip(skip)
        .limit(limit)
        .lean()
    ]);

    return {
      items: items.map(formatSchedule),
      total,
      page: Math.max(1, page),
      totalPages: Math.ceil(total / limit) || 1
    };
  },

  async create(data) {
    const item = await Schedule.create(data);
    return formatSchedule(item);
  },

  async updateById(id, data) {
    const item = await Schedule.findByIdAndUpdate(id, data, { new: true, runValidators: true }).lean();
    return formatSchedule(item);
  },

  async deleteById(id) {
    const item = await Schedule.findByIdAndDelete(id).lean();
    return formatSchedule(item);
  },

  async getSemesters() {
    const semesters = await Schedule.distinct('semester');
    return semesters.filter(Boolean);
  },

  async count(filter = {}) {
    return Schedule.countDocuments(filter);
  }
};

export default scheduleMongoRepo;
