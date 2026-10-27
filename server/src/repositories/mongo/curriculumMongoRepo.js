import { Curriculum } from '../../models/Curriculum.js';
import { Course } from '../../models/Course.js';

function formatCurriculum(doc) {
  if (!doc) return null;
  const obj = typeof doc.toObject === 'function' ? doc.toObject() : { ...doc };
  if (obj._id) obj._id = obj._id.toString();
  delete obj.__v;
  return obj;
}

export const curriculumMongoRepo = {
  async findByProgram(programName = 'K30 CNTT') {
    let curriculum = await Curriculum.findOne({ program: programName }).lean();

    if (!curriculum) {
      const courses = await Course.find({ program: programName }).lean();
      if (courses.length > 0) {
        const sectionMap = {};
        courses.forEach(c => {
          const sec = c.sectionName || 'Môn học chung';
          if (!sectionMap[sec]) sectionMap[sec] = [];
          sectionMap[sec].push({
            code: c.code,
            name: c.name,
            credits: c.credits,
            prerequisites: c.prerequisites,
            required: c.required,
            semesterRecommended: c.semesterRecommended
          });
        });
        const sections = Object.entries(sectionMap).map(([name, cs]) => ({ name, courses: cs }));
        curriculum = { program: programName, major: 'Công nghệ thông tin', totalCredits: 126, sections };
      }
    }

    return formatCurriculum(curriculum || { program: programName, major: 'Công nghệ thông tin', totalCredits: 126, sections: [] });
  },

  async upsert(data) {
    const updated = await Curriculum.findOneAndUpdate(
      { program: data.program },
      data,
      { upsert: true, new: true }
    ).lean();
    return formatCurriculum(updated);
  },

  async count() {
    return Curriculum.countDocuments();
  }
};

export default curriculumMongoRepo;
