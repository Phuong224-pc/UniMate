import * as scheduleService from '../services/scheduleService.js';
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
