import crypto from 'node:crypto';
import { curriculumRepo, courseRepo, getDataMode } from '../repositories/index.js';
import { parseCurriculumWorkbook, buildK30Rules, groupCurriculumCourses, hasValue, cleanCode, specializationId } from '../utils/curriculumWorkbook.js';
import { parseExcelBuffer, autoMapColumns, FIELD_DEFINITIONS } from '../utils/excelParser.js';

const previews = new Map();
const fields = ['name', 'credits', 'sectionName', 'groupCode', 'requirementGroup', 'specialization', 'required', 'countsTowardDegree', 'prerequisites', 'priorCourses', 'semesterRecommended', 'conditionNotes', 'verificationStatus'];
const flatten = curriculum => (curriculum?.sections || []).flatMap(section => (section.courses || []).map(course => ({ ...course, sectionName: section.name })));
const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const failure = (message, status = 400) => { const error = new Error(message); error.statusCode = status; return error; };
const isK30Scope = (program, scope) => program === 'K30 CNTT' && scope?.schoolId === 'VLU' && scope?.majorCode === '7480201' && scope?.cohort === 'K30' && scope?.version === '2024';
const fallbackScope = program => program === 'K30 CNTT' ? { schoolId: 'VLU', majorCode: '7480201', cohort: 'K30', version: '2024' } : null;

function validateCourse(course) {
  const errors = [];
  if (!/^[A-Z0-9][A-Z0-9_.-]{1,49}$/.test(course.code)) errors.push('Mã học phần không hợp lệ.');
  if (!hasValue(course.name)) errors.push('Thiếu tên học phần.');
  if (!Number.isFinite(course.credits) || course.credits < 0 || course.credits > 30) errors.push('Tín chỉ phải là số từ 0 đến 30 lấy từ cột tín chỉ.');
  if (!hasValue(course.groupCode)) errors.push('Thiếu mã nhóm BB/TC; không suy nhóm từ tên khối.');
  return errors;
}

function mergeCourse(before, incoming) {
  const result = { ...before };
  for (const [key, value] of Object.entries(incoming)) {
    if (key === 'conflicts') continue;
    if (key === 'specialization' && value === null && hasValue(incoming.groupCode)) result[key] = null;
    else if (hasValue(value) || Array.isArray(value) || typeof value === 'boolean') result[key] = structuredClone(value);
  }
  return result;
}

export async function previewCurriculumImport({ buffer, filename, defaultProgram = 'K30 CNTT', curriculumId = null, scope = null, sheetName = null, customMapping = null }) {
  const target = curriculumId ? await curriculumRepo.findById(curriculumId) : await curriculumRepo.findByProgram(defaultProgram, scope);
  if (curriculumId && !target) throw failure('Không tìm thấy khung đã chọn.', 404);
  if (target?.verificationStatus === 'ambiguous_version') throw failure('Có nhiều phiên bản. Chọn khung hiện có bằng mã định danh.');
  const program = target?.program || defaultProgram;
  const targetScope = target?.scope || scope || fallbackScope(program);
  let parsed = parseCurriculumWorkbook(buffer, { filename, sheetName });
  if (!parsed.recognized) {
    const generic = parseExcelBuffer(buffer, sheetName);
    const mapping = customMapping && Object.keys(customMapping).length ? customMapping : autoMapColumns(generic.headers, 'curriculum');
    const hash = crypto.createHash('sha256').update(buffer).digest('hex');
    parsed = { ...generic, recognized: false, sheetRoles: generic.availableSheets.map(sheet => ({ sheet, role: 'mapped' })), rows: generic.rows.map((raw, index) => {
      const course = {};
      for (const field of FIELD_DEFINITIONS.curriculum.fields) if (mapping[field.key] && hasValue(raw[mapping[field.key]])) course[field.key] = raw[mapping[field.key]];
      course.code = cleanCode(course.code);
      if (hasValue(course.credits)) course.credits = Number(String(course.credits).replace(',', '.'));
      for (const key of ['prerequisites', 'priorCourses']) if (hasValue(course[key])) course[key] = String(course[key]).split(/[,;\s]+/).filter(x => /^\d{2}[A-Z]/i.test(x));
      if (hasValue(course.specialization)) course.specialization = specializationId(course.specialization);
      if (hasValue(course.groupCode)) { course.groupCode = (String(course.groupCode).match(/TC\d{3}|BBKTL|BB/i) || [])[0]?.toUpperCase(); course.required = /^BB/.test(course.groupCode || ''); }
      course.source = { filename, sheet: generic.activeSheetName, row: raw.__sourceRow || index + 2, fileHash: hash };
      return course;
    }), detectedMapping: mapping, fileHash: hash };
  }
  const existing = flatten(target);
  const byCode = new Map(existing.map(course => [cleanCode(course.code), course]));
  const seen = new Map();
  const rows = parsed.rows.map((incoming, index) => {
    const before = byCode.get(incoming.code);
    const data = mergeCourse(before, incoming);
    const errors = validateCourse(data);
    const conflicts = [...(incoming.conflicts || [])];
    if (seen.has(incoming.code)) {
      errors.push(`Mã học phần bị trùng trong file (dòng ${seen.get(incoming.code)}).`);
    } else seen.set(incoming.code, incoming.source.row);
    const changes = fields.filter(field => Object.hasOwn(incoming, field) && !equal(before?.[field], data[field])).map(field => ({ field, before: before?.[field] ?? null, after: data[field] }));
    const changeType = errors.length ? 'invalid' : conflicts.length ? 'conflict' : !before ? 'added' : changes.length ? 'changed' : 'unchanged';
    return { rowIndex: index + 1, selected: !errors.length && !conflicts.length && changeType !== 'unchanged', status: errors.length ? 'invalid' : changeType === 'unchanged' ? 'duplicate' : 'valid', changeType, data, source: incoming.source, changes, conflicts, errors, warnings: conflicts.map(conflict => conflict.message), originalRaw: incoming };
  });
  const builtRules = isK30Scope(program, targetScope) ? buildK30Rules(rows.map(row => row.data)) : null;
  const rules = builtRules ? {
    ...builtRules, ...(target?.rules || {}),
    groups: Object.fromEntries([...new Set([...Object.keys(builtRules.groups), ...Object.keys(target?.rules?.groups || {})])].map(key => [key, { ...(builtRules.groups[key] || {}), ...(target?.rules?.groups?.[key] || {}) }])),
    policies: { ...builtRules.policies, ...(target?.rules?.policies || {}) }
  } : target?.rules || null;
  const missingRules = rules ? Object.keys(rules.groups || {}).filter(key => !target?.rules?.groups?.[key]) : ['Chưa có quy tắc được xác nhận cho trường/ngành/khóa/phiên bản này.'];
  const absentCourses = existing.filter(course => !seen.has(cleanCode(course.code))).map(course => ({ code: course.code, name: course.name, action: 'retained' }));
  const summary = { total: rows.length, valid: rows.filter(row => row.status === 'valid').length, duplicate: rows.filter(row => row.status === 'duplicate').length, invalid: rows.filter(row => row.status === 'invalid').length, added: rows.filter(row => !byCode.has(row.data.code)).length, changed: rows.filter(row => byCode.has(row.data.code) && row.changes.length).length, unchanged: rows.filter(row => row.changeType === 'unchanged').length, conflicts: rows.filter(row => row.conflicts.length).length, absent: absentCourses.length };
  for (const [key, value] of previews) if (value.expiresAt < Date.now()) previews.delete(key);
  if (previews.size >= 100) previews.delete(previews.keys().next().value);
  const previewToken = crypto.randomBytes(24).toString('hex');
  const preview = { previewToken, rows, target: target?._id ? target : { program, scope: targetScope, sections: [], revision: 1 }, program, scope: targetScope, rules, source: { filename, sheet: parsed.activeSheetName, fileHash: parsed.fileHash }, expectedRevision: target?.revision || 1, expiresAt: Date.now() + 30 * 60 * 1000 };
  previews.set(previewToken, structuredClone(preview));
  return { isScanned: false, previewToken, target: { _id: target?._id, program, scope: targetScope, revision: preview.expectedRevision }, availableSheets: parsed.availableSheets, activeSheetName: parsed.activeSheetName, sheetRoles: parsed.sheetRoles, headers: parsed.headers || fields, detectedMapping: parsed.detectedMapping || {}, fields: FIELD_DEFINITIONS.curriculum.fields, rows, summary, missingRules, absentCourses, conflicts: rows.filter(row => row.conflicts.length).map(row => ({ rowIndex: row.rowIndex, code: row.data.code, conflicts: row.conflicts })), warnings: parsed.warnings || [] };
}

export async function confirmCurriculumImport({ previewToken, rows = [], selectedRowIndices = null, resolutions = {} }) {
  const preview = previews.get(previewToken);
  if (!preview || preview.expiresAt < Date.now()) throw failure('Bản xem trước hết hạn hoặc không tồn tại. Vui lòng tải lại file.');
  if (preview.completedResult) return preview.completedResult;
  const current = preview.target._id ? await curriculumRepo.findById(preview.target._id) : await curriculumRepo.findByProgram(preview.program, preview.scope);
  if ((!preview.target._id && current?._id) || (preview.target._id && !current?._id)) throw failure('Khung đã thay đổi sau khi xem trước. Vui lòng phân tích lại file.', 409);
  if (current?._id && (current.revision || 1) !== preview.expectedRevision) throw failure('Khung đã thay đổi sau khi xem trước. Vui lòng phân tích lại file.', 409);
  const selected = new Set(selectedRowIndices || rows.filter(row => row.selected !== false).map(row => row.rowIndex));
  const membership = new Map(flatten(current?._id ? current : preview.target).map(course => [course.code, course]));
  let addedCount = 0, updatedCount = 0, skippedCount = 0;
  for (const row of preview.rows) {
    if (!selected.has(row.rowIndex) || row.status === 'invalid') { skippedCount++; continue; }
    const data = structuredClone(row.data);
    const resolution = resolutions[String(row.rowIndex)] || resolutions[row.data.code] || {};
    for (const conflict of row.conflicts) {
      if (!Object.hasOwn(resolution, conflict.field) || !conflict.values.some(value => equal(value, resolution[conflict.field]))) throw failure(`Dòng ${row.rowIndex} (${data.code}): cần xác nhận ${conflict.field} theo một giá trị nguồn.`);
      data[conflict.field] = resolution[conflict.field];
    }
    const validation = validateCourse(data);
    if (validation.length) throw failure(`Dòng ${row.rowIndex}: ${validation.join(' ')}`);
    data.conflicts = [];
    const before = membership.get(data.code);
    if (before && fields.every(field => equal(before[field], data[field]))) { skippedCount++; continue; }
    membership.set(data.code, { ...mergeCourse(before, data), conflicts: [] });
    if (before) updatedCount++; else addedCount++;
  }
  const rulesChanged = !equal(current?.rules, preview.rules);
  let saved = current;
  if (addedCount || updatedCount || rulesChanged) {
    const history = [...(current?.importHistory || []), { ...preview.source, at: new Date().toISOString(), previousRevision: current?.revision || 1, addedCount, updatedCount }];
    saved = await curriculumRepo.upsert({ ...preview.target, ...(current?._id ? current : {}), program: preview.program, scope: preview.scope, totalCredits: current?.totalCredits ?? preview.rules?.totalCredits ?? null, revision: (current?.revision || 0) + 1, rules: preview.rules, sections: groupCurriculumCourses([...membership.values()]), source: preview.source, importHistory: history }, current?._id ? { expectedRevision: preview.expectedRevision } : {});
    // The catalog identifies courses globally. Curriculum membership carries its own scoped metadata.
    // Never overwrite existing catalog records or change their IDs during a framework update.
    for (const course of membership.values()) if (!await courseRepo.findByCode(course.code)) await courseRepo.create({ code: course.code, name: course.name, credits: course.credits, prerequisites: course.prerequisites || [], priorCourses: course.priorCourses || [], source: course.source });
  }
  const result = { success: true, storageMode: getDataMode(), addedCount, updatedCount, skippedCount, errorCount: 0, errors: [], curriculumId: saved?._id, revision: saved?.revision, message: `Đã cập nhật khung: ${addedCount} bổ sung, ${updatedCount} thay đổi, ${skippedCount} giữ nguyên/bỏ qua. Điểm và lịch sử được giữ nguyên.` };
  preview.completedResult = result;
  return result;
}
