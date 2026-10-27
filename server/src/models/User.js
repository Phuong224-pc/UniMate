import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, 'Email là bắt buộc'],
      unique: true,
      trim: true,
      lowercase: true,
      index: true
    },
    mssv: {
      type: String,
      trim: true,
      default: null,
      index: true
    },
    passwordHash: {
      type: String,
      required: [true, 'Mật khẩu là bắt buộc']
    },
    role: {
      type: String,
      enum: ['student', 'admin'],
      default: 'student',
      index: true
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'suspended'],
      default: 'active'
    },
    lastLogin: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Tự động loại bỏ passwordHash và __v khi chuyển đổi sang JSON
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.passwordHash;
  delete obj.__v;
  return obj;
};

export const User = mongoose.model('User', userSchema);
export default User;
