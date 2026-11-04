import { studentRepo, curriculumRepo, scheduleRepo } from '../repositories/index.js';
import { getAcademicProgress, resolveStudentCurriculum } from './academicService.js';
import { flattenCurriculum, normalizeCourseCode } from '../utils/gradeUtils.js';
import { StudyPlan } from '../models/StudyPlan.js';

/**
 * Cấu hình ca học chuẩn tham chiếu Trường Đại học Văn Lang (VLU)
 * Ca 1: Tiết 1 - 3, 07:00 - 09:25
 * Ca 2: Tiết 4 - 6, 09:35 - 12:00
 * Nghỉ trưa: 12:00 - 13:00 (Nghỉ trưa & nạp năng lượng)
 * Ca 3: Tiết 7 - 9, 13:00 - 15:25
 * Ca 4: Tiết 10 - 12, 15:35 - 18:00
 * Ca 5: Tiết 13 - 16, 18:05 - 21:10 (Đúng chuẩn 4 tiết tối)
 */
export const VLU_SHIFTS = [
  { shift: 1, periods: 'Tiết 1 - 3', startTime: '07:00', endTime: '09:25', label: 'Ca 1 (Sáng sớm)' },
  { shift: 2, periods: 'Tiết 4 - 6', startTime: '09:35', endTime: '12:00', label: 'Ca 2 (Sáng muộn)' },
  { shift: 3, periods: 'Tiết 7 - 9', startTime: '13:00', endTime: '15:25', label: 'Ca 3 (Chiều sớm)' },
  { shift: 4, periods: 'Tiết 10 - 12', startTime: '15:35', endTime: '18:00', label: 'Ca 4 (Chiều muộn)' },
  { shift: 5, periods: 'Tiết 13 - 16', startTime: '18:05', endTime: '21:10', label: 'Ca 5 (Tối)' }
];

export const VLU_BREAKS = {
  morningBreak: { start: '09:25', end: '09:35', label: 'Giải lao giữa ca sáng (10 phút)' },
  lunchBreak: { start: '12:00', end: '13:00', label: 'Nghỉ trưa & ăn uống (60 phút)' },
  afternoonBreak: { start: '15:25', end: '15:35', label: 'Giải lao giữa ca chiều (10 phút)' },
  eveningBreak: { start: '18:00', end: '18:05', label: 'Chuyển ca tối (5 phút)' }
};

export const DAY_NAMES = {
  2: 'Thứ Hai',
  3: 'Thứ Ba',
  4: 'Thứ Tư',
  5: 'Thứ Năm',
  6: 'Thứ Sáu',
  7: 'Thứ Bảy',
  8: 'Chủ Nhật'
};

/**
 * Ánh xạ nhãn nội bộ sang tên tiếng Việt chuẩn hóa, rõ ràng
 */
export function getFriendlyGroupName(groupKey) {
  const map = {
    commonRequired: 'Bắt buộc chung',
    specializationRequired: 'Bắt buộc chuyên ngành',
    TC209: 'Tự chọn cơ sở ngành',
    TC309: 'Tự chọn chuyên ngành',
    TC306: 'Tự chọn chờ quy tắc',
    TC406: 'Khối tốt nghiệp (Khóa luận / Chuyên đề)',
    internship: 'Thực tập doanh nghiệp',
    TC002: 'Thể chất 1 (TC002)',
    TC102: 'Thể chất 2 (TC102)',
    defense: 'Giáo dục quốc phòng'
  };
  return map[groupKey] || groupKey || 'Học phần';
}

/**
 * Chuẩn hóa và trích xuất mã học phần sạch (loại bỏ tên môn hoặc ký tự thừa như ': 71ITSE41003 - ...')
 */
export function extractCleanCourseCode(str) {
  if (!str) return '';
  const match = String(str).match(/71[A-Z0-9]{5,12}/i);
  if (match) return match[0].toUpperCase();
  return normalizeCourseCode(str);
}

/**
 * Sinh danh sách các học kỳ tiếp theo dựa theo chu kỳ 3 kỳ/năm của ĐH Văn Lang
 */
export function getNextSemesters(startSemester, count = 6) {
  const semesters = [];
  let [yearPart, termPart] = (startSemester || '2026-2027 HK02').split(' ');
  if (!yearPart || !termPart) {
    yearPart = '2026-2027';
    termPart = 'HK02';
  }

  let [startYear, endYear] = yearPart.split('-').map(Number);
  let termNum = parseInt(termPart.replace('HK', ''), 10) || 1;

  for (let i = 0; i < count; i++) {
    const semName = `${startYear}-${endYear} HK0${termNum}`;
    const yearDiff = startYear - 2024; // K30 bắt đầu 2024
    const yearOfStudy = Math.max(1, Math.min(5, yearDiff + 1));
    const yearLabel = `Năm ${yearOfStudy}`;

    semesters.push({
      semester: semName,
      academicYear: `${startYear}-${endYear}`,
      term: `HK0${termNum}`,
      yearOfStudy,
      yearLabel,
      index: i
    });

    termNum++;
    if (termNum > 3) {
      termNum = 1;
      startYear++;
      endYear++;
    }
  }

  return semesters;
}

/**
 * Trợ lý tự động xây dựng lộ trình học tập và xếp lịch đề xuất cho sinh viên
 */
export async function generateStudentRoadmapPlan(studentOrMssv, userPreferences = {}) {
  let student = null;
  if (typeof studentOrMssv === 'string') {
    student = await studentRepo.findByMssv(studentOrMssv.trim());
  } else {
    student = studentOrMssv;
  }

  if (!student) {
    throw new Error('Không tìm thấy thông tin hồ sơ sinh viên để lập lộ trình.');
  }

  // 1. Phân tích tiến độ học tập hiện tại từ service học vụ
  const progress = await getAcademicProgress(student);
  const curriculum = await resolveStudentCurriculum(student);

  if (!curriculum) {
    throw new Error('Chưa xác định được Khung chương trình đào tạo áp dụng cho sinh viên.');
  }

  const allCurriculumCourses = flattenCurriculum(curriculum);
  const courseMap = new Map(allCurriculumCourses.map(c => [c.code, c]));

  // Lấy các tập hợp môn: Đã đạt, Đang học
  const completedCodes = new Set(
    (progress.courseStates || [])
      .filter(c => c.status === 'passed')
      .map(c => c.code)
  );

  const inProgressCoursesList = (progress.courseStates || []).filter(c => c.status === 'in_progress');
  const inProgressCodes = new Set(inProgressCoursesList.map(c => c.code));

  const specialization = student.specialization || progress.specialization || 'software';
  const groupsConfig = curriculum.rules?.groups || {};

  // Giả định mặc định: Môn đang học ở kỳ hiện tại sẽ thi ĐẠT để mở môn học trước cho kỳ sau
  const includeCurrentInProgress = userPreferences.includeCurrentInProgress !== false;
  const assumedPassedCodes = new Set([...completedCodes]);
  if (includeCurrentInProgress) {
    inProgressCodes.forEach(code => assumedPassedCodes.add(code));
  }

  // 2. Xác định chính xác các môn còn thiếu theo đúng Khung K30 VLU
  const missingCourses = [];

  // A. Bắt buộc chung
  const commonCodes = groupsConfig.commonRequired?.courseCodes || [];
  for (const code of commonCodes) {
    if (!assumedPassedCodes.has(code)) {
      const c = courseMap.get(code);
      if (c) {
        missingCourses.push({
          code: c.code,
          name: c.name || 'Môn bắt buộc chung',
          credits: Number(c.credits) || 3,
          groupCode: 'BB',
          requirementGroup: 'commonRequired',
          specialization: null,
          prerequisites: c.prerequisites || [],
          priorCourses: c.priorCourses || [],
          isElective: false,
          isInternship: false,
          isGraduation: false
        });
      }
    }
  }

  // B. Bắt buộc chuyên ngành (Chỉ lấy đúng chuyên ngành của sinh viên)
  const specMap = groupsConfig.specializationRequired?.specializations || {};
  const specCodes = specMap[specialization] || [];
  for (const code of specCodes) {
    if (!assumedPassedCodes.has(code)) {
      const c = courseMap.get(code);
      if (c) {
        const priorArr = c.priorCourses || [];
        const prereqArr = c.prerequisites || [];
        let conditionText = '';
        if (prereqArr.length > 0) {
          conditionText = `Tiên quyết: ${prereqArr.join(', ')}`;
        } else if (priorArr.length > 0) {
          const priorNames = priorArr.map(p => `${p} (${courseMap.get(p)?.name || 'Môn cơ sở'})`).join(', ');
          conditionText = `Học trước: ${priorNames}`;
        } else {
          conditionText = 'Không có điều kiện tiên quyết';
        }

        missingCourses.push({
          code: c.code,
          name: c.name || 'Môn bắt buộc chuyên ngành',
          credits: Number(c.credits) || 3,
          groupCode: 'BB',
          requirementGroup: 'specializationRequired',
          specialization,
          prerequisites: prereqArr,
          priorCourses: priorArr,
          conditionText,
          isElective: false,
          isInternship: false,
          isGraduation: false
        });
      }
    }
  }

  // C. Tự chọn cơ sở ngành (TC209: yêu cầu 3 môn / 9 TC)
  const tc209Rule = groupsConfig.TC209 || {};
  const tc209RequiredCredits = tc209Rule.requiredCredits || 9;
  const tc209Current = progress.groups?.TC209?.earnedCredits || 0;
  let tc209NeededCredits = Math.max(0, tc209RequiredCredits - tc209Current);
  
  if (tc209NeededCredits > 0) {
    const candidateTC209 = allCurriculumCourses.filter(
      c => c.groupCode === 'TC209' && !assumedPassedCodes.has(c.code)
    );
    for (const c of candidateTC209) {
      if (tc209NeededCredits <= 0) break;
      missingCourses.push({
        code: c.code,
        name: c.name || 'Tự chọn cơ sở ngành',
        credits: Number(c.credits) || 3,
        groupCode: 'TC209',
        requirementGroup: 'TC209',
        specialization: null,
        prerequisites: c.prerequisites || [],
        priorCourses: c.priorCourses || [],
        isElective: true,
        isInternship: false,
        isGraduation: false
      });
      tc209NeededCredits -= (Number(c.credits) || 3);
    }
  }

  // D. Tự chọn chuyên ngành (TC309: yêu cầu 3 môn / 9 TC)
  // Phân tích toàn bộ danh mục ứng viên TC309 và tạo danh sách lựa chọn hợp lệ
  const tc309Rule = groupsConfig.TC309 || {};
  const tc309RequiredCredits = tc309Rule.requiredCredits || 9;
  const tc309Earned = progress.groups?.TC309?.earnedCredits || 0;
  const tc309InProgress = includeCurrentInProgress
    ? (progress.groups?.TC309?.inProgressCredits || 0)
    : 0;
  let tc309NeededCredits = Math.max(0, tc309RequiredCredits - (tc309Earned + tc309InProgress));

  // Tập hợp tất cả các môn thuộc nhóm TC309 trong khung K30
  const allTC309Courses = allCurriculumCourses.filter(c => c.groupCode === 'TC309');
  const availableTC309Candidates = allTC309Courses.map(c => {
    const isPassed = completedCodes.has(c.code);
    const isInProgress = inProgressCodes.has(c.code);
    const prereqsMet = (c.prerequisites || []).every(req => assumedPassedCodes.has(extractCleanCourseCode(req)));
    const priorsMet = (c.priorCourses || []).every(req => assumedPassedCodes.has(extractCleanCourseCode(req)));
    const eligible = !isPassed && !isInProgress && prereqsMet && priorsMet;

    let reason = 'Đủ điều kiện đăng ký học';
    if (isPassed) {
      reason = 'Đã hoàn thành ở học kỳ trước (đã tính vào 88 TC tích lũy)';
    } else if (isInProgress) {
      reason = 'Đang học tại học kỳ hiện tại (giả định hoàn thành)';
    } else if (!prereqsMet) {
      reason = `Chưa đạt môn tiên quyết bắt buộc: ${(c.prerequisites || []).join(', ')}`;
    } else if (!priorsMet) {
      const priorNames = (c.priorCourses || []).map(p => `${p} (${courseMap.get(p)?.name || ''})`).join(', ');
      reason = `Chưa hoàn thành môn học trước: ${priorNames}`;
    } else if (c.priorCourses?.length > 0) {
      const priorNames = c.priorCourses.map(p => `${p} (${courseMap.get(p)?.name || ''})`).join(', ');
      reason = `Đã hoàn thành môn học trước: ${priorNames}`;
    }

    return {
      code: c.code,
      name: c.name,
      credits: Number(c.credits) || 3,
      groupCode: 'TC309',
      groupName: 'Tự chọn chuyên ngành',
      prerequisites: c.prerequisites || [],
      priorCourses: c.priorCourses || [],
      isPassed,
      isInProgress,
      eligible,
      reason
    };
  });

  const eligibleUnpassedTC309 = availableTC309Candidates.filter(c => c.eligible);

  // Chọn môn TC309: Người dùng có thể chỉ định hoặc bấm Gợi ý lại để luân chuyển
  let selectedTC309Code = userPreferences.selectedElectiveTC309 || userPreferences.selectedElectives?.TC309;

  // Nếu bấm "Gợi ý lại" và yêu cầu luân chuyển:
  if (userPreferences.cycleElective && eligibleUnpassedTC309.length > 1) {
    const currentCode = userPreferences.currentElectiveTC309;
    const currentIndex = eligibleUnpassedTC309.findIndex(c => c.code === currentCode);
    const nextIndex = (currentIndex + 1) % eligibleUnpassedTC309.length;
    selectedTC309Code = eligibleUnpassedTC309[nextIndex]?.code;
  }

  // Ưu tiên theo thứ tự: Lập trình Java nâng cao (71ITSE30803) -> Kiểm thử tự động (71ITSE41603) -> Hệ Quản trị CSDL (71ITIS30203) -> Các môn còn lại
  let chosenTC309 = eligibleUnpassedTC309.find(c => c.code === selectedTC309Code);
  if (!chosenTC309) {
    chosenTC309 = eligibleUnpassedTC309.find(c => c.code === '71ITSE30803') ||
                  eligibleUnpassedTC309.find(c => c.code === '71ITSE41603') ||
                  eligibleUnpassedTC309[0];
  }

  if (tc309NeededCredits > 0 && chosenTC309) {
    const priorArr = chosenTC309.priorCourses || [];
    const conditionText = priorArr.length > 0
      ? `Học trước: ${priorArr.map(p => `${p} (${courseMap.get(p)?.name || 'Môn cơ sở'})`).join(', ')}`
      : 'Không có điều kiện học trước';

    missingCourses.push({
      code: chosenTC309.code,
      name: chosenTC309.name,
      credits: chosenTC309.credits,
      groupCode: 'TC309',
      requirementGroup: 'TC309',
      groupName: 'Tự chọn chuyên ngành',
      specialization: null,
      prerequisites: chosenTC309.prerequisites || [],
      priorCourses: priorArr,
      conditionText,
      isElective: true,
      isInternship: false,
      isGraduation: false,
      reason: `Môn tự chọn chuyên ngành được đề xuất (${chosenTC309.reason})`
    });
  }

  // E. Thực tập doanh nghiệp (71ITIN40304 - 4 TC)
  const internshipCodes = groupsConfig.internship?.courseCodes || ['71ITIN40304'];
  for (const code of internshipCodes) {
    if (!assumedPassedCodes.has(code)) {
      const c = courseMap.get(code) || {
        code: '71ITIN40304',
        name: 'Đồ án thực tập doanh nghiệp',
        credits: 4,
        groupCode: 'BB',
        requirementGroup: 'internship'
      };
      missingCourses.push({
        code: c.code,
        name: c.name || 'Đồ án thực tập doanh nghiệp',
        credits: Number(c.credits) || 4,
        groupCode: 'BB',
        requirementGroup: 'internship',
        specialization: null,
        prerequisites: c.prerequisites || [],
        priorCourses: c.priorCourses || [],
        conditionText: 'Điều kiện: Tích lũy tối thiểu 90 tín chỉ và đã hoàn thành các môn cơ sở chuyên ngành cốt lõi',
        isElective: false,
        isInternship: true,
        isGraduation: false
      });
    }
  }

  // F. Khối tốt nghiệp (TC406 - 6 TC)
  const tc406Rule = groupsConfig.TC406 || {};
  const graduationOption = userPreferences.graduationType || userPreferences.graduationOption || 'thesis';
  const isAlreadyDone406 = progress.groups?.TC406?.complete;

  if (!isAlreadyDone406) {
    if (graduationOption === 'topics' || graduationOption === 'courses') {
      // 2 học phần thay thế khóa luận
      const altCodes = ['71ITGR40203', '71ITGR40303'];
      for (const code of altCodes) {
        if (!assumedPassedCodes.has(code)) {
          const c = courseMap.get(code) || {
            code,
            name: code === '71ITGR40203' ? 'Chuyên đề tốt nghiệp 1' : 'Chuyên đề tốt nghiệp 2',
            credits: 3,
            groupCode: 'TC406',
            requirementGroup: 'TC406'
          };
          missingCourses.push({
            code: c.code,
            name: c.name,
            credits: Number(c.credits) || 3,
            groupCode: 'TC406',
            requirementGroup: 'TC406',
            specialization: null,
            prerequisites: c.prerequisites || [],
            priorCourses: c.priorCourses || [],
            conditionText: 'Điều kiện: Đã hoàn thành thực tập và các học phần chuyên ngành',
            isElective: false,
            isInternship: false,
            isGraduation: true
          });
        }
      }
    } else {
      // Khóa luận tốt nghiệp (71ITGR40206 - 6 TC)
      const thesisCode = '71ITGR40206';
      if (!assumedPassedCodes.has(thesisCode)) {
        const c = courseMap.get(thesisCode) || {
          code: thesisCode,
          name: 'Đồ án tốt nghiệp / Khóa luận tốt nghiệp',
          credits: 6,
          groupCode: 'TC406',
          requirementGroup: 'TC406'
        };
        missingCourses.push({
          code: c.code,
          name: c.name || 'Đồ án tốt nghiệp / Khóa luận tốt nghiệp',
          credits: Number(c.credits) || 6,
          groupCode: 'TC406',
          requirementGroup: 'TC406',
          specialization: null,
          prerequisites: c.prerequisites || [],
          priorCourses: c.priorCourses || [],
          conditionText: 'Điều kiện: Hoàn tất toàn bộ các môn học trước kỳ cuối và được khoa phê duyệt đề tài',
          isElective: false,
          isInternship: false,
          isGraduation: true
        });
      }
    }
  }

  // 3. Tính điểm ưu tiên / Đồ thị phụ thuộc (Critical Path)
  const unlocksMap = new Map();
  for (const c of allCurriculumCourses) {
    const prereqs = (c.prerequisites || []).map(extractCleanCourseCode);
    const priors = (c.priorCourses || []).map(extractCleanCourseCode);
    for (const req of [...prereqs, ...priors]) {
      if (!unlocksMap.has(req)) unlocksMap.set(req, []);
      unlocksMap.get(req).push(c.code);
    }
  }

  missingCourses.forEach(c => {
    c.unlockedCourses = unlocksMap.get(c.code) || [];
    c.unlockScore = c.unlockedCourses.length;
  });

  // Xác định học kỳ bắt đầu
  const startSemester = userPreferences.startSemester || '2026-2027 HK02';

  // Lấy dữ liệu các lớp học phần thực tế đã được mở trong DB (schedules collection)
  let actualClasses = [];
  try {
    actualClasses = await scheduleRepo.findMany({ limit: 200 });
    if (actualClasses?.items) actualClasses = actualClasses.items;
  } catch {}

  // Thông số tín chỉ thực tế từ tiến độ
  const initialEarnedCredits = Number(progress.earnedCredits) || 0;
  const initialInProgressCredits = Number(progress.inProgressCredits) || 0;
  const targetDegreeCredits = Number(progress.totalCredits) || Number(curriculum.totalCredits) || 126;

  // 4. Sinh 3 phương án học tập: Balanced (Cân bằng), Light (Nhẹ hơn mỗi kỳ), Fast (Ưu tiên hoàn thành sớm)
  const options = {
    balanced: generatePlanOption({
      pace: 'balanced',
      label: 'Cân bằng (Khuyên dùng)',
      description: 'Phân bổ cân đối số môn mỗi kỳ (Kỳ 1 học 4 môn chuyên ngành 13 TC, Kỳ 2 làm khóa luận tốt nghiệp 6 TC), đảm bảo tối ưu thời gian nghỉ.',
      missingCourses: [...missingCourses],
      assumedPassedCodes: new Set(assumedPassedCodes),
      initialEarnedCredits,
      initialInProgressCredits,
      targetDegreeCredits,
      includeCurrentInProgress,
      startSemester,
      targetGraduationSemester: userPreferences.targetGraduationSemester,
      minCredits: 12,
      maxCredits: 16,
      maxConsecutiveShifts: userPreferences.maxConsecutiveShifts || 2,
      preferredDaysPerWeek: userPreferences.preferredDaysPerWeek || 4,
      preferredShifts: userPreferences.preferredShifts || [1, 2, 3],
      blockedSlots: userPreferences.blockedSlots || [],
      avoidNightMorning: userPreferences.avoidNightMorning !== false,
      actualClasses,
      courseMap
    }),
    light: generatePlanOption({
      pace: 'light',
      label: 'Nhẹ hơn mỗi kỳ (Giảm tải)',
      description: 'Giảm tải số môn: Kỳ 1 học 3 môn lý thuyết (9 TC), Kỳ 2 dành trọn thời gian Thực tập doanh nghiệp (4 TC), Kỳ 3 tập trung Khóa luận tốt nghiệp (6 TC).',
      missingCourses: [...missingCourses],
      assumedPassedCodes: new Set(assumedPassedCodes),
      initialEarnedCredits,
      initialInProgressCredits,
      targetDegreeCredits,
      includeCurrentInProgress,
      startSemester,
      targetGraduationSemester: userPreferences.targetGraduationSemester,
      minCredits: 8,
      maxCredits: 9, // Đảm bảo kỳ 1 chỉ 3 môn (9 TC), kỳ 2 thực tập (4 TC), kỳ 3 khóa luận (6 TC)
      maxConsecutiveShifts: 2,
      preferredDaysPerWeek: 3,
      preferredShifts: userPreferences.preferredShifts || [1, 2, 3],
      blockedSlots: userPreferences.blockedSlots || [],
      avoidNightMorning: true,
      actualClasses,
      courseMap
    }),
    fast: generatePlanOption({
      pace: 'fast',
      label: 'Ưu tiên hoàn thành sớm',
      description: 'Tận dụng tối đa các môn đã đủ điều kiện tiên quyết, kết hợp làm đồ án thực tập để rút ngắn thời gian hoàn tất chương trình.',
      missingCourses: [...missingCourses],
      assumedPassedCodes: new Set(assumedPassedCodes),
      initialEarnedCredits,
      initialInProgressCredits,
      targetDegreeCredits,
      includeCurrentInProgress,
      startSemester,
      targetGraduationSemester: userPreferences.targetGraduationSemester,
      minCredits: 13,
      maxCredits: 18,
      maxConsecutiveShifts: 3,
      preferredDaysPerWeek: 5,
      preferredShifts: userPreferences.preferredShifts || [1, 2, 3, 4],
      blockedSlots: userPreferences.blockedSlots || [],
      avoidNightMorning: userPreferences.avoidNightMorning !== false,
      actualClasses,
      courseMap
    })
  };

  const totalMissingCredits = missingCourses.reduce((sum, c) => sum + c.credits, 0);

  // 5. Bảng đối chiếu toàn bộ môn học trong khung đào tạo (Full Curriculum Audit)
  const fullCurriculumAudit = allCurriculumCourses.map(c => {
    let status = 'unselected';
    let statusText = 'Chưa học';
    let reason = 'Chưa đăng ký';
    let plannedSemester = null;

    if (completedCodes.has(c.code)) {
      status = 'passed';
      statusText = 'Đã hoàn thành';
      reason = 'Đã tích lũy trong 88 tín chỉ thực tế';
    } else if (inProgressCodes.has(c.code)) {
      status = 'in_progress';
      statusText = 'Đang học';
      reason = 'Đang học học kỳ hiện tại (giả định hoàn thành)';
    } else if (c.specialization && c.specialization !== specialization) {
      status = 'other_specialization';
      statusText = 'Chuyên ngành khác';
      reason = `Thuộc chuyên ngành ${c.specialization === 'ai' ? 'Trí tuệ nhân tạo' : 'Công nghệ dữ liệu'}, không áp dụng cho sinh viên CNPM`;
    } else if (c.code === chosenTC309?.code) {
      status = 'planned';
      statusText = 'Được đề xuất';
      reason = 'Môn tự chọn chuyên ngành (TC309) được phân bổ vào học kỳ tới';
      plannedSemester = '2026-2027 HK02';
    } else if (c.groupCode === 'TC309' || c.groupCode === 'TC209') {
      status = 'not_selected_elective';
      statusText = 'Tự chọn thay thế';
      reason = c.groupCode === 'TC209' 
        ? 'Đã hoàn thành đủ định mức 3 môn / 9 TC nhóm TC209' 
        : 'Môn tự chọn nhóm TC309 hợp lệ, có thể đổi thay thế';
    } else if (missingCourses.some(mc => mc.code === c.code)) {
      status = 'planned';
      statusText = 'Được đề xuất';
      reason = c.code === '71ITIN40304' 
        ? 'Học phần thực tập doanh nghiệp bắt buộc' 
        : (c.code === '71ITGR40206' || c.code === '71ITGR40203' || c.code === '71ITGR40303')
          ? 'Học phần tốt nghiệp bắt buộc hoàn tất khóa học' 
          : 'Môn bắt buộc chuyên ngành CNPM còn thiếu';
      plannedSemester = c.code === '71ITGR40206' ? 'Kỳ tốt nghiệp' : '2026-2027 HK02';
    }

    return {
      code: c.code,
      name: c.name,
      credits: Number(c.credits) || 3,
      groupCode: c.groupCode,
      groupName: getFriendlyGroupName(c.requirementGroup || c.groupCode),
      specialization: c.specialization,
      isCurrentSpecialization: !c.specialization || c.specialization === specialization,
      status,
      statusText,
      plannedSemester,
      reason,
      prerequisites: c.prerequisites || [],
      priorCourses: c.priorCourses || []
    };
  });

  return {
    student: {
      mssv: student.mssv,
      fullName: student.fullName,
      className: student.className,
      cohort: student.cohort,
      specialization,
      specializationName: specialization === 'software' ? 'Công nghệ Phần mềm' : specialization === 'data' ? 'Công nghệ Dữ liệu' : 'Trí tuệ Nhân tạo'
    },
    academicStatus: {
      earnedCredits: initialEarnedCredits,
      inProgressCredits: initialInProgressCredits,
      totalCredits: targetDegreeCredits,
      remainingCredits: totalMissingCredits,
      missingCoursesCount: missingCourses.length,
      totalMissingCredits,
      physicalCompleted: progress.groups?.TC002?.complete && progress.groups?.TC102?.complete,
      defenseCompleted: progress.groups?.defense?.complete,
      inProgressCourses: inProgressCoursesList.map(c => ({
        code: c.code,
        name: c.name,
        credits: c.credits,
        status: 'Đang học (giả định hoàn thành)'
      })),
      explanation: `Bảng điểm hiện tại có ${initialEarnedCredits} TC tích lũy và ${initialInProgressCredits} TC đang học. Với giả định ${initialInProgressCredits} TC đang học sẽ đạt, hệ thống phân bổ đúng ${totalMissingCredits} TC còn lại (gồm 2 môn BB chuyên ngành, 1 môn TC309, 1 đồ án thực tập và 1 đồ án tốt nghiệp) vào các học kỳ tiếp theo để hoàn tất trọn vẹn ${targetDegreeCredits} TC ra trường.`,
      assumptions: [
        `Toàn bộ ${initialInProgressCredits} tín chỉ đang học tại HK hiện tại được giả định sẽ thi ĐẠT để mở môn học trước cho các kỳ tiếp theo.`,
        'Thời khóa biểu các học kỳ tương lai được bố trí theo ca học chuẩn VLU (Ca 1 - 5) kèm thời gian giải lao và nghỉ trưa 12:00 - 13:00.',
        'Các học kỳ chưa có lịch lớp mở chính thức từ nhà trường được ghi chú rõ ràng là Khung lịch đề xuất.'
      ]
    },
    availableElectives: {
      TC309: availableTC309Candidates,
      currentSelectedCode: chosenTC309?.code || '71ITSE30803'
    },
    fullCurriculumAudit,
    options
  };
}

/**
 * Thuật toán sinh từng phương án kế hoạch học tập
 */
function generatePlanOption({
  pace,
  label,
  description,
  missingCourses,
  assumedPassedCodes,
  initialEarnedCredits,
  initialInProgressCredits,
  targetDegreeCredits,
  includeCurrentInProgress,
  startSemester,
  targetGraduationSemester,
  minCredits,
  maxCredits,
  maxConsecutiveShifts,
  preferredDaysPerWeek,
  preferredShifts,
  blockedSlots,
  avoidNightMorning,
  actualClasses,
  courseMap
}) {
  const semestersMeta = getNextSemesters(startSemester, 7);
  const plannedSemesters = [];
  const passedSoFar = new Set(assumedPassedCodes);
  let remainingQueue = [...missingCourses];

  // Khởi tạo mức tích lũy cơ sở dựa theo tiến độ thật
  let cumulativeCredits = includeCurrentInProgress 
    ? (initialEarnedCredits + initialInProgressCredits) 
    : initialEarnedCredits;

  // Tách riêng môn Thực tập và Khối tốt nghiệp
  let unallocatedInternship = remainingQueue.find(c => c.isInternship) || null;
  let unallocatedGraduation = remainingQueue.filter(c => c.isGraduation);
  remainingQueue = remainingQueue.filter(c => !c.isInternship && !c.isGraduation);

  for (let sIdx = 0; sIdx < semestersMeta.length; sIdx++) {
    if (remainingQueue.length === 0 && !unallocatedInternship && unallocatedGraduation.length === 0) {
      break;
    }

    const currentSem = semestersMeta[sIdx];
    const semCourses = [];
    let semCredits = 0;

    // 1. Kiểm tra môn đủ điều kiện tiên quyết ở học kỳ này
    const availableForSem = remainingQueue.filter(course => {
      const prereqsMet = (course.prerequisites || []).every(req => passedSoFar.has(extractCleanCourseCode(req)));
      const priorsMet = (course.priorCourses || []).every(req => passedSoFar.has(extractCleanCourseCode(req)));
      return prereqsMet && priorsMet;
    });

    // Sắp xếp môn: Ưu tiên môn Bắt buộc chuyên ngành trước, sau đó là môn có điểm mở đường (unlockScore) cao
    availableForSem.sort((a, b) => {
      if (a.requirementGroup === 'specializationRequired' && b.requirementGroup !== 'specializationRequired') return -1;
      if (b.requirementGroup === 'specializationRequired' && a.requirementGroup !== 'specializationRequired') return 1;
      if (b.unlockScore !== a.unlockScore) return b.unlockScore - a.unlockScore;
      return b.credits - a.credits;
    });

    // Chọn các môn đưa vào kỳ hiện tại (không vượt quá maxCredits)
    for (const course of availableForSem) {
      if (semCredits + course.credits <= maxCredits) {
        semCourses.push({
          ...course,
          name: course.name || courseMap.get(course.code)?.name || 'Môn học',
          groupName: getFriendlyGroupName(course.requirementGroup || course.groupCode),
          reason: course.unlockScore > 0 
            ? `Ưu tiên mở đường cho ${course.unlockScore} môn học tiếp theo (${course.unlockedCourses.slice(0, 2).join(', ')})` 
            : course.requirementGroup === 'specializationRequired' 
              ? 'Môn bắt buộc chuyên ngành CNPM cần hoàn thành theo tiến độ' 
              : 'Môn tự chọn chuyên ngành (TC309) phù hợp để hoàn tất định mức'
        });
        semCredits += course.credits;
      }
    }

    // Cập nhật remainingQueue
    const selectedCodes = new Set(semCourses.map(c => c.code));
    remainingQueue = remainingQueue.filter(c => !selectedCodes.has(c.code));

    // 2. Xử lý môn Thực tập doanh nghiệp
    // Ở chế độ "light", không nhồi thực tập vào kỳ 1; xếp thực tập sang kỳ 2 riêng biệt
    const canScheduleInternshipNow = pace === 'light' 
      ? (sIdx >= 1 && unallocatedInternship && semCourses.length === 0)
      : (unallocatedInternship && (currentSem.yearOfStudy >= 4 || (currentSem.yearOfStudy === 3 && currentSem.term === 'HK03') || remainingQueue.length <= 1));

    if (canScheduleInternshipNow) {
      const internshipCap = pace === 'light' ? 6 : (maxCredits + 2);
      if (semCredits + unallocatedInternship.credits <= internshipCap) {
        semCourses.push({
          ...unallocatedInternship,
          name: unallocatedInternship.name || 'Đồ án thực tập doanh nghiệp',
          groupName: 'Thực tập doanh nghiệp',
          reason: 'Kỳ thực tập doanh nghiệp thực tế tại công ty công nghệ'
        });
        semCredits += unallocatedInternship.credits;
        unallocatedInternship = null; // Đã xếp xong
      }
    }

    // 3. Xử lý Khối tốt nghiệp (Xếp vào kỳ riêng biệt hoặc kỳ cuối cùng khi các môn lý thuyết đã xong)
    if (unallocatedGraduation.length > 0 && remainingQueue.length === 0 && !unallocatedInternship) {
      const gradTotalCredits = unallocatedGraduation.reduce((s, c) => s + c.credits, 0);
      const canBundleGraduation = semCredits === 0 || (pace === 'fast' && semCredits + gradTotalCredits <= 16);
      if (canBundleGraduation) {
        unallocatedGraduation.forEach(c => {
          semCourses.push({
            ...c,
            name: c.name || (c.code === '71ITGR40206' ? 'Đồ án tốt nghiệp / Khóa luận tốt nghiệp' : 'Chuyên đề tốt nghiệp'),
            groupName: 'Khối tốt nghiệp',
            reason: c.code === '71ITGR40206' 
              ? 'Khóa luận tốt nghiệp cuối khóa hoàn tất chương trình đào tạo' 
              : 'Học phần chuyên đề tốt nghiệp thay thế khóa luận'
          });
          semCredits += c.credits;
        });
        unallocatedGraduation = []; // Đã xếp xong
      }
    }

    // Cập nhật danh sách môn đã đạt cho các kỳ tiếp theo
    semCourses.forEach(c => passedSoFar.add(c.code));
    cumulativeCredits += semCredits;

    if (semCourses.length > 0) {
      // 4. Lập lịch học chi tiết cho từng môn trong kỳ (Phân ca & bố trí thời gian nghỉ)
      const scheduledCourses = scheduleCoursesIntoWeeklyGrid({
        semester: currentSem.semester,
        courses: semCourses,
        actualClasses,
        preferredShifts,
        preferredDaysPerWeek,
        blockedSlots,
        maxConsecutiveShifts,
        avoidNightMorning,
        courseMap
      });

      plannedSemesters.push({
        semester: currentSem.semester,
        academicYear: currentSem.academicYear,
        term: currentSem.term,
        yearOfStudy: currentSem.yearOfStudy,
        yearLabel: currentSem.yearLabel,
        courses: scheduledCourses,
        totalCredits: semCredits,
        totalCourses: scheduledCourses.length,
        projectedCumulativeCredits: Math.min(targetDegreeCredits, cumulativeCredits),
        fulfilledGroups: [...new Set(scheduledCourses.map(c => c.requirementGroup))],
        notes: semCourses.some(c => c.isGraduation) 
          ? `🎓 Học kỳ dự kiến tốt nghiệp và hoàn tất toàn bộ ${targetDegreeCredits} tín chỉ K30 CNTT.` 
          : semCourses.some(c => c.isInternship) 
            ? '🏢 Học kỳ kết hợp thực tập doanh nghiệp tại đơn vị liên kết.' 
            : '📚 Học kỳ tăng cường các môn chuyên ngành và tích lũy học phần trọng điểm.'
      });
    }
  }

  // Nếu còn môn chưa xếp hết (ví dụ do giới hạn tín chỉ quá thấp ở chế độ light)
  if (remainingQueue.length > 0 || unallocatedGraduation.length > 0 || unallocatedInternship) {
    const lastMeta = semestersMeta[plannedSemesters.length] || {
      semester: '2028-2029 HK01',
      academicYear: '2028-2029',
      term: 'HK01',
      yearOfStudy: 4,
      yearLabel: 'Năm 4'
    };
    const finalCourses = [...remainingQueue, ...(unallocatedInternship ? [unallocatedInternship] : []), ...unallocatedGraduation];
    const finalCredits = finalCourses.reduce((s, c) => s + c.credits, 0);
    cumulativeCredits += finalCredits;

    const scheduledCourses = scheduleCoursesIntoWeeklyGrid({
      semester: lastMeta.semester,
      courses: finalCourses,
      actualClasses,
      preferredShifts,
      preferredDaysPerWeek,
      blockedSlots,
      maxConsecutiveShifts,
      avoidNightMorning,
      courseMap
    });

    plannedSemesters.push({
      semester: lastMeta.semester,
      academicYear: lastMeta.academicYear,
      term: lastMeta.term,
      yearOfStudy: lastMeta.yearOfStudy,
      yearLabel: lastMeta.yearLabel,
      courses: scheduledCourses,
      totalCredits: finalCredits,
      totalCourses: finalCourses.length,
      projectedCumulativeCredits: Math.min(targetDegreeCredits, cumulativeCredits),
      fulfilledGroups: [...new Set(scheduledCourses.map(c => c.requirementGroup))],
      notes: '🎓 Học kỳ tốt nghiệp hoàn tất toàn bộ môn học còn lại.'
    });
  }

  const totalPlannedCredits = plannedSemesters.reduce((s, sem) => s + sem.totalCredits, 0);
  const targetEndSemester = plannedSemesters[plannedSemesters.length - 1]?.semester || '';

  return {
    pace,
    label,
    description,
    totalSemesters: plannedSemesters.length,
    totalPlannedCredits,
    targetEndSemester,
    plannedSemesters,
    unscheduledCourses: []
  };
}

/**
 * Xếp môn vào lưới thời khóa biểu trong tuần (Thứ 2 - Thứ 7, Ca 1 - 5)
 * Tuân thủ thời gian nghỉ trưa (12:00-13:00), khoảng nghỉ giữa các ca, tránh tối rồi sáng sớm
 */
function scheduleCoursesIntoWeeklyGrid({
  semester,
  courses,
  actualClasses = [],
  preferredShifts = [1, 2, 3],
  preferredDaysPerWeek = 4,
  blockedSlots = [],
  maxConsecutiveShifts = 2,
  avoidNightMorning = true,
  courseMap = new Map()
}) {
  const blockedMap = new Set(blockedSlots.map(b => `${b.dayOfWeek}_${b.shift}`));
  const occupiedSlots = new Map(); // key: "day_shift" -> course
  const allowedDays = [2, 3, 4, 5, 6, 7];

  return courses.map((course, idx) => {
    const courseCode = course.code || course.courseCode;
    const resolvedName = course.name || course.courseName || courseMap.get(courseCode)?.name || 'Môn học';
    const groupName = course.groupName || getFriendlyGroupName(course.requirementGroup || course.groupCode);

    // 1. Kiểm tra xem có lớp học phần mở thực tế trong database cho kỳ này không
    const realClass = actualClasses.find(
      ac => ac.courseCode === courseCode && ac.semester === semester
    );

    if (realClass) {
      const shiftNum = realClass.startPeriod <= 3 ? 1 : realClass.startPeriod <= 6 ? 2 : realClass.startPeriod <= 9 ? 3 : realClass.startPeriod <= 12 ? 4 : 5;
      occupiedSlots.set(`${realClass.dayOfWeek}_${shiftNum}`, courseCode);
      const scheduleObj = {
        dayOfWeek: realClass.dayOfWeek,
        dayOfWeekText: realClass.dayOfWeekText || DAY_NAMES[realClass.dayOfWeek] || 'Thứ Hai',
        shift: shiftNum,
        shiftName: `Ca ${shiftNum}`,
        startPeriod: realClass.startPeriod,
        endPeriod: realClass.endPeriod,
        startTime: realClass.startTime,
        endTime: realClass.endTime,
        room: realClass.room || 'Phòng học chính thức',
        lecturer: realClass.lecturer || 'Giảng viên khoa CNTT',
        classSection: realClass.classSection || 'K30 CNTT',
        isActualClass: true
      };

      return {
        ...course,
        code: courseCode,
        courseCode,
        name: resolvedName,
        courseName: resolvedName,
        groupName,
        requirementGroupName: groupName,
        dayOfWeek: scheduleObj.dayOfWeek,
        dayOfWeekText: scheduleObj.dayOfWeekText,
        shift: scheduleObj.shift,
        shiftName: scheduleObj.shiftName,
        startPeriod: scheduleObj.startPeriod,
        endPeriod: scheduleObj.endPeriod,
        startTime: scheduleObj.startTime,
        endTime: scheduleObj.endTime,
        timeRange: `${scheduleObj.startTime} - ${scheduleObj.endTime}`,
        room: scheduleObj.room,
        lecturer: scheduleObj.lecturer,
        isActualClass: true,
        sourceType: 'actual_class',
        conditionText: course.conditionText || '',
        suggestedSchedule: scheduleObj
      };
    }

    // 2. Nếu là môn thực tập doanh nghiệp
    if (course.isInternship) {
      const scheduleObj = {
        dayOfWeek: 2,
        dayOfWeekText: 'Thứ Hai - Thứ Sáu',
        shift: 0,
        shiftName: 'Giờ hành chính',
        startPeriod: 1,
        endPeriod: 8,
        startTime: '08:00',
        endTime: '17:00',
        room: 'Doanh nghiệp tiếp nhận thực tập',
        lecturer: 'Người hướng dẫn DN & GV Phụ trách',
        isActualClass: false
      };

      return {
        ...course,
        code: courseCode,
        courseCode,
        name: resolvedName,
        courseName: resolvedName,
        groupName: 'Thực tập doanh nghiệp',
        requirementGroupName: 'Thực tập doanh nghiệp',
        dayOfWeek: scheduleObj.dayOfWeek,
        dayOfWeekText: scheduleObj.dayOfWeekText,
        shift: 0,
        shiftName: scheduleObj.shiftName,
        startPeriod: 1,
        endPeriod: 8,
        startTime: '08:00',
        endTime: '17:00',
        timeRange: '08:00 - 17:00',
        room: scheduleObj.room,
        lecturer: scheduleObj.lecturer,
        isActualClass: false,
        sourceType: 'suggested_slot',
        conditionText: course.conditionText || 'Điều kiện: Tích lũy tối thiểu 90 tín chỉ',
        suggestedSchedule: scheduleObj
      };
    }

    // 3. Nếu là Khóa luận tốt nghiệp
    if (course.isGraduation && courseCode === '71ITGR40206') {
      const scheduleObj = {
        dayOfWeek: 7,
        dayOfWeekText: 'Thứ Bảy',
        shift: 2,
        shiftName: 'Ca 2',
        startPeriod: 4,
        endPeriod: 6,
        startTime: '09:35',
        endTime: '12:00',
        room: 'Phòng Seminar / Hội đồng bảo vệ',
        lecturer: 'Giảng viên hướng dẫn khóa luận',
        isActualClass: false
      };

      return {
        ...course,
        code: courseCode,
        courseCode,
        name: resolvedName,
        courseName: resolvedName,
        groupName: 'Khối tốt nghiệp',
        requirementGroupName: 'Khối tốt nghiệp',
        dayOfWeek: 7,
        dayOfWeekText: 'Thứ Bảy',
        shift: 2,
        shiftName: 'Ca 2',
        startPeriod: 4,
        endPeriod: 6,
        startTime: '09:35',
        endTime: '12:00',
        timeRange: '09:35 - 12:00',
        room: scheduleObj.room,
        lecturer: scheduleObj.lecturer,
        isActualClass: false,
        sourceType: 'suggested_slot',
        conditionText: course.conditionText || 'Điều kiện: Hoàn tất các môn học trước kỳ cuối',
        suggestedSchedule: scheduleObj
      };
    }

    // 4. Phân bổ ca học thông minh cho môn lý thuyết / thực hành (Ca 1 - 5)
    let bestDay = 2;
    let bestShift = 1;
    let foundSlot = false;

    // Thứ tự ca ưu tiên: theo sở thích sinh viên trước, sau đó là các ca còn lại
    const shiftCandidates = [
      ...preferredShifts,
      ...[1, 2, 3, 4, 5].filter(s => !preferredShifts.includes(s))
    ];

    for (const shift of shiftCandidates) {
      for (const day of allowedDays) {
        const slotKey = `${day}_${shift}`;
        
        // Không xếp vào slot bận của sinh viên
        if (blockedMap.has(slotKey)) continue;

        // Không xếp trùng môn
        if (occupiedSlots.has(slotKey)) continue;

        // Tránh học ca 5 (tối) rồi ca 1 (sáng sớm hôm sau)
        if (avoidNightMorning) {
          if (shift === 1 && occupiedSlots.has(`${day - 1}_5`)) continue;
          if (shift === 5 && occupiedSlots.has(`${day + 1}_1`)) continue;
        }

        // Đếm số ca đã có trong ngày đó (không vượt quá maxConsecutiveShifts)
        let dayShiftsCount = 0;
        for (let s = 1; s <= 5; s++) {
          if (occupiedSlots.has(`${day}_${s}`)) dayShiftsCount++;
        }
        if (dayShiftsCount >= maxConsecutiveShifts) continue;

        bestDay = day;
        bestShift = shift;
        foundSlot = true;
        break;
      }
      if (foundSlot) break;
    }

    // Ghi nhận slot đã được sử dụng
    occupiedSlots.set(`${bestDay}_${bestShift}`, courseCode);

    const shiftInfo = VLU_SHIFTS.find(s => s.shift === bestShift) || VLU_SHIFTS[0];
    const scheduleObj = {
      dayOfWeek: bestDay,
      dayOfWeekText: DAY_NAMES[bestDay] || 'Thứ Hai',
      shift: bestShift,
      shiftName: `Ca ${bestShift}`,
      startPeriod: (bestShift - 1) * 3 + 1,
      endPeriod: bestShift === 5 ? 16 : ((bestShift - 1) * 3 + 3),
      startTime: shiftInfo.startTime,
      endTime: shiftInfo.endTime,
      room: 'Phòng học CS3 (Gợi ý khung)',
      lecturer: 'Bộ môn phân công giảng viên',
      isActualClass: false
    };

    return {
      ...course,
      code: courseCode,
      courseCode,
      name: resolvedName,
      courseName: resolvedName,
      groupName,
      requirementGroupName: groupName,
      dayOfWeek: bestDay,
      dayOfWeekText: scheduleObj.dayOfWeekText,
      shift: bestShift,
      shiftName: scheduleObj.shiftName,
      startPeriod: scheduleObj.startPeriod,
      endPeriod: scheduleObj.endPeriod,
      startTime: scheduleObj.startTime,
      endTime: scheduleObj.endTime,
      timeRange: `${scheduleObj.startTime} - ${scheduleObj.endTime}`,
      room: scheduleObj.room,
      lecturer: scheduleObj.lecturer,
      isActualClass: false,
      sourceType: 'suggested_slot',
      conditionText: course.conditionText || '',
      suggestedSchedule: scheduleObj
    };
  });
}

/**
 * Lưu kế hoạch học tập đã chọn vào MongoDB
 */
export async function saveStudentStudyPlan(mssv, planData, userId = null) {
  if (!mssv) throw new Error('MSSV không được để trống.');

  const filter = { mssv: mssv.trim() };
  const update = {
    ...planData,
    mssv: mssv.trim(),
    userId: userId || planData.userId || null,
    updatedAt: new Date()
  };

  const saved = await StudyPlan.findOneAndUpdate(filter, update, {
    new: true,
    upsert: true,
    setDefaultsOnInsert: true
  });

  return saved;
}

/**
 * Lấy kế hoạch học tập đã lưu của sinh viên từ MongoDB
 */
export async function getStudentStudyPlan(mssv) {
  if (!mssv) return null;
  return StudyPlan.findOne({ mssv: mssv.trim() }).lean();
}

/**
 * Trợ lý AI Thời khóa biểu chuyên biệt
 */
export async function handleScheduleAdvisorChat({ mssv, message, currentPlan = null, preferences = {} }) {
  const student = await studentRepo.findByMssv(mssv);
  if (!student) {
    return {
      reply: 'Không tìm thấy thông tin sinh viên để tư vấn thời khóa biểu. Vui lòng đăng nhập lại.',
      suggestedAction: null
    };
  }

  // Tái sử dụng engine tạo lộ trình để có số liệu chính xác
  let roadmapResult = null;
  try {
    roadmapResult = await generateStudentRoadmapPlan(student, preferences);
  } catch (err) {
    return {
      reply: `Đã xảy ra lỗi khi phân tích thời khóa biểu: ${err.message}`,
      suggestedAction: null
    };
  }

  const { student: sInfo, academicStatus, options, availableElectives } = roadmapResult;
  const currentOption = options[preferences.pace || 'balanced'] || options.balanced;
  const q = (message || '').toLowerCase();

  // 1. Câu hỏi vì sao môn giống nhau / môn bắt buộc vs tự chọn
  if (/tại sao môn giống nhau|sao không đổi|môn bắt buộc|môn tự chọn/i.test(q)) {
    return {
      reply: `### 🎯 Giải Thích Tính Nhất Quán Giữa Các Lần Gợi Ý\n\n` +
        `Các môn học được phân bổ dựa trên cấu trúc chuẩn của Khung K30 CNTT (Chuyên ngành Công nghệ Phần mềm):\n\n` +
        `1. **Môn Bắt Buộc Chuyên Ngành (Cố định)**:\n` +
        `   - **71ITSE41303** - Phân tích và thiết kế HT theo Hướng đối tượng (3 TC)\n` +
        `   - **71ITSE41503** - Quản lý dự án phần mềm (3 TC)\n` +
        `   - **71ITIN40304** - Đồ án thực tập doanh nghiệp (4 TC)\n` +
        `   - **71ITGR40206** - Khóa luận tốt nghiệp (6 TC)\n` +
        `   *(Đây là 4 học phần bắt buộc mọi sinh viên CNPM đều phải hoàn thành để tốt nghiệp, hệ thống không thể tự ý đổi sang môn khác).*\n\n` +
        `2. **Môn Tự Chọn Chuyên Ngành (TC309 - Có thể tự do thay đổi)**:\n` +
        `   - Bạn có thể bấm nút **"Đổi môn tự chọn"** ngay trên thẻ môn để chọn trong các môn hợp lệ:\n` +
        `     + **71ITSE30803** - Lập trình Java nâng cao (Đã học trước Lập trình Java)\n` +
        `     + **71ITSE41603** - Kiểm thử tự động (Đang học môn trước Kiểm thử PM)\n` +
        `     + **71ITIS30203** - Hệ Quản trị Cơ sở dữ liệu (Đã học trước Cơ sở dữ liệu)\n` +
        `     + **71ITSE30703** - Lập trình di động nâng cao\n` +
        `     + **71ITNW30403** - Lập trình Hệ thống nhúng và IoT\n` +
        `     + **71ITAI51403** - Nhập môn tối ưu hóa\n\n` +
        `👉 Bạn có thể bấm **"Gợi ý lại"** để hệ thống luân chuyển sang môn tự chọn tiếp theo!`
    };
  }

  // 2. Câu hỏi về điều kiện của Quản lý dự án phần mềm / Phân tích thiết kế
  if (/quản lý dự án phần mềm|71itse41503|phân tích và thiết kế|71itse41303|tiên quyết/i.test(q)) {
    return {
      reply: `### 🔍 Đối Chiếu Điều Kiện Môn Học Theo Khung K30 CNTT Văn Lang\n\n` +
        `Theo đúng file Khung chương trình đào tạo K30 chính thức:\n` +
        `- **71ITSE41503 - Quản lý dự án phần mềm (3 TC)**:\n` +
        `  + *Môn học trước*: **71ITSE41103 - Kỹ thuật lấy yêu cầu** (Sinh viên đang học tại HK hiện tại, giả định hoàn thành để sang kỳ sau học Quản lý dự án PM).\n` +
        `  + *Tiên quyết*: Không có (Không yêu cầu tiên quyết Nhập môn CNPM).\n\n` +
        `- **71ITSE41303 - Phân tích và thiết kế hệ thống theo Hướng đối tượng (3 TC)**:\n` +
        `  + *Môn học trước*: **71ITSE41103 - Kỹ thuật lấy yêu cầu**.\n` +
        `  + *Tiên quyết*: Không có.\n\n` +
        `💡 Cả hai môn này đều đủ điều kiện xếp vào học kỳ **2026-2027 HK02** khi 19 tín chỉ ở kỳ hiện tại hoàn tất.`
    };
  }

  // 3. Câu hỏi về tạo lộ trình các kỳ sau
  if (/tạo lộ trình|lập lộ trình|kỳ sau|các kỳ tiếp theo/i.test(q)) {
    return {
      reply: `### 🚀 Đã Sẵn Sàng Tạo Lộ Trình Toàn Bộ Các Kỳ Tiếp Theo Cho Bạn\n\n` +
        `UniMate đã tự động phân bổ toàn bộ các môn còn thiếu vào các học kỳ tiếp theo cho bạn:\n` +
        `- **Số kỳ dự kiến**: **${currentOption.totalSemesters} học kỳ** (Hoàn thành vào **${currentOption.targetEndSemester}**).\n` +
        `- **Phân bổ môn học**:\n` +
        currentOption.plannedSemesters.map((sem, sIdx) => 
          `  - **${sem.semester} (${sem.yearLabel})**: ${sem.totalCourses} môn (${sem.courses.map(c => c.courseName).join(', ')})`
        ).join('\n') +
        `\n\n👉 Bạn có thể xem chi tiết thời khóa biểu từng kỳ và bấm **"Lưu lộ trình vào hệ thống"** để xác nhận kế hoạch!`
    };
  }

  // 4. Câu hỏi kỳ tới giảm một môn
  if (/giảm một môn|bớt một môn|giảm tải|học ít môn hơn/i.test(q)) {
    const lightOption = options.light;
    return {
      reply: `### ☕ Đề Xuất Giảm Tải: Chuyển Sang Phương Án "${lightOption.label}"\n\n` +
        `Nếu bạn muốn giảm bớt một môn ở học kỳ tới để lịch học nhẹ nhàng hơn:\n` +
        `- **Kỳ 1**: Học 3 môn chuyên ngành (${lightOption.plannedSemesters[0]?.courses.map(c => `**${c.courseName}**`).join(', ')}).\n` +
        `- **Kỳ 2**: Dành riêng cho **Thực tập doanh nghiệp** (4 TC, không vướng môn học khác).\n` +
        `- **Kỳ 3**: Dành riêng cho **Khóa luận tốt nghiệp** (6 TC).\n\n` +
        `👉 Bạn có thể chọn phương án **"${lightOption.label}"** ở thanh chọn phương án bên cạnh để áp dụng ngay!`,
      suggestedAction: {
        type: 'CHANGE_PACE',
        pace: 'light'
      }
    };
  }

  // 5. Câu hỏi về nghỉ cuối tuần / tránh ca 5 (ca tối)
  if (/nghỉ cuối tuần|tránh ca 5|đừng xếp ca 5|không học tối|học sáng|nghỉ t7|nghỉ chủ nhật/i.test(q)) {
    return {
      reply: `### ⏰ Gợi Ý Lịch Học Tối Ưu Giờ Nghỉ (Nghỉ Cuối Tuần & Không Xếp Ca 5)\n\n` +
        `UniMate đã tối ưu hóa lịch học theo mong muốn của bạn:\n` +
        `- **Khung giờ học**: Ưu tiên **Ca 1 (07:00 - 09:25)** và **Ca 2 (09:35 - 12:00)**; hoặc ca chiều sớm **Ca 3 (13:00 - 15:25)**.\n` +
        `- **Nghỉ trưa trọn vẹn**: **12:00 - 13:00** không xếp lịch để bạn ăn uống và nghỉ ngơi.\n` +
        `- **Tuyệt đối tránh Ca 5 (Tối)**: Không có tiết học nào vào khung 18:05 - 21:10 (Tiết 13-16).\n` +
        `- **Trọn vẹn 2 ngày nghỉ cuối tuần**: Thứ Bảy và Chủ Nhật được giữ trống hoàn toàn.\n\n` +
        `👉 Bạn hãy bấm nút **"Gợi ý lại"** hoặc áp dụng tùy chọn né Ca 5 để hệ thống cập nhật ngay trên lưới thời khóa biểu!`,
      suggestedAction: {
        type: 'APPLY_PREFERENCES',
        preferences: {
          preferredShifts: [1, 2, 3],
          avoidNightMorning: true,
          blockedDays: [7, 8]
        }
      }
    };
  }

  // 6. Mặc định tổng quan
  return {
    reply: `### 📅 Trợ Lý Thời Khóa Biểu & Lộ Trình Cá Nhân UniMate\n\n` +
      `Chào **${sInfo.fullName}**! Dựa trên bảng điểm chính thức (${academicStatus.earnedCredits} TC tích lũy + ${academicStatus.inProgressCredits} TC đang học):\n` +
      `- **Số học kỳ dự kiến**: **${currentOption.totalSemesters} kỳ** (Hoàn thành dự kiến: **${currentOption.targetEndSemester}**).\n` +
      `- **Phương án hiện tại**: **${currentOption.label}** - ${currentOption.description}\n\n` +
      `Bạn có thể yêu cầu tôi:\n` +
      `- *"Vì sao các lần gợi ý giống nhau?"*\n` +
      `- *"Kỳ tới giảm một môn."*\n` +
      `- *"Tôi muốn nghỉ cuối tuần (Thứ 7, CN)."*\n` +
      `- *"Đừng xếp ca 5 (ca tối)."*\n` +
      `- *"Điều kiện của môn Quản lý dự án phần mềm là gì?"*`,
    suggestedAction: null
  };
}

export default {
  VLU_SHIFTS,
  VLU_BREAKS,
  DAY_NAMES,
  getFriendlyGroupName,
  extractCleanCourseCode,
  getNextSemesters,
  generateStudentRoadmapPlan,
  saveStudentStudyPlan,
  getStudentStudyPlan,
  handleScheduleAdvisorChat
};
