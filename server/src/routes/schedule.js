import express from 'express';
import * as scheduleController from '../controllers/scheduleController.js';
import { authenticate, optionalAuth } from '../middlewares/authMiddleware.js';
import { requireAdmin } from '../middlewares/roleMiddleware.js';
import { validateSchedule } from '../validators/scheduleValidator.js';

const router = express.Router();

// Lấy danh sách học kỳ có trong hệ thống
router.get('/semesters', scheduleController.getSemesters);

// Tra cứu thời khóa biểu (theo sinh viên đăng nhập hoặc theo lớp/học kỳ)
router.get('/', optionalAuth, scheduleController.getSchedule);

// Thêm lịch học mới (Admin)
router.post('/', authenticate, requireAdmin, validateSchedule, scheduleController.createSchedule);

// Cập nhật lịch học (Admin)
router.put('/:id', authenticate, requireAdmin, validateSchedule, scheduleController.updateSchedule);

// Xóa lịch học (Admin)
router.delete('/:id', authenticate, requireAdmin, scheduleController.deleteSchedule);

export default router;
