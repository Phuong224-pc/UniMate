import { GoogleGenAI } from '@google/genai';
import { promptRepo, courseRepo, studentRepo } from '../repositories/index.js';

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    throw new Error('GEMINI_API_KEY chưa được cấu hình trong .env');
  }
  return new GoogleGenAI({ apiKey });
}

function findMatchingCourses(query, courses) {
  if (!query || typeof query !== 'string') return [];
  const q = query.toLowerCase().trim();
  const words = q.split(/\s+/).filter(w => w.length >= 2);
  const matched = [];

  for (const c of courses) {
    const cname = (c.name || '').toLowerCase();
    const ccode = (c.code || '').toLowerCase();
    if (q.includes(cname) || cname.includes(q) || (c.code && q.includes(ccode))) {
      matched.push(c);
    } else if (words.length >= 2 && words.every(w => cname.includes(w))) {
      matched.push(c);
    }
  }
  return matched;
}

const MODEL_PRIORITY = [
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-3-flash-preview',
  'gemini-3.8-flash',
  'gemma-4-26b-a4b-it'
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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

async function callGeminiWithRetry(genai, modelName, chatConfig, lastParts, maxRetries = 2) {
  let lastError = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const chat = genai.chats.create(chatConfig);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout sau 25 giây')), 25000)
      );
      const response = await Promise.race([
        chat.sendMessage({ message: lastParts }),
        timeoutPromise
      ]);
      return response;
    } catch (err) {
      lastError = err;
      const isRetryable = isRetryableError(err);
      console.warn(`[Gemini] Model ${modelName} lần ${attempt}/${maxRetries} thất bại: ${err.message}`);

      if (err.status === 404 || !isRetryable || attempt === maxRetries) {
        break;
      }

      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 4000);
      await sleep(delay);
    }
  }

  throw lastError;
}

export async function handleChatMessage(req, res) {
  try {
    const { messages = [], mode = 'default', image = null, systemPromptOverride } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ success: false, error: 'Không có tin nhắn hợp lệ' });
    }

    const validMessages = messages.filter(
      (m) =>
        m &&
        m.content &&
        typeof m.content === 'string' &&
        m.content.trim() &&
        !m.isError &&
        !m.content.startsWith('⚠️ Lỗi kết nối AI')
    );

    if (validMessages.length === 0) {
      return res.status(400).json({ success: false, error: 'Tin nhắn không có nội dung' });
    }

    // Lấy system prompt từ repository (MongoDB hoặc Demo)
    let promptContent = null;
    try {
      const promptDoc = await promptRepo.findByKey(mode);
      if (promptDoc) promptContent = promptDoc.content;
    } catch {}

    if (!promptContent) {
      promptContent = 'Bạn là UniMate, trợ lý học tập AI thông minh (sử dụng dữ liệu demo tham khảo từ Trường Đại học Văn Lang - VLU, không phải đại diện chính thức của trường).';
    }

    let baseSystemPrompt = systemPromptOverride || promptContent;

    const lastMsg = validMessages[validMessages.length - 1];
    const userText = lastMsg?.content || '';

    // Nạp danh mục môn học K30 từ active repository
    let allCoursesList = [];
    try {
      allCoursesList = await courseRepo.findMany({});
    } catch {}

    if (allCoursesList.length > 0) {
      const lines = ['DANH MỤC ĐẦY ĐỦ CÁC HỌC PHẦN KHUNG CTĐT K30 CNTT VĂN LANG (DATABASE):'];
      allCoursesList.forEach(c => {
        const prereq = c.prerequisites && c.prerequisites.length > 0 ? `Tiên quyết: ${c.prerequisites.join(', ')}` : 'Không có';
        lines.push(`- Mã: ${c.code} | Môn: ${c.name} | ${c.credits} TC | ${prereq}`);
      });
      baseSystemPrompt += `\n\n[DỮ LIỆU CHÍNH THỨC TOÀN BỘ MÔN HỌC KHUNG CTĐT K30 CNTT VĂN LANG]:\n${lines.join('\n')}`;
    }

    // Quét môn học đang được hỏi
    const matchedCourses = findMatchingCourses(userText, allCoursesList);
    if (matchedCourses.length > 0) {
      const listInfo = matchedCourses
        .map(
          (c) =>
            `- Mã học phần: ${c.code} | Tên học phần: "${c.name}" | Số tín chỉ: ${c.credits} TC | Thuộc nhóm: ${c.sectionName || ''} | Tiên quyết: ${
              (c.prerequisites || []).length > 0 ? c.prerequisites.join(', ') : 'Không có'
            }`
        )
        .join('\n');

      baseSystemPrompt += `\n\n[KẾT QUẢ TRA CỨU CHÍNH XÁC - MÔN HỌC CÓ TRONG KHUNG K30 ĐANG ĐƯỢC HỎI]:\n${listInfo}\n\n⚠️ QUY TẮC BẮT BUỘC CHO AI:\n1. Khẳng định RÕ RÀNG VÀ CHÍNH XÁC: Môn học trên CÓ trong Khung chương trình đào tạo K30 ngành Công nghệ Thông tin (126 tín chỉ) của Đại học Văn Lang.\n2. Nêu đầy đủ: Mã môn, Tên môn, Số tín chỉ, Thuộc nhóm kiến thức/chuyên ngành nào, Điều kiện tiên quyết/học trước.\n3. Tuyệt đối KHÔNG ĐƯỢC NÓI là "không có trong khung chương trình"!`;
    }

    // Tra cứu dữ liệu sinh viên nếu tin nhắn có MSSV
    const mssvMatch = userText.match(/\b(247480\d{7})\b/);
    if (mssvMatch) {
      const queryMssv = mssvMatch[1];
      try {
        const studentRecord = await studentRepo.findByMssv(queryMssv);
        if (studentRecord) {
          baseSystemPrompt += `\n\n[DỮ LIỆU HỌC TẬP SINH VIÊN MSSV ${queryMssv} TỪ DATABASE]:\n${JSON.stringify(studentRecord)}`;
        }
      } catch {}
    }

    const genai = getGeminiClient();

    // Chuẩn bị lịch sử
    const rawHistory = validMessages.slice(0, validMessages.length - 1);
    while (rawHistory.length > 0 && rawHistory[0].role !== 'user') {
      rawHistory.shift();
    }

    const history = [];
    for (const msg of rawHistory) {
      const role = msg.role === 'user' ? 'user' : 'model';
      if (history.length > 0 && history[history.length - 1].role === role) {
        history[history.length - 1].parts[0].text += `\n${msg.content}`;
      } else {
        history.push({
          role,
          parts: [{ text: msg.content }]
        });
      }
    }

    const lastParts = [];
    if (image && image.data) {
      const base64Data = image.data.startsWith('data:') ? image.data.split(',')[1] : image.data;
      lastParts.push({
        inlineData: {
          mimeType: image.mimeType || 'image/jpeg',
          data: base64Data
        }
      });
    }

    lastParts.push({ text: userText || 'Hãy phân tích hình ảnh này giúp tôi:' });

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
            temperature: 0.6,
            maxOutputTokens: 2048,
            topP: 0.95
          },
          history
        };
        response = await callGeminiWithRetry(genai, model, chatConfig, lastParts, 2);
        if (response && response.text) {
          break;
        }
      } catch (err) {
        lastErr = err;
        console.warn(`[Gemini] Model ${model} không khả dụng: ${err.message}`);
      }
    }

    if (!response || !response.text) {
      throw lastErr || new Error('Tất cả mô hình AI đều không phản hồi lúc này');
    }

    res.json({
      success: true,
      reply: response.text,
      model: usedModel,
      usage: {
        prompt_tokens: response.usageMetadata?.promptTokenCount,
        completion_tokens: response.usageMetadata?.candidatesTokenCount,
        total_tokens: response.usageMetadata?.totalTokenCount
      }
    });
  } catch (error) {
    console.error('Lỗi Chat API:', error.message);
    let userMessage = 'Xin lỗi, hiện tại hệ thống AI đang quá tải hoặc gặp gián đoạn kết nối. Vui lòng thử lại sau vài giây!';
    if (error.message?.includes('API_KEY') || error.message?.includes('chưa được cấu hình')) {
      userMessage = 'Lỗi cấu hình GEMINI_API_KEY. Vui lòng kiểm tra lại file .env!';
    } else if (error.message?.includes('timeout')) {
      userMessage = 'Yêu cầu mất quá nhiều thời gian xử lý. Vui lòng thử lại với câu hỏi ngắn hơn!';
    }

    res.status(500).json({
      success: false,
      error: userMessage,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

export default {
  handleChatMessage
};
