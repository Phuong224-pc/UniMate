import { errorResponse } from '../utils/responseUtils.js';

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return errorResponse(res, 'Chưa đăng nhập', 401);
    }
    if (!roles.includes(req.user.role)) {
      return errorResponse(res, 'Bạn không có quyền thực hiện thao tác này', 403);
    }
    next();
  };
}

export const requireAdmin = requireRole('admin');

export function requireSelfOrAdmin(paramKey = 'mssv') {
  return (req, res, next) => {
    if (!req.user) {
      return errorResponse(res, 'Chưa đăng nhập', 401);
    }
    if (req.user.role === 'admin') {
      return next();
    }
    const targetParam = req.params[paramKey];
    if (targetParam && req.user.mssv && targetParam.trim() === req.user.mssv.trim()) {
      return next();
    }
    if (targetParam && req.user._id && targetParam.toString() === req.user._id.toString()) {
      return next();
    }
    return errorResponse(res, 'Bạn chỉ có quyền truy cập hoặc chỉnh sửa dữ liệu của chính mình', 403);
  };
}
