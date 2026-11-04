import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDataProvider, promptRepo } from '../repositories/index.js';
import { SystemPrompt } from '../models/SystemPrompt.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function syncPrompts() {
  console.log('🔄 Đang khởi động syncPromptsWithBackup...');
  await initDataProvider();

  // 1. Sao lưu dữ liệu hiện tại từ MongoDB
  const currentDocs = await SystemPrompt.find({}).lean();
  const backupDir = path.resolve(__dirname, '../data/backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(backupDir, `systemprompts_backup_${timestamp}.json`);
  fs.writeFileSync(backupPath, JSON.stringify(currentDocs, null, 2), 'utf-8');
  console.log(`✅ Đã sao lưu ${currentDocs.length} prompt từ MongoDB vào: ${backupPath}`);

  // 2. Đọc prompts mới từ prompts.json
  const promptsJsonPath = path.resolve(__dirname, '../data/prompts.json');
  const newPrompts = JSON.parse(fs.readFileSync(promptsJsonPath, 'utf-8'));

  const titles = {
    default: 'UniMate Toàn Diện (Trang Chủ - Demo VLU)',
    advisor: 'Cố Vấn Lộ Trình Học Tập AI (Advisor)',
    roadmap: 'Cố Vấn Lộ Trình K30 (Roadmap)',
    results: 'Kết Quả & Phân Tích GPA (Results)',
    graduation: 'Dự Báo & Xét Tốt Nghiệp (Graduation)',
    future: 'Định Hướng Nghề Nghiệp (Career)'
  };

  // 3. Cập nhật idempotent vào MongoDB
  for (const [key, content] of Object.entries(newPrompts)) {
    const title = titles[key] || key;
    await SystemPrompt.findOneAndUpdate(
      { key },
      { key, title, content, updatedAt: new Date() },
      { upsert: true, new: true }
    );
    console.log(`  ✓ Đã cập nhật prompt [${key}]: "${title}"`);
  }

  console.log('🎉 Hoàn tất đồng bộ System Prompts vào MongoDB Atlas an toàn và không gây trùng lặp!');
  process.exit(0);
}

syncPrompts().catch(err => {
  console.error('❌ Lỗi đồng bộ prompts:', err);
  process.exit(1);
});
