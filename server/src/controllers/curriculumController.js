import * as curriculumService from '../services/curriculumService.js';
import { successResponse } from '../utils/responseUtils.js';

export async function getCurriculum(req, res, next) {
  try {
    const { program } = req.query;
    const data = await curriculumService.getCurriculum(program || 'K30 CNTT');
    return successResponse(res, data);
  } catch (error) {
    next(error);
  }
}

export async function searchCourses(req, res, next) {
  try {
    const query = req.query.q || '';
    const results = await curriculumService.searchCourses(query);
    return successResponse(res, results);
  } catch (error) {
    next(error);
  }
}

export async function addCourse(req, res, next) {
  try {
    const course = await curriculumService.addCourse(req.body);
    return successResponse(res, course, 'Thêm môn học thành công', 201);
  } catch (error) {
    next(error);
  }
}

export async function updateCourse(req, res, next) {
  try {
    const { code } = req.params;
    const course = await curriculumService.updateCourse(code, req.body);
    return successResponse(res, course, 'Cập nhật môn học thành công');
  } catch (error) {
    next(error);
  }
}

export async function deleteCourse(req, res, next) {
  try {
    const { code } = req.params;
    await curriculumService.deleteCourse(code);
    return successResponse(res, null, 'Xóa môn học thành công');
  } catch (error) {
    next(error);
  }
}
