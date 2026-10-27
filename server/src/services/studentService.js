import { studentRepo, userRepo } from '../repositories/index.js';
import { calculateAcademicStats } from '../utils/gradeUtils.js';
import { hashPassword } from '../utils/passwordUtils.js';

export async function getStudents({ page = 1, limit = 20, search = '', className = '', cohort = '', status = 'active' } = {}) {
  return studentRepo.findMany({ page, limit, search, className, cohort, status });
}

export async function getStudentByMssv(mssv) {
  if (!mssv) throw new Error('MSSV không được để trống');
  const clean = mssv.trim();
  const student = await studentRepo.findByMssv(clean);
  return student;
}

export async function updateStudentProfile(mssv, updateData, isUserAdmin = false) {
  const cleanMssv = mssv.trim();
  const profile = await studentRepo.findByMssv(cleanMssv);
  if (!profile) {
    throw new Error(`Không tìm thấy sinh viên có MSSV: ${cleanMssv}`);
  }

  // Danh sách các trường sinh viên được phép tự cập nhật
  const studentAllowedFields = [
    'fullName', 'phone', 'dob', 'gender', 'address', 'idNumber',
    'ethnicity', 'nationality', 'avatarUrl', 'activities', 'certs',
    'docs', 'completedCourses'
  ];

  // Danh sách các trường chỉ admin được cập nhật
  const adminAllowedFields = [
    ...studentAllowedFields,
    'className', 'faculty', 'major', 'cohort', 'trainingCourse',
    'officialCumulativeGpa4', 'officialCumulativeCredits', 'officialRating',
    'courses', 'status'
  ];

  const allowedFields = isUserAdmin ? adminAllowedFields : studentAllowedFields;
  const filteredData = {};

  allowedFields.forEach((field) => {
    if (updateData[field] !== undefined) {
      filteredData[field] = updateData[field];
    }
  });

  // Nếu Admin cập nhật danh sách môn học/bảng điểm, tự động tính lại GPA và tín chỉ theo dữ liệu gốc
  if (isUserAdmin && updateData.courses && Array.isArray(updateData.courses)) {
    const stats = calculateAcademicStats(updateData.courses);
    filteredData.officialCumulativeGpa4 = stats.cumulativeGpa4;
    filteredData.officialCumulativeCredits = stats.cumulativeCredits;
    filteredData.officialRating = stats.rating;
  }

  const updated = await studentRepo.updateByMssv(cleanMssv, filteredData);
  return updated;
}

export async function createStudent(data) {
  const { mssv, fullName, email } = data;
  if (!mssv || !fullName || !email) {
    throw new Error('MSSV, họ và tên và email là bắt buộc');
  }

  const cleanMssv = mssv.trim();
  const cleanEmail = email.trim().toLowerCase();

  const existingMssv = await studentRepo.findByMssv(cleanMssv);
  if (existingMssv) {
    throw new Error(`Sinh viên với MSSV '${cleanMssv}' đã tồn tại`);
  }

  const existingEmail = await studentRepo.findByEmail(cleanEmail);
  if (existingEmail) {
    throw new Error(`Email '${cleanEmail}' đã được sử dụng trong hệ thống`);
  }

  // Nếu có courses, tính toán thống kê GPA & credits ban đầu
  let initialGpa = data.officialCumulativeGpa4 || 0;
  let initialCredits = data.officialCumulativeCredits || 0;
  let initialRating = data.officialRating || 'Chưa xếp loại';

  if (data.courses && Array.isArray(data.courses) && data.courses.length > 0) {
    const stats = calculateAcademicStats(data.courses);
    initialGpa = stats.cumulativeGpa4;
    initialCredits = stats.cumulativeCredits;
    initialRating = stats.rating;
  }

  // Tự động tạo tài khoản User để sinh viên có thể đăng nhập ngay
  let user = await userRepo.findByEmail(cleanEmail);
  if (!user) {
    const defaultPassHash = await hashPassword('Vlu@2025!');
    user = await userRepo.create({
      email: cleanEmail,
      mssv: cleanMssv,
      passwordHash: defaultPassHash,
      role: 'student',
      status: 'active'
    });
  }

  const profile = await studentRepo.create({
    ...data,
    userId: user?._id || null,
    mssv: cleanMssv,
    email: cleanEmail,
    fullName: fullName.trim(),
    officialCumulativeGpa4: initialGpa,
    officialCumulativeCredits: initialCredits,
    officialRating: initialRating,
    className: data.className || 'K30 CNTT',
    faculty: data.faculty || 'Khoa Công Nghệ Thông Tin',
    major: data.major || 'Kỹ thuật Phần mềm',
    cohort: data.cohort || '2024 - 2028',
    trainingCourse: data.trainingCourse || 'K30',
    courses: data.courses || [],
    activities: data.activities || [],
    certs: data.certs || [],
    docs: data.docs || [],
    completedCourses: data.completedCourses || []
  });

  return profile;
}

export async function deleteStudent(mssv, { forceHardDelete = false } = {}) {
  const cleanMssv = mssv.trim();
  const student = await studentRepo.findByMssv(cleanMssv);

  if (!student) {
    throw new Error(`Không tìm thấy sinh viên MSSV: ${cleanMssv}`);
  }

  // Kiểm tra lịch sử học tập
  const hasAcademicHistory = (student.courses && student.courses.length > 0) || (student.officialCumulativeCredits > 0);

  // Nếu có lịch sử học tập và không yêu cầu forceHardDelete -> Thực hiện xóa mềm (soft delete)
  if (hasAcademicHistory && !forceHardDelete) {
    if (student.userId) {
      await userRepo.updateById(student.userId, { status: 'inactive' });
    }
    const updated = await studentRepo.updateByMssv(cleanMssv, { status: 'Đã nghỉ học / Vô hiệu hóa' });

    return {
      success: true,
      action: 'soft_delete',
      data: updated,
      message: `Sinh viên ${student.fullName} (${cleanMssv}) đã có kết quả học tập (${(student.courses || []).length} môn). Hệ thống đã vô hiệu hóa tài khoản an toàn (soft delete) để tránh mất dữ liệu học vụ.`
    };
  }

  // Xóa hoàn toàn nếu sinh viên mới chưa có lịch sử học tập hoặc force
  await studentRepo.deleteByMssv(cleanMssv);
  if (student.userId) {
    await userRepo.deleteById(student.userId);
  }

  return {
    success: true,
    action: 'hard_delete',
    message: `Đã xóa hoàn toàn hồ sơ sinh viên MSSV: ${cleanMssv}`
  };
}

export async function confirmTranscriptCourses(mssv, incomingCourses = [], source = 'student_ocr_import') {
  const cleanMssv = mssv.trim();
  const student = await studentRepo.findByMssv(cleanMssv);
  if (!student) {
    throw new Error(`Không tìm thấy sinh viên có MSSV: ${cleanMssv}`);
  }

  const existingCourses = Array.isArray(student.courses) ? [...student.courses] : [];
  let addedCount = 0;
  let updatedCount = 0;

  incomingCourses.forEach(incoming => {
    if (!incoming.code || !incoming.name) return;

    const code = incoming.code.toUpperCase().trim();
    const semester = incoming.semester ? incoming.semester.trim() : '';

    // Tìm xem môn này đã có trong học kỳ đó chưa
    const existingIndex = existingCourses.findIndex(
      c => c.code.toUpperCase().trim() === code && (c.semester || '').trim() === semester
    );

    const formattedCourse = {
      code,
      name: incoming.name.trim(),
      credits: Number(incoming.credits) || 0,
      score: incoming.score !== null && incoming.score !== undefined ? Number(incoming.score) : null,
      point4: incoming.point4 !== null && incoming.point4 !== undefined ? Number(incoming.point4) : null,
      letter: incoming.letter ? incoming.letter.toUpperCase().trim() : '',
      semester: semester || '2024-2025 HK01',
      area: incoming.area || '',
      status: incoming.status || 'Đạt',
      source
    };

    if (existingIndex >= 0) {
      existingCourses[existingIndex] = {
        ...existingCourses[existingIndex],
        ...formattedCourse
      };
      updatedCount++;
    } else {
      existingCourses.push(formattedCourse);
      addedCount++;
    }
  });

  // Tự động tính toán lại toàn bộ kết quả học tập từ dữ liệu gốc
  const stats = calculateAcademicStats(existingCourses);

  // Cập nhật danh sách mã môn đã hoàn thành (completedCourses)
  const completedCodes = [
    ...new Set(
      existingCourses
        .filter(c => c.status === 'Đạt' || c.status === 'Đạt thấp' || c.status === 'Miễn/ bảo lưu' || (c.score !== null && c.score >= 4.0))
        .map(c => c.code)
    )
  ];

  const updatePayload = {
    courses: existingCourses,
    completedCourses: completedCodes,
    officialCumulativeGpa4: stats.cumulativeGpa4,
    officialCumulativeCredits: stats.cumulativeCredits,
    officialRating: stats.rating,
    source: `Nhập bảng điểm (${source}) - cập nhật lúc ${new Date().toLocaleDateString('vi-VN')}`
  };

  const updatedStudent = await studentRepo.updateByMssv(cleanMssv, updatePayload);

  return {
    student: updatedStudent,
    addedCount,
    updatedCount,
    totalCourses: existingCourses.length,
    stats,
    message: `Đã lưu thành công ${addedCount} môn mới và cập nhật ${updatedCount} môn vào bảng điểm.`
  };
}

export default {
  getStudents,
  getStudentByMssv,
  updateStudentProfile,
  createStudent,
  deleteStudent,
  confirmTranscriptCourses
};
