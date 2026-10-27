import { scheduleRepo, studentRepo } from '../repositories/index.js';

export async function getScheduleForStudent({ mssv, semester, dayOfWeek } = {}) {
  let className = 'K30 CNTT';
  let courses = [];

  if (mssv && mssv.trim()) {
    const student = await studentRepo.findByMssv(mssv.trim());
    if (student) {
      className = student.className || 'K30 CNTT';
      courses = student.courses || [];
    }
  }

  return scheduleRepo.findForStudent({
    mssv,
    semester,
    dayOfWeek,
    className,
    courses
  });
}

export async function getAllSchedules({ semester, classSection, courseCode, page = 1, limit = 50 } = {}) {
  return scheduleRepo.findMany({ semester, classSection, courseCode, page, limit });
}

export async function createScheduleItem(data) {
  return scheduleRepo.create(data);
}

export async function updateScheduleItem(id, data) {
  const item = await scheduleRepo.updateById(id, data);
  if (!item) throw new Error('Không tìm thấy lịch học cần cập nhật');
  return item;
}

export async function deleteScheduleItem(id) {
  const item = await scheduleRepo.deleteById(id);
  if (!item) throw new Error('Không tìm thấy lịch học cần xóa');
  return item;
}

export async function getSemestersList() {
  const semesters = await scheduleRepo.getSemesters();
  if (!semesters || semesters.length === 0) {
    return ['2024-2025 HK01', '2024-2025 HK02', '2025-2026 HK01'];
  }
  return semesters;
}

export default {
  getScheduleForStudent,
  getAllSchedules,
  createScheduleItem,
  updateScheduleItem,
  deleteScheduleItem,
  getSemestersList
};
