import mongoose from 'mongoose';

const plannedCourseSchema = new mongoose.Schema(
  {
    courseCode: { type: String, required: true },
    courseName: { type: String, required: true },
    credits: { type: Number, required: true },
    groupCode: { type: String, default: '' },
    requirementGroup: { type: String, default: '' },
    isElective: { type: Boolean, default: false },
    isInternship: { type: Boolean, default: false },
    isGraduation: { type: Boolean, default: false },
    reason: { type: String, default: '' },
    prerequisitesMet: { type: [String], default: [] },
    unlockedCourses: { type: [String], default: [] },
    suggestedSchedule: {
      dayOfWeek: { type: Number, default: 2 },
      dayOfWeekText: { type: String, default: 'Thứ Hai' },
      shift: { type: Number, default: 1 },
      startPeriod: { type: Number, default: 1 },
      endPeriod: { type: Number, default: 3 },
      startTime: { type: String, default: '07:00' },
      endTime: { type: String, default: '09:25' },
      room: { type: String, default: 'Phòng học lý thuyết' },
      lecturer: { type: String, default: 'Giảng viên phụ trách' },
      isActualClass: { type: Boolean, default: false }
    }
  },
  { _id: false }
);

const plannedSemesterSchema = new mongoose.Schema(
  {
    semester: { type: String, required: true }, // e.g. "2026-2027 HK02"
    academicYear: { type: String, default: '' },
    term: { type: String, default: '' },
    yearOfStudy: { type: Number, default: 3 },
    yearLabel: { type: String, default: 'Năm 3' },
    courses: { type: [plannedCourseSchema], default: [] },
    totalCredits: { type: Number, default: 0 },
    totalCourses: { type: Number, default: 0 },
    projectedCumulativeCredits: { type: Number, default: 0 },
    fulfilledGroups: { type: [String], default: [] },
    notes: { type: String, default: '' }
  },
  { _id: false }
);

const studyPlanSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
      index: true
    },
    mssv: {
      type: String,
      required: true,
      index: true
    },
    program: {
      type: String,
      default: 'K30 CNTT'
    },
    version: {
      type: String,
      default: '2024'
    },
    specialization: {
      type: String,
      default: 'software'
    },
    startSemester: {
      type: String,
      required: true
    },
    targetGraduationSemester: {
      type: String,
      default: ''
    },
    pace: {
      type: String,
      enum: ['balanced', 'light', 'fast'],
      default: 'balanced'
    },
    preferences: {
      preferredDaysPerWeek: { type: Number, default: 4 },
      preferredShifts: { type: [Number], default: [1, 2, 3] },
      blockedSlots: {
        type: [
          {
            dayOfWeek: { type: Number },
            shift: { type: Number },
            note: { type: String, default: '' }
          }
        ],
        default: []
      },
      maxConsecutiveShifts: { type: Number, default: 2 },
      avoidNightAndEarlyMorning: { type: Boolean, default: true },
      minCredits: { type: Number, default: 12 },
      maxCredits: { type: Number, default: 18 }
    },
    plannedSemesters: {
      type: [plannedSemesterSchema],
      default: []
    },
    summary: {
      totalSemesters: { type: Number, default: 0 },
      totalPlannedCredits: { type: Number, default: 0 },
      finalCumulativeCredits: { type: Number, default: 126 },
      graduationProjectOption: { type: String, default: 'thesis' },
      isEligibleForGraduation: { type: Boolean, default: true }
    },
    status: {
      type: String,
      enum: ['draft', 'confirmed'],
      default: 'draft'
    },
    assumptions: {
      type: [String],
      default: []
    }
  },
  {
    timestamps: true
  }
);

export const StudyPlan = mongoose.model('StudyPlan', studyPlanSchema);
export default StudyPlan;

