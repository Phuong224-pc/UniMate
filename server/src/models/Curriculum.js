import mongoose from 'mongoose';

const curriculumCourseSchema = new mongoose.Schema(
  {
    code: { type: String, required: true },
    name: { type: String, required: true },
    credits: { type: Number, required: true },
    prerequisites: { type: [String], default: [] },
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
      unique: true,
      trim: true
    },
    major: {
      type: String,
      default: 'Công nghệ thông tin'
    },
    totalCredits: {
      type: Number,
      default: 126
    },
    sections: {
      type: [sectionSchema],
      default: []
    }
  },
  {
    timestamps: true
  }
);

export const Curriculum = mongoose.model('Curriculum', curriculumSchema);
export default Curriculum;
