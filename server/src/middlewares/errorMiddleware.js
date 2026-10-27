import { errorResponse } from '../utils/responseUtils.js';

export function errorHandler(err, req, res, next) {
  console.error(`💥 [Error] ${req.method} ${req.url}:`, err.message || err);

  // Mongoose duplicate key error (code 11000)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'dữ liệu';
    const value = err.keyValue ? err.keyValue[field] : '';
    return errorResponse(res, `${field === 'email' ? 'Email' : field === 'mssv' ? 'Mã sinh viên' : field} '${value}' đã tồn tại trong hệ thống.`, 409);
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(e => e.message);
    return errorResponse(res, messages.join(', '), 400);
  }

  // CastError (invalid ObjectId)
  if (err.name === 'CastError') {
    return errorResponse(res, `Định dạng ID '${err.value}' không hợp lệ`, 400);
  }

  const statusCode = err.statusCode || 500;
  return errorResponse(res, err.message || 'Lỗi máy chủ nội bộ', statusCode);
}
