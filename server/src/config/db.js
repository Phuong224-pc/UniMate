import mongoose from 'mongoose';
import { config } from './environment.js';

let isConnected = false;
let listenersAttached = false;

export async function connectDB(options = {}) {
  const { timeoutMs = 15000, silentError = false } = options;
  const uri = config.mongodbUri;

  if (!uri) {
    if (!silentError) {
      console.warn('⚠️ [MongoDB] MONGODB_URI chưa được định nghĩa trong biến môi trường (.env).');
    }
    return false;
  }

  // Setup connection event listeners once
  if (!listenersAttached) {
    mongoose.connection.on('connected', () => {
      isConnected = true;
      console.log('✅ [MongoDB] Đã kết nối thành công tới database MongoDB.');
    });

    mongoose.connection.on('error', (err) => {
      isConnected = false;
      console.error('❌ [MongoDB] Lỗi kết nối MongoDB:', err.message);
    });

    mongoose.connection.on('disconnected', () => {
      isConnected = false;
      console.warn('⚠️ [MongoDB] Đã ngắt kết nối với MongoDB. Đang sẵn sàng thử kết nối lại...');
    });

    listenersAttached = true;
  }

  try {
    if (!silentError) {
      console.log(`🔌 [MongoDB] Đang kết nối tới: ${uri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')}`);
    }
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: timeoutMs,
      connectTimeoutMS: timeoutMs
    });
    isConnected = true;
    return true;
  } catch (error) {
    isConnected = false;
    if (!silentError) {
      console.error('❌ [MongoDB] Không thể kết nối tới MongoDB:', error.message);
      console.error('💡 Vui lòng đảm bảo MongoDB đang chạy hoặc cập nhật MONGODB_URI trong server/.env.');
    }
    return false;
  }
}

export function isDbConnected() {
  return isConnected && mongoose.connection.readyState === 1;
}

export default connectDB;
