import crypto from 'node:crypto';
import * as XLSX from 'xlsx';

export const normalizeText = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').trim().toLowerCase();
export const cleanCode = value => String(value ?? '').trim().toUpperCase().replace(/\s+/g, '');
export const hasValue = value => value !== undefined && value !== null && String(value).trim() !== '' && !/^#(?:N\/A|REF!|VALUE!|DIV\/0!|NAME\?|NUM!|NULL!)/i.test(String(value).trim());
const splitCodes = value => [...new Set((String(value ?? '').match(/\b\d{2}[A-Z]{2,6}\d{4,8}\b/gi) || []).map(cleanCode))];
const numeric = value => hasValue(value) && Number.isFinite(Number(String(value).replace(',', '.'))) ? Number(String(value).replace(',', '.')) : undefined;
const termNumber = (term, year) => numeric(term) && numeric(year) ? String((numeric(year) - 1) * 3 + numeric(term)) : '';

export function specializationId(value) {
  const text = normalizeText(value);
  if (/phan mem|cnpm|^software$/.test(text)) return 'software';
  if (/cong nghe du lieu|cndl|^data$/.test(text)) return 'data';
  if (/tri tue nhan tao|^ai$/.test(text)) return 'ai';
  return null;
}

function headerIndex(rows) {
  return rows.findIndex(row => row.some(cell => /^(ma hoc phan|ma mon hoc|ma mon|code|course code)$/.test(normalizeText(cell))) && row.some(cell => /ten.*(hoc phan|mon)|course name|^name$/.test(normalizeText(cell))));
}

function readSheet(workbook, sheet, filename, fileHash) {
  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheet], { header: 1, range: 0, defval: '', raw: false });
  const hi = headerIndex(rows);
  if (hi < 0) return { sheet, role: 'lookup', rows: [] };
  const headers = rows[hi].map(normalizeText);
  const ci = regex => headers.findIndex(cell => regex.test(cell));
  const indices = {
    code: ci(/^(ma hoc phan|ma mon hoc|ma mon|code|course code)$/), name: ci(/ten.*(hoc phan|mon)|course name|^name$/),
    credits: ci(/^(so tin chi|so tc|tin chi|credits|tc)$/), group: ci(/bb\/tc|bat buoc.*tu chon|ma nhom|group/),
    section: ci(/^khoi kien thuc$|^section/), specialization: ci(/ten chuyen nganh|^specialization/),
    prerequisites: ci(/tien quyet|prerequisites/), priorCourses: ci(/hoc truoc|priorcourses/), term: ci(/^hoc ky$|phan bo hoc ky/), year: ci(/^nam thu$/)
  };
  const role = indices.section >= 0 && indices.specialization >= 0 ? 'catalog' : 'plan';
  const result = [];
  let planSpecialization = null;
  let planTerm = '';
  for (let ri = hi + 1; ri < rows.length; ri++) {
    const row = rows[ri];
    if (role === 'plan') {
      const heading = row.map(cell => String(cell)).join(' ');
      const hk = heading.match(/HK\d{3}\s+(\d+)/i);
      if (hk) { planTerm = hk[1]; planSpecialization = null; }
      if (/chuyen nganh/i.test(normalizeText(heading))) planSpecialization = specializationId(heading);
      if (/chon \d.*tu chon/.test(normalizeText(heading))) planSpecialization = null;
    }
    const code = cleanCode(row[indices.code]);
    if (!/^\d{2}[A-Z]{2,6}\d{4,8}$/.test(code)) continue;
    const rawGroup = String(row[indices.group] || '').trim();
    const groupCode = (rawGroup.match(/TC\d{3}|BBKTL|BB/i) || [])[0]?.toUpperCase();
    const credits = numeric(row[indices.credits]);
    const source = { filename, sheet, row: ri + 1, fileHash };
    const term = role === 'plan' ? planTerm || termNumber(row[indices.term], row[indices.year]) : termNumber(row[indices.term], row[indices.year]);
    const semesterSources = term ? [{ ...source, column: role === 'plan' ? 'Phân bổ học kỳ / Năm thứ' : 'R/S', value: term }] : [];
    // Some K30 catalog sheets carry a second term/year pair. Preserve both; neither wins by position or sheet name.
    if (role === 'catalog' && hasValue(row[20]) && hasValue(row[21])) {
      const otherTerm = termNumber(row[20], row[21]);
      if (otherTerm) semesterSources.push({ ...source, column: 'U/V', value: otherTerm });
    }
    const specialization = role === 'catalog' ? specializationId(row[indices.specialization]) : groupCode === 'BB' ? planSpecialization : null;
    const entry = {
      code, name: String(row[indices.name] || '').trim(), ...(credits !== undefined ? { credits } : {}),
      ...(groupCode ? { groupCode } : {}), sectionName: role === 'catalog' ? String(row[indices.section] || '').trim() : '',
      specialization, required: groupCode === 'BB' || groupCode === 'BBKTL',
      requirementGroup: code.startsWith('71NAD') ? 'defense' : code === '71ITIN40304' ? 'internship' : groupCode === 'BB' || groupCode === 'BBKTL' ? (specialization ? 'specializationRequired' : 'commonRequired') : groupCode,
      prerequisites: splitCodes(row[indices.prerequisites]), priorCourses: splitCodes(row[indices.priorCourses]),
      source, semesterSources,
      countsTowardDegree: !(groupCode === 'TC002' || groupCode === 'TC102' || code.startsWith('71NAD') || groupCode === 'TC306'),
      conditionNotes: !splitCodes(row[indices.priorCourses]).length && hasValue(row[indices.priorCourses]) && !/^khong\s*$/.test(normalizeText(row[indices.priorCourses])) ? String(row[indices.priorCourses]).trim() : ''
    };
    // Blank cells are not instructions to clear previously valid conditions.
    if (!hasValue(row[indices.prerequisites])) delete entry.prerequisites;
    if (!hasValue(row[indices.priorCourses])) delete entry.priorCourses;
    result.push(entry);
  }
  return { sheet, role, rows: result, headerRow: hi + 1 };
}

export function parseCurriculumWorkbook(buffer, { filename = '', sheetName = null } = {}) {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellFormula: true, cellText: true });
  const fileHash = crypto.createHash('sha256').update(buffer).digest('hex');
  const sheets = workbook.SheetNames.map(sheet => readSheet(workbook, sheet, filename, fileHash));
  const catalogs = sheets.filter(sheet => sheet.role === 'catalog');
  // Selection is based on sheet content. The user can explicitly select any catalog in preview.
  const selected = sheetName ? sheets.find(sheet => sheet.sheet === sheetName) : catalogs[0];
  if (!selected || selected.role !== 'catalog') return { recognized: catalogs.length > 0, availableSheets: workbook.SheetNames, sheetRoles: sheets.map(({ sheet, role }) => ({ sheet, role })), activeSheetName: selected?.sheet || sheetName, rows: [], warnings: ['Chọn sheet khung danh mục; sheet kế hoạch chỉ bổ sung nguồn học kỳ, MaBoMon là bảng tra cứu.'] };
  const byCode = new Map();
  for (const sheet of sheets) for (const course of sheet.rows) {
    if (!byCode.has(course.code)) byCode.set(course.code, []);
    byCode.get(course.code).push(course);
  }
  const entries = selected.rows.map(course => {
    const peers = byCode.get(course.code) || [];
    const semesterSources = peers.flatMap(peer => peer.semesterSources);
    const terms = [...new Set(semesterSources.map(source => source.value))];
    const conflicts = [];
    if (terms.length > 1) conflicts.push({ field: 'semesterRecommended', values: terms, sources: semesterSources, message: 'Học kỳ khác nhau giữa các cột/sheet; cần admin chọn nguồn.' });
    for (const field of ['credits', 'groupCode', 'prerequisites', 'priorCourses']) {
      const sources = peers.filter(peer => hasValue(peer[field]) && !(field === 'groupCode' && course.code.startsWith('71NAD'))).map(peer => ({ ...peer.source, value: peer[field] }));
      const values = [...new Map(sources.map(source => [JSON.stringify(source.value), source.value])).values()];
      if (values.length > 1) conflicts.push({ field, values, sources, message: `Mâu thuẫn ${field} giữa các sheet.` });
    }
    if (course.groupCode === 'TC306') course.verificationStatus = 'pending_group_rule';
    return { ...course, semesterSources, ...(terms.length === 1 ? { semesterRecommended: terms[0] } : {}), conflicts };
  });
  return { recognized: true, availableSheets: workbook.SheetNames, activeSheetName: selected.sheet, sheetRoles: sheets.map(({ sheet, role }) => ({ sheet, role })), rows: entries, fileHash };
}

export function buildK30Rules(courses) {
  const common = courses.filter(c => c.required && !c.specialization && c.countsTowardDegree && c.code !== '71ITIN40304');
  const specializations = Object.fromEntries(['software', 'data', 'ai'].map(id => [id, courses.filter(c => c.required && c.specialization === id).map(c => c.code)]));
  return {
    totalCredits: 126,
    source: { type: 'user_confirmed_requirements', description: 'Yêu cầu khung VLU CNTT K30 trong tác vụ; TC306 và điều kiện khoa chưa xác nhận.' },
    groups: {
      commonRequired: { requiredCredits: 80, requiredCourses: common.length, courseCodes: common.map(c => c.code), countsTowardDegree: true },
      specializationRequired: { requiredCredits: 18, requiredCourses: 6, specializations, countsTowardDegree: true },
      TC209: { requiredCredits: 9, requiredCourses: 3, countsTowardDegree: true },
      TC309: { requiredCredits: 9, requiredCourses: 3, countsTowardDegree: true },
      TC306: { requiredCredits: null, requiredCourses: null, countsTowardDegree: false, verificationStatus: 'pending_confirmation' },
      TC406: { requiredCredits: 6, countsTowardDegree: true, options: [['71ITGR40206'], ['71ITGR40203', '71ITGR40303']], facultyEligibility: 'unverified' },
      TC002: { requiredCredits: 2, requiredCourses: 1, countsTowardDegree: false },
      TC102: { requiredCredits: 2, requiredCourses: 1, countsTowardDegree: false },
      defense: { requiredCredits: 11, requiredCourses: 4, courseCodes: courses.filter(c => c.code.startsWith('71NAD')).map(c => c.code), countsTowardDegree: false },
      internship: { requiredCredits: 4, requiredCourses: 1, courseCodes: ['71ITIN40304'], countsTowardDegree: true }
    },
    policies: { recognition: 'explicit', conditionGpaExclusion: true, retake: 'unverified', passScore10: null, passPoint4: null, minimumGpa: null, outcomes: null }
  };
}

export function groupCurriculumCourses(courses) {
  const sections = new Map();
  for (const original of courses) {
    const course = { ...original };
    const sectionName = course.sectionName || (course.groupCode === 'TC306' ? 'TC306 — chờ xác nhận' : 'Môn học chung');
    delete course.sectionName;
    if (!sections.has(sectionName)) sections.set(sectionName, { name: sectionName, courses: [] });
    sections.get(sectionName).courses.push(course);
  }
  return [...sections.values()];
}
