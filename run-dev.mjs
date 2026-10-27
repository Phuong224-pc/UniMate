import { spawn } from 'child_process';

const modeArg = process.argv[2] || process.env.DATA_MODE || 'auto';
const mode = modeArg.toLowerCase().trim();

console.log("\n==========================================================");
console.log("🚀 KHỞI ĐỘNG VLU SMART ASSISTANT FULLSTACK (REACT + NODE.JS)");
if (mode === 'demo') {
  console.log("📦 CHẾ ĐỘ: DEMO LOCAL (Chạy mượt mà không cần MongoDB)");
} else if (mode === 'mongodb') {
  console.log("🔌 CHẾ ĐỘ: MONGODB (Bắt buộc kết nối database MongoDB)");
} else {
  console.log("⚡ CHẾ ĐỘ: AUTO (Tự động nhận diện MongoDB / Demo Local)");
}
console.log("==========================================================\n");

const isWin = process.platform === 'win32';
const npmCmd = isWin ? 'npm.cmd' : 'npm';

// Khởi chạy Server Node.js (Port 5001)
const server = spawn(npmCmd, ['run', 'dev'], {
  cwd: './server',
  stdio: 'inherit',
  shell: true,
  env: {
    ...process.env,
    DATA_MODE: mode
  }
});

// Khởi chạy Client React Vite (Port 5173/5174)
const frontend = spawn(npmCmd, ['run', 'dev'], {
  cwd: './client',
  stdio: 'inherit',
  shell: true
});

const cleanup = () => {
  console.log("\nĐang tắt các tiến trình VLU Assistant...");
  try { server.kill(); } catch {}
  try { frontend.kill(); } catch {}
  process.exit(0);
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
