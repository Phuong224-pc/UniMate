import express from 'express';
import multer from 'multer';
import * as adminController from '../controllers/adminController.js';
import { authenticate } from '../middlewares/authMiddleware.js';
import { requireAdmin } from '../middlewares/roleMiddleware.js';

const router = express.Router();

// Public / Diagnostic endpoints
router.get('/health', adminController.getHealth);
router.get('/prompts', adminController.getPrompts);

// ─── TẤT CẢ ROUTE DƯỚI ĐÂY BẮT BUỘC ĐĂNG NHẬP VỚI VAI TRÒ ADMIN ───
router.use(authenticate, requireAdmin);

// Dashboard thống kê
router.get('/dashboard', adminController.getDashboardStats);

// Quản lý System Prompts
router.post('/prompts', adminController.updatePrompts);

// Quản lý Người dùng & Phân quyền
router.get('/users', adminController.getUsers);
router.post('/users', adminController.createUser);
router.put('/users/:id', adminController.updateUser);
router.delete('/users/:id', adminController.deleteUser);

// Quản lý Môn học
router.get('/courses', adminController.getCourses);
router.post('/courses', adminController.createCourse);
router.put('/courses/:id', adminController.updateCourse);
router.delete('/courses/:id', adminController.deleteCourse);

// Quản lý Khung Chương trình đào tạo
router.get('/curriculum', adminController.getCurriculum);
router.put('/curriculum', adminController.updateCurriculum);

// Quản lý Thời khóa biểu
router.get('/schedules', adminController.getSchedules);
router.post('/schedules', adminController.createSchedule);
router.put('/schedules/:id', adminController.updateSchedule);
router.delete('/schedules/:id', adminController.deleteSchedule);

// ─── NHẬP DỮ LIỆU HÀNG LOẠT (EXCEL & PDF) ───
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = file.originalname.toLowerCase();
    const mime = (file.mimetype || '').toLowerCase();
    if (
      ext.endsWith('.xlsx') || 
      ext.endsWith('.xls') || 
      ext.endsWith('.pdf') ||
      mime.includes('spreadsheet') ||
      mime.includes('excel') ||
      mime.includes('pdf')
    ) {
      cb(null, true);
    } else {
      cb(new Error('Chỉ hỗ trợ file bảng tính Excel (.xlsx, .xls) hoặc tài liệu PDF'));
    }
  }
});

router.get('/import/template/:dataType', adminController.getImportTemplate);
router.post('/import/preview', upload.single('file'), adminController.previewImport);
router.post('/import/confirm', adminController.confirmImport);

export default router;

