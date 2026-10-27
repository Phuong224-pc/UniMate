import { User } from '../../models/User.js';

function formatUser(doc) {
  if (!doc) return null;
  const obj = typeof doc.toObject === 'function' ? doc.toObject() : { ...doc };
  obj._id = obj._id.toString();
  return obj;
}

export const userMongoRepo = {
  async findById(id) {
    if (!id) return null;
    try {
      const user = await User.findById(id).lean();
      return formatUser(user);
    } catch {
      return null;
    }
  },

  async findByEmail(email) {
    if (!email) return null;
    const clean = email.trim().toLowerCase();
    const user = await User.findOne({ email: clean }).lean();
    return formatUser(user);
  },

  async findByMssv(mssv) {
    if (!mssv) return null;
    const clean = mssv.trim();
    const user = await User.findOne({ mssv: clean }).lean();
    return formatUser(user);
  },

  async findOne(query) {
    const user = await User.findOne(query).lean();
    return formatUser(user);
  },

  async create(userData) {
    const user = await User.create(userData);
    return formatUser(user);
  },

  async updateById(id, data) {
    const user = await User.findByIdAndUpdate(id, data, { new: true, runValidators: true }).lean();
    return formatUser(user);
  },

  async deleteById(id) {
    const user = await User.findByIdAndDelete(id).lean();
    return formatUser(user);
  },

  async findMany({ page = 1, limit = 20, search = '', role = '', status = '' } = {}) {
    const query = {};
    if (role && role !== 'all') query.role = role;
    if (status && status !== 'all') query.status = status;
    if (search && search.trim()) {
      const s = search.trim();
      query.$or = [
        { email: { $regex: s, $options: 'i' } },
        { mssv: { $regex: s, $options: 'i' } },
        { username: { $regex: s, $options: 'i' } }
      ];
    }
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const [total, users] = await Promise.all([
      User.countDocuments(query),
      User.find(query).sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean()
    ]);

    return {
      users: users.map(formatUser),
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum) || 1
    };
  },

  async findAll(filter = {}) {
    const list = await User.find(filter).lean();
    return list.map(formatUser);
  },

  async count(filter = {}) {
    return User.countDocuments(filter);
  }
};

export default userMongoRepo;
