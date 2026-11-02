import mongoose from 'mongoose';

const courseSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    credits: {
      type: Number,
      required: true
    },
    prerequisites: {
      type: [String],
      default: []
    },
    priorCourses: { type: [String], default: undefined },
    groupCode: String,
    requirementGroup: String,
    specialization: { type: String, default: null },
    countsTowardDegree: Boolean,
    source: mongoose.Schema.Types.Mixed,
    verificationStatus: String,
    sectionName: {
      type: String,
      default: ''
    },
    program: {
      type: String,
      default: '',
      index: true
    },
    semesterRecommended: {
      type: String,
      default: ''
    },
    required: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

export const Course = mongoose.model('Course', courseSchema);
export default Course;
