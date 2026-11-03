import { connectDB } from '../config/db.js';
import { userMongoRepo } from './mongo/userMongoRepo.js';
import { studentMongoRepo } from './mongo/studentMongoRepo.js';
import { scheduleMongoRepo } from './mongo/scheduleMongoRepo.js';
import { curriculumMongoRepo } from './mongo/curriculumMongoRepo.js';
import { courseMongoRepo } from './mongo/courseMongoRepo.js';
import { promptMongoRepo } from './mongo/promptMongoRepo.js';

let isInitialized = false;

function unavailableMongo(customMsg) {
  const error = new Error(customMsg || 'Không kết nối được MongoDB. Vui lòng kiểm tra MONGODB_URI và quyền IP trong MongoDB Atlas.');
  error.code = 'MONGODB_UNAVAILABLE';
  return error;
}

// Export trực tiếp các Mongo Repositories chuẩn - Không dùng demo data
export const userRepo = userMongoRepo;
export const studentRepo = studentMongoRepo;
export const scheduleRepo = scheduleMongoRepo;
export const curriculumRepo = curriculumMongoRepo;
export const courseRepo = courseMongoRepo;
export const promptRepo = promptMongoRepo;

export async function initDataProvider({ connectDatabase = connectDB } = {}) {
  if (isInitialized) {
    return { mode: 'mongodb', isDemo: false };
  }

  console.log(`\n⚙️ [Data Provider] Khởi động hệ thống lưu trữ: MONGODB (Môi trường: ${process.env.NODE_ENV || 'development'})`);
  console.log('🔌 [Data Provider] Đang kết nối trực tiếp tới cơ sở dữ liệu MongoDB Atlas...');

  const connected = await connectDatabase();
  if (!connected) {
    console.error('\n❌ [Data Provider] LỖI: Không thể kết nối tới cơ sở dữ liệu MongoDB!');
    console.error('👉 Kiểm tra MONGODB_URI trong biến môi trường và quyền truy cập mạng (IP Access List) trên MongoDB Atlas.\n');
    throw unavailableMongo('Không thể kết nối tới cơ sở dữ liệu MongoDB. Vui lòng kiểm tra biến môi trường MONGODB_URI và Network Access trong MongoDB Atlas.');
  }

  console.log('🟢 [Data Provider] Kết nối MONGODB thành công! Hệ thống sẵn sàng phục vụ dữ liệu thật.\n');
  isInitialized = true;
  return { mode: 'mongodb', isDemo: false };
}

export function getDataMode() {
  return 'mongodb';
}

export function isDemoMode() {
  return false;
}

export function resetDemoStore() {
  return { success: false, message: 'Hệ thống đang hoạt động ở chế độ MongoDB thật, không dùng Demo.' };
}

export default {
  initDataProvider,
  getDataMode,
  isDemoMode,
  resetDemoStore,
  userRepo,
  studentRepo,
  scheduleRepo,
  curriculumRepo,
  courseRepo,
  promptRepo
};
