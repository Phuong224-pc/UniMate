import * as studentService from '../services/studentService.js';
import { successResponse, errorResponse } from '../utils/responseUtils.js';

export async function getStudents(req, res, next) {
  try {
    const { page, limit, search, className, cohort, status } = req.query;
    const result = await studentService.getStudents({ page, limit, search, className, cohort, status });
    return successResponse(res, result);
  } catch (error) {
    next(error);
  }
}

export async function getStudentByMssv(req, res, next) {
  try {
    const { mssv } = req.params;

    // Kiểm tra quyền trên từng bản ghi:
    // Sinh viên chỉ được phép xem hồ sơ và bảng điểm của chính mình
    if (req.user && req.user.role === 'student') {
      if (req.user.mssv && req.user.mssv.trim() !== mssv.trim()) {
        return errorResponse(res, 'Bạn chỉ có quyền truy cập hồ sơ và kết quả học tập của chính mình', 403);
      }
    }

    const student = await studentService.getStudentByMssv(mssv);
    if (!student) {
      return errorResponse(res, `Không tìm thấy sinh viên có MSSV: ${mssv}`, 404);
    }
    return successResponse(res, student);
  } catch (error) {
    next(error);
  }
}

export async function updateStudent(req, res, next) {
  try {
    const { mssv } = req.params;
    const isUserAdmin = req.user?.role === 'admin';

    // Sinh viên không được tự nâng quyền hoặc sửa điểm
    if (!isUserAdmin && req.user?.mssv && req.user.mssv.trim() !== mssv.trim()) {
      return errorResponse(res, 'Bạn chỉ có quyền chỉnh sửa hồ sơ của chính mình', 403);
    }

    const updated = await studentService.updateStudentProfile(mssv, req.body, isUserAdmin);
    return successResponse(res, updated, 'Cập nhật thông tin sinh viên thành công');
  } catch (error) {
    next(error);
  }
}

export async function createStudent(req, res, next) {
  try {
    const student = await studentService.createStudent(req.body);
    return successResponse(res, student, 'Thêm mới sinh viên thành công', 201);
  } catch (error) {
    next(error);
  }
}

export async function deleteStudent(req, res, next) {
  try {
    const { mssv } = req.params;
    const force = req.query.force === 'true';
    const result = await studentService.deleteStudent(mssv, { forceHardDelete: force });
    return successResponse(res, result, result.message);
  } catch (error) {
    next(error);
  }
}

export async function ocrTranscript(req, res, next) {
  try {
    const { parseTranscriptDocument } = await import('../services/ocrService.js');
    let buffer = req.file?.buffer;
    let mimeType = req.file?.mimetype || req.body.mimeType;
    let base64 = req.body.data || req.body.image || req.body.file;

    if (!buffer && !base64) {
      return errorResponse(res, 'Vui lòng tải lên file ảnh hoặc PDF bảng điểm', 400);
    }

    const result = await parseTranscriptDocument({ buffer, mimeType, base64 });
    return successResponse(res, result, 'Trích xuất dữ liệu bảng điểm thành công');
  } catch (error) {
    next(error);
  }
}

export async function confirmTranscript(req, res, next) {
  try {
    const { mssv, courses, source } = req.body;
    const isUserAdmin = req.user?.role === 'admin';
    const targetMssv = isUserAdmin ? (mssv || req.user?.mssv) : (req.user?.mssv || mssv);

    if (!targetMssv) {
      return errorResponse(res, 'Không xác định được MSSV của sinh viên', 400);
    }

    if (!courses || !Array.isArray(courses) || courses.length === 0) {
      return errorResponse(res, 'Danh sách môn học xác nhận không được để trống', 400);
    }

    const importSource = isUserAdmin ? 'admin_confirmed' : (source || 'student_ocr_import');
    const result = await studentService.confirmTranscriptCourses(targetMssv, courses, importSource);
    return successResponse(res, result, result.message);
  } catch (error) {
    next(error);
  }
}

export default {
  getStudents,
  getStudentByMssv,
  updateStudent,
  createStudent,
  deleteStudent,
  ocrTranscript,
  confirmTranscript
};

