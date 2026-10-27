import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DEFAULT_STORE_DIR = path.resolve(__dirname, '../../../data/demo');
const DEFAULT_STORE_FILE = path.join(DEFAULT_STORE_DIR, 'demo_store.json');
const SEED_FILE = path.resolve(__dirname, '../../data/demo_seed.json');

class DemoStorageEngine {
  constructor() {
    this.storePath = process.env.DEMO_DATA_PATH || DEFAULT_STORE_FILE;
    this.data = null;
    this.writeQueue = Promise.resolve();
    this.initialized = false;
  }

  ensureInitialized() {
    if (this.initialized && this.data) return;

    const dir = path.dirname(this.storePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    if (!fs.existsSync(this.storePath)) {
      console.log(`📦 [Demo Storage] Khởi tạo kho dữ liệu Demo mới tại: ${this.storePath}`);
      if (!fs.existsSync(SEED_FILE)) {
        throw new Error(`Không tìm thấy file demo seed tại: ${SEED_FILE}`);
      }
      const seedContent = fs.readFileSync(SEED_FILE, 'utf8').replace(/^\uFEFF/, '');
      fs.writeFileSync(this.storePath, seedContent, 'utf8');
      this.data = JSON.parse(seedContent);
    } else {
      try {
        const content = fs.readFileSync(this.storePath, 'utf8').replace(/^\uFEFF/, '');
        this.data = JSON.parse(content);
      } catch (err) {
        console.error(`❌ [Demo Storage] Lỗi đọc file demo store (${err.message}). Khởi tạo lại từ seed.`);
        const seedContent = fs.readFileSync(SEED_FILE, 'utf8').replace(/^\uFEFF/, '');
        fs.writeFileSync(this.storePath, seedContent, 'utf8');
        this.data = JSON.parse(seedContent);
      }
    }

    this.initialized = true;
  }

  async persistAsync() {
    this.writeQueue = this.writeQueue.then(async () => {
      try {
        const dir = path.dirname(this.storePath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        const jsonStr = JSON.stringify(this.data, null, 2);
        fs.writeFileSync(this.storePath, jsonStr, 'utf8');
      } catch (err) {
        console.error('❌ [Demo Storage] Lỗi ghi file demo store an toàn:', err.message);
        throw err;
      }
    });

    return this.writeQueue;
  }

  persistSync() {
    try {
      const dir = path.dirname(this.storePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const jsonStr = JSON.stringify(this.data, null, 2);
      fs.writeFileSync(this.storePath, jsonStr, 'utf8');
    } catch (err) {
      console.error('❌ [Demo Storage] Lỗi ghi đồng bộ file demo store:', err.message);
      throw err;
    }
  }

  resetStore() {
    console.log(`🔄 [Demo Storage] Đang đặt lại (reset) kho dữ liệu Demo về bộ mẫu ban đầu...`);
    if (!fs.existsSync(SEED_FILE)) {
      throw new Error(`Không tìm thấy file demo seed tại: ${SEED_FILE}`);
    }
    const seedContent = fs.readFileSync(SEED_FILE, 'utf8').replace(/^\uFEFF/, '');
    this.data = JSON.parse(seedContent);
    this.persistSync();
    console.log(`✅ [Demo Storage] Đã khôi phục dữ liệu Demo thành công từ demo_seed.json.`);
    return { success: true, message: 'Đã khôi phục dữ liệu demo về trạng thái mẫu ban đầu' };
  }

  getCollection(name) {
    this.ensureInitialized();
    if (!this.data[name]) {
      this.data[name] = [];
    }
    // Return shallow copy of items
    return this.data[name];
  }

  find(collectionName, filterFn = null) {
    const list = this.getCollection(collectionName);
    if (!filterFn) return list.map(item => ({ ...item }));
    return list.filter(filterFn).map(item => ({ ...item }));
  }

  findOne(collectionName, filterFn) {
    const list = this.getCollection(collectionName);
    const item = list.find(filterFn);
    return item ? { ...item } : null;
  }

  async insertOne(collectionName, doc) {
    this.ensureInitialized();
    const list = this.getCollection(collectionName);
    const now = new Date().toISOString();
    const item = {
      _id: doc._id || `id_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      ...doc,
      createdAt: doc.createdAt || now,
      updatedAt: doc.updatedAt || now
    };
    list.push(item);
    await this.persistAsync();
    return { ...item };
  }

  async updateOne(collectionName, filterFn, updateData) {
    this.ensureInitialized();
    const list = this.getCollection(collectionName);
    const index = list.findIndex(filterFn);
    if (index === -1) return null;

    const current = list[index];
    const updated = {
      ...current,
      ...updateData,
      _id: current._id, // Không cho phép đổi _id
      updatedAt: new Date().toISOString()
    };
    list[index] = updated;
    await this.persistAsync();
    return { ...updated };
  }

  async deleteOne(collectionName, filterFn) {
    this.ensureInitialized();
    const list = this.getCollection(collectionName);
    const index = list.findIndex(filterFn);
    if (index === -1) return false;

    const removed = list.splice(index, 1)[0];
    await this.persistAsync();
    return removed;
  }

  count(collectionName, filterFn = null) {
    this.ensureInitialized();
    const list = this.getCollection(collectionName);
    if (!filterFn) return list.length;
    return list.filter(filterFn).length;
  }
}

export const demoStorage = new DemoStorageEngine();
export default demoStorage;
