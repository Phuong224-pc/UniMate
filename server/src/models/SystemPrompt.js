import mongoose from 'mongoose';

const systemPromptSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true
    },
    title: {
      type: String,
      default: ''
    },
    content: {
      type: String,
      required: true
    }
  },
  {
    timestamps: true
  }
);

export const SystemPrompt = mongoose.model('SystemPrompt', systemPromptSchema);
export default SystemPrompt;
