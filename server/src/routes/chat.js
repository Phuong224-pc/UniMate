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

// Danh sách model theo thứ tự ưu tiên (nhanh → mạnh hơn)
const MODEL_PRIORITY = [
  'gemini-2.0-flash',
  'gemini-1.5-flash',
  'gemini-1.5-flash-8b',
];

// Hàm sleep để chờ trước khi retry
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Kiểm tra lỗi có thể retry không (503, overload, timeout, ECONNRESET)
function isRetryableError(err) {
  const msg = (err.message || '').toLowerCase();
  const status = err.status || err.statusCode || 0;
  return (
    status === 503 ||
    status === 429 ||
    msg.includes('unavailable') ||
    msg.includes('overloaded') ||
    msg.includes('high demand') ||
    msg.includes('econnreset') ||
    msg.includes('timeout') ||
    msg.includes('resource_exhausted')
  );
}

// Gọi Gemini với retry + fallback model
async function callGeminiWithRetry(genai, modelName, chatConfig, lastParts, maxRetries = 3) {
  let lastError = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const chat = genai.chats.create(chatConfig);
      // Timeout 25 giây
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout sau 25 giây')), 25000)
      );
      const response = await Promise.race([
        chat.sendMessage({ message: lastParts }),
        timeoutPromise,
      ]);
      return response;
    } catch (err) {
      lastError = err;
      const isRetryable = isRetryableError(err);
      console.warn(`[Gemini] Attempt ${attempt}/${maxRetries} thất bại (${modelName}): ${err.message}`);

      if (!isRetryable || attempt === maxRetries) break;

      // Exponential backoff: 1s, 2s, 4s
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 8000);
      console.log(`[Gemini] Chờ ${delay}ms trước khi retry...`);
      await sleep(delay);
    }
  }

  throw lastError;
}

router.post('/', async (req, res) => {
  try {
    const { messages = [], mode = 'default', image = null, systemPromptOverride } = req.body;

    if (!messages || messages.length === 0) {
      return res.status(400).json({ success: false, error: 'Không có tin nhắn' });
    }

    let baseSystemPrompt = systemPromptOverride || systemPrompts[mode] || systemPrompts['default'] || 'Bạn là VLU Smart Assistant, trợ lý AI thông minh của Trường Đại học Văn Lang.';

    // Nếu ở chế độ advisor hoặc roadmap, bổ sung thông tin khung K30
    if ((mode === 'advisor' || mode === 'roadmap') && curriculumKnowledge) {
      baseSystemPrompt += `\n\n[DỮ LIỆU THAM CHIẾU KHUNG CTĐT K30 CNTT VĂN LANG 126 TÍN CHỈ]:\n${curriculumKnowledge.slice(0, 8000)}`;
    }

    const genai = getGeminiClient();

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

    // Thử từng model theo thứ tự ưu tiên
    let response = null;
    let usedModel = MODEL_PRIORITY[0];
    let lastErr = null;

    for (const model of MODEL_PRIORITY) {
      try {
        usedModel = model;
        const chatConfig = {
          model,
          config: {
            systemInstruction: baseSystemPrompt,
            temperature: 0.5,
            maxOutputTokens: 1024,
            topP: 0.95
          },
          history
        };
        response = await callGeminiWithRetry(genai, model, chatConfig, lastParts, 3);
        break; // Thành công → thoát vòng lặp
      } catch (err) {
        lastErr = err;
        console.warn(`[Gemini] Model ${model} thất bại hoàn toàn, thử model tiếp theo...`);
      }
    }

    if (!response) throw lastErr || new Error('Tất cả model đều không phản hồi');

    const reply = response.text || "Xin lỗi, không nhận được phản hồi từ mô hình AI.";

    res.json({
      success: true,
      reply,
      model: usedModel,
      usage: {
        prompt_tokens: response.usageMetadata?.promptTokenCount,
        completion_tokens: response.usageMetadata?.candidatesTokenCount,
        total_tokens: response.usageMetadata?.totalTokenCount
      }
    });

  } catch (error) {
    console.error("Lỗi Gemini API:", error.message);

    // Phân loại lỗi để trả về message thân thiện
    let userMessage = "Xin lỗi, có lỗi kết nối đến AI. Vui lòng thử lại.";
    if (isRetryableError(error)) {
      userMessage = "AI đang bận, vui lòng thử lại sau vài giây.";
    } else if (error.message?.includes('API_KEY') || error.message?.includes('chưa được cấu hình')) {
      userMessage = "Lỗi cấu hình server. Vui lòng liên hệ quản trị viên.";
    } else if (error.message?.includes('timeout')) {
      userMessage = "Yêu cầu mất quá nhiều thời gian. Vui lòng thử câu hỏi ngắn hơn.";
    }

    res.status(500).json({
      success: false,
      error: userMessage
    });
  }
});

export default router;
