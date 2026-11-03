import { spawn } from 'child_process';

console.log("\n==========================================================");
console.log("🚀 KHỞI ĐỘNG VLU SMART ASSISTANT FULLSTACK (REACT + NODE.JS)");
console.log("🔌 KẾT NỐI: MONGODB DATABASE CHÍNH THỨC (Dữ liệu thật)");
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
    DATA_MODE: 'mongodb'
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
