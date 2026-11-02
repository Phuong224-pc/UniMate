import mongoose from 'mongoose';

const courseGradeSchema = new mongoose.Schema(
  {
    code: { type: String, required: true },
    name: { type: String, required: true },
    credits: { type: Number, default: 0 },
    score: { type: Number, default: null },
    point4: { type: Number, default: null },
    letter: { type: String, default: '' },
    semester: { type: String, default: '' },
    area: { type: String, default: '' },
    status: { type: String, default: 'Đang học' },
    countCredit: { type: Boolean, default: true },
    countGpa: { type: Boolean, default: true },
    source: { type: mongoose.Schema.Types.Mixed, default: null },
    sourceRows: { type: [mongoose.Schema.Types.Mixed], default: [] },
    recognition: { type: mongoose.Schema.Types.Mixed, default: null },
    recognitionApproved: { type: Boolean, default: false },
    registrationSource: { type: mongoose.Schema.Types.Mixed, default: null }
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
      default: 'Công nghệ thông tin'
    },
    specialization: { type: String, enum: ['software', 'data', 'ai', null], default: null },
    specializationSelectedAt: { type: Date, default: null },
    specializationHistory: { type: [mongoose.Schema.Types.Mixed], default: [] },
    program: { type: String, default: '' },
    curriculumId: { type: String, default: null },
    curriculumVersion: { type: String, default: '' },
    schoolId: { type: String, default: '' },
    majorCode: { type: String, default: '' },
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
      default: null
    },
    officialCumulativeCredits: {
      type: Number,
      default: null
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
    plannedCourses: { type: [String], default: [] },
    transcriptSourceTotals: { type: mongoose.Schema.Types.Mixed, default: null },
    transcriptImportHistory: { type: [mongoose.Schema.Types.Mixed], default: [] },
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
