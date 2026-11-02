import { curriculumRepo, courseRepo } from '../repositories/index.js';

export async function getCurriculum(programName = 'K30 CNTT', { scope = null, curriculumId = null } = {}) {
  return curriculumId ? curriculumRepo.findById(curriculumId) : curriculumRepo.findByProgram(programName, scope);
}

export async function searchCourses(query = '') {
  return courseRepo.findMany({ query });
}

export async function addCourse(courseData) {
  return courseRepo.create(courseData);
}

export async function updateCourse(code, updateData) {
  return courseRepo.updateByCode(code, updateData);
}

export async function deleteCourse(code) {
  return courseRepo.deleteByCode(code);
}

export default {
  getCurriculum,
  searchCourses,
  addCourse,
  updateCourse,
  deleteCourse
};
