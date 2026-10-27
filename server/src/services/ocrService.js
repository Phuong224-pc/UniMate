import { GoogleGenAI } from '@google/genai';
import { courseRepo } from '../repositories/index.js';
import config from '../config/environment.js';

let pdfParseModule = null;
try {
  const mod = await import('pdf-parse');
  pdfParseModule = mod.default || mod;
} catch {
  // pdf-parse optional fallback
}

const MODEL_PRIORITY = [
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-3-flash-preview',
  'gemini-3.8-flash',
  'gemma-4-26b-a4b-it'
];

function getGenAI() {
  const apiKey = config.geminiApiKey || process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    throw new Error('GEMINI_API_KEY chưa được cấu hình trên máy chủ để thực hiện OCR');
  }
  return new GoogleGenAI({ apiKey });
}

const SYSTEM_OCR_PROMPT = `Bạn là chuyên gia bóc tách dữ liệu bảng điểm sinh viên chuẩn của Trường Đại học Văn Lang (VLU).
Hãy phân tích tài liệu/ảnh bảng điểm được cung cấp và trích xuất dữ liệu thành cấu trúc JSON CHÍNH XÁC:

{
  "studentInfo": {
    "mssv": "Mã số sinh viên nếu tìm thấy (ví dụ 2474802010458), nếu không có để null",
    "fullName": "Họ và tên sinh viên nếu có, nếu không để null",
    "className": "Lớp (ví dụ K30 CNTT), nếu không để null",
    "major": "Ngành/Chuyên ngành nếu có, nếu không để null",
    "cohort": "Khóa nếu có, nếu không để null"
  },
  "semesters": [
    {
      "semesterName": "Tên học kỳ hoặc Điểm bảo lưu, ví dụ: '2024-2025 HK01', '2024-2025 HK02', '2024-2025 HK03', 'Điểm bảo lưu'",
      "courses": [
        {
          "code": "Mã môn học chính xác, giữ nguyên số 0 và chữ hoa (ví dụ: '71ITBS10103', '71ENG01012')",
          "name": "Tên môn học đầy đủ bằng tiếng Việt có dấu",
          "credits": 3,
          "score": 8.5,
          "point4": 3.4,
          "letter": "A",
          "status": "Đạt",
          "area": "Cơ sở khối ngành"
        }
      ],
      "summary": {
        "passedCredits": 14,
        "semesterGpa4": 3.4,
        "cumulativeCredits": 14,
        "cumulativeGpa4": 3.4
      }
    }
  ]
}

CÁC NGUYÊN TẮC BẮT BUỘC:
1. KHÔNG được nhận diện các dòng tổng hợp cuối kỳ ("Số tín chỉ đạt học kỳ", "Điểm trung bình học kỳ", "Xếp loại học kỳ", "Điểm rèn luyện", "Tổng số tín chỉ tích lũy", "Điểm trung bình tích lũy", "Xếp loại tích lũy") thành môn học. Chỉ đưa thông số vào object summary.
2. Bỏ qua icon hoặc ký tự lạ trong cột Chi tiết.
3. Giữ nguyên mã môn học, kể cả các số 0 ở đầu (ví dụ: '71ENG01012', '71ENG01000').
4. Giữ nguyên dấu tiếng Việt trong tên môn học.
5. Ô trống trên bảng điểm nghĩa là chưa có điểm -> để score: null, point4: null (KHÔNG tự chuyển thành 0).
6. Ký hiệu MT (Miễn/Bảo lưu) -> letter: "MT", status: "Miễn/ bảo lưu", score: null, point4: null.
7. Chuẩn hóa dấu phẩy thập phân thành dấu chấm (ví dụ: 8,5 -> 8.5).
8. Giữ nguyên điểm hệ 4 và điểm chữ đọc từ tài liệu, không tự ý quy đổi theo bảng khác.
9. CHỈ trả về đúng định dạng JSON hợp lệ, không bọc markdown \`\`\`json, không có thêm văn bản giải thích.`;

export async function parseTranscriptDocument({ buffer, mimeType, base64 }) {
  if (!buffer && !base64) {
    throw new Error('Không có dữ liệu file được gửi lên');
  }

  const effectiveMime = (mimeType || 'image/jpeg').toLowerCase();
  const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
  if (!allowedMimes.includes(effectiveMime)) {
    throw new Error(`Định dạng file '${effectiveMime}' không được hỗ trợ. Vui lòng chọn ảnh JPG, PNG, WebP hoặc tài liệu PDF.`);
  }

  let textFromPdf = null;
  if (effectiveMime === 'application/pdf' && buffer && pdfParseModule) {
    try {
      const parsed = await pdfParseModule(buffer);
      if (parsed && parsed.text && parsed.text.trim().length > 60) {
        textFromPdf = parsed.text;
      }
    } catch (e) {
      console.warn('[OCR] pdf-parse không đọc được text stream, chuyển sang Gemini Vision:', e.message);
    }
  }

  const genai = getGenAI();
  const parts = [];

  if (textFromPdf) {
    // PDF có text thuần
    parts.push({
      text: `Nội dung văn bản trích xuất từ PDF bảng điểm VLU:\n\n${textFromPdf}\n\nHãy trích xuất JSON bảng điểm theo yêu cầu hệ thống.`
    });
  } else {
    // Xử lý ảnh hoặc PDF dạng nhúng inlineData
    let dataPayload = base64;
    if (!dataPayload && buffer) {
      dataPayload = buffer.toString('base64');
    }
    if (dataPayload && dataPayload.startsWith('data:')) {
      dataPayload = dataPayload.split(',')[1];
    }

    parts.push({
      inlineData: {
        mimeType: effectiveMime,
        data: dataPayload
      }
    });
    parts.push({
      text: 'Hãy đọc bảng điểm trong tài liệu này và xuất JSON chuẩn xác theo cấu trúc đã quy định.'
    });
  }

  let rawJson = null;
  let lastError = null;

  for (const model of MODEL_PRIORITY) {
    try {
      const chatConfig = {
        model,
        config: {
          systemInstruction: SYSTEM_OCR_PROMPT,
          temperature: 0.1, // Nhiệt độ thấp để đảm bảo dữ liệu bóc tách chính xác nhất
          maxOutputTokens: 4096,
          responseMimeType: 'application/json'
        }
      };

      const chat = genai.chats.create(chatConfig);
      const res = await chat.sendMessage({ message: parts });
      if (res && res.text) {
        rawJson = res.text;
        break;
      }
    } catch (err) {
      lastError = err;
      console.warn(`[OCR] Model ${model} thất bại: ${err.message}`);
    }
  }

  if (!rawJson) {
    throw lastError || new Error('Không thể trích xuất dữ liệu bảng điểm từ tài liệu');
  }

  // Parse JSON an toàn
  let parsedData = null;
  try {
    const cleanJson = rawJson
      .replace(/^```json\s*/i, '')
      .replace(/```\s*$/, '')
      .trim();
    parsedData = JSON.parse(cleanJson);
  } catch (err) {
    console.error('[OCR] Lỗi cú pháp JSON phản hồi từ Gemini:', rawJson);
    throw new Error('Dữ liệu AI trích xuất không đúng cấu trúc JSON tiêu chuẩn');
  }

  // Đối chiếu mã môn với danh mục 87 môn học trong hệ thống
  const allCourses = await courseRepo.findAll();
  const courseMap = new Map();
  allCourses.forEach(c => {
    if (c.code) courseMap.set(c.code.toUpperCase().trim(), c);
  });

  const processedSemesters = (parsedData.semesters || []).map(sem => {
    const courses = (sem.courses || []).map(item => {
      const codeClean = (item.code || '').toUpperCase().trim();
      const match = courseMap.get(codeClean);

      let isOfficialMatch = false;
      let matchedCourseName = item.name || '';
      let matchedCredits = item.credits || 0;
      let suggestion = null;

      if (match) {
        isOfficialMatch = true;
        matchedCourseName = match.name;
        if (!matchedCredits) matchedCredits = match.credits || 0;
      } else {
        // Tìm gợi ý môn theo tên nếu mã không khớp hoàn toàn
        const nameLower = (item.name || '').toLowerCase();
        for (const [cCode, cObj] of courseMap.entries()) {
          if (cObj.name && (cObj.name.toLowerCase().includes(nameLower) || nameLower.includes(cObj.name.toLowerCase()))) {
            suggestion = { code: cCode, name: cObj.name, credits: cObj.credits };
            break;
          }
        }
      }

      // Xử lý chuẩn hóa điểm số
      let scoreNum = item.score !== null && item.score !== undefined ? parseFloat(String(item.score).replace(',', '.')) : null;
      let point4Num = item.point4 !== null && item.point4 !== undefined ? parseFloat(String(item.point4).replace(',', '.')) : null;
      if (Number.isNaN(scoreNum)) scoreNum = null;
      if (Number.isNaN(point4Num)) point4Num = null;

      const letterUpper = (item.letter || '').toUpperCase().trim();
      let statusStr = item.status || 'Đang học';
      if (letterUpper === 'MT' || item.status?.includes('Miễn')) {
        statusStr = 'Miễn/ bảo lưu';
      } else if (scoreNum !== null) {
        if (scoreNum >= 4.0) statusStr = scoreNum < 5.5 ? 'Đạt thấp' : 'Đạt';
        else statusStr = 'Không đạt';
      }

      return {
        code: codeClean,
        name: matchedCourseName,
        credits: Number(matchedCredits) || 0,
        score: scoreNum,
        point4: point4Num,
        letter: letterUpper,
        status: statusStr,
        area: item.area || (match?.type || ''),
        semester: sem.semesterName || '',
        isOfficialMatch,
        suggestion,
        selected: true // Mặc định người dùng chọn nhập dòng này
      };
    });

    return {
      semesterName: sem.semesterName || 'Học kỳ chưa đặt tên',
      courses,
      summary: sem.summary || {}
    };
  });

  return {
    studentInfo: parsedData.studentInfo || {},
    semesters: processedSemesters,
    totalExtractedCourses: processedSemesters.reduce((acc, s) => acc + s.courses.length, 0)
  };
}

export default {
  parseTranscriptDocument
};
