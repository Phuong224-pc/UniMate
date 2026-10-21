import express from 'express';
import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const router = express.Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Đọc curriculum để nạp context cho AI nếu cần
let curriculumKnowledge = "";
try {
  const k30Path = path.join(__dirname, '../data/khungK30.json');
  if (fs.existsSync(k30Path)) {
    const data = JSON.parse(fs.readFileSync(k30Path, 'utf8'));
    curriculumKnowledge = JSON.stringify(data);
  }
} catch (err) {
  console.error("Lỗi nạp tri thức K30:", err.message);
}

// Đọc system prompts mặc định
let systemPrompts = {};
try {
  const promptsPath = path.join(__dirname, '../data/prompts.json');
  if (fs.existsSync(promptsPath)) {
    systemPrompts = JSON.parse(fs.readFileSync(promptsPath, 'utf8'));
  }
} catch (err) {
  console.error("Lỗi nạp prompts:", err.message);
}

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    throw new Error("GEMINI_API_KEY chưa được cấu hình trong .env");
  }
  return new GoogleGenAI({ apiKey });
}

router.post('/', async (req, res) => {
  try {
    const { messages = [], mode = 'default', image = null, systemPromptOverride } = req.body;

    let baseSystemPrompt = systemPromptOverride || systemPrompts[mode] || systemPrompts['default'] || 'Bạn là VLU Smart Assistant, trợ lý AI thông minh của Trường Đại học Văn Lang.';

    // Nếu ở chế độ advisor hoặc roadmap, bổ sung thông tin khung K30
    if ((mode === 'advisor' || mode === 'roadmap') && curriculumKnowledge) {
      baseSystemPrompt += `\n\n[DỮ LIỆU THAM CHIẾU KHUNG CTĐT K30 CNTT VĂN LANG 126 TÍN CHỈ]:\n${curriculumKnowledge.slice(0, 8000)}`;
    }

    const genai = getGeminiClient();
    const model = 'gemini-3.8-flash';

    // Xây dựng lịch sử hội thoại theo định dạng Gemini
    const history = [];
    for (let i = 0; i < messages.length - 1; i++) {
      const msg = messages[i];
      history.push({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content || '' }]
      });
    }

    // Tin nhắn cuối cùng của user (có thể kèm ảnh)
    const lastMsg = messages[messages.length - 1];
    const lastParts = [];

    if (image && image.data) {
      // Hỗ trợ Vision: gửi ảnh base64
      const base64Data = image.data.startsWith('data:')
        ? image.data.split(',')[1]
        : image.data;
      lastParts.push({
        inlineData: {
          mimeType: image.mimeType || 'image/jpeg',
          data: base64Data
        }
      });
    }

    lastParts.push({ text: lastMsg?.content || 'Hãy phân tích hình ảnh này giúp tôi:' });

    // Khởi tạo chat session với lịch sử và system instruction
    const chat = genai.chats.create({
      model,
      config: {
        systemInstruction: baseSystemPrompt,
        temperature: 0.5,
        maxOutputTokens: 2048,
        topP: 0.95
      },
      history
    });

    const response = await chat.sendMessage({ message: lastParts });
    const reply = response.text || "Xin lỗi, không nhận được phản hồi từ mô hình AI.";

    res.json({
      success: true,
      reply,
      model,
      usage: {
        prompt_tokens: response.usageMetadata?.promptTokenCount,
        completion_tokens: response.usageMetadata?.candidatesTokenCount,
        total_tokens: response.usageMetadata?.totalTokenCount
      }
    });

  } catch (error) {
    console.error("Lỗi Gemini API:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Lỗi xử lý AI Core"
    });
  }
});

export default router;
