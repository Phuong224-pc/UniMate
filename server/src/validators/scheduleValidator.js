import { errorResponse } from '../utils/responseUtils.js';

export function validateSchedule(req, res, next) {
  const { semester, courseCode, courseName, classSection, dayOfWeek } = req.body;

  if (!semester || typeof semester !== 'string') {
    return errorResponse(res, 'Học kỳ là bắt buộc (ví dụ: 2024-2025 HK01)', 400);
  }

  if (!courseCode || typeof courseCode !== 'string') {
    return errorResponse(res, 'Mã học phần là bắt buộc', 400);
  }

  if (!courseName || typeof courseName !== 'string') {
    return errorResponse(res, 'Tên học phần là bắt buộc', 400);
  }

  if (!classSection || typeof classSection !== 'string') {
    return errorResponse(res, 'Lớp học phần là bắt buộc (ví dụ: K30-CNTT-01)', 400);
  }

  if (dayOfWeek === undefined || dayOfWeek === null || isNaN(Number(dayOfWeek))) {
    return errorResponse(res, 'Thứ học là bắt buộc (từ 2 đến 8)', 400);
  }

  const d = Number(dayOfWeek);
  if (d < 2 || d > 8) {
    return errorResponse(res, 'Thứ học phải từ 2 (Thứ Hai) đến 8 (Chủ Nhật)', 400);
  }

  // Tự động map dayOfWeekText
  const dayNames = {
    2: 'Thứ Hai',
    3: 'Thứ Ba',
    4: 'Thứ Tư',
    5: 'Thứ Năm',
    6: 'Thứ Sáu',
    7: 'Thứ Bảy',
    8: 'Chủ Nhật'
  };
  req.body.dayOfWeek = d;
  if (!req.body.dayOfWeekText) {
    req.body.dayOfWeekText = dayNames[d];
  }

  next();
}
