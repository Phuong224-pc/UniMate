import mongoose from 'mongoose';

const scheduleSchema = new mongoose.Schema(
  {
    semester: {
      type: String,
      required: true,
      index: true
    },
    academicYear: {
      type: String,
      default: '2024-2025'
    },
    courseCode: {
      type: String,
      required: true,
      index: true
    },
    courseName: {
      type: String,
      required: true
    },
    classSection: {
      type: String,
      required: true,
      index: true
    },
    lecturer: {
      type: String,
      default: 'Giảng viên Khoa CNTT'
    },
    dayOfWeek: {
      type: Number,
      required: true,
      min: 2,
      max: 8 // 2: Thứ 2, ..., 7: Thứ 7, 8: Chủ nhật
    },
    dayOfWeekText: {
      type: String,
      default: ''
    },
    startPeriod: {
      type: Number,
      default: 1
    },
    endPeriod: {
      type: Number,
      default: 3
    },
    startTime: {
      type: String,
      default: '07:30'
    },
    endTime: {
      type: String,
      default: '10:00'
    },
    room: {
      type: String,
      default: 'CS3 Đặng Thùy Trâm'
    },
    dateRange: {
      type: String,
      default: ''
    },
    mssvList: {
      type: [String],
      default: [],
      index: true
    },
    notes: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

export const Schedule = mongoose.model('Schedule', scheduleSchema);
export default Schedule;
