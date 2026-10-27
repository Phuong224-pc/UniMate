import { SystemPrompt } from '../../models/SystemPrompt.js';

export const promptMongoRepo = {
  async getAll() {
    const list = await SystemPrompt.find({}).lean();
    const result = {};
    list.forEach(p => {
      result[p.key] = p.content;
    });
    return result;
  },

  async findByKey(key) {
    return SystemPrompt.findOne({ key }).lean();
  },

  async upsert(key, { title, content }) {
    const updated = await SystemPrompt.findOneAndUpdate(
      { key },
      { key, title: title || key, content },
      { upsert: true, new: true }
    ).lean();
    return updated;
  },

  async count() {
    return SystemPrompt.countDocuments();
  }
};

export default promptMongoRepo;
