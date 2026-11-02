import { curriculumRepo } from '../repositories/index.js';
import { calculateAcademicStats, normalizeCourseCode } from '../utils/gradeUtils.js';

export async function resolveStudentCurriculum(student = {}) {
  if (student.curriculumId && curriculumRepo.findById) return await curriculumRepo.findById(student.curriculumId) || null;
  const program = student.program || (student.trainingCourse === 'K30' || /K30/i.test(student.className || '') ? 'K30 CNTT' : null);
  if (!program) return null;
  const all = curriculumRepo.findMany ? await curriculumRepo.findMany() : [await curriculumRepo.findByProgram(program)];
  const list = Array.isArray(all) ? all : all.curriculum || all.curricula || [];
  const matches = list.filter(c => c.program === program && (!student.schoolId || c.scope?.schoolId === student.schoolId)
    && (!student.majorCode || c.scope?.majorCode === student.majorCode)
    && (!student.trainingCourse || !c.scope?.cohort || c.scope.cohort === student.trainingCourse)
    && (!student.curriculumVersion || String(c.scope?.version) === String(student.curriculumVersion)));
  // Ambiguous versions require explicit assignment; never pick the newest.
  return matches.length === 1 ? matches[0] : null;
}

export async function getAcademicProgress(student = {}) {
  const curriculum = await resolveStudentCurriculum(student);
  const sourceTotals = student.transcriptSourceTotals || {
    cumulativeCredits: student.officialCumulativeCredits ?? null, cumulativeGpa4: student.officialCumulativeGpa4 ?? null,
    source: student.source || 'Hồ sơ nguồn cũ; chưa xác minh'
  };
  return calculateAcademicStats(student.courses || [], { curriculum, specialization: student.specialization || null, sourceTotals });
}

export async function validateCoursePlan(student, courseCodes = []) {
  if (!Array.isArray(courseCodes)) throw Object.assign(new Error('Kế hoạch phải là danh sách mã môn.'), { statusCode: 400 });
  const progress = await getAcademicProgress(student);
  if (!progress.curriculum) throw Object.assign(new Error('Chưa xác định phiên bản khung áp dụng; cần admin gán khung.'), { statusCode: 409 });
  const states = new Map(progress.courseStates.map(c => [c.code, c]));
  const normalized = [...new Set(courseCodes.map(normalizeCourseCode))];
  for (const code of normalized) {
    const course = states.get(code);
    if (!course) throw Object.assign(new Error(`Môn ${code} không thuộc phiên bản khung áp dụng.`), { statusCode: 400 });
    if (course.locked) throw Object.assign(new Error(course.reason), { statusCode: 403 });
    if (!course.eligible && course.status !== 'passed') throw Object.assign(new Error(course.reason), { statusCode: 400 });
  }
  return normalized;
}
