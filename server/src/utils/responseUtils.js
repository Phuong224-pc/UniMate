export function successResponse(res, data = null, message = null, statusCode = 200) {
  const payload = { success: true };
  if (message) payload.message = message;
  if (data !== null) payload.data = data;
  return res.status(statusCode).json(payload);
}

export function errorResponse(res, error = 'Đã có lỗi xảy ra', statusCode = 500, details = null) {
  const payload = {
    success: false,
    error: typeof error === 'string' ? error : error?.message || 'Lỗi hệ thống'
  };
  if (details) payload.details = details;
  return res.status(statusCode).json(payload);
}
