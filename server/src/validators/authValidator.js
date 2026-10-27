import { errorResponse } from '../utils/responseUtils.js';

export function validateRegister(req, res, next) {
  const { fullName, email, password } = req.body;

  if (!fullName || typeof fullName !== 'string' || !fullName.trim()) {
    return errorResponse(res, 'Họ và tên là bắt buộc', 400);
  }

  if (!email || typeof email !== 'string' || !email.trim()) {
    return errorResponse(res, 'Email là bắt buộc', 400);
  }

  const cleanEmail = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(cleanEmail)) {
    return errorResponse(res, 'Định dạng email không hợp lệ (Ví dụ: ten.mssv@vanlanguni.vn)', 400);
  }

  if (!password || typeof password !== 'string' || password.length < 6) {
    return errorResponse(res, 'Mật khẩu phải có tối thiểu 6 ký tự', 400);
  }

  // BẢO MẬT: Bắt buộc role là student khi đăng ký công khai, không cho phép nâng quyền thành admin
  delete req.body.role;
  delete req.body.status;

  req.body.fullName = fullName.trim();
  req.body.email = cleanEmail;

  next();
}

export function validateLogin(req, res, next) {
  const { identifier, email, password } = req.body;
  const loginAccount = (identifier || email || '').trim();

  if (!loginAccount) {
    return errorResponse(res, 'Vui lòng nhập Email hoặc Mã số sinh viên', 400);
  }

  if (!password || typeof password !== 'string') {
    return errorResponse(res, 'Vui lòng nhập mật khẩu', 400);
  }

  req.body.identifier = loginAccount;
  next();
}
