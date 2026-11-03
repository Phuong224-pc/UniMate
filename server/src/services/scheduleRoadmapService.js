import { studentRepo, curriculumRepo, scheduleRepo } from '../repositories/index.js';
import { getAcademicProgress, resolveStudentCurriculum } from './academicService.js';
import { flattenCurriculum, normalizeCourseCode } from '../utils/gradeUtils.js';
import { StudyPlan } from '../models/StudyPlan.js';

/**
 * Cấu hình ca học chuẩn tham chiếu Trường Đại học Văn Lang (VLU)
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

  const inProgressCodes = new Set(
    (progress.courseStates || [])
      .filter(c => c.status === 'in_progress')
      .map(c => c.code)
  );

  const specialization = student.specialization || progress.specialization || 'software';
  const groupsConfig = curriculum.rules?.groups || {};

  // Giả định mặc định: Môn đang học ở kỳ hiện tại sẽ thi ĐẠT để mở tiên quyết cho kỳ sau
  const assumedPassedCodes = new Set([...completedCodes]);
  if (userPreferences.includeCurrentInProgress !== false) {
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
          name: c.name,
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
        missingCourses.push({
          code: c.code,
          name: c.name,
          credits: Number(c.credits) || 3,
          groupCode: 'BB',
          requirementGroup: 'specializationRequired',
          specialization,
          prerequisites: c.prerequisites || [],
          priorCourses: c.priorCourses || [],
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
        name: c.name,
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
  const tc309Rule = groupsConfig.TC309 || {};
  const tc309RequiredCredits = tc309Rule.requiredCredits || 9;
  const tc309Earned = progress.groups?.TC309?.earnedCredits || 0;
  const tc309InProgress = (userPreferences.includeCurrentInProgress !== false)
    ? (progress.groups?.TC309?.inProgressCredits || 0)
    : 0;
  let tc309NeededCredits = Math.max(0, tc309RequiredCredits - (tc309Earned + tc309InProgress));

  if (tc309NeededCredits > 0) {
    // Ưu tiên các môn tự chọn gắn liền với chuyên ngành sinh viên đã chọn
    const candidateTC309 = allCurriculumCourses
      .filter(c => c.groupCode === 'TC309' && !assumedPassedCodes.has(c.code))
      .sort((a, b) => {
        const aSpec = a.specialization === specialization ? 1 : 0;
        const bSpec = b.specialization === specialization ? 1 : 0;
        return bSpec - aSpec;
      });

    for (const c of candidateTC309) {
      if (tc309NeededCredits <= 0) break;
      missingCourses.push({
        code: c.code,
        name: c.name,
        credits: Number(c.credits) || 3,
        groupCode: 'TC309',
        requirementGroup: 'TC309',
        specialization: c.specialization || null,
        prerequisites: c.prerequisites || [],
        priorCourses: c.priorCourses || [],
        isElective: true,
        isInternship: false,
        isGraduation: false
      });
      tc309NeededCredits -= (Number(c.credits) || 3);
    }
  }

  // E. Thực tập doanh nghiệp (71ITIN40304 - 4 TC)
  const internshipCodes = groupsConfig.internship?.courseCodes || ['71ITIN40304'];
  for (const code of internshipCodes) {
    if (!assumedPassedCodes.has(code)) {
      const c = courseMap.get(code) || {
        code: '71ITIN40304',
        name: 'Thực tập doanh nghiệp',
        credits: 4,
        groupCode: 'BB',
        requirementGroup: 'internship'
      };
      missingCourses.push({
        code: c.code,
        name: c.name,
        credits: Number(c.credits) || 4,
        groupCode: 'BB',
        requirementGroup: 'internship',
        specialization: null,
        prerequisites: c.prerequisites || [],
        priorCourses: c.priorCourses || [],
        isElective: false,
        isInternship: true,
        isGraduation: false
      });
    }
  }

  // F. Khối tốt nghiệp (TC406 - 6 TC)
  const tc406Rule = groupsConfig.TC406 || {};
  const graduationOption = userPreferences.graduationOption || 'thesis'; // 'thesis' hoặc 'courses'
  const isAlreadyDone406 = progress.groups?.TC406?.complete;

  if (!isAlreadyDone406) {
    if (graduationOption === 'courses') {
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
          name: 'Khóa luận tốt nghiệp',
          credits: 6,
          groupCode: 'TC406',
          requirementGroup: 'TC406'
        };
        missingCourses.push({
          code: c.code,
          name: c.name,
          credits: Number(c.credits) || 6,
          groupCode: 'TC406',
          requirementGroup: 'TC406',
          specialization: null,
          prerequisites: c.prerequisites || [],
          priorCourses: c.priorCourses || [],
          isElective: false,
          isInternship: false,
          isGraduation: true
        });
      }
    }
  }

  // 3. Tính điểm ưu tiên / Đồ thị phụ thuộc (Critical Path)
  // Môn nào mở đường cho nhiều môn sau thì ưu tiên xếp trước
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

  // 4. Sinh 3 phương án học tập: Balanced (Cân bằng), Light (Nhẹ hơn), Fast (Hoàn thành sớm)
  const options = {
    balanced: generatePlanOption({
      pace: 'balanced',
      label: 'Phương án Cân bằng (Khuyên dùng)',
      description: 'Phân bổ đều 12 - 16 tín chỉ mỗi kỳ, cân bằng thời gian học tập và nghỉ ngơi hợp lý.',
      missingCourses: [...missingCourses],
      assumedPassedCodes: new Set(assumedPassedCodes),
      startSemester,
      targetGraduationSemester: userPreferences.targetGraduationSemester,
      minCredits: userPreferences.minCredits || 12,
      maxCredits: userPreferences.maxCredits || 16,
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
      label: 'Phương án Giảm tải (Nhẹ nhàng)',
      description: 'Giảm tải xuống 9 - 12 tín chỉ mỗi kỳ, có thể kéo dài thêm 1 kỳ để đi làm hoặc ôn tập kỹ hơn.',
      missingCourses: [...missingCourses],
      assumedPassedCodes: new Set(assumedPassedCodes),
      startSemester,
      targetGraduationSemester: userPreferences.targetGraduationSemester,
      minCredits: 9,
      maxCredits: 12,
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
      label: 'Phương án Tăng tốc (Tốt nghiệp sớm)',
      description: 'Tận dụng tối đa điều kiện tiên quyết, 16 - 20 tín chỉ mỗi kỳ để hoàn tất chương trình sớm nhất có thể.',
      missingCourses: [...missingCourses],
      assumedPassedCodes: new Set(assumedPassedCodes),
      startSemester,
      targetGraduationSemester: userPreferences.targetGraduationSemester,
      minCredits: 16,
      maxCredits: 20,
      maxConsecutiveShifts: 3,
      preferredDaysPerWeek: 5,
      preferredShifts: userPreferences.preferredShifts || [1, 2, 3, 4],
      blockedSlots: userPreferences.blockedSlots || [],
      avoidNightMorning: userPreferences.avoidNightMorning !== false,
      actualClasses,
      courseMap
    })
  };

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
      earnedCredits: progress.earnedCredits,
      inProgressCredits: progress.inProgressCredits,
      totalCredits: progress.totalCredits || 126,
      remainingCredits: progress.remainingCredits,
      missingCoursesCount: missingCourses.length,
      totalMissingCredits: missingCourses.reduce((sum, c) => sum + c.credits, 0),
      physicalCompleted: progress.groups?.TC002?.complete && progress.groups?.TC102?.complete,
      defenseCompleted: progress.groups?.defense?.complete,
      assumptions: [
        'Toàn bộ 19 tín chỉ đang học tại HK hiện tại được giả định sẽ thi ĐẠT để mở môn tiên quyết cho các kỳ tiếp theo.',
        'Thời khóa biểu các học kỳ tương lai được bố trí theo ca học chuẩn VLU (Ca 1 - 5) kèm thời gian giải lao và nghỉ trưa 12:00 - 13:00.',
        'Các học kỳ chưa có lịch lớp mở chính thức từ nhà trường được ghi chú là Khung lịch đề xuất.'
      ]
    },
    options
  };
}

/**
 * Thuật toán phân bổ môn học vào từng học kỳ cụ thể & sắp xếp ca học có thời gian nghỉ
 */
function generatePlanOption({
  pace,
  label,
  description,
  missingCourses,
  assumedPassedCodes,
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
  let cumulativeCredits = 88 + (assumedPassedCodes.size > 88 ? 19 : 0); // Tích lũy cơ sở K30

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

    // Sắp xếp ưu tiên: Môn bắt buộc chuyên ngành > Mở đường nhiều môn sau > Tín chỉ
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
          reason: course.unlockScore > 0 
            ? `Ưu tiên mở đường cho ${course.unlockScore} môn học tiếp theo (${course.unlockedCourses.slice(0, 2).join(', ')})` 
            : course.requirementGroup === 'specializationRequired' 
              ? 'Môn bắt buộc chuyên ngành cần hoàn thành theo tiến độ' 
              : 'Môn tự chọn phù hợp để đủ định mức tín chỉ'
        });
        semCredits += course.credits;
      }
    }

    // Cập nhật remainingQueue
    const selectedCodes = new Set(semCourses.map(c => c.code));
    remainingQueue = remainingQueue.filter(c => !selectedCodes.has(c.code));

    // 2. Xử lý môn Thực tập doanh nghiệp (Xếp vào Năm 3 HK3 hoặc Năm 4 HK1 khi các môn cơ sở đã xong)
    const internshipCap = pace === 'light' ? maxCredits : (maxCredits + 2);
    if (unallocatedInternship && (currentSem.yearOfStudy >= 4 || (currentSem.yearOfStudy === 3 && currentSem.term === 'HK03') || remainingQueue.length <= 1)) {
      if (semCredits + unallocatedInternship.credits <= internshipCap) {
        semCourses.push({
          ...unallocatedInternship,
          reason: 'Kỳ thực tập doanh nghiệp thực tế tại công ty công nghệ'
        });
        semCredits += unallocatedInternship.credits;
        unallocatedInternship = null; // Đã xếp xong
      }
    }

    // 3. Xử lý Khối tốt nghiệp (Xếp vào kỳ riêng biệt hoặc kỳ cuối cùng khi các môn lý thuyết đã xong)
    if (unallocatedGraduation.length > 0 && remainingQueue.length === 0 && !unallocatedInternship) {
      const gradTotalCredits = unallocatedGraduation.reduce((s, c) => s + c.credits, 0);
      // Chỉ gộp đồ án tốt nghiệp vào cùng kỳ nếu tổng tín chỉ kỳ đó không vượt quá 14 (hoặc kỳ này chưa có môn nào)
      const canBundleGraduation = semCredits === 0 || (pace === 'fast' && semCredits + gradTotalCredits <= 16);
      if (canBundleGraduation) {
        unallocatedGraduation.forEach(c => {
          semCourses.push({
            ...c,
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
        avoidNightMorning
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
        projectedCumulativeCredits: Math.min(126, cumulativeCredits),
        fulfilledGroups: [...new Set(scheduledCourses.map(c => c.requirementGroup))],
        notes: semCourses.some(c => c.isGraduation) 
          ? '🎓 Học kỳ dự kiến tốt nghiệp và hoàn tất toàn bộ 126 tín chỉ K30 CNTT.' 
          : semCourses.some(c => c.isInternship) 
            ? '🏢 Học kỳ kết hợp thực tập doanh nghiệp tại đơn vị liên kết.' 
            : '📚 Học kỳ tăng cường các môn chuyên ngành và tích lũy tín chỉ trọng điểm.'
      });
    }
  }

  // Nếu còn môn chưa xếp hết (ví dụ do giới hạn tín chỉ quá thấp)
  if (remainingQueue.length > 0 || unallocatedGraduation.length > 0 || unallocatedInternship) {
    // Thêm kỳ phụ kết thúc
    const lastMeta = semestersMeta[plannedSemesters.length] || {
      semester: '2028-2029 HK01',
      academicYear: '2028-2029',
      term: 'HK01',
      yearOfStudy: 4,
      yearLabel: 'Năm 4'
    };
    const finalCourses = [...remainingQueue, ...(unallocatedInternship ? [unallocatedInternship] : []), ...unallocatedGraduation];
    const scheduledCourses = scheduleCoursesIntoWeeklyGrid({
      semester: lastMeta.semester,
      courses: finalCourses,
      actualClasses,
      preferredShifts,
      preferredDaysPerWeek,
      blockedSlots,
      maxConsecutiveShifts,
      avoidNightMorning
    });
    plannedSemesters.push({
      semester: lastMeta.semester,
      academicYear: lastMeta.academicYear,
      term: lastMeta.term,
      yearOfStudy: lastMeta.yearOfStudy,
      yearLabel: lastMeta.yearLabel,
      courses: scheduledCourses,
      totalCredits: finalCourses.reduce((s, c) => s + c.credits, 0),
      totalCourses: finalCourses.length,
      projectedCumulativeCredits: 126,
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
    plannedSemesters
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
  avoidNightMorning = true
}) {
  const blockedMap = new Set(blockedSlots.map(b => `${b.dayOfWeek}_${b.shift}`));
  const occupiedSlots = new Map(); // key: "day_shift" -> course

  // Các ngày học ưu tiên (T2 -> T7)
  const allowedDays = [2, 3, 4, 5, 6, 7];

  return courses.map((course, idx) => {
    // 1. Kiểm tra xem có lớp học phần mở thực tế trong database cho kỳ này không
    const realClass = actualClasses.find(
      ac => ac.courseCode === course.code && ac.semester === semester
    );

    if (realClass) {
      const shiftNum = realClass.startPeriod <= 3 ? 1 : realClass.startPeriod <= 6 ? 2 : realClass.startPeriod <= 9 ? 3 : realClass.startPeriod <= 12 ? 4 : 5;
      occupiedSlots.set(`${realClass.dayOfWeek}_${shiftNum}`, course.code);
      return {
        courseCode: course.code,
        courseName: course.name,
        credits: course.credits,
        groupCode: course.groupCode,
        requirementGroup: course.requirementGroup,
        isElective: course.isElective,
        isInternship: course.isInternship,
        isGraduation: course.isGraduation,
        reason: course.reason,
        prerequisitesMet: course.prerequisites || [],
        unlockedCourses: course.unlockedCourses || [],
        suggestedSchedule: {
          dayOfWeek: realClass.dayOfWeek,
          dayOfWeekText: realClass.dayOfWeekText || DAY_NAMES[realClass.dayOfWeek] || 'Thứ Hai',
          shift: shiftNum,
          startPeriod: realClass.startPeriod,
          endPeriod: realClass.endPeriod,
          startTime: realClass.startTime,
          endTime: realClass.endTime,
          room: realClass.room || 'Phòng học chính thức',
          lecturer: realClass.lecturer || 'Giảng viên khoa CNTT',
          classSection: realClass.classSection || 'K30 CNTT',
          isActualClass: true
        }
      };
    }

    // 2. Nếu là môn thực tập hoặc khóa luận, không chiếm ca học cố định trên giảng đường
    if (course.isInternship) {
      return {
        courseCode: course.code,
        courseName: course.name,
        credits: course.credits,
        groupCode: course.groupCode,
        requirementGroup: course.requirementGroup,
        isElective: false,
        isInternship: true,
        isGraduation: false,
        reason: course.reason,
        suggestedSchedule: {
          dayOfWeek: 2,
          dayOfWeekText: 'Thứ Hai - Thứ Sáu',
          shift: 0,
          startPeriod: 1,
          endPeriod: 8,
          startTime: '08:00',
          endTime: '17:00',
          room: 'Doanh nghiệp tiếp nhận thực tập',
          lecturer: 'GV Hướng dẫn & Người hướng dẫn DN',
          isActualClass: false
        }
      };
    }

    if (course.isGraduation && course.code === '71ITGR40206') {
      return {
        courseCode: course.code,
        courseName: course.name,
        credits: course.credits,
        groupCode: course.groupCode,
        requirementGroup: course.requirementGroup,
        isElective: false,
        isInternship: false,
        isGraduation: true,
        reason: course.reason,
        suggestedSchedule: {
          dayOfWeek: 7,
          dayOfWeekText: 'Thứ Bảy',
          shift: 2,
          startPeriod: 4,
          endPeriod: 6,
          startTime: '09:35',
          endTime: '12:00',
          room: 'Phòng Seminar / Hội đồng bảo vệ',
          lecturer: 'Giảng viên hướng dẫn khóa luận',
          isActualClass: false
        }
      };
    }

    // 3. Phân bổ ca học thông minh cho môn lý thuyết / thực hành
    // Tìm ngày và ca tối ưu
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
    occupiedSlots.set(`${bestDay}_${bestShift}`, course.code);

    const shiftInfo = VLU_SHIFTS.find(s => s.shift === bestShift) || VLU_SHIFTS[0];

    return {
      courseCode: course.code,
      courseName: course.name,
      credits: course.credits,
      groupCode: course.groupCode,
      requirementGroup: course.requirementGroup,
      isElective: course.isElective,
      isInternship: course.isInternship,
      isGraduation: course.isGraduation,
      reason: course.reason,
      prerequisitesMet: course.prerequisites || [],
      unlockedCourses: course.unlockedCourses || [],
      suggestedSchedule: {
        dayOfWeek: bestDay,
        dayOfWeekText: DAY_NAMES[bestDay] || 'Thứ Hai',
        shift: bestShift,
        startPeriod: (bestShift - 1) * 3 + 1,
        endPeriod: (bestShift - 1) * 3 + 3,
        startTime: shiftInfo.startTime,
        endTime: shiftInfo.endTime,
        room: `Phòng học CS3 (Gợi ý: CS3 Đặng Thùy Trâm)`,
        lecturer: 'Giảng viên Bộ môn phụ trách',
        isActualClass: false
      }
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

  const { student: sInfo, academicStatus, options } = roadmapResult;
  const currentOption = options[preferences.pace || 'balanced'] || options.balanced;
  const q = (message || '').toLowerCase();

  // 1. Câu hỏi về nên học bao nhiêu môn/tín chỉ kỳ tới
  if (/bao nhiêu môn|bao nhiêu tín chỉ|kỳ tới|kỳ tiếp theo/i.test(q)) {
    const nextSem = currentOption.plannedSemesters[0];
    if (!nextSem) {
      return {
        reply: '🎉 Bạn đã hoàn thành toàn bộ chương trình đào tạo! Không còn môn học nào cần phân bổ cho kỳ tiếp theo.',
        suggestedAction: null
      };
    }

    return {
      reply: `### 🎯 Tư Vấn Khối Lượng Học Kỳ Tới (${nextSem.semester})\n\n` +
        `Theo phương án **${currentOption.label}**, UniMate khuyến nghị bạn nên đăng ký:\n` +
        `- **Số lượng môn**: **${nextSem.totalCourses} môn** (Tổng **${nextSem.totalCredits} tín chỉ**).\n` +
        `- **Danh sách môn đề xuất**:\n` +
        nextSem.courses.map((c, i) => `  ${i + 1}. **${c.courseCode}** - ${c.courseName} (${c.credits} TC) [${c.suggestedSchedule.dayOfWeekText}, Ca ${c.suggestedSchedule.shift}: ${c.suggestedSchedule.startTime} - ${c.suggestedSchedule.endTime}]`).join('\n') +
        `\n\n💡 **Lý do xếp**: Các môn này giúp bạn hoàn thành điều kiện tiên quyết và mở đường cho các môn chuyên ngành tiếp theo. Sau khi hoàn thành kỳ này, bạn sẽ tích lũy đạt **${nextSem.projectedCumulativeCredits}/126 TC**.`
    };
  }

  // 2. Câu hỏi về nghỉ cuối tuần / tránh ca 5
  if (/nghỉ cuối tuần|tránh ca 5|không học tối|học sáng/i.test(q)) {
    return {
      reply: `### ⏰ Gợi Ý Lịch Học Tối Ưu Giờ Nghỉ\n\n` +
        `UniMate đã sẵn sàng điều chỉnh lịch học cho bạn:\n` +
        `- **Ưu tiên ca sáng & chiều sớm**: Ca 1 (07:00 - 09:25) và Ca 2 (09:35 - 12:00).\n` +
        `- **Nghỉ trưa cố định**: 12:00 - 13:00 mỗi ngày để đảm bảo sức khỏe.\n` +
        `- **Loại bỏ Ca 5 (Tối)**: Không bố trí bất kỳ môn nào vào khung giờ 18:05 - 21:10.\n` +
        `- **Trọn vẹn 2 ngày nghỉ cuối tuần**: Toàn bộ lịch được xếp từ Thứ Hai đến Thứ Sáu.\n\n` +
        `👉 Bạn có thể bấm nút **"Tạo lộ trình cá nhân"** với tùy chọn Ca 1-3 và không chọn Thứ Bảy/Chủ Nhật để áp dụng ngay phương án này vào bảng thời khóa biểu!`,
      suggestedAction: {
        type: 'APPLY_PREFERENCES',
        preferences: {
          preferredShifts: [1, 2, 3],
          avoidNightMorning: true,
          preferredDaysPerWeek: 4,
          blockedSlots: [
            { dayOfWeek: 7, shift: 1 }, { dayOfWeek: 7, shift: 2 }, { dayOfWeek: 7, shift: 3 }, { dayOfWeek: 7, shift: 4 }, { dayOfWeek: 7, shift: 5 },
            { dayOfWeek: 8, shift: 1 }, { dayOfWeek: 8, shift: 2 }, { dayOfWeek: 8, shift: 3 }, { dayOfWeek: 8, shift: 4 }, { dayOfWeek: 8, shift: 5 }
          ]
        }
      }
    };
  }

  // 3. Câu hỏi đổi môn tự chọn
  if (/đổi môn|thay môn tự chọn|học môn khác/i.test(q)) {
    return {
      reply: `### 🔄 Hướng Dẫn Đổi Môn Tự Chọn Trong Lộ Trình\n\n` +
        `Hiện tại trong Khung K30 CNTT, bạn có thể tự do hoán đổi môn trong cùng nhóm tự chọn:\n` +
        `- **Nhóm TC309 (Tự chọn chuyên ngành)**: Bạn có thể chọn thay thế bằng *Lập trình Java nâng cao*, *Phát triển Web an toàn*, hoặc *Kiến trúc phần mềm*.\n` +
        `- **Khối tốt nghiệp (TC406)**: Bạn có thể chọn phương án làm *Khóa luận tốt nghiệp (6 TC)* hoặc học *2 Chuyên đề thay thế khóa luận (6 TC)*.\n\n` +
        `👉 Bạn có thể đổi trực tiếp ngay trên thẻ chi tiết học kỳ ở giao diện Thời khóa biểu bên cạnh!`,
      suggestedAction: null
    };
  }

  // 4. Mặc định tổng quan
  return {
    reply: `### 📅 Trợ Lý Thời Khóa Biểu & Lộ Trình Cá Nhân UniMate\n\n` +
      `Chào **${sInfo.fullName}**! Dựa trên bảng điểm chính thức (${academicStatus.earnedCredits}/126 TC tích lũy + ${academicStatus.inProgressCredits} TC đang học):\n` +
      `- **Số tín chỉ còn thiếu để tốt nghiệp**: **${academicStatus.totalMissingCredits} TC** (${academicStatus.missingCoursesCount} môn học).\n` +
      `- **Dự kiến số học kỳ cần thêm**: **${currentOption.totalSemesters} học kỳ** (Dự kiến tốt nghiệp vào **${currentOption.targetEndSemester}**).\n` +
      `- **Phương án đề xuất**: ${currentOption.label} - ${currentOption.description}\n\n` +
      `Bạn có thể yêu cầu tôi tư vấn chi tiết cho từng học kỳ, tinh chỉnh ca học sáng/chiều, tránh ca tối hoặc đổi môn tự chọn bất cứ lúc nào!`,
    suggestedAction: null
  };
}

export default {
  VLU_SHIFTS,
  VLU_BREAKS,
  DAY_NAMES,
  getNextSemesters,
  generateStudentRoadmapPlan,
  saveStudentStudyPlan,
  getStudentStudyPlan,
  handleScheduleAdvisorChat
};
