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
    sectionName: {
      type: String,
      default: ''
    },
    program: {
      type: String,
      default: 'K30 CNTT',
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
