import { verifyToken } from '../utils/tokenUtils.js';
import { userRepo } from '../repositories/index.js';
import { errorResponse } from '../utils/responseUtils.js';

export async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return errorResponse(res, 'Yêu cầu đăng nhập để truy cập tài nguyên này', 401);
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return errorResponse(res, 'Token không hợp lệ', 401);
    }

    let decoded;
    try {
      decoded = verifyToken(token);
    } catch {
      return errorResponse(res, 'Phiên đăng nhập đã hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại.', 401);
    }

    // Kiểm tra trạng thái tài khoản thông qua userRepo
    const user = await userRepo.findById(decoded.userId);
    if (!user) {
      return errorResponse(res, 'Tài khoản không tồn tại trên hệ thống', 401);
    }

    if (user.status !== 'active') {
      return errorResponse(res, 'Tài khoản đã bị tạm khóa hoặc vô hiệu hóa. Vui lòng liên hệ quản trị viên.', 403);
    }

    req.user = {
      _id: user._id,
      email: user.email,
      mssv: user.mssv,
      role: user.role,
      status: user.status
    };

    next();
  } catch (error) {
    return errorResponse(res, error.message || 'Lỗi xác thực người dùng', 500);
  }
}

export async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      if (token) {
        const decoded = verifyToken(token);
        const user = await userRepo.findById(decoded.userId);
        if (user && user.status === 'active') {
          req.user = {
            _id: user._id,
            email: user.email,
            mssv: user.mssv,
            role: user.role,
            status: user.status
          };
        }
      }
    }
  } catch {
    // Bỏ qua nếu token không hợp lệ ở middleware tùy chọn
  }
  next();
}

export default {
  authenticate,
  optionalAuth
};
