import crypto from 'node:crypto';
import mongoose from 'mongoose';
import { calculateAcademicStats, normalizeCourseCode, numericGrade } from '../utils/gradeUtils.js';

const SCOPE_KEYS = ['schoolId', 'majorCode', 'cohort', 'version'];
const ALLOWED_COLLECTIONS = ['courses', 'curriculums', 'studentprofiles'];
const SOURCE_FIELDS = ['name', 'credits', 'groupCode', 'requirementGroup', 'specialization', 'required', 'countsTowardDegree', 'conditionNotes', 'verificationStatus'];
const idString = value => value?.toHexString ? value.toHexString() : String(value ?? '');
const valid = value => value !== null && value !== undefined && String(value).trim() !== '' && !/^#(?:N\/A|REF!|VALUE!|DIV\/0!|NUM!|NAME\?)/i.test(String(value));
const sameScope = (left, right) => Boolean(left && right) && SCOPE_KEYS.every(key => String(left[key] ?? '') === String(right[key] ?? ''));
const normalizeText = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').toLowerCase().trim();

// Native BSON identifiers are immutable and deliberately retain their prototype.
function copy(value) {
  if (value instanceof Date) return new Date(value);
  if (Array.isArray(value)) return value.map(copy);
  if (value && Object.getPrototypeOf(value) === Object.prototype) return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, copy(item)]));
  return value;
}

function comparable(value) {
  if (value?.toHexString) return { $oid: value.toHexString() };
  if (value instanceof Date) return { $date: value.toISOString() };
  if (Array.isArray(value)) return value.map(comparable);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().filter(key => value[key] !== undefined).map(key => [key, comparable(value[key])]));
  return value;
}
const same = (left, right) => JSON.stringify(comparable(left)) === JSON.stringify(comparable(right));
const digest = value => crypto.createHash('sha256').update(JSON.stringify(comparable(value))).digest('hex');
const sourceCourses = curriculum => (curriculum?.sections || []).flatMap(section => (section.courses || []).map(course => ({ ...copy(course), sectionName: section.name })));
const semester = value => {
  const text = String(value || '').trim().replace(/[–—]/g, '-');
  const year = text.match(/(20\d{2})\s*-\s*(20\d{2})/);
  const term = text.match(/(?:HK|học kỳ)\s*0?(\d+)/i);
  return year && term ? `${year[1]}-${year[2]} HK${String(Number(term[1])).padStart(2, '0')}` : text;
};
const attemptKey = course => `${normalizeCourseCode(course?.code)}|${semester(course?.semester)}`;

function sourceWithHistory(before, after, source) {
  if (!source || same(before.source, source)) return;
  const history = [...(Array.isArray(before.sourceHistory) ? before.sourceHistory : [])];
  if (before.source && !history.some(item => same(item, before.source))) history.push(copy(before.source));
  if (history.length) after.sourceHistory = history;
  after.source = copy(source);
}

function groupSections(courses, originalSections = []) {
  const metadata = new Map(originalSections.map(section => [section.name, section]));
  const sections = new Map();
  for (const original of courses) {
    const name = original.sectionName || 'Môn chưa phân nhóm';
    const course = copy(original); delete course.sectionName;
    if (!sections.has(name)) sections.set(name, { ...copy(metadata.get(name) || {}), name, courses: [] });
    sections.get(name).courses.push(course);
  }
  return [...sections.values()];
}

function canonicalId(program, scope) {
  return new mongoose.Types.ObjectId(digest({ program, scope, purpose: 'unimate-scoped-curriculum-repair' }).slice(0, 24));
}

function validateCanonical(curriculum) {
  if (!curriculum || curriculum.program !== 'K30 CNTT' || !sameScope(curriculum.scope, { schoolId: 'VLU', majorCode: '7480201', cohort: 'K30', version: '2024' })) throw new Error('Chỉ sửa khung VLU CNTT K30 phiên bản 2024 đã được cung cấp.');
  if (!curriculum.rules || !curriculum.source?.fileHash) throw new Error('Thiếu quy tắc hoặc nguồn workbook của khung chuẩn.');
  const seen = new Set();
  for (const course of sourceCourses(curriculum)) {
    const code = normalizeCourseCode(course.code);
    if (!/^\d{2}[A-Z0-9]{4,14}$/.test(code) || seen.has(code)) throw new Error('Danh mục nguồn có mã thiếu, sai hoặc trùng.');
    if (numericGrade(course.credits) === null || course.credits < 0 || !valid(course.name) || !valid(course.groupCode)) throw new Error(`Thiếu mã nhóm, tên hoặc tín chỉ nguồn của ${code}.`);
    seen.add(code);
  }
}

/**
 * Build a deterministic, read-only repair plan. Execution/backup belongs to the
 * repair engine. Nothing here connects to MongoDB, touches a demo store, or writes
 * accounts, schedules or prompts. All updates include the original precondition.
 */
export function buildDatabaseRepairPlan({ snapshot = {}, canonicalCurriculum, transcript = null, transcriptLink = null,
  studentLinks = [], sourceConditionStates = {}, now = new Date().toISOString() } = {}) {
  validateCanonical(canonicalCurriculum);
  const original = snapshot.collections || snapshot;
  const collections = Object.fromEntries(Object.entries(original).filter(([, docs]) => Array.isArray(docs)).map(([name, docs]) => [name, docs.map(copy)]));
  for (const name of ['courses', 'curriculums', 'studentprofiles', 'users', 'schedules', 'systemprompts', 'chatbox']) collections[name] ||= [];
  const review = [];
  const addReview = (code, message, details = {}) => review.push({ blocking: false, code, message, ...details });
  const source = canonicalCurriculum.source;
  const canonical = sourceCourses(canonicalCurriculum);
  const canonicalMap = new Map(canonical.map(course => [normalizeCourseCode(course.code), course]));
  const scope = copy(canonicalCurriculum.scope);
  const program = canonicalCurriculum.program;
  const references = [];

  function mergeMembership(before = {}, incoming) {
    const result = copy(before);
    result.code = normalizeCourseCode(incoming.code);
    const conflicts = incoming.conflicts || [];
    const conflictingFields = new Set(conflicts.map(item => item.field));
    for (const field of SOURCE_FIELDS) {
      if (!Object.hasOwn(incoming, field) || conflictingFields.has(field)) continue;
      const value = incoming[field];
      if (value === null && field === 'specialization' || typeof value === 'boolean' || typeof value === 'number' || valid(value)) result[field] = copy(value);
    }
    if (valid(incoming.sectionName)) result.sectionName = incoming.sectionName;
    for (const field of ['prerequisites', 'priorCourses']) {
      if (!Array.isArray(incoming[field]) || conflictingFields.has(field)) continue;
      const proposed = incoming[field].map(normalizeCourseCode).filter(Boolean);
      const old = Array.isArray(before[field]) ? before[field] : [];
      const explicitNone = sourceConditionStates[incoming.code]?.[field] === 'none';
      const oldCodes = old.flatMap(value => String(value).match(/\b\d{2}[A-Z]{2,6}\d{4,8}\b/gi) || []).map(normalizeCourseCode);
      const otherField = field === 'prerequisites' ? 'priorCourses' : 'prerequisites';
      const relationshipMoved = oldCodes.length > 0 && oldCodes.every(code => (incoming[otherField] || []).includes(code));
      if (proposed.length || !old.length || explicitNone || relationshipMoved) result[field] = proposed;
      else addReview('blank_condition_preserved', 'Giữ điều kiện hiện có vì nguồn không xác nhận rõ thao tác xóa.', { collection: 'curriculums', courseCode: incoming.code, field });
    }
    if (valid(incoming.semesterRecommended) && !conflictingFields.has('semesterRecommended')) result.semesterRecommended = incoming.semesterRecommended;
    if (incoming.semesterSources) result.semesterSources = copy(incoming.semesterSources);
    result.conflicts = copy(conflicts);
    for (const conflict of conflicts) addReview('source_field_deferred', 'Chưa áp dụng trường mâu thuẫn; giữ giá trị hiện có và các nguồn để admin xác nhận.', { collection: 'curriculums', courseCode: incoming.code, field: conflict.field, values: copy(conflict.values) });
    sourceWithHistory(before, result, incoming.source);
    return result;
  }

  // The code catalog is shared. Scope-specific membership remains in curriculum.
  const catalogGroups = new Map();
  for (const course of collections.courses) {
    const code = normalizeCourseCode(course.code);
    if (!catalogGroups.has(code)) catalogGroups.set(code, []);
    catalogGroups.get(code).push(course);
  }
  for (const incoming of canonical) {
    const code = normalizeCourseCode(incoming.code);
    const candidates = (catalogGroups.get(code) || []).filter(course => !course.repairAliasOf);
    if (!candidates.length) {
      const inserted = mergeMembership({}, incoming);
      inserted._id = new mongoose.Types.ObjectId(digest({ code, purpose: 'unimate-course-catalog-repair' }).slice(0, 24));
      inserted.program = program;
      collections.courses.push(inserted);
      catalogGroups.set(code, [inserted]);
      continue;
    }
    const ordered = candidates.slice().sort((left, right) => Number(Boolean(right.source?.fileHash)) - Number(Boolean(left.source?.fileHash)) || idString(left._id).localeCompare(idString(right._id)));
    const preferred = ordered[0];
    if (preferred.program && preferred.program !== program && !sameScope(preferred.scope, scope)) {
      addReview('shared_catalog_other_program', 'Không ghi đè bản ghi danh mục thuộc chương trình khác; membership K30 có dữ liệu độc lập.', { collection: 'courses', id: idString(preferred._id), courseCode: code });
      continue;
    }
    const merged = mergeMembership(preferred, incoming);
    // Keep the globally unique catalog key in place; normalized aliases are metadata.
    merged.code = preferred.code || code;
    Object.assign(preferred, merged);
    for (const duplicate of ordered.slice(1)) {
      duplicate.repairAliasOf = idString(preferred._id);
      duplicate.repairAliasReason = 'duplicate_normalized_course_code';
      references.push({ collection: 'courses', aliasId: idString(duplicate._id), canonicalId: idString(preferred._id), key: code, action: 'retained_as_alias' });
      addReview('duplicate_course_alias_retained', 'Bản ghi dư giữ nguyên ID dưới dạng alias, không xóa; mọi tham chiếu cũ vẫn còn bản ghi đích.', { collection: 'courses', id: idString(duplicate._id), courseCode: code });
    }
  }

  // Adopt only this exact version or an unscoped legacy document of this program.
  const scoped = collections.curriculums.filter(item => item.program === program && sameScope(item.scope, scope) && !item.repairAliasOf);
  const legacy = collections.curriculums.filter(item => item.program === program && !item.scope && !item.repairAliasOf);
  let candidates = scoped.length ? scoped : legacy;
  let target;
  if (candidates.length) {
    const refCount = item => collections.studentprofiles.filter(profile => idString(profile.curriculumId) === idString(item._id)).length;
    candidates = candidates.slice().sort((left, right) => refCount(right) - refCount(left) || Number(Boolean(right.rules)) - Number(Boolean(left.rules)) || idString(left._id).localeCompare(idString(right._id)));
    target = candidates[0];
    for (const duplicate of candidates.slice(1)) {
      for (const profile of collections.studentprofiles) if (idString(profile.curriculumId) === idString(duplicate._id)) {
        references.push({ collection: 'studentprofiles', id: idString(profile._id), field: 'curriculumId', before: idString(duplicate._id), after: idString(target._id) });
        profile.curriculumId = idString(target._id);
      }
      duplicate.repairAliasOf = idString(target._id);
      duplicate.repairAliasReason = 'duplicate_scoped_curriculum';
      addReview('duplicate_curriculum_alias_retained', 'Đã chuyển tham chiếu curriculumId đã biết về bản chuẩn; giữ bản dư dưới dạng alias và giữ nguyên ID.', { collection: 'curriculums', id: idString(duplicate._id) });
    }
  } else {
    target = { _id: canonicalId(program, scope), program, sections: [] };
    collections.curriculums.push(target);
  }
  const previousTarget = copy(target);
  const oldMemberships = sourceCourses(target);
  const membership = new Map();
  for (const course of oldMemberships) {
    const code = normalizeCourseCode(course.code);
    if (!code || /^#/.test(code)) {
      addReview('legacy_invalid_membership_retained', 'Giữ bản ghi cũ không nhận diện được mã để tránh xóa ngầm; cần admin kiểm tra.', { collection: 'curriculums', id: idString(target._id) });
      continue;
    }
    if (membership.has(code)) addReview('duplicate_membership_consolidated', 'Gộp membership trùng theo mã trong cùng khung; ID của khung và bảng điểm không đổi.', { collection: 'curriculums', id: idString(target._id), courseCode: code });
    else membership.set(code, course);
  }
  for (const course of canonical) membership.set(course.code, mergeMembership(membership.get(course.code), course));
  target.sections = groupSections([...membership.values()], previousTarget.sections);
  target.program = program;
  target.scope = scope;
  target.major = canonicalCurriculum.major;
  target.totalCredits = canonicalCurriculum.totalCredits;
  const existingRules = previousTarget.rules || {};
  target.rules = {
    ...copy(existingRules), ...copy(canonicalCurriculum.rules),
    groups: { ...copy(existingRules.groups || {}), ...copy(canonicalCurriculum.rules.groups) },
    // Existing confirmed grading policies survive; absent/unknown source policies never erase them.
    policies: { ...copy(canonicalCurriculum.rules.policies), ...Object.fromEntries(Object.entries(existingRules.policies || {}).filter(([, value]) => value !== null && value !== undefined && value !== 'unverified')) }
  };
  sourceWithHistory(previousTarget, target, source);
  const targetContent = doc => Object.fromEntries(Object.entries(doc).filter(([key]) => !['revision', 'updatedAt', 'academicRepair'].includes(key)));
  if (!same(targetContent(previousTarget), targetContent(target))) target.revision = Math.max(1, Number(previousTarget.revision) || 0) + (previousTarget.sections?.length ? 1 : 0);
  else target.revision = previousTarget.revision;

  // Repair a missing account relationship only when both independent identifiers agree.
  for (const profile of collections.studentprofiles) {
    const mssv = String(profile.mssv || '').trim();
    if (!mssv) continue;
    const bound = collections.users.find(user => idString(user._id) === idString(profile.userId));
    if (bound) {
      if (bound.mssv && String(bound.mssv).trim() !== mssv) addReview('account_profile_identity_conflict', 'Tài khoản đang liên kết có MSSV khác hồ sơ; không tự đổi liên kết.', { collection: 'studentprofiles', id: idString(profile._id), blocking: true });
      continue;
    }
    const matches = collections.users.filter(user => String(user.mssv || '').trim() === mssv && normalizeText(user.email) === normalizeText(profile.email) && valid(profile.email));
    if (matches.length === 1) profile.userId = matches[0]._id;
    else addReview('unverified_account_profile_link', 'Chưa đủ hai định danh khớp duy nhất để khôi phục liên kết tài khoản.', { collection: 'studentprofiles', id: idString(profile._id) });
  }
  for (const link of studentLinks) {
    if (link?.confirmed !== true || !link.evidence) continue;
    const profile = collections.studentprofiles.find(item => idString(item._id) === idString(link.profileId));
    if (!profile) { addReview('student_link_not_found', 'Không tìm thấy hồ sơ trong liên kết được xác nhận.', { collection: 'studentprofiles', blocking: true }); continue; }
    if (profile.curriculumId && idString(profile.curriculumId) !== idString(target._id)) { addReview('existing_version_assignment_preserved', 'Hồ sơ đã được gán phiên bản khác; không tự chuyển sang khung mới.', { collection: 'studentprofiles', id: idString(profile._id) }); continue; }
    profile.curriculumId = idString(target._id);
    profile.curriculumVersion = scope.version;
    profile.program = program;
    profile.schoolId = scope.schoolId;
    profile.majorCode = scope.majorCode;
  }

  let transcriptDraft = null;
  if (transcript) {
    const sourceRows = (transcript.semesters || []).flatMap(sem => (sem.courses || []).map(course => ({ ...copy(course), semester: semester(course.semester || sem.semesterName) })));
    const matches = collections.studentprofiles.filter(profile => transcriptLink?.profileId ? idString(profile._id) === idString(transcriptLink.profileId) : transcriptLink?.mssv && String(profile.mssv).trim() === String(transcriptLink.mssv).trim());
    if (transcriptLink?.confirmed !== true || matches.length !== 1) {
      transcriptDraft = { status: 'awaiting_profile_link', source: copy(transcript.sourceTotals?.source || {}), courseCount: sourceRows.length, sourceTotals: copy(transcript.sourceTotals || {}) };
      addReview('transcript_unlinked_draft', 'Bảng điểm được giữ thành bản nháp; chưa có một hồ sơ đích được xác nhận duy nhất.', { collection: 'studentprofiles' });
    } else {
      const profile = matches[0];
      const users = collections.users.filter(user => idString(user._id) === idString(profile.userId));
      const linkedIdentityValid = users.length === 1 && (!users[0].mssv || String(users[0].mssv).trim() === String(profile.mssv).trim());
      if (!linkedIdentityValid) addReview('transcript_account_link_unverified', 'Chưa xác minh được tài khoản liên kết của đúng hồ sơ; không ghi bảng điểm.', { collection: 'studentprofiles', id: idString(profile._id), blocking: true });
      else if (profile.curriculumId && idString(profile.curriculumId) !== idString(target._id)) addReview('transcript_version_conflict', 'Hồ sơ đang dùng phiên bản khác; không tự chuyển phiên bản để làm khớp bảng điểm.', { collection: 'studentprofiles', id: idString(profile._id), blocking: true });
      else {
        const seen = new Map();
        for (const row of sourceRows) {
          if (!normalizeCourseCode(row.code) || numericGrade(row.credits) === null) throw new Error('Bảng điểm nguồn có mã hoặc tín chỉ chưa xác minh.');
          const key = attemptKey(row);
          if (seen.has(key) && !same(seen.get(key), row)) throw new Error('Bảng điểm nguồn có lần học trùng mâu thuẫn.');
          seen.set(key, row);
        }
        const currentCourses = [...(Array.isArray(profile.courses) ? profile.courses : [])].map(copy);
        for (const incoming of seen.values()) {
          const index = currentCourses.findIndex(course => attemptKey(course) === attemptKey(incoming));
          const before = index < 0 ? {} : currentCourses[index];
          const row = { ...copy(before), ...copy(incoming), code: normalizeCourseCode(incoming.code), semester: semester(incoming.semester) };
          for (const field of ['score', 'point4']) {
            row[field] = numericGrade(incoming[field]);
            // Schema-default zero on an ungraded legacy row is not a real grade.
            const oldUngradedZero = numericGrade(before[field]) === 0 && /đang học|chưa có điểm|in_progress/i.test(String(before.status || '')) && !String(before.letter || '').trim();
            if (row[field] === null && numericGrade(before[field]) !== null && !oldUngradedZero) {
              row[field] = before[field];
              row.status = before.status;
              row.letter = before.letter;
              addReview('newer_grade_preserved', 'Nguồn chưa có điểm không ghi đè một kết quả đã tồn tại; giữ điểm để đối chiếu.', { collection: 'studentprofiles', id: idString(profile._id), courseCode: row.code, field });
            }
          }
          sourceWithHistory(before, row, incoming.source || transcript.sourceTotals?.source || { type: 'user_confirmed_pdf' });
          if (index < 0) currentCourses.push(row); else currentCourses[index] = row;
        }
        profile.courses = currentCourses;
        profile.curriculumId = idString(target._id);
        profile.curriculumVersion = scope.version;
        profile.program = program;
        profile.schoolId = scope.schoolId;
        profile.majorCode = scope.majorCode;
        const requestedSpecialization = transcriptLink.specialization;
        if (['software', 'data', 'ai'].includes(requestedSpecialization) && profile.specialization !== requestedSpecialization) {
          profile.specializationHistory = [...(profile.specializationHistory || []), { from: profile.specialization || null, to: requestedSpecialization, changedAt: now, admin: true, source: 'user_confirmed_database_repair', evidence: copy(transcriptLink.evidence || transcriptLink.source || 'user_confirmed'), previousPlannedCourses: copy(profile.plannedCourses || []) }];
          profile.specialization = requestedSpecialization;
          profile.specializationSelectedAt = new Date(now);
          // History retains old choices; branch checks will revalidate future plans.
        }
        const sourceTotals = copy(transcript.sourceTotals || {});
        const mergedSourceTotals = { ...(profile.transcriptSourceTotals || {}) };
        for (const [key, value] of Object.entries(sourceTotals)) if (value !== null && value !== undefined && value !== '') mergedSourceTotals[key] = value;
        profile.transcriptSourceTotals = mergedSourceTotals;
        if (numericGrade(sourceTotals.cumulativeCredits) !== null) profile.officialCumulativeCredits = numericGrade(sourceTotals.cumulativeCredits);
        if (numericGrade(sourceTotals.cumulativeGpa4) !== null) profile.officialCumulativeGpa4 = numericGrade(sourceTotals.cumulativeGpa4);
        const importDigest = digest({ source: sourceTotals.source, courses: sourceRows });
        const history = [...(profile.transcriptImportHistory || [])];
        if (!history.some(item => item.digest === importDigest)) history.push({ digest: importDigest, source: copy(sourceTotals.source || { type: 'user_confirmed_pdf' }), importedAt: now, courseCount: sourceRows.length, evidence: copy(transcriptLink.evidence || transcriptLink.source || 'user_confirmed') });
        profile.transcriptImportHistory = history;
        profile.completedCourses = calculateAcademicStats(profile.courses, { curriculum: target, specialization: profile.specialization, sourceTotals: mergedSourceTotals }).completedCourseCodes;
      }
    }
  }

  const operations = [];
  const summary = { added: 0, updated: 0, skipped: 0, errors: 0, byCollection: {} };
  for (const name of ALLOWED_COLLECTIONS) {
    const beforeMap = new Map((original[name] || []).map(doc => [idString(doc._id), doc]));
    const counts = { added: 0, updated: 0, skipped: 0 };
    for (const doc of collections[name]) {
      const before = beforeMap.get(idString(doc._id));
      if (!before) {
        const naturalKey = name === 'courses' ? { code: doc.code } : name === 'curriculums' ? { program: doc.program, ...Object.fromEntries(SCOPE_KEYS.map(key => [`scope.${key}`, doc.scope[key]])) } : { mssv: doc.mssv };
        operations.push({ collection: name, kind: 'insert', document: copy(doc), naturalKey, reason: 'Bổ sung dữ liệu có nguồn vào đúng phạm vi chương trình.', source: copy(source) });
        counts.added++;
      } else if (!same(before, doc)) {
        const set = Object.fromEntries(Object.entries(doc).filter(([key, value]) => key !== '_id' && !same(before[key], value)).map(([key, value]) => [key, copy(value)]));
        if (!Object.keys(set).length) { counts.skipped++; continue; }
        operations.push({ collection: name, kind: 'update', id: before._id, expected: copy(before), set, reason: 'Cập nhật có căn cứ nguồn, bảo toàn ID và dữ liệu ngoài phạm vi.', source: copy(source) });
        counts.updated++;
      } else counts.skipped++;
    }
    summary.byCollection[name] = counts;
    for (const field of ['added', 'updated', 'skipped']) summary[field] += counts[field];
  }
  const idCollisions = operations.filter(operation => operation.kind === 'insert').filter(operation => Object.values(original).filter(Array.isArray).flat().some(doc => idString(doc._id) === idString(operation.document._id)));
  if (idCollisions.length) addReview('deterministic_id_collision', 'Mã định danh thêm mới đã tồn tại ngoài bản ghi dự kiến; dừng trước khi ghi.', { blocking: true });
  summary.errors = review.filter(item => item.blocking).length;
  return { version: 1, database: snapshot.database || 'chatbox', scope, source: copy(source), operations, review, summary, references, transcriptDraft,
    invariants: { noAccountWrites: true, noScheduleGeneration: true, noDeletes: true, noDemoWrites: true, deferredFieldsNotApplied: true },
    verification: { canonicalCurriculumId: idString(target._id), canonicalCourseCount: canonicalMap.size,
      transcriptProfileId: transcriptLink?.confirmed && transcript ? idString(collections.studentprofiles.find(profile => String(profile.mssv).trim() === String(transcriptLink.mssv).trim())?._id) : null } };
}

export default buildDatabaseRepairPlan;
