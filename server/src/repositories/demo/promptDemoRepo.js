import { demoStorage } from './demoStorage.js';

export const promptDemoRepo = {
  async getAll() {
    const list = demoStorage.find('prompts');
    const result = {};
    list.forEach(p => {
      result[p.key] = p.content;
    });
    return result;
  },

  async findByKey(key) {
    return demoStorage.findOne('prompts', p => p.key === key);
  },

  async upsert(key, { title, content }) {
    const existing = demoStorage.findOne('prompts', p => p.key === key);
    if (existing) {
      return demoStorage.updateOne('prompts', p => p.key === key, { title: title || existing.title, content });
    }
    return demoStorage.insertOne('prompts', { key, title: title || key, content });
  },

  async count() {
    return demoStorage.count('prompts');
  }
};

export default promptDemoRepo;
