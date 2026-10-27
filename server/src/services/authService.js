import { userRepo, studentRepo } from '../repositories/index.js';
import { hashPassword, comparePassword } from '../utils/passwordUtils.js';
import { generateToken } from '../utils/tokenUtils.js';

export async function registerStudent({ fullName, email, password, mssv }) {
  const cleanEmail = email.trim().toLowerCase();

  // Kiểm tra email trùng
  const existingUser = await userRepo.findByEmail(cleanEmail);
  if (existingUser) {
    throw new Error('Email này đã được sử dụng để đăng ký tài khoản');
  }

  // Tự động trích xuất hoặc sinh mã sinh viên
  let finalMssv = mssv?.trim();
  if (!finalMssv) {
    const match = cleanEmail.match(/\.([0-9]{10,15})@/);
    if (match) {
      finalMssv = match[1];
    } else {
      let candidate;
      let isDuplicate = true;
      let attempts = 0;
      while (isDuplicate && attempts < 10) {
        attempts++;
        candidate = '24' + String(Date.now()).slice(-9);
        const check = await studentRepo.findByMssv(candidate);
        if (!check) isDuplicate = false;
      }
      finalMssv = candidate;
    }
  }

  // Kiểm tra MSSV trùng trong StudentProfile
  const existingProfile = await studentRepo.findByMssv(finalMssv);
  if (existingProfile) {
    throw new Error(`Mã số sinh viên '${finalMssv}' đã tồn tại trong hệ thống`);
  }

  // Hash mật khẩu
  const passwordHash = await hashPassword(password);

  // Tạo User trong repository được chọn (MongoDB hoặc Demo Local)
  const user = await userRepo.create({
    email: cleanEmail,
    mssv: finalMssv,
    passwordHash,
    role: 'student',
    status: 'active'
  });

  // Tạo StudentProfile tương ứng
  const profile = await studentRepo.create({
    userId: user._id,
    mssv: finalMssv,
    fullName: fullName.trim(),
    email: cleanEmail,
    className: 'K30 CNTT',
    faculty: 'Khoa Công Nghệ Thông Tin',
    major: 'Kỹ thuật Phần mềm',
    cohort: '2024 - 2028',
    trainingCourse: 'K30',
    officialCumulativeGpa4: 0,
    officialCumulativeCredits: 0,
    officialRating: 'Chưa xếp loại',
    courses: [],
    activities: [
      { id: 1, type: 'activity', name: 'Sinh viên Khóa K30 Khoa CNTT VLU', role: 'Thành viên', year: '2024', icon: '🎓' }
    ]
  });

  const token = generateToken({
    userId: user._id,
    email: user.email,
    mssv: user.mssv,
    role: user.role
  });

  const safeUser = { ...user };
  delete safeUser.passwordHash;

  return {
    token,
    user: safeUser,
    profile
  };
}

export async function loginUser({ identifier, password }) {
  const cleanId = identifier.trim().toLowerCase();

  // Tìm User bằng email HOẶC mssv
  const user = await userRepo.findOne({
    $or: [
      { email: cleanId },
      { mssv: cleanId }
    ]
  });

  if (!user) {
    throw new Error('Tài khoản hoặc mật khẩu không chính xác');
  }

  if (user.status !== 'active') {
    throw new Error('Tài khoản của bạn đã bị khóa hoặc chưa được kích hoạt');
  }

  // Kiểm tra password với bcrypt
  const isMatch = await comparePassword(password, user.passwordHash);
  if (!isMatch) {
    throw new Error('Tài khoản hoặc mật khẩu không chính xác');
  }

  // Cập nhật lastLogin
  await userRepo.updateById(user._id, { lastLogin: new Date().toISOString() });

  // Tìm StudentProfile tương ứng
  let profile = await studentRepo.findOne({
    $or: [
      { userId: user._id },
      { mssv: user.mssv },
      { email: user.email }
    ]
  });

  // Nếu là admin và chưa có profile, tạo profile mặc định
  if (!profile && user.role === 'admin') {
    profile = {
      fullName: 'Quản Trị Viên Hệ Thống',
      email: user.email,
      role: 'admin',
      mssv: user.mssv || 'ADMIN'
    };
  }

  const token = generateToken({
    userId: user._id,
    email: user.email,
    mssv: user.mssv,
    role: user.role
  });

  const safeUser = { ...user };
  delete safeUser.passwordHash;

  return {
    token,
    user: safeUser,
    profile
  };
}

export async function getCurrentUser(userId) {
  const user = await userRepo.findById(userId);
  if (!user) throw new Error('Không tìm thấy thông tin tài khoản');

  const profile = await studentRepo.findOne({
    $or: [
      { userId: user._id },
      { mssv: user.mssv },
      { email: user.email }
    ]
  });

  const safeUser = { ...user };
  delete safeUser.passwordHash;

  return {
    user: safeUser,
    profile
  };
}

export async function changeUserPassword(userId, oldPassword, newPassword) {
  if (!oldPassword || !newPassword) {
    throw new Error('Vui lòng điền mật khẩu hiện tại và mật khẩu mới');
  }
  if (newPassword.length < 6) {
    throw new Error('Mật khẩu mới phải có tối thiểu 6 ký tự');
  }

  const user = await userRepo.findById(userId);
  if (!user) throw new Error('Không tìm thấy tài khoản');

  const isMatch = await comparePassword(oldPassword, user.passwordHash);
  if (!isMatch) {
    throw new Error('Mật khẩu hiện tại không chính xác');
  }

  const newHash = await hashPassword(newPassword);
  await userRepo.updateById(userId, { passwordHash: newHash });

  return { success: true, message: 'Đổi mật khẩu thành công' };
}

export default {
  registerStudent,
  loginUser,
  getCurrentUser,
  changeUserPassword
};

