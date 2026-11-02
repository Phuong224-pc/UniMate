import mongoose from 'mongoose';

const curriculumCourseSchema = new mongoose.Schema(
  {
    code: { type: String, required: true },
    name: { type: String, required: true },
    credits: { type: Number, required: true },
    prerequisites: { type: [String], default: [] },
    priorCourses: { type: [String], default: undefined },
    groupCode: String,
    requirementGroup: String,
    specialization: { type: String, default: null },
    countsTowardDegree: Boolean,
    source: mongoose.Schema.Types.Mixed,
    semesterSources: [mongoose.Schema.Types.Mixed],
    conflicts: [mongoose.Schema.Types.Mixed],
    verificationStatus: String,
    conditionNotes: String,
    required: { type: Boolean, default: true },
    semesterRecommended: { type: String, default: '' }
  },
  { _id: false }
);

const sectionSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    courses: { type: [curriculumCourseSchema], default: [] }
  },
  { _id: false }
);

const curriculumSchema = new mongoose.Schema(
  {
    program: {
      type: String,
      required: true,
      trim: true
    },
    major: {
      type: String,
      default: ''
    },
    totalCredits: {
      type: Number,
      default: null
    },
    sections: {
      type: [sectionSchema],
      default: []
    },
    scope: mongoose.Schema.Types.Mixed,
    revision: { type: Number, default: 1 },
    rules: mongoose.Schema.Types.Mixed,
    source: mongoose.Schema.Types.Mixed,
    importHistory: [mongoose.Schema.Types.Mixed]
  },
  {
    timestamps: true
  }
);

curriculumSchema.index({ program: 1, 'scope.schoolId': 1, 'scope.majorCode': 1, 'scope.cohort': 1, 'scope.version': 1 }, { unique: true });

export const Curriculum = mongoose.model('Curriculum', curriculumSchema);
export default Curriculum;
