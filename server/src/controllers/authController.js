import * as authService from '../services/authService.js';
import { successResponse, errorResponse } from '../utils/responseUtils.js';

export async function register(req, res, next) {
  try {
    const result = await authService.registerStudent(req.body);
    return successResponse(res, result, 'Đăng ký tài khoản thành công', 201);
  } catch (error) {
    next(error);
  }
}

export async function login(req, res, next) {
  try {
    const result = await authService.loginUser(req.body);
    return successResponse(res, result, 'Đăng nhập thành công');
  } catch (error) {
    next(error);
  }
}

export async function getMe(req, res, next) {
  try {
    if (!req.user) {
      return errorResponse(res, 'Chưa đăng nhập', 401);
    }
    const result = await authService.getCurrentUser(req.user._id);
    return successResponse(res, result);
  } catch (error) {
    next(error);
  }
}

export function logout(req, res) {
  return successResponse(res, null, 'Đăng xuất thành công');
}

export async function changePassword(req, res, next) {
  try {
    const { oldPassword, newPassword } = req.body;
    const result = await authService.changeUserPassword(req.user._id, oldPassword, newPassword);
    return successResponse(res, result, result.message);
  } catch (error) {
    next(error);
  }
}

export default {
  register,
  login,
  getMe,
  logout,
  changePassword
};

