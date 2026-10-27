import { demoStorage } from './demoStorage.js';

export const curriculumDemoRepo = {
  async findByProgram(programName = 'K30 CNTT') {
    const clean = programName.trim().toLowerCase();
    const curr = demoStorage.findOne('curriculum', c => (c.program || '').toLowerCase() === clean);
    if (curr) return curr;

    // Fallback: build from courses if curriculum entry is missing
    const courses = demoStorage.find('courses', c => (c.program || '').toLowerCase() === clean);
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
      return { program: programName, major: 'Công nghệ thông tin', totalCredits: 126, sections };
    }

    return { program: programName, major: 'Công nghệ thông tin', totalCredits: 126, sections: [] };
  },

  async upsert(data) {
    const existing = demoStorage.findOne('curriculum', c => c.program === data.program);
    if (existing) {
      return demoStorage.updateOne('curriculum', c => c._id === existing._id, data);
    }
    return demoStorage.insertOne('curriculum', data);
  },

  async count() {
    return demoStorage.count('curriculum');
  }
};

export default curriculumDemoRepo;
