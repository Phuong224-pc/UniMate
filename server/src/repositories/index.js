import { connectDB } from '../config/db.js';
import { userMongoRepo } from './mongo/userMongoRepo.js';
import { studentMongoRepo } from './mongo/studentMongoRepo.js';
import { scheduleMongoRepo } from './mongo/scheduleMongoRepo.js';
import { curriculumMongoRepo } from './mongo/curriculumMongoRepo.js';
import { courseMongoRepo } from './mongo/courseMongoRepo.js';
import { promptMongoRepo } from './mongo/promptMongoRepo.js';

import { demoStorage } from './demo/demoStorage.js';
import { userDemoRepo } from './demo/userDemoRepo.js';
import { studentDemoRepo } from './demo/studentDemoRepo.js';
import { scheduleDemoRepo } from './demo/scheduleDemoRepo.js';
import { curriculumDemoRepo } from './demo/curriculumDemoRepo.js';
import { courseDemoRepo } from './demo/courseDemoRepo.js';
import { promptDemoRepo } from './demo/promptDemoRepo.js';

let currentMode = null; // 'mongodb' | 'demo'
let isInitialized = false;

function activeRepository(mongoRepository, demoRepository) {
  if (currentMode === 'mongodb') return mongoRepository;
  if (currentMode === 'demo' || !currentMode && process.env.DATA_MODE === 'demo') return demoRepository;
  throw new Error('Data provider chưa khởi tạo. Không sử dụng dữ liệu demo thay cho MongoDB.');
}

function unavailableMongo() {
  const error = new Error('Không kết nối được MongoDB đã cấu hình. Chưa khởi động API và không chuyển sang dữ liệu demo.');
  error.code = 'MONGODB_UNAVAILABLE';
  return error;
}

// Delegating Proxy Repositories so imports remain static and clean
export const userRepo = new Proxy({}, {
  get(target, prop) {
    const repo = activeRepository(userMongoRepo, userDemoRepo);
    const val = repo[prop];
    return typeof val === 'function' ? val.bind(repo) : val;
  }
});

export const studentRepo = new Proxy({}, {
  get(target, prop) {
    const repo = activeRepository(studentMongoRepo, studentDemoRepo);
    const val = repo[prop];
    return typeof val === 'function' ? val.bind(repo) : val;
  }
});

export const scheduleRepo = new Proxy({}, {
  get(target, prop) {
    const repo = activeRepository(scheduleMongoRepo, scheduleDemoRepo);
    const val = repo[prop];
    return typeof val === 'function' ? val.bind(repo) : val;
  }
});

export const curriculumRepo = new Proxy({}, {
  get(target, prop) {
    const repo = activeRepository(curriculumMongoRepo, curriculumDemoRepo);
    const val = repo[prop];
    return typeof val === 'function' ? val.bind(repo) : val;
  }
});

export const courseRepo = new Proxy({}, {
  get(target, prop) {
    const repo = activeRepository(courseMongoRepo, courseDemoRepo);
    const val = repo[prop];
    return typeof val === 'function' ? val.bind(repo) : val;
  }
});

export const promptRepo = new Proxy({}, {
  get(target, prop) {
    const repo = activeRepository(promptMongoRepo, promptDemoRepo);
    const val = repo[prop];
    return typeof val === 'function' ? val.bind(repo) : val;
  }
});

export async function initDataProvider({ connectDatabase = connectDB, storage = demoStorage } = {}) {
  if (isInitialized && currentMode) {
    return { mode: currentMode, isDemo: currentMode === 'demo' };
  }

  const requestedMode = (process.env.DATA_MODE || 'mongodb').toLowerCase().trim();
  const isProduction = process.env.NODE_ENV === 'production';
  if (!['mongodb', 'demo', 'auto'].includes(requestedMode)) throw new Error('DATA_MODE phải là mongodb, demo hoặc auto.');

  console.log(`\n⚙️ [Data Provider] Cấu hình DATA_MODE: "${requestedMode}" (Môi trường: ${process.env.NODE_ENV || 'development'})`);

  if (requestedMode === 'demo') {
    // Chế độ DEMO cục bộ thuần túy
    currentMode = 'demo';
    storage.ensureInitialized();
    console.log('🟢 [Data Provider] Đã kích hoạt CHẾ ĐỘ DEMO LOCAL.');
    console.log(`📁 Kho lưu trữ: ${storage.storePath}`);
    console.log('💡 Lưu ý: Tất cả thao tác đọc/ghi sẽ được lưu an toàn vào kho demo cục bộ này.\n');
    isInitialized = true;
    return { mode: 'demo', isDemo: true };
  }

  if (requestedMode === 'mongodb') {
    // Chế độ MongoDB bắt buộc
    console.log('🔌 [Data Provider] Đang kết nối tới MongoDB Database (DATA_MODE=mongodb)...');
    const connected = await connectDatabase();
    if (!connected) {
      console.error('\n❌ [Data Provider] LỖI: Không thể kết nối tới cơ sở dữ liệu MongoDB!');
      console.error('👉 Kiểm tra MONGODB_URI và quyền kết nối MongoDB.\n');
      throw unavailableMongo();
    }
    currentMode = 'mongodb';
    console.log('🟢 [Data Provider] Đã kích hoạt CHẾ ĐỘ MONGODB THẬT thành công.\n');
    isInitialized = true;
    return { mode: 'mongodb', isDemo: false };
  }

  // Chế độ AUTO
  if (isProduction) {
    console.log('🔒 [Data Provider] Môi trường Production: Đang kết nối tới MongoDB...');
    const connected = await connectDatabase();
    if (!connected) {
      throw unavailableMongo();
    }
    currentMode = 'mongodb';
    isInitialized = true;
    return { mode: 'mongodb', isDemo: false };
  }

  // Dev environment auto-probe
  console.log('🔍 [Data Provider] Chế độ AUTO: Đang kiểm tra kết nối MongoDB (chờ tối đa 3.5 giây)...');
  const connected = await connectDatabase({ timeoutMs: 3500, silentError: true });

  if (connected) {
    currentMode = 'mongodb';
    console.log('🟢 [Data Provider] Kết nối MongoDB thành công! Kích hoạt CHẾ ĐỘ MONGODB.\n');
  } else {
    currentMode = 'demo';
    storage.ensureInitialized();
    console.log('\n⚠️ [Data Provider] Không tìm thấy hoặc chưa bật MongoDB (hoặc lỗi mạng).');
    console.log('🚀 TỰ ĐỘNG CHUYỂN SANG CHẾ ĐỘ DEMO LOCAL để bạn phát triển và kiểm thử mà không cần bật MongoDB.');
    console.log(`📁 Kho dữ liệu demo: ${storage.storePath}`);
    console.log('💡 Dữ liệu mẫu đã sẵn sàng (Admin, Sinh viên K30, Thời khóa biểu, Điểm số, Khung CTĐT).\n');
  }

  isInitialized = true;
  return { mode: currentMode, isDemo: currentMode === 'demo' };
}

export function getDataMode() {
  return currentMode || (process.env.DATA_MODE || 'auto');
}

export function isDemoMode() {
  return currentMode === 'demo';
}

export function resetDemoStore() {
  return demoStorage.resetStore();
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
