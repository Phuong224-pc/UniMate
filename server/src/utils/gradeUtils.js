// Pure academic calculation shared by repositories, pages and AI.
export const normalizeCourseCode = value => String(value || '').trim().toUpperCase().replace(/\s+/g, '');
export const numericGrade = value => value === null || value === undefined || String(value).trim() === ''
  ? null : Number.isFinite(Number(String(value).replace(',', '.'))) ? Number(String(value).replace(',', '.')) : null;
const round = value => Number(value.toFixed(2));
const sum = list => list.reduce((total, item) => total + (numericGrade(item.credits) || 0), 0);

export function classifyCourseResult(course, policies = {}) {
  const status = String(course.status || '').toLowerCase();
  const letter = String(course.letter || '').trim().toUpperCase();
  if (/miễn|bảo lưu|recognized|exempt/.test(status) || ['MT', 'MIỄN'].includes(letter)) {
    return course.recognitionApproved === true || policies.recognition === 'source_confirmed' && Boolean(course.source)
      ? 'recognized' : 'unverified';
  }
  const score = numericGrade(course.score), point = numericGrade(course.point4);
  if (/không đạt|chưa đạt|failed|rớt/.test(status) || letter === 'F') return 'failed';
  if (/đang học|chưa có điểm|in_progress|registered/.test(status)) return 'in_progress';
  if (/^[ABCD][+-]?$/.test(letter)) return 'passed';
  if (score === null && point === null) return 'in_progress';
  if (/^đạt|passed/.test(status)) return 'passed';
  // Letters determine pass/fail only, never manufacture a numeric GPA.
  if (policies.passScore10 != null && score !== null) return score >= policies.passScore10 ? 'passed' : 'failed';
  if (policies.passPoint4 != null && point !== null) return point >= policies.passPoint4 ? 'passed' : 'failed';
  return 'unverified';
}

export function flattenCurriculum(curriculum) {
  return (curriculum?.sections || []).flatMap(section => (section.courses || []).map(course => ({
    ...course, sectionName: section.name, code: normalizeCourseCode(course.code)
  })));
}

export function requirementGroup(course) {
  if (course.requirementGroup) return course.requirementGroup;
  const group = String(course.groupCode || '').toUpperCase();
  if (['TC209', 'TC309', 'TC306', 'TC406', 'TC002', 'TC102'].includes(group)) return group;
  if (group === 'DEFENSE' || /GDQP|quốc phòng|quoc phong/i.test(course.name || '')) return 'defense';
  if (/thực tập|thuc tap/i.test(course.name || '')) return 'internship';
  if (group && !['BB', 'BBKTL'].includes(group)) return group;
  if (!group && course.required === false) return 'unverified';
  return course.specialization ? 'specializationRequired' : 'commonRequired';
}

function chooseGpaAttempt(attempts, policy, warnings, code) {
  const graded = attempts.filter(c => ['passed', 'failed'].includes(c.outcome) && numericGrade(c.point4) !== null);
  if (graded.length < 2) return graded[0] || null;
  if (policy === 'highest') return graded.reduce((a, b) => a.point4 >= b.point4 ? a : b);
  if (policy === 'latest') return [...graded].sort((a, b) => String(a.semester).localeCompare(String(b.semester))).at(-1);
  warnings.push(`Chưa thể xác minh GPA học lại của ${code}: chưa cấu hình quy tắc chọn lần học.`);
  return undefined;
}

export function calculateAcademicStats(courses = [], { curriculum = null, specialization = null, sourceTotals = null } = {}) {
  const warnings = [], policies = curriculum?.rules?.policies || {}, memberships = new Map();
  for (const course of flattenCurriculum(curriculum)) {
    if (!memberships.has(course.code)) memberships.set(course.code, course);
    else if (JSON.stringify(memberships.get(course.code)) !== JSON.stringify(course)) warnings.push(`Mã ${course.code} có nhiều khai báo trong khung; cần đối chiếu.`);
  }
  if (!curriculum?.rules) warnings.push('Chưa đủ dữ liệu để kiểm tra: khung chưa có quy tắc nhóm được xác nhận.');
  if (!specialization && [...memberships.values()].some(c => requirementGroup(c) === 'specializationRequired')) warnings.push('Chưa chọn chuyên ngành; chưa thể kiểm tra đầy đủ BB chuyên ngành.');
  const uniqueAttempts = new Map();
  for (const input of Array.isArray(courses) ? courses : []) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) { warnings.push('Bản ghi bảng điểm không hợp lệ; cần kiểm tra dữ liệu nguồn.'); continue; }
    const code = normalizeCourseCode(input.code);
    if (!code) continue;
    const course = { ...input, code, credits: numericGrade(input.credits), score: numericGrade(input.score), point4: numericGrade(input.point4) };
    course.outcome = classifyCourseResult(course, policies);
    const key = `${code}|${String(course.semester || '').trim()}`;
    const previous = uniqueAttempts.get(key);
    if (previous && ['score', 'point4', 'credits', 'status', 'letter', 'countCredit', 'countGpa'].some(field => previous[field] !== course[field])) {
      warnings.push(`Dữ liệu mâu thuẫn cho ${code} (${course.semester || 'chưa rõ kỳ'}); cần xác minh bản nguồn.`);
      if (['passed', 'failed'].includes(previous.outcome) && course.outcome === 'in_progress') continue;
    }
    uniqueAttempts.set(key, course);
  }
  const attemptsByCode = new Map();
  for (const course of uniqueAttempts.values()) {
    if (!attemptsByCode.has(course.code)) attemptsByCode.set(course.code, []);
    attemptsByCode.get(course.code).push(course);
  }
  const completed = [], pending = [], failed = [], unmappedCourses = [], unverifiedCourses = [], gpaRows = [];
  let gpaUnverified = false;
  for (const [code, attempts] of attemptsByCode) {
    const membership = memberships.get(code);
    const passed = attempts.find(c => ['passed', 'recognized'].includes(c.outcome));
    const active = attempts.find(c => c.outcome === 'in_progress');
    const latest = passed || active || attempts.at(-1);
    if (!membership) {
      unmappedCourses.push({ ...latest, reason: 'Mã môn chưa thuộc danh mục của phiên bản khung áp dụng.' });
      continue;
    }
    const group = requirementGroup(membership);
    const branchAllowed = !membership.specialization || membership.specialization === specialization || group !== 'specializationRequired';
    const record = { ...latest, groupCode: membership.groupCode, group, membership, eligible: branchAllowed };
    if (group === 'unverified') { unverifiedCourses.push({ ...record, reason: 'Chưa xác định mã nhóm hoặc quy tắc tự chọn.' }); continue; }
    if (latest.credits === null) { unverifiedCourses.push({ ...record, reason: 'Thiếu cột tín chỉ nguồn.' }); continue; }
    if (latest.credits !== Number(membership.credits)) warnings.push(`Tín chỉ ${code}: bảng điểm ${latest.credits}, khung ${membership.credits}; giữ nguyên nguồn, cần đối chiếu.`);
    if (!branchAllowed) warnings.push(`${code}: Không thuộc chuyên ngành bạn đã chọn; giữ lịch sử điểm, không tính vào yêu cầu nhánh.`);
    const isDegreeExemptGroup = ['TC002', 'TC102', 'defense'].includes(group) || membership.countsTowardDegree === false;
    if (passed && branchAllowed && (passed.countCredit !== false || isDegreeExemptGroup)) completed.push(record);
    else if (active && branchAllowed) pending.push(record);
    else if (latest.outcome === 'failed') failed.push(record);
    else if (latest.outcome === 'unverified') unverifiedCourses.push(record);
    const gpaEligible = (branchAllowed || policies.gpaOtherSpecializations === 'include') && membership.countGpa !== false && membership.countsTowardDegree !== false && !['TC002', 'TC102', 'defense', 'TC306'].includes(group);
    if (gpaEligible) {
      if (attempts.some(c => ['passed', 'failed'].includes(c.outcome) && c.countGpa !== false && c.credits > 0 && c.point4 === null)) {
        warnings.push(`Chưa thể xác minh GPA: ${code} thiếu điểm hệ 4 nguồn; không quy đổi từ điểm chữ.`);
        gpaUnverified = true;
      }
      const chosen = chooseGpaAttempt(attempts, policies.retake, warnings, code);
      if (chosen === undefined) gpaUnverified = true;
      else if (chosen && chosen.countGpa !== false && chosen.credits > 0) gpaRows.push(chosen);
    }
  }
  const groupKeys = ['commonRequired', 'specializationRequired', 'TC209', 'TC309', 'TC306', 'TC406', 'TC002', 'TC102', 'defense', 'internship'];
  const groups = {}, configured = curriculum?.rules?.groups || {};
  for (const key of new Set([...groupKeys, ...Object.keys(configured), ...[...memberships.values()].map(requirementGroup)])) {
    const rule = configured[key] || {};
    const countsTowardDegree = rule.countsTowardDegree ?? !['TC002', 'TC102', 'defense', 'TC306'].includes(key);
    const active = Boolean(configured[key]) || [...memberships.values()].some(c => requirementGroup(c) === key);
    const members = [...memberships.values()].filter(c => requirementGroup(c) === key && (!countsTowardDegree || c.countsTowardDegree !== false) && (key !== 'specializationRequired' || specialization && c.specialization === specialization));
    const passed = completed.filter(c => c.group === key && (!countsTowardDegree || c.membership.countsTowardDegree !== false)), studying = pending.filter(c => c.group === key);
    const requiredCredits = numericGrade(rule.requiredCredits) ?? (['commonRequired', 'specializationRequired', 'internship'].includes(key) ? sum(members) : null);
    const requiredCourses = numericGrade(rule.requiredCourses) ?? (['commonRequired', 'specializationRequired', 'internship', 'defense'].includes(key) ? members.length : null);
    let applied = passed, complete = requiredCredits !== null && sum(passed) >= requiredCredits && (requiredCourses === null || passed.length >= requiredCourses), validOption = null;
    if (['commonRequired', 'specializationRequired', 'internship', 'defense'].includes(key)) complete &&= members.every(c => passed.some(p => p.code === c.code));
    if (key === 'TC406') {
      const codes = new Set(passed.map(c => c.code));
      const optionCodes = option => (Array.isArray(option) ? option : option.courseCodes || option.codes || []).map(normalizeCourseCode);
      const options = (rule.options || []).filter(option => optionCodes(option).length);
      validOption = options.find(option => optionCodes(option).every(code => codes.has(code))) || null;
      complete = Boolean(validOption) && sum(passed) >= (requiredCredits ?? Infinity);
      // Credit for a completed replacement subject is partial progress toward its option.
      // Choose one option; never combine unrelated alternatives to satisfy the block.
      const optionRows = options.map(option => passed.filter(c => optionCodes(option).includes(c.code)));
      applied = optionRows.sort((a, b) => sum(b) - sum(a))[0] || [];
    }
    if (key === 'TC306' || key === 'specializationRequired' && !specialization) complete = false;
    const earnedCredits = requiredCredits === null ? 0 : Math.min(sum(applied), requiredCredits);
    groups[key] = {
      requiredCredits, requiredCourses, earnedCredits, passedCoursesCount: passed.length, inProgressCredits: sum(studying),
      remainingCredits: requiredCredits === null ? null : Math.max(0, requiredCredits - earnedCredits),
      missingCourseCodes: /^TC/.test(key) ? [] : members.filter(c => !passed.some(p => p.code === c.code)).map(c => c.code),
      passedCourseCodes: passed.map(c => c.code), inProgressCourseCodes: studying.map(c => c.code), complete, validOption,
      countsTowardDegree, active,
      verified: Boolean(configured[key]) && key !== 'TC306' && rule.facultyEligibility !== 'unverified'
    };
  }
  const earnedCredits = Object.values(groups).filter(g => g.countsTowardDegree).reduce((n, g) => n + g.earnedCredits, 0);
  const degreePending = pending.filter(c => c.membership.countsTowardDegree !== false && !['TC002', 'TC102', 'defense', 'TC306'].includes(c.group));
  const inProgressCredits = sum(degreePending), totalCredits = numericGrade(curriculum?.totalCredits) ?? numericGrade(curriculum?.rules?.totalCredits);
  const denominator4 = sum(gpaRows), rows10 = gpaRows.filter(c => c.score !== null);
  const calculatedGpa4 = gpaUnverified || !denominator4 ? null : round(gpaRows.reduce((n, c) => n + c.point4 * c.credits, 0) / denominator4);
  const calculatedGpa10 = !sum(rows10) ? null : round(rows10.reduce((n, c) => n + c.score * c.credits, 0) / sum(rows10));
  if (!policies.gpaVerified) warnings.push('GPA tự tính là trung bình có trọng số từ điểm hệ 4 nguồn; chưa đủ quy tắc GPA chính thức để xác minh.');
  if (groups.TC306.active) warnings.push('TC306 được lưu riêng, chưa xác nhận quy tắc tính vào khung.');
  if (groups.TC406.active && configured.TC406?.facultyEligibility === 'unverified') warnings.push('Phương án TC406 được đối chiếu cấu trúc học phần; điều kiện cho phép của khoa chưa được xác minh.');
  const source = sourceTotals || {}, discrepancies = [];
  if (numericGrade(source.cumulativeCredits) !== null && numericGrade(source.cumulativeCredits) !== earnedCredits) discrepancies.push({ field: 'cumulativeCredits', source: numericGrade(source.cumulativeCredits), calculated: earnedCredits, reason: 'Đối chiếu danh mục, nhóm, học lại, miễn và tín chỉ nguồn; không ép bằng tổng PDF.' });
  if (numericGrade(source.cumulativeGpa4) !== null && calculatedGpa4 !== numericGrade(source.cumulativeGpa4)) discrepancies.push({ field: 'cumulativeGpa4', source: numericGrade(source.cumulativeGpa4), calculated: calculatedGpa4, reason: 'Chưa xác minh quy tắc GPA, điểm làm tròn hoặc học lại của trường.' });
  const completedCodes = new Set(completed.map(c => c.code));
  const attendedCodes = new Set([...uniqueAttempts.values()].filter(c => ['passed', 'failed', 'recognized'].includes(c.outcome)).map(c => c.code));
  const courseStates = [...memberships.values()].map(c => {
    const group = requirementGroup(c), locked = group === 'specializationRequired' && Boolean(c.specialization) && c.specialization !== specialization;
    const missingPrerequisites = (c.prerequisites || []).filter(code => !completedCodes.has(normalizeCourseCode(code)));
    const missingPriorCourses = (c.priorCourses || []).filter(code => !attendedCodes.has(normalizeCourseCode(code)));
    return { code: c.code, name: c.name, credits: c.credits, groupCode: c.groupCode, specialization: c.specialization || null,
      status: completedCodes.has(c.code) ? 'passed' : pending.some(p => p.code === c.code) ? 'in_progress' : 'missing',
      locked, eligible: !locked && !missingPrerequisites.length && !missingPriorCourses.length,
      reason: locked ? !specialization ? 'Vui lòng chọn chuyên ngành trước khi lập kế hoạch nhánh.' : 'Không thuộc chuyên ngành bạn đã chọn' : missingPrerequisites.length ? `Chưa đạt tiên quyết: ${missingPrerequisites.join(', ')}` : missingPriorCourses.length ? `Chưa học trước: ${missingPriorCourses.join(', ')}` : '', missingPrerequisites, missingPriorCourses };
  });
  const incompleteGroups = Object.entries(groups).filter(([key, g]) => g.active && key !== 'TC306' && !g.complete).map(([key]) => key);
  return {
    earnedCredits, cumulativeCredits: earnedCredits, totalCredits, remainingCredits: totalCredits === null ? null : Math.max(0, totalCredits - earnedCredits),
    inProgressCredits, inProgressCoursesCount: degreePending.length, registeredCredits: numericGrade(source.registeredCredits),
    recognizedCredits: sum(completed.filter(c => c.outcome === 'recognized')), physicalCredits: groups.TC002.earnedCredits + groups.TC102.earnedCredits,
    defenseCredits: groups.defense.earnedCredits, calculatedGpa4, calculatedGpa10, cumulativeGpa4: calculatedGpa4, cumulativeGpa10: calculatedGpa10,
    gpaCredits: denominator4, gpaQualityPoints: gpaRows.reduce((n, c) => n + c.point4 * c.credits, 0), rating: 'Chưa xác minh quy tắc xếp loại', passedCoursesCount: completed.length, failedCoursesCount: failed.length,
    completedCourseCodes: [...completedCodes], specialization, groups, courseStates, lockedCourseCodes: courseStates.filter(c => c.locked).map(c => c.code),
    unmappedCourses, unverifiedCourses, sourceTotals: source, discrepancies, warnings: [...new Set(warnings)],
    graduation: { status: incompleteGroups.length ? 'incomplete' : 'unknown', incompleteGroups, message: 'Chưa đủ dữ liệu để kiểm tra', unknownConditions: ['GPA tối thiểu', 'Chuẩn đầu ra và điều kiện khác của khoa'] },
    curriculum: curriculum ? { id: curriculum._id, program: curriculum.program, scope: curriculum.scope, revision: curriculum.revision } : null
  };
}

export default calculateAcademicStats;
