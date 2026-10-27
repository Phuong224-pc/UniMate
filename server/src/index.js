import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import { initDataProvider, getDataMode, isDemoMode } from './repositories/index.js';
import { config } from './config/environment.js';

import authRoutes from './routes/auth.js';
import studentsRoutes from './routes/students.js';
import scheduleRoutes from './routes/schedule.js';
import curriculumRoutes from './routes/curriculum.js';
import profileRoutes from './routes/profile.js';
import adminRoutes from './routes/admin.js';
import chatRoutes from './routes/chat.js';
import { errorHandler } from './middlewares/errorMiddleware.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = config.port;

// Middleware CORS
const corsOptions = {
  origin: [
    config.clientUrl,
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:5174',
    'http://127.0.0.1:5174',
    'http://localhost:3000'
  ],
  credentials: true
};
app.use(cors(corsOptions));

// Body parsers
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/students', studentsRoutes);
app.use('/api/schedule', scheduleRoutes);
app.use('/api/curriculum', curriculumRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/chat', chatRoutes);

// Trạng thái hoạt động và chế độ dữ liệu (tối giản, an toàn, không lộ secret)
app.get('/api/status', (req, res) => {
  res.json({
    status: 'ok',
    app: 'VLU Smart Assistant Backend',
    dataMode: getDataMode(),
    isDemo: isDemoMode(),
    timestamp: new Date().toISOString()
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'VLU Smart Assistant Backend',
    dataMode: getDataMode(),
    isDemo: isDemoMode(),
    timestamp: new Date().toISOString(),
    geminiConfigured: Boolean(config.geminiApiKey) && config.geminiApiKey !== 'your_gemini_api_key_here'
  });
});

// Phục vụ Frontend build tĩnh nếu tồn tại (trong thư mục frontend/dist)
const frontendDist = path.join(__dirname, '../../frontend/dist');
const frontendDistExists = fs.existsSync(path.join(frontendDist, 'index.html'));

if (frontendDistExists) {
  app.use(express.static(frontendDist));
  // Catch-all cho React Router SPA
  app.get('/{*splat}', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
} else {
  app.get('/', (req, res) => {
    res.status(200).json({
      status: 'ok',
      message: 'VLU Assistant Backend is running. Frontend dev server: http://localhost:5173',
      dataMode: getDataMode(),
      isDemo: isDemoMode()
    });
  });
}

// Central Error Handling Middleware
app.use(errorHandler);

// Khởi chạy Data Provider và Server
async function startServer() {
  const provider = await initDataProvider();

  app.listen(PORT, () => {
    console.log(`🚀 [VLU Assistant Backend] Server đang chạy tại http://localhost:${PORT}`);
    console.log(`📊 Chế độ dữ liệu: ${provider.mode.toUpperCase()} ${provider.isDemo ? '(DEMO LOCAL - Không cần cài MongoDB)' : '(MONGODB PRODUCTION)'}`);
    console.log(`🔑 Gemini AI: ${(config.geminiApiKey && config.geminiApiKey !== 'your_gemini_api_key_here') ? 'Đã cấu hình' : 'CHƯA CẤU HÌNH'}`);
  });
}

startServer();
