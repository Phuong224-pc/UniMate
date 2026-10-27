import { errorResponse } from '../utils/responseUtils.js';

export function validateStudentProfileUpdate(req, res, next) {
  const isUserAdmin = req.user && req.user.role === 'admin';

  // Nếu người dùng không phải là admin, loại bỏ các trường quản trị
  if (!isUserAdmin) {
    delete req.body.role;
    delete req.body.status;
    delete req.body.mssv;
    delete req.body.officialCumulativeGpa4;
    delete req.body.officialCumulativeCredits;
    delete req.body.officialRating;
    delete req.body.userId;
  }

  // Validate phone if provided
  if (req.body.phone && typeof req.body.phone === 'string') {
    const cleanPhone = req.body.phone.replace(/[\s.-]/g, '');
    if (!/^[0-9]{9,11}$/.test(cleanPhone)) {
      return errorResponse(res, 'Số điện thoại không hợp lệ (cần 9-11 chữ số)', 400);
    }
  }

  // Validate email if provided
  if (req.body.email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(req.body.email.trim())) {
      return errorResponse(res, 'Định dạng email không hợp lệ', 400);
    }
  }

  next();
}

export function validateStudentCreate(req, res, next) {
  const { mssv, fullName, email } = req.body;

  if (!mssv || typeof mssv !== 'string' || !mssv.trim()) {
    return errorResponse(res, 'Mã số sinh viên (MSSV) là bắt buộc', 400);
  }

  if (!fullName || typeof fullName !== 'string' || !fullName.trim()) {
    return errorResponse(res, 'Họ tên sinh viên là bắt buộc', 400);
  }

  if (!email || typeof email !== 'string' || !email.trim()) {
    return errorResponse(res, 'Email sinh viên là bắt buộc', 400);
  }

  next();
}
