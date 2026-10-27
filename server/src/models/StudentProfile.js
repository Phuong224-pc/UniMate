import mongoose from 'mongoose';

const courseGradeSchema = new mongoose.Schema(
  {
    code: { type: String, required: true },
    name: { type: String, required: true },
    credits: { type: Number, default: 0 },
    score: { type: Number, default: 0 },
    point4: { type: Number, default: 0 },
    letter: { type: String, default: '' },
    semester: { type: String, default: '' },
    area: { type: String, default: '' },
    status: { type: String, default: 'Đang học' },
    countCredit: { type: Boolean, default: true },
    countGpa: { type: Boolean, default: true }
  },
  { _id: false }
);

const activitySchema = new mongoose.Schema(
  {
    id: { type: Number },
    type: { type: String, enum: ['activity', 'skill'], default: 'activity' },
    name: { type: String, required: true },
    level: { type: String, default: '' },
    role: { type: String, default: '' },
    year: { type: String, default: '' },
    icon: { type: String, default: '⭐' }
  },
  { _id: false }
);

const certificateSchema = new mongoose.Schema(
  {
    id: { type: Number },
    name: { type: String, required: true },
    score: { type: String, default: '' },
    issuer: { type: String, default: '' },
    date: { type: String, default: '' },
    status: { type: String, default: 'Chưa có' }
  },
  { _id: false }
);

const documentSchema = new mongoose.Schema(
  {
    id: { type: Number },
    name: { type: String, required: true },
    type: { type: String, default: 'image' },
    date: { type: String, default: '' },
    size: { type: String, default: '' },
    status: { type: String, default: 'Đã duyệt' },
    url: { type: String, default: '' }
  },
  { _id: false }
);

const studentProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
      index: true
    },
    mssv: {
      type: String,
      required: [true, 'MSSV là bắt buộc'],
      unique: true,
      trim: true,
      index: true
    },
    fullName: {
      type: String,
      required: [true, 'Họ và tên là bắt buộc'],
      trim: true
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true
    },
    phone: {
      type: String,
      default: ''
    },
    dob: {
      type: String,
      default: ''
    },
    gender: {
      type: String,
      default: 'Nam'
    },
    className: {
      type: String,
      default: 'K30 CNTT'
    },
    faculty: {
      type: String,
      default: 'Khoa Công Nghệ Thông Tin'
    },
    major: {
      type: String,
      default: 'Kỹ thuật Phần mềm'
    },
    cohort: {
      type: String,
      default: '2024 - 2028'
    },
    trainingCourse: {
      type: String,
      default: 'K30'
    },
    ethnicity: {
      type: String,
      default: 'Kinh'
    },
    nationality: {
      type: String,
      default: 'Việt Nam'
    },
    address: {
      type: String,
      default: ''
    },
    idNumber: {
      type: String,
      default: ''
    },
    officialCumulativeGpa4: {
      type: Number,
      default: 0
    },
    officialCumulativeCredits: {
      type: Number,
      default: 0
    },
    officialRating: {
      type: String,
      default: 'Chưa xếp loại'
    },
    source: {
      type: String,
      default: 'Hồ sơ sinh viên Đại học Văn Lang'
    },
    avatarUrl: {
      type: String,
      default: null
    },
    activities: {
      type: [activitySchema],
      default: []
    },
    certs: {
      type: [certificateSchema],
      default: []
    },
    docs: {
      type: [documentSchema],
      default: []
    },
    completedCourses: {
      type: [String],
      default: []
    },
    courses: {
      type: [courseGradeSchema],
      default: []
    }
  },
  {
    timestamps: true
  }
);

studentProfileSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

export const StudentProfile = mongoose.model('StudentProfile', studentProfileSchema);
export default StudentProfile;
