import * as adminService from '../services/adminService.js';
import { adminImportService } from '../services/adminImportService.js';
import { successResponse, errorResponse } from '../utils/responseUtils.js';

export async function getDashboardStats(req, res, next) {
  try {
    const stats = await adminService.getDashboardStats();
    return successResponse(res, stats);
  } catch (error) {
    next(error);
  }
}

export async function getUsers(req, res, next) {
  try {
    const { page, limit, search, role, status } = req.query;
    const result = await adminService.getUsers({ page, limit, search, role, status });
    return successResponse(res, result);
  } catch (error) {
    next(error);
  }
}

export async function createUser(req, res, next) {
  try {
    const user = await adminService.createUser(req.body);
    return successResponse(res, user, 'Tạo tài khoản người dùng thành công', 201);
  } catch (error) {
    next(error);
  }
}

export async function updateUser(req, res, next) {
  try {
    const { id } = req.params;
    const user = await adminService.updateUser(id, req.body);
    return successResponse(res, user, 'Cập nhật tài khoản thành công');
  } catch (error) {
    next(error);
  }
}

export async function deleteUser(req, res, next) {
  try {
    const { id } = req.params;
    const result = await adminService.deleteUser(id);
    return successResponse(res, result, result.message);
  } catch (error) {
    next(error);
  }
}

export async function getCourses(req, res, next) {
  try {
    const { query, program, page, limit } = req.query;
    const courses = await adminService.getCourses({ query, program, page, limit });
    return successResponse(res, courses);
  } catch (error) {
    next(error);
  }
}

export async function createCourse(req, res, next) {
  try {
    const course = await adminService.createCourse(req.body);
    return successResponse(res, course, 'Thêm môn học thành công', 201);
  } catch (error) {
    next(error);
  }
}

export async function updateCourse(req, res, next) {
  try {
    const { id } = req.params;
    const course = await adminService.updateCourse(id, req.body);
    return successResponse(res, course, 'Cập nhật môn học thành công');
  } catch (error) {
    next(error);
  }
}

export async function deleteCourse(req, res, next) {
  try {
    const { id } = req.params;
    const result = await adminService.deleteCourse(id);
    return successResponse(res, result, 'Xóa môn học thành công');
  } catch (error) {
    next(error);
  }
}

export async function getCurriculum(req, res, next) {
  try {
    const { program } = req.query;
    const curriculum = await adminService.getCurriculum(program);
    return successResponse(res, curriculum);
  } catch (error) {
    next(error);
  }
}

export async function updateCurriculum(req, res, next) {
  try {
    const result = await adminService.updateCurriculum(req.body);
    return successResponse(res, result, 'Cập nhật khung chương trình đào tạo thành công');
  } catch (error) {
    next(error);
  }
}

export async function getSchedules(req, res, next) {
  try {
    const schedules = await adminService.getSchedules(req.query);
    return successResponse(res, schedules);
  } catch (error) {
    next(error);
  }
}

export async function createSchedule(req, res, next) {
  try {
    const schedule = await adminService.createSchedule(req.body);
    return successResponse(res, schedule, 'Thêm lịch học thành công', 201);
  } catch (error) {
    next(error);
  }
}

export async function updateSchedule(req, res, next) {
  try {
    const { id } = req.params;
    const schedule = await adminService.updateSchedule(id, req.body);
    return successResponse(res, schedule, 'Cập nhật lịch học thành công');
  } catch (error) {
    next(error);
  }
}

export async function deleteSchedule(req, res, next) {
  try {
    const { id } = req.params;
    const result = await adminService.deleteSchedule(id);
    return successResponse(res, result, 'Xóa lịch học thành công');
  } catch (error) {
    next(error);
  }
}

export async function getPrompts(req, res, next) {
  try {
    const data = await adminService.getPrompts();
    return successResponse(res, data);
  } catch (error) {
    next(error);
  }
}

export async function updatePrompts(req, res, next) {
  try {
    const result = await adminService.updatePrompts(req.body);
    return successResponse(res, result, 'Cập nhật System Prompts thành công');
  } catch (error) {
    next(error);
  }
}

export async function getHealth(req, res, next) {
  try {
    const health = await adminService.getSystemHealth();
    return res.json(health);
  } catch (error) {
    next(error);
  }
}

// ─── ADMIN BULK IMPORT (EXCEL & PDF) ───
export async function getImportTemplate(req, res, next) {
  try {
    const { dataType } = req.params;
    const { buffer, filename } = adminImportService.getTemplate(dataType);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    return res.send(buffer);
  } catch (error) {
    next(error);
  }
}

export async function previewImport(req, res, next) {
  try {
    if (!req.file) {
      return errorResponse(res, 'Vui lòng tải lên file Excel (.xlsx, .xls) hoặc PDF', 400);
    }
    const { dataType, sheetName, customMapping } = req.body;
    let parsedMapping = null;
    if (customMapping) {
      try {
        parsedMapping = typeof customMapping === 'string' ? JSON.parse(customMapping) : customMapping;
      } catch {}
    }

    const preview = await adminImportService.previewImport({
      buffer: req.file.buffer,
      filename: req.file.originalname,
      mimetype: req.file.mimetype,
      dataType: dataType || 'courses',
      sheetName,
      customMapping: parsedMapping
    });

    return successResponse(res, preview);
  } catch (error) {
    next(error);
  }
}

export async function confirmImport(req, res, next) {
  try {
    const { dataType, rows, conflictMode, defaultProgram } = req.body;
    if (!dataType || !Array.isArray(rows)) {
      return errorResponse(res, 'Dữ liệu xác nhận không hợp lệ', 400);
    }

    const result = await adminImportService.confirmImport({
      dataType,
      rows,
      conflictMode: conflictMode || 'skip',
      defaultProgram: defaultProgram || 'K30 CNTT'
    });

    return successResponse(res, result, result.message);
  } catch (error) {
    next(error);
  }
}

export default {
  getDashboardStats,
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  getCourses,
  createCourse,
  updateCourse,
  deleteCourse,
  getCurriculum,
  updateCurriculum,
  getSchedules,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  getPrompts,
  updatePrompts,
  getHealth,
  getImportTemplate,
  previewImport,
  confirmImport
};
