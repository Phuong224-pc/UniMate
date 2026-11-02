import express from 'express';
import * as profileController from '../controllers/profileController.js';
import { authenticate } from '../middlewares/authMiddleware.js';
import { validateStudentProfileUpdate } from '../validators/studentValidator.js';

const router = express.Router();

// Lấy hồ sơ của sinh viên đang đăng nhập từ MongoDB
router.get('/me', authenticate, profileController.getMyProfile);
router.get('/me/academic-progress', authenticate, profileController.getMyAcademicProgress);
router.put('/me/specialization', authenticate, profileController.selectMySpecialization);

// Cập nhật hồ sơ sinh viên vào MongoDB
router.put('/me', authenticate, validateStudentProfileUpdate, profileController.updateMyProfile);

// OCR hình ảnh CCCD, thẻ sinh viên, bảng điểm (Gemini Vision)
router.post('/extract-from-image', authenticate, profileController.extractProfileFromImage);

export default router;
