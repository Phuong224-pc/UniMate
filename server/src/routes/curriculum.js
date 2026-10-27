import express from 'express';
import * as curriculumController from '../controllers/curriculumController.js';
import { authenticate } from '../middlewares/authMiddleware.js';
import { requireAdmin } from '../middlewares/roleMiddleware.js';

const router = express.Router();

// Lấy toàn bộ khung chương trình (mặc định K30 CNTT)
router.get('/', curriculumController.getCurriculum);

// Tìm kiếm môn học theo từ khóa
router.get('/search', curriculumController.searchCourses);

// Quản lý môn học (chỉ Admin)
router.post('/course', authenticate, requireAdmin, curriculumController.addCourse);
router.put('/course/:code', authenticate, requireAdmin, curriculumController.updateCourse);
router.delete('/course/:code', authenticate, requireAdmin, curriculumController.deleteCourse);

export default router;
