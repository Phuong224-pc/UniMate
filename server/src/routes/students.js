import express from 'express';
import multer from 'multer';
import * as studentController from '../controllers/studentController.js';
import { authenticate, optionalAuth } from '../middlewares/authMiddleware.js';
import { requireAdmin, requireSelfOrAdmin } from '../middlewares/roleMiddleware.js';
import { validateStudentProfileUpdate, validateStudentCreate } from '../validators/studentValidator.js';

const router = express.Router();

// Cấu hình multer nhận file bộ nhớ đệm (RAM Buffer), giới hạn 15MB
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (allowed.includes(file.mimetype.toLowerCase())) {
      cb(null, true);
    } else {
      cb(new Error('Chỉ hỗ trợ file ảnh (JPG, PNG, WebP) hoặc file tài liệu PDF'));
    }
  }
});

// Trích xuất OCR bảng điểm từ ảnh/camera/PDF
router.post('/ocr-transcript', authenticate, upload.single('file'), studentController.ocrTranscript);

// Xác nhận lưu dữ liệu bảng điểm đã kiểm tra vào hồ sơ sinh viên
router.post('/confirm-transcript', authenticate, studentController.confirmTranscript);

// Lấy danh sách tóm tắt sinh viên (có tìm kiếm & phân trang)
router.get('/', optionalAuth, studentController.getStudents);

// Tra cứu chi tiết hồ sơ & bảng điểm theo MSSV
router.get('/:mssv', optionalAuth, studentController.getStudentByMssv);

// Thêm sinh viên mới (chỉ Admin)
router.post('/', authenticate, requireAdmin, validateStudentCreate, studentController.createStudent);

// Cập nhật thông tin sinh viên (Sinh viên chỉ cập nhật thông tin của mình, Admin cập nhật tất cả)
router.put('/:mssv', authenticate, requireSelfOrAdmin('mssv'), validateStudentProfileUpdate, studentController.updateStudent);

// Xóa hoặc vô hiệu hóa sinh viên (chỉ Admin, ưu tiên soft-delete nếu có lịch sử học tập)
router.delete('/:mssv', authenticate, requireAdmin, studentController.deleteStudent);

export default router;

