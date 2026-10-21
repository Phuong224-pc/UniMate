import express from 'express';
import { GoogleGenAI } from '@google/genai';

const router = express.Router();

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    throw new Error("GEMINI_API_KEY chua duoc cau hinh trong .env");
  }
  return new GoogleGenAI({ apiKey });
}

router.post('/extract-from-image', async (req, res) => {
  try {
    const { image } = req.body;
    if (!image || !image.data) {
      return res.status(400).json({ success: false, error: 'Thieu du lieu anh' });
    }

    const base64Data = image.data.startsWith('data:')
      ? image.data.split(',')[1]
      : image.data;

    const VISION_MODEL = 'gemini-3.8-flash';

    const prompt = `You are an OCR system specialized in extracting student information from Vietnamese document images (CCCD, student card, transcript, score sheet, passport, etc.).

Analyze the provided image and extract information in the following exact JSON format:
{
  "fullName": "Full name (Ho va ten)",
  "mssv": "Student ID number if present",
  "dob": "Date of birth in DD/MM/YYYY format",
  "gender": "Nam or Nu",
  "email": "Email if present",
  "phone": "Phone number if present",
  "ethnicity": "Ethnicity (Dan toc)",
  "nationality": "Nationality (Quoc tich)",
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
      return res.status(geminiErr?.status || 500).json({
        success: false,
        error: `AI Vision loi: ${geminiErr?.message || 'Gemini API loi'}`
      });
    }

    console.log('[Profile OCR] Raw response:', rawText.slice(0, 500));

    // Strip markdown code blocks if present
    const cleaned = rawText
      .replace(/```(?:json)?\s*/gi, '')
      .replace(/```/g, '')
      .trim();

    // Parse JSON from response
    let extractedData = {};
    try {
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        extractedData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseErr) {
      console.error('JSON parse error:', parseErr.message, '\nRaw:', rawText);
      return res.status(422).json({
        success: false,
        error: 'AI khong the trich xuat thong tin tu anh nay. Vui long thu anh ro hon (chup thang, khong nghieng, du anh sang).'
      });
    }

    if (extractedData.error) {
      return res.status(422).json({ success: false, error: extractedData.error });
    }

    // Remove null/undefined/empty fields
    const cleanData = Object.fromEntries(
      Object.entries(extractedData).filter(([, v]) => v !== null && v !== undefined && v !== '')
    );

    res.json({ success: true, data: cleanData, model: VISION_MODEL });

  } catch (error) {
    console.error('Profile OCR unexpected error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Loi he thong khi xu ly anh'
    });
  }
});

export default router;