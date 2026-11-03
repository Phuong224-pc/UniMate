import * as scheduleService from '../services/scheduleService.js';
import * as scheduleRoadmapService from '../services/scheduleRoadmapService.js';
import { successResponse, errorResponse } from '../utils/responseUtils.js';

export async function getSchedule(req, res, next) {
  try {
    const { semester, mssv, dayOfWeek, all, classSection, courseCode, page, limit } = req.query;

    // Nếu admin yêu cầu xem toàn bộ lịch hoặc query danh mục quản lý
    if (all === 'true' && req.user?.role === 'admin') {
      const result = await scheduleService.getAllSchedules({ semester, classSection, courseCode, page, limit });
      return successResponse(res, result);
    }

    // Nếu là sinh viên, ưu tiên lấy theo MSSV của tài khoản đăng nhập (trừ khi admin tra cứu mssv khác)
    let targetMssv = mssv;
    if (req.user && req.user.role === 'student') {
      targetMssv = req.user.mssv;
    }

    const items = await scheduleService.getScheduleForStudent({
      mssv: targetMssv,
      semester,
      dayOfWeek
    });

    return successResponse(res, items);
  } catch (error) {
    next(error);
  }
}

export async function createSchedule(req, res, next) {
  try {
    const item = await scheduleService.createScheduleItem(req.body);
    return successResponse(res, item, 'Thêm lịch học thành công', 201);
  } catch (error) {
    next(error);
  }
}

export async function updateSchedule(req, res, next) {
  try {
    const { id } = req.params;
    const item = await scheduleService.updateScheduleItem(id, req.body);
    return successResponse(res, item, 'Cập nhật lịch học thành công');
  } catch (error) {
    next(error);
  }
}

export async function deleteSchedule(req, res, next) {
  try {
    const { id } = req.params;
    await scheduleService.deleteScheduleItem(id);
    return successResponse(res, null, 'Xóa lịch học thành công');
  } catch (error) {
    next(error);
  }
}

export async function getSemesters(req, res, next) {
  try {
    const list = await scheduleService.getSemestersList();
    return successResponse(res, list);
  } catch (error) {
    next(error);
  }
}

/**
 * Tự động phân tích và tạo lộ trình học tập cá nhân cho các kỳ tiếp theo
 */
export async function generateRoadmapPlan(req, res, next) {
  try {
    let targetMssv = req.user?.mssv;
    if (req.user?.role === 'admin' && req.query.mssv) {
      targetMssv = req.query.mssv;
    }

    if (!targetMssv) {
      return errorResponse(res, 'Vui lòng đăng nhập bằng tài khoản sinh viên để tạo lộ trình cá nhân.', 401);
    }

    const preferences = req.body || {};
    const result = await scheduleRoadmapService.generateStudentRoadmapPlan(targetMssv, preferences);
    return successResponse(res, result, 'Tạo lộ trình cá nhân thành công');
  } catch (error) {
    next(error);
  }
}

/**
 * Lấy lộ trình học tập đã lưu của sinh viên từ MongoDB
 */
export async function getMyStudyPlan(req, res, next) {
  try {
    const targetMssv = req.user?.mssv;
    if (!targetMssv) {
      return errorResponse(res, 'Chưa đăng nhập tài khoản sinh viên.', 401);
    }

    const plan = await scheduleRoadmapService.getStudentStudyPlan(targetMssv);
    return successResponse(res, plan);
  } catch (error) {
    next(error);
  }
}

/**
 * Lưu lộ trình học tập đã xác nhận vào MongoDB
 */
export async function saveMyStudyPlan(req, res, next) {
  try {
    const targetMssv = req.user?.mssv;
    if (!targetMssv) {
      return errorResponse(res, 'Chưa đăng nhập tài khoản sinh viên.', 401);
    }

    const saved = await scheduleRoadmapService.saveStudentStudyPlan(targetMssv, req.body, req.user?._id);
    return successResponse(res, saved, 'Đã lưu lộ trình học tập thành công vào hệ thống!');
  } catch (error) {
    next(error);
  }
}

/**
 * Trợ lý AI Thời khóa biểu tư vấn trực tuyến
 */
export async function chatScheduleAdvisor(req, res, next) {
  try {
    const targetMssv = req.user?.mssv;
    if (!targetMssv) {
      return errorResponse(res, 'Chưa đăng nhập tài khoản sinh viên.', 401);
    }

    const { message, currentPlan, preferences } = req.body || {};
    const reply = await scheduleRoadmapService.handleScheduleAdvisorChat({
      mssv: targetMssv,
      message,
      currentPlan,
      preferences
    });

    return successResponse(res, reply);
  } catch (error) {
    next(error);
  }
}
