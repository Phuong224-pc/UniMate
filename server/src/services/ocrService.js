import { GoogleGenAI } from '@google/genai';
import { courseRepo } from '../repositories/index.js';
import config from '../config/environment.js';

// Hàm bóc tách text từ file PDF với hỗ trợ cả pdf-parse v1 và v2
async function extractTextFromPdf(buffer) {
  if (!buffer) return null;
  try {
    const mod = await import('pdf-parse');
    if (typeof mod.default === 'function') {
      const res = await mod.default(buffer);
      if (res?.text && res.text.trim().length > 30) return res.text;
    }
    if (mod.PDFParse) {
      const parser = new mod.PDFParse({ data: buffer });
      await parser.load();
      const res = await parser.getText();
      if (res?.text && res.text.trim().length > 30) return res.text;
    }
  } catch (err) {
    console.warn('[OCR] pdf-parse không đọc được text stream:', err.message);
  }
  return null;
}

// Hàm phân tích cấu trúc bảng điểm VLU từ text stream chuẩn xác 100%
export function parseVluTranscriptText(raw) {
  if (!raw) return null;
  const normalized = raw.normalize('NFC');
  const semesters = [];
  let currentSemester = null;
  const lines = normalized.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Nhận diện tiêu đề học kỳ: 'Năm học: 2024-2025 - Học kỳ: HK01' hoặc 'Điểm Bảo Lưu'
    const semMatch = line.match(/(Năm\s*học:\s*\d{4}-\d{4}\s*-\s*Học\s*kỳ:\s*HK\d+)|(Điểm\s*Bảo\s*Lưu)/i);
    if (semMatch) {
      if (currentSemester && currentSemester.courses.length > 0) {
        semesters.push(currentSemester);
      }
      let sName = semMatch[0].trim();
      const hkMatch = sName.match(/(\d{4}-\d{4})\s*-\s*Học\s*kỳ:\s*(HK\d+)/i);
      if (hkMatch) {
        sName = `${hkMatch[1]} ${hkMatch[2].toUpperCase()}`;
      }
      currentSemester = { semesterName: sName, courses: [] };
      continue;
    }

    if (!currentSemester) {
      currentSemester = { semesterName: 'Điểm bảo lưu', courses: [] };
    }

    // Bỏ qua các dòng tổng kết, ghi chú, URL
    if (
      line.startsWith('-') || line.startsWith('_') || line.startsWith('STT') ||
      line.startsWith('Chú ý') || line.startsWith('https:') || line.includes('Cổng thông tin') ||
      line.startsWith('=>')
    ) {
      continue;
    }

    // Dòng môn học: bắt đầu bằng số thứ tự và mã môn (ví dụ '1 71ENG010012' hoặc '8 71NAD410044')
    const courseMatch = line.match(/^(\d+)\s+([0-9]{2}[A-Z0-9]{4,12})\s+(.*)$/i);
    if (courseMatch) {
      const code = courseMatch[2].toUpperCase().trim();
      let rest = courseMatch[3].trim();

      // Kiểm tra nếu tên môn bị xuống dòng tiếp theo
      while (i + 1 < lines.length) {
        const next = lines[i + 1];
        if (
          next.match(/^(\d+\s+[0-9]{2}[A-Z0-9]{4,}|Năm\s*học|Điểm\s*Bảo\s*Lưu|-|STT|https:|Chú ý|=>|\d{2}:\d{2})/i)
        ) {
          break;
        }
        rest += ' ' + next;
        i++;
      }

      let name = rest;
      let credits = 3;
      let score = null;
      let point4 = null;
      let letter = '';
      let status = 'Đang học';

      // 1. Môn MT / Miễn: 'Anh văn dự bị (AV0) 2 MT'
      const mtMatch = rest.match(/^(.*?)\s+(\d+)\s+(MT|MIỄN)$/i);
      if (mtMatch) {
        name = mtMatch[1].trim();
        credits = Number(mtMatch[2]) || 0;
        letter = 'MT';
        status = 'Miễn/ bảo lưu';
      } else {
        // 2. Môn có điểm: '... 3 7.8 3.12 B' hoặc '... 2 8 3.20 B+'
        const scoreMatch = rest.match(/^(.*?)\s+(\d+)\s+([\d.]+)\s+([\d.]+)\s+([A-D][+]?|F|KXL|VT)$/i);
        if (scoreMatch) {
          name = scoreMatch[1].trim();
          credits = Number(scoreMatch[2]) || 0;
          score = parseFloat(scoreMatch[3]);
          point4 = parseFloat(scoreMatch[4]);
          letter = scoreMatch[5].toUpperCase();
          if (letter === 'F') {
            status = 'Không đạt';
          } else if (score >= 4.0) {
            status = score < 5.5 ? 'Đạt thấp' : 'Đạt';
          } else {
            status = 'Không đạt';
          }
        } else {
          // 3. Môn đang học chưa có điểm: 'Anh văn 7 (AV7) 3'
          const noScoreMatch = rest.match(/^(.*?)\s+(\d+)$/);
          if (noScoreMatch) {
            name = noScoreMatch[1].trim();
            credits = Number(noScoreMatch[2]) || 0;
            status = 'Đang học';
          }
        }
      }

      currentSemester.courses.push({
        code,
        name,
        credits,
        score,
        point4,
        letter,
        status,
        semester: currentSemester.semesterName
      });
    }
  }

  if (currentSemester && currentSemester.courses.length > 0) {
    semesters.push(currentSemester);
  }

  return semesters.length > 0 ? { semesters } : null;
}

// Hàm trích xuất JSON an toàn từ phản hồi Gemini
function safeExtractJson(rawJson) {
  if (!rawJson) return null;
  let clean = rawJson
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();

  try {
    return JSON.parse(clean);
  } catch {}

  const startIdx = clean.indexOf('{');
  const endIdx = clean.lastIndexOf('}');
  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    const candidate = clean.slice(startIdx, endIdx + 1);
    try {
      return JSON.parse(candidate);
    } catch {
      const repaired = candidate
        .replace(/,\s*}/g, '}')
        .replace(/,\s*]/g, ']');
      try {
        return JSON.parse(repaired);
      } catch {}
    }
  }
  return null;
}

export async function parseTranscriptDocument({ buffer, mimeType, base64 }) {
  if (!buffer && !base64) {
    throw new Error('Không có dữ liệu file được gửi lên');
  }

  const effectiveMime = (mimeType || 'image/jpeg').toLowerCase();
  const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
  if (!allowedMimes.includes(effectiveMime)) {
    throw new Error(`Định dạng file '${effectiveMime}' không được hỗ trợ. Vui lòng chọn ảnh JPG, PNG, WebP hoặc tài liệu PDF.`);
  }

  let parsedData = null;

  // 1. Nếu là file PDF, ưu tiên trích xuất text stream trực tiếp để bóc tách chính xác 100%
  if (effectiveMime === 'application/pdf' && buffer) {
    const textFromPdf = await extractTextFromPdf(buffer);
    if (textFromPdf && textFromPdf.trim().length > 60) {
      const textParsed = parseVluTranscriptText(textFromPdf);
      if (textParsed && textParsed.semesters && textParsed.semesters.length > 0) {
        parsedData = textParsed;
      }
    }
  }

  // 2. Nếu chưa parse được từ text (ảnh chụp hoặc file scan không có text stream), gọi Gemini AI Vision
  if (!parsedData) {
    const genai = getGenAI();
    const parts = [];

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

    let rawJson = null;
    let lastError = null;

    for (const model of MODEL_PRIORITY) {
      try {
        const chatConfig = {
          model,
          config: {
            systemInstruction: SYSTEM_OCR_PROMPT,
            temperature: 0.1,
            maxOutputTokens: 16384, // 16K tokens tránh bị cắt cụt JSON khi bảng điểm nhiều học kỳ
            responseMimeType: 'application/json'
          }
        };

        const chat = genai.chats.create(chatConfig);
        const res = await chat.sendMessage({ message: parts });
        if (res && res.text) {
          rawJson = res.text;
          parsedData = safeExtractJson(rawJson);
          if (parsedData) break;
        }
      } catch (err) {
        lastError = err;
        console.warn(`[OCR] Model ${model} thất bại: ${err.message}`);
      }
    }

    if (!parsedData) {
      throw lastError || new Error('Dữ liệu AI trích xuất không đúng cấu trúc JSON tiêu chuẩn. Vui lòng kiểm tra lại độ rõ nét của tài liệu.');
    }
  }

  // 3. Đối chiếu và làm giàu dữ liệu với danh mục môn học chính thức trong hệ thống
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
        const nameLower = (item.name || '').toLowerCase();
        for (const [cCode, cObj] of courseMap.entries()) {
          if (cObj.name && (cObj.name.toLowerCase().includes(nameLower) || nameLower.includes(cObj.name.toLowerCase()))) {
            suggestion = { code: cCode, name: cObj.name, credits: cObj.credits };
            break;
          }
        }
      }

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
        selected: true
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
  parseTranscriptDocument,
  parseVluTranscriptText
};
