import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import dns from 'dns';

// Fix Node.js SRV record lookup issue on Windows with Atlas mongodb+srv
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch {
  // Ignore fallback if network interface does not permit
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

export const config = {
  port: parseInt(process.env.PORT || '5001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  dataMode: (process.env.DATA_MODE || 'auto').toLowerCase().trim(),
  demoDataPath: process.env.DEMO_DATA_PATH || '',
  mongodbUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/vlu_bot',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  jwtSecret: process.env.JWT_SECRET || 'vlu_jwt_secret_production_ready_2025',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  geminiApiKey: process.env.GEMINI_API_KEY || ''
};

export default config;

