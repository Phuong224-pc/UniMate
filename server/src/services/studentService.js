import { createHash } from 'node:crypto';
import { studentRepo, userRepo } from '../repositories/index.js';
import { getAcademicProgress, validateCoursePlan } from './academicService.js';
import { hashPassword } from '../utils/passwordUtils.js';

export const SPECIALIZATIONS = [
  { id: 'software', name: 'Công nghệ Phần mềm' },
  { id: 'data', name: 'Công nghệ Dữ liệu' },
  { id: 'ai', name: 'Trí tuệ Nhân tạo' }
];

function fail(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  throw error;
}

export async function withAcademicProgress(student) {
  if (!student) return null;
  return {
    ...student,
    specialization: student.specialization || null,
    plannedCourses: student.plannedCourses || [],
    academicProgress: await getAcademicProgress(student)
  };
}

export async function getStudents(options = {}) {
  const result = await studentRepo.findMany(options);
  return { ...result, students: await Promise.all(result.students.map(withAcademicProgress)) };
}

export async function getStudentByMssv(mssv) {
  if (!mssv || typeof mssv !== 'string') fail('MSSV không được để trống');
  return withAcademicProgress(await studentRepo.findByMssv(mssv.trim()));
}

export async function updateStudentProfile(mssv, updateData, isUserAdmin = false) {
  const cleanMssv = mssv.trim();
  const profile = await studentRepo.findByMssv(cleanMssv);
  if (!profile) fail(`Không tìm thấy sinh viên có MSSV: ${cleanMssv}`, 404);
  if ('specialization' in updateData || 'specializationHistory' in updateData) {
    fail('Vui lòng dùng thao tác chọn/đổi chuyên ngành và xác nhận riêng.');
  }
  if (!isUserAdmin && ('completedCourses' in updateData || 'courses' in updateData)) {
    fail('Kết quả hoàn thành phải đến từ bảng điểm được xác nhận. Vui lòng lưu lựa chọn vào kế hoạch học tập.', 403);
  }
  const studentAllowedFields = [
    'fullName', 'phone', 'dob', 'gender', 'address', 'idNumber',
    'ethnicity', 'nationality', 'avatarUrl', 'activities', 'certs', 'docs', 'plannedCourses'
  ];
  const adminAllowedFields = [
    ...studentAllowedFields, 'className', 'faculty', 'major', 'cohort', 'trainingCourse',
    'officialCumulativeGpa4', 'officialCumulativeCredits', 'officialRating',
    'courses', 'status', 'program', 'curriculumId', 'curriculumVersion', 'schoolId', 'majorCode'
  ];
  const fields = isUserAdmin ? adminAllowedFields : studentAllowedFields;
  const filteredData = Object.fromEntries(fields.filter(field => updateData[field] !== undefined).map(field => [field, updateData[field]]));
  if (filteredData.plannedCourses !== undefined) {
    if (!Array.isArray(filteredData.plannedCourses) || filteredData.plannedCourses.some(code => typeof code !== 'string')) {
      fail('Kế hoạch học tập phải là danh sách mã môn.');
    }
    filteredData.plannedCourses = [...new Set(filteredData.plannedCourses.map(code => code.trim().toUpperCase()).filter(Boolean))];
    await validateCoursePlan({ ...profile, ...filteredData }, filteredData.plannedCourses);
  }
  if (filteredData.courses !== undefined) {
    if (!Array.isArray(filteredData.courses)) fail('Bảng điểm phải là danh sách học phần.');
    filteredData.courses = filteredData.courses.map(course => normalizeTranscriptCourse(course, null, { allowRecognitionApproval: true }));
    const progress = await getAcademicProgress({ ...profile, ...filteredData });
    filteredData.completedCourses = progress.completedCourseCodes || [];
  }
  // Source observations and calculated totals have separate storage.
  return withAcademicProgress(await studentRepo.updateByMssv(cleanMssv, filteredData));
}

export function validateSpecializationChange(profile, payload = {}, isUserAdmin = false) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) fail('Dữ liệu chọn chuyên ngành không hợp lệ.');
  const { specialization, confirm, change } = payload;
  if (!SPECIALIZATIONS.some(item => item.id === specialization)) fail('Chuyên ngành không hợp lệ.');
  if (confirm !== true) fail('Vui lòng xác nhận lựa chọn chuyên ngành.');
  const current = profile.specialization || null;
  if (current === specialization) return false;
  if (current && change !== true) fail('Đổi chuyên ngành cần thao tác riêng và xác nhận rõ ràng.', 409);
  const hasRelatedData = Boolean((profile.courses || []).length || (profile.plannedCourses || []).length || (profile.completedCourses || []).length);
  if (current && hasRelatedData && !isUserAdmin) {
    fail('Đã có dữ liệu học tập liên quan. Vui lòng yêu cầu quản trị viên xử lý đổi chuyên ngành; lịch sử điểm được giữ nguyên.', 403);
  }
  return true;
}

export async function selectSpecialization(mssv, payload, { isUserAdmin = false, actorId = null } = {}) {
  const profile = await studentRepo.findByMssv(mssv.trim());
  if (!profile) fail('Không tìm thấy hồ sơ sinh viên.', 404);
  if (!validateSpecializationChange(profile, payload, isUserAdmin)) return withAcademicProgress(profile);
  const now = new Date().toISOString();
  const history = [...(profile.specializationHistory || []), { from: profile.specialization || null, to: payload.specialization, changedAt: now, actorId, admin: isUserAdmin }];
  const update = { specialization: payload.specialization, specializationSelectedAt: now, specializationHistory: history };
  // Preserve old plans in change history when an administrator changes a branch.
  if (profile.specialization && (profile.plannedCourses || []).length) {
    history[history.length - 1].previousPlannedCourses = [...profile.plannedCourses];
    update.plannedCourses = [];
  }
  return withAcademicProgress(await studentRepo.updateByMssv(mssv.trim(), update));
}

export async function createStudent(data) {
  const { mssv, fullName, email } = data;
  if (!mssv || !fullName || !email) fail('MSSV, họ và tên và email là bắt buộc');
  const cleanMssv = mssv.trim();
  const cleanEmail = email.trim().toLowerCase();
  if (await studentRepo.findByMssv(cleanMssv)) fail(`Sinh viên với MSSV '${cleanMssv}' đã tồn tại`, 409);
  if (await studentRepo.findByEmail(cleanEmail)) fail(`Email '${cleanEmail}' đã được sử dụng trong hệ thống`, 409);
  let user = await userRepo.findByEmail(cleanEmail);
  if (!user) user = await userRepo.create({ email: cleanEmail, mssv: cleanMssv, passwordHash: await hashPassword('Vlu@2025!'), role: 'student', status: 'active' });
  const profile = await studentRepo.create({
    ...data, userId: user._id, mssv: cleanMssv, email: cleanEmail, fullName: fullName.trim(),
    className: data.className || 'K30 CNTT', faculty: data.faculty || 'Khoa Công Nghệ Thông Tin',
    major: data.major || 'Công nghệ thông tin', cohort: data.cohort || '2024 - 2028', trainingCourse: data.trainingCourse || 'K30',
    specialization: null, specializationHistory: [],
    courses: Array.isArray(data.courses) ? data.courses.map(course => normalizeTranscriptCourse(course, null, { allowRecognitionApproval: true })) : [],
    activities: data.activities || [], certs: data.certs || [], docs: data.docs || [], plannedCourses: [], completedCourses: []
  });
  return withAcademicProgress(profile);
}

export async function deleteStudent(mssv, { forceHardDelete = false } = {}) {
  const cleanMssv = mssv.trim();
  const student = await studentRepo.findByMssv(cleanMssv);
  if (!student) fail(`Không tìm thấy sinh viên MSSV: ${cleanMssv}`, 404);
  const hasAcademicHistory = (student.courses || []).length > 0 || student.officialCumulativeCredits > 0;
  if (hasAcademicHistory && !forceHardDelete) {
    if (student.userId) await userRepo.updateById(student.userId, { status: 'inactive' });
    const updated = await studentRepo.updateByMssv(cleanMssv, { status: 'Đã nghỉ học / Vô hiệu hóa' });
    return { success: true, action: 'soft_delete', data: updated, message: `Đã vô hiệu hóa tài khoản ${cleanMssv} và giữ nguyên lịch sử học tập.` };
  }
  await studentRepo.deleteByMssv(cleanMssv);
  if (student.userId) await userRepo.deleteById(student.userId);
  return { success: true, action: 'hard_delete', message: `Đã xóa hoàn toàn hồ sơ sinh viên MSSV: ${cleanMssv}` };
}

function optionalNumber(value, field, max) {
  if (value === null || value === undefined || typeof value === 'string' && !value.trim()) return null;
  if (!['number', 'string'].includes(typeof value)) fail(`${field} không hợp lệ.`);
  const number = Number(typeof value === 'string' ? value.replace(',', '.') : value);
  if (!Number.isFinite(number) || number < 0 || number > max) fail(`${field} không hợp lệ.`);
  return number;
}

export function normalizeSemester(value) {
  const text = String(value || '').trim().replace(/[–—]/g, '-');
  const year = text.match(/(20\d{2})\s*-\s*(20\d{2})/);
  const term = text.match(/(?:HK|học kỳ)\s*0?(\d+)/i);
  return year && term ? `${year[1]}-${year[2]} HK${String(Number(term[1])).padStart(2, '0')}` : text;
}

export function normalizeTranscriptCourse(incoming = {}, source = null, { allowRecognitionApproval = false } = {}) {
  if (!incoming || typeof incoming !== 'object' || Array.isArray(incoming)) fail('Dữ liệu học phần không hợp lệ.');
  const code = String(incoming.code || '').trim().toUpperCase();
  const name = String(incoming.name || '').trim();
  if (!code || !name || !/^[A-Z0-9_-]+$/.test(code)) fail('Học phần phải có mã và tên hợp lệ.');
  const credits = optionalNumber(incoming.credits, 'Tín chỉ', 60);
  if (credits === null) fail(`Thiếu số tín chỉ của môn ${code}.`);
  const score = optionalNumber(incoming.score, `Điểm hệ 10 của ${code}`, 10);
  const point4 = optionalNumber(incoming.point4, `Điểm hệ 4 của ${code}`, 4);
  return {
    code, name, credits, score, point4,
    letter: String(incoming.letter || '').trim().toUpperCase(), semester: normalizeSemester(incoming.semester), area: incoming.area || '',
    status: incoming.status || (score === null && point4 === null ? 'Đang học' : ''),
    ...(typeof incoming.countCredit === 'boolean' ? { countCredit: incoming.countCredit } : {}),
    ...(typeof incoming.countGpa === 'boolean' ? { countGpa: incoming.countGpa } : {}),
    source: incoming.source || source, sourceRows: Array.isArray(incoming.sourceRows) ? incoming.sourceRows : [],
    ...(incoming.recognition ? { recognition: incoming.recognition } : {}),
    ...(allowRecognitionApproval && typeof incoming.recognitionApproved === 'boolean' ? { recognitionApproved: incoming.recognitionApproved } : {}),
    ...(incoming.registrationSource ? { registrationSource: incoming.registrationSource } : {})
  };
}

export async function confirmTranscriptCourses(mssv, incomingCourses = [], source = 'student_ocr_import', sourceTotals = null, options = {}) {
  const cleanMssv = mssv.trim();
  let student = await studentRepo.findByMssv(cleanMssv);
  if (!student) {
    const user = await userRepo.findByMssv(cleanMssv);
    if (!user) fail(`Không tìm thấy sinh viên có MSSV: ${cleanMssv}`, 404);
    student = await studentRepo.create({ userId: user._id, mssv: cleanMssv, fullName: user.fullName || 'Sinh viên VLU', email: user.email || '', courses: [], specialization: null });
  }
  if (!Array.isArray(incomingCourses) || incomingCourses.length === 0) fail('Danh sách môn học không được để trống.');
  const normalizedIncoming = incomingCourses.map(course => normalizeTranscriptCourse(course, source, options));
  const seenIncoming = new Map();
  for (const course of normalizedIncoming) {
    const key = `${course.code}|${course.semester}`;
    const previous = seenIncoming.get(key);
    if (previous && ['credits', 'score', 'point4', 'letter', 'status'].some(field => previous[field] !== course[field])) {
      fail(`Dữ liệu trùng của ${course.code} (${course.semester || 'chưa rõ kỳ'}) có kết quả mâu thuẫn; cần đối chiếu bản nguồn trước khi xác nhận.`, 409);
    }
    seenIncoming.set(key, course);
  }
  const existingCourses = [...(student.courses || [])];
  let addedCount = 0;
  let updatedCount = 0;
  for (const incoming of normalizedIncoming) {
    const index = existingCourses.findIndex(course => String(course.code).trim().toUpperCase() === incoming.code && normalizeSemester(course.semester) === incoming.semester);
    if (index >= 0) {
      const previous = existingCourses[index];
      const merged = { ...previous, ...incoming };
      // An incomplete extraction must not erase a known result of this attempt.
      if (incoming.score === null && incoming.point4 === null && !incoming.letter && incoming.status === 'Đang học' && (previous.score !== null && previous.score !== undefined || previous.point4 !== null && previous.point4 !== undefined)) {
        for (const field of ['score', 'point4', 'letter', 'status']) merged[field] = previous[field];
      }
      existingCourses[index] = merged;
      updatedCount++;
    } else {
      existingCourses.push(incoming);
      addedCount++;
    }
  }
  const digest = createHash('sha256').update(JSON.stringify({ courses: normalizedIncoming, sourceTotals })).digest('hex');
  const importHistory = [...(student.transcriptImportHistory || [])];
  if (!importHistory.some(entry => entry.digest === digest)) importHistory.push({ digest, source, importedAt: new Date().toISOString(), courseCount: normalizedIncoming.length });
  const payload = { courses: existingCourses, transcriptImportHistory: importHistory };
  if (sourceTotals && typeof sourceTotals === 'object' && !Array.isArray(sourceTotals)) {
    payload.transcriptSourceTotals = { ...sourceTotals, source: sourceTotals.source || source };
    const credits = sourceTotals.cumulativeCredits ?? sourceTotals.officialCumulativeCredits;
    const gpa4 = sourceTotals.cumulativeGpa4 ?? sourceTotals.officialCumulativeGpa4;
    const observedCredits = optionalNumber(credits, 'Tín chỉ tích lũy nguồn', 1000);
    const observedGpa4 = optionalNumber(gpa4, 'GPA nguồn', 4);
    if (observedCredits !== null) payload.officialCumulativeCredits = observedCredits;
    if (observedGpa4 !== null) payload.officialCumulativeGpa4 = observedGpa4;
  }
  const progress = await getAcademicProgress({ ...student, ...payload });
  payload.completedCourses = progress.completedCourseCodes || [];
  const updated = await studentRepo.updateByMssv(cleanMssv, payload);
  return {
    student: { ...updated, specialization: updated.specialization || null, academicProgress: progress },
    addedCount, updatedCount, totalCourses: existingCourses.length, stats: progress,
    message: `Đã lưu ${addedCount} môn mới và đối chiếu ${updatedCount} môn đã có trong bảng điểm.`
  };
}

export default { getStudents, getStudentByMssv, updateStudentProfile, createStudent, deleteStudent, confirmTranscriptCourses, selectSpecialization, withAcademicProgress };
