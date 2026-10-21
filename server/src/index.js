import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import chatRoutes from './routes/chat.js';
import studentsRoutes from './routes/students.js';
import curriculumRoutes from './routes/curriculum.js';
import adminRoutes from './routes/admin.js';
import profileRoutes from './routes/profile.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// API Routes
app.use('/api/chat', chatRoutes);
app.use('/api/students', studentsRoutes);
app.use('/api/curriculum', curriculumRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/profile', profileRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'VLU Smart Assistant Backend',
    timestamp: new Date().toISOString(),
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY) && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here'
  });
});

// Phục vụ Client build tĩnh nếu tồn tại
const clientDist = path.join(__dirname, '../../client/dist');
const clientDistExists = fs.existsSync(path.join(clientDist, 'index.html'));

if (clientDistExists) {
  app.use(express.static(clientDist));
  // Catch-all: trả về index.html cho React Router (mọi route không phải /api)
  app.get('/{*splat}', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(clientDist, 'index.html'));
  });
} else {
  app.get('/', (req, res) => {
    res.status(200).json({ status: 'ok', message: 'VLU Assistant Backend is running. Frontend not built yet.' });
  });
}

app.listen(PORT, () => {
  console.log(`🚀 [VLU Assistant Backend] Server đang chạy tại http://localhost:${PORT}`);
  console.log(`🔑 Gemini API Key: ${(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here') ? 'Đã cấu hình' : 'CHƯA CẤU HÌNH - Cập nhật GEMINI_API_KEY trong server/.env'}`);
});
