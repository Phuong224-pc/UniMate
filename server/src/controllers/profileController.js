import { studentRepo } from '../repositories/index.js';
import * as studentService from '../services/studentService.js';
import { successResponse, errorResponse } from '../utils/responseUtils.js';
import { GoogleGenAI } from '@google/genai';

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    throw new Error('GEMINI_API_KEY chưa được cấu hình trong .env');
  }
  return new GoogleGenAI({ apiKey });
}

export async function getMyProfile(req, res, next) {
  try {
    if (!req.user) {
      return errorResponse(res, 'Chưa đăng nhập', 401);
    }

    let profile = await findAuthenticatedProfile(req.user);

    if (!profile) {
      // Nếu chưa có, tạo profile mặc định cho tài khoản
      if (!req.user.mssv) return errorResponse(res, 'Tài khoản chưa được liên kết với hồ sơ sinh viên', 404);
      profile = await studentRepo.create({
        userId: req.user._id,
        mssv: req.user.mssv,
        fullName: req.user.email.split('@')[0],
        email: req.user.email,
        className: 'K30 CNTT',
        major: 'Công nghệ thông tin',
        specialization: null
      });
    }

    return successResponse(res, await studentService.withAcademicProgress(profile));
  } catch (error) {
    next(error);
  }
}

async function findAuthenticatedProfile(user) {
  const identities = [{ userId: user._id }];
  if (user.mssv) identities.push({ mssv: user.mssv });
  if (user.email) identities.push({ email: user.email });
  return studentRepo.findOne({ $or: identities });
}

export async function getMyAcademicProgress(req, res, next) {
  try {
    const profile = await findAuthenticatedProfile(req.user);
    if (!profile) return errorResponse(res, 'Không tìm thấy hồ sơ sinh viên', 404);
    const enriched = await studentService.withAcademicProgress(profile);
    return successResponse(res, enriched.academicProgress);
  } catch (error) {
    next(error);
  }
}

export async function selectMySpecialization(req, res, next) {
  try {
    const profile = await findAuthenticatedProfile(req.user);
    if (!profile) return errorResponse(res, 'Không tìm thấy hồ sơ sinh viên', 404);
    const updated = await studentService.selectSpecialization(profile.mssv, req.body, {
      isUserAdmin: req.user.role === 'admin', actorId: String(req.user._id)
    });
    return successResponse(res, updated, 'Đã lưu lựa chọn chuyên ngành.');
  } catch (error) {
    next(error);
  }
}

export async function updateMyProfile(req, res, next) {
  try {
    if (!req.user) {
      return errorResponse(res, 'Chưa đăng nhập', 401);
    }

    let targetMssv = req.user.mssv;
    if (!targetMssv) {
      const existing = await findAuthenticatedProfile(req.user);
      if (existing) targetMssv = existing.mssv;
    }

    if (!targetMssv) {
      return errorResponse(res, 'Không tìm thấy hồ sơ để cập nhật', 404);
    }

    const updated = await studentService.updateStudentProfile(targetMssv, req.body, req.user.role === 'admin');
    return successResponse(res, updated, 'Hồ sơ đã được lưu thành công vào cơ sở dữ liệu!');
  } catch (error) {
    next(error);
  }
}

export async function extractProfileFromImage(req, res, next) {
  try {
    const { image } = req.body;
    if (!image || !image.data) {
      return errorResponse(res, 'Thiếu dữ liệu ảnh để trích xuất', 400);
    }

    const base64Data = image.data.startsWith('data:')
      ? image.data.split(',')[1]
      : image.data;

    const VISION_MODEL = 'gemini-3.8-flash';

    const prompt = `You are an OCR system specialized in extracting student information from Vietnamese document images (CCCD, student card, transcript, score sheet, passport, etc.).

Analyze the provided image and extract information in the following exact JSON format:
{
  "fullName": "Full name (Họ và tên)",
  "mssv": "Student ID number if present",
  "dob": "Date of birth in DD/MM/YYYY format",
  "gender": "Nam or Nữ",
  "email": "Email if present",
  "phone": "Phone number if present",
  "ethnicity": "Ethnicity (Dân tộc)",
  "nationality": "Nationality (Quốc tịch)",
  "address": "Permanent address or contact address",
  "faculty": "Faculty/Department if present",
  "major": "Major/Field of study if present",
  "className": "Class/Group if present",
  "cohort": "Academic year/cohort if present",
  "idNumber": "ID card/CCCD number if present"
}

Rules:
- Only fill fields actually found in the image. Set value to null if not found.
- Do NOT guess or fabricate information.
- Return ONLY pure JSON, no markdown, no extra text.
- If you cannot identify any information, return: {"error": "Cannot identify information from this image"}`;

    const genai = getGeminiClient();

    let rawText;
    try {
      const response = await genai.models.generateContent({
        model: VISION_MODEL,
        contents: [
          {
            role: 'user',
            parts: [
              {
                inlineData: {
                  mimeType: image.mimeType || 'image/jpeg',
                  data: base64Data
                }
              },
              { text: prompt }
            ]
          }
        ],
        config: {
          temperature: 0.05,
          maxOutputTokens: 2048
        }
      });
      rawText = response.text || '';
    } catch (geminiErr) {
      console.error('Gemini API error:', geminiErr?.message || geminiErr);
      return errorResponse(res, `AI Vision lỗi: ${geminiErr?.message || 'Gemini API lỗi'}`, 500);
    }

    // Strip markdown code blocks if present
    const cleaned = rawText
      .replace(/```(?:json)?\s*/gi, '')
      .replace(/```/g, '')
      .trim();

    let extractedData = {};
    try {
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        extractedData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseErr) {
      return errorResponse(res, 'AI không thể trích xuất thông tin từ ảnh này. Vui lòng thử ảnh rõ nét hơn.', 422);
    }

    if (extractedData.error) {
      return errorResponse(res, extractedData.error, 422);
    }

    const cleanData = Object.fromEntries(
      Object.entries(extractedData).filter(([, v]) => v !== null && v !== undefined && v !== '')
    );

    return successResponse(res, cleanData);
  } catch (error) {
    next(error);
  }
}

export default {
  getMyProfile,
  getMyAcademicProgress,
  selectMySpecialization,
  updateMyProfile,
  extractProfileFromImage
};
