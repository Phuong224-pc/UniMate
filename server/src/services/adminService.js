import { 
  promptRepo, 
  userRepo, 
  studentRepo, 
  scheduleRepo, 
  courseRepo, 
  curriculumRepo,
  getDataMode, 
  isDemoMode 
} from '../repositories/index.js';
import { isDbConnected } from '../config/db.js';
import { hashPassword } from '../utils/passwordUtils.js';

export async function getPrompts() {
  return promptRepo.getAll();
}

export async function updatePrompts(promptsObj) {
  const entries = Object.entries(promptsObj);
  const titles = {
    default: '1. AI Trợ Lý Sinh Viên (Trang Chủ)',
    advisor: '2. Cố Vấn Lộ Trình Học Tập (Advisor)',
    roadmap: '3. Lộ Trình Cá Nhân Hóa (Roadmap)',
    results: '4. Phân Tích Kết QuẢ Học Tập (GPA)',
    graduation: '5. Cố Vấn Tốt Nghiệp (Graduation)',
    future: '6. Định Hướng Nghề Nghiệp (Career)'
  };

  for (const [key, content] of entries) {
    if (typeof content === 'string') {
      await promptRepo.upsert(key, {
        title: titles[key] || key,
        content
      });
    }
  }

  const mode = getDataMode();
  return { 
    success: true, 
    message: `Đã cập nhật System Prompts thành công vào kho lưu trữ ${mode === 'mongodb' ? 'MongoDB' : 'Demo Local'}!` 
  };
}

export async function getSystemHealth() {
  const isDemo = isDemoMode();
  const dbConnected = isDemo ? true : isDbConnected();

  let counts = { users: 0, students: 0, schedules: 0, courses: 0, curricula: 0 };
  try {
    const [users, students, schedules, courses, curricula] = await Promise.all([
      userRepo.count(),
      studentRepo.count(),
      scheduleRepo.count(),
      courseRepo.count(),
      curriculumRepo.count()
    ]);
    counts = { users, students, schedules, courses, curricula };
  } catch (err) {
    console.error('Lỗi đếm số lượng bản ghi:', err.message);
  }

  return {
    status: 'ok',
    app: 'VLU Smart Assistant Backend',
    timestamp: new Date().toISOString(),
    dataMode: getDataMode(),
    isDemo,
    database: {
      connected: dbConnected,
      engine: isDemo ? 'Demo Local (File JSON)' : 'MongoDB / Mongoose',
      stats: counts
    },
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY) && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here'
  };
}

export async function getDashboardStats() {
  const [usersCount, studentsCount, coursesCount, schedulesCount, curriculaCount, allUsers] = await Promise.all([
    userRepo.count(),
    studentRepo.count(),
    courseRepo.count(),
    scheduleRepo.count(),
    curriculumRepo.count(),
    userRepo.findAll()
  ]);

  const roleBreakdown = { student: 0, lecturer: 0, admin: 0 };
  const statusBreakdown = { active: 0, locked: 0, inactive: 0 };

  allUsers.forEach(u => {
    const r = u.role || 'student';
    roleBreakdown[r] = (roleBreakdown[r] || 0) + 1;
    const s = u.status || 'active';
    statusBreakdown[s] = (statusBreakdown[s] || 0) + 1;
  });

  const recentUsers = allUsers
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
    .slice(0, 5)
    .map(u => {
      const copy = { ...u };
      delete copy.passwordHash;
      delete copy.password;
      return copy;
    });

  return {
    counts: {
      users: usersCount,
      students: studentsCount,
      courses: coursesCount,
      schedules: schedulesCount,
      curricula: curriculaCount
    },
    roleBreakdown,
    statusBreakdown,
    recentUsers,
    dataMode: getDataMode(),
    isDemo: isDemoMode()
  };
}

// ─── USER MANAGEMENT ───

export async function getUsers({ page = 1, limit = 20, search = '', role = '', status = '' } = {}) {
  const result = await userRepo.findMany({ page, limit, search, role, status });
  const sanitizedUsers = (result.users || []).map(u => {
    const copy = { ...u };
    delete copy.passwordHash;
    delete copy.password;
    return copy;
  });

  return {
    ...result,
    users: sanitizedUsers
  };
}

export async function createUser(data) {
  const { email, password, role = 'student', mssv, fullName, className, major, cohort } = data;

  if (!email || !password) {
    throw new Error('Email và mật khẩu là bắt buộc');
  }

  const cleanEmail = email.trim().toLowerCase();
  const existingUser = await userRepo.findByEmail(cleanEmail);
  if (existingUser) {
    throw new Error(`Email '${cleanEmail}' đã được đăng ký tài khoản`);
  }

  const passHash = await hashPassword(password);
  const newUser = await userRepo.create({
    email: cleanEmail,
    mssv: mssv ? mssv.trim() : null,
    username: cleanEmail.split('@')[0],
    passwordHash: passHash,
    role: role || 'student',
    status: data.status || 'active'
  });

  // Nếu là sinh viên, đồng thời tạo hồ sơ sinh viên
  if (role === 'student' && mssv) {
    const cleanMssv = mssv.trim();
    const existingProfile = await studentRepo.findByMssv(cleanMssv);
    if (!existingProfile) {
      await studentRepo.create({
        userId: newUser._id,
        mssv: cleanMssv,
        fullName: fullName ? fullName.trim() : cleanEmail.split('@')[0],
        email: cleanEmail,
        className: className || 'K30 CNTT',
        major: major || 'Kỹ thuật Phần mềm',
        cohort: cohort || '2024 - 2028',
        trainingCourse: 'K30',
        officialCumulativeGpa4: 0,
        officialCumulativeCredits: 0,
        courses: []
      });
    }
  }

  const copy = { ...newUser, id: newUser._id || newUser.id };
  delete copy.passwordHash;
  delete copy.password;
  return copy;
}

export async function updateUser(id, updateData) {
  const targetId = id || updateData?._id || updateData?.id;
  const user = await userRepo.findById(targetId);
  if (!user) {
    throw new Error(`Không tìm thấy tài khoản có ID: ${targetId}`);
  }

  const payload = {};
  if (updateData.role) payload.role = updateData.role;
  if (updateData.status) payload.status = updateData.status;
  if (updateData.mssv) payload.mssv = updateData.mssv.trim();

  if (updateData.password && updateData.password.trim()) {
    payload.passwordHash = await hashPassword(updateData.password.trim());
  }

  const updated = await userRepo.updateById(id, payload);
  const copy = { ...updated };
  delete copy.passwordHash;
  delete copy.password;
  return copy;
}

export async function deleteUser(id) {
  const user = await userRepo.findById(id);
  if (!user) {
    throw new Error(`Không tìm thấy tài khoản có ID: ${id}`);
  }

  // Khóa tài khoản an toàn (soft delete)
  const updated = await userRepo.updateById(id, { status: 'locked' });
  const copy = { ...updated };
  delete copy.passwordHash;
  return {
    success: true,
    message: `Đã khóa tài khoản ${user.email} thành công`,
    user: copy
  };
}

// ─── COURSE MANAGEMENT ───

export async function getCourses({ query = '', program = '', page = 1, limit = 100 } = {}) {
  const all = await courseRepo.findMany({ query, program });
  return all;
}

export async function createCourse(data) {
  if (!data.code || !data.name) {
    throw new Error('Mã môn học và tên môn học là bắt buộc');
  }
  return courseRepo.create(data);
}

export async function updateCourse(idOrCode, data) {
  try {
    return await courseRepo.updateById(idOrCode, data);
  } catch {
    return await courseRepo.updateByCode(idOrCode, data);
  }
}

export async function deleteCourse(idOrCode) {
  try {
    return await courseRepo.deleteById(idOrCode);
  } catch {
    return await courseRepo.deleteByCode(idOrCode);
  }
}

// ─── CURRICULUM MANAGEMENT ───

export async function getCurriculum(program = 'K30 CNTT') {
  return curriculumRepo.findByProgram(program);
}

export async function updateCurriculum(data) {
  return curriculumRepo.upsert(data);
}

// ─── SCHEDULE MANAGEMENT ───

export async function getSchedules(params = {}) {
  return scheduleRepo.findMany(params);
}

export async function createSchedule(data) {
  return scheduleRepo.create(data);
}

export async function updateSchedule(id, data) {
  return scheduleRepo.updateById(id, data);
}

export async function deleteSchedule(id) {
  return scheduleRepo.deleteById(id);
}

export default {
  getPrompts,
  updatePrompts,
  getSystemHealth,
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
  deleteSchedule
};
