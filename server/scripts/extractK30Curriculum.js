import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseCurriculumWorkbook, buildK30Rules, groupCurriculumCourses } from '../src/utils/curriculumWorkbook.js';

const workbookPath = process.argv[2];
const selectedSheet = process.argv[3];
if (!workbookPath || !selectedSheet) throw new Error('Usage: node scripts/extractK30Curriculum.js <workbook.xlsx> <explicit catalog sheet>');
const result = parseCurriculumWorkbook(fs.readFileSync(workbookPath), { filename: path.basename(workbookPath), sheetName: selectedSheet });
if (!result.rows.length) throw new Error('Select a catalog sheet containing curriculum memberships.');
const source = { filename: path.basename(workbookPath), sheet: selectedSheet, fileHash: result.fileHash };
const curriculum = {
  program: 'K30 CNTT', major: 'Công nghệ thông tin', totalCredits: 126,
  scope: { schoolId: 'VLU', majorCode: '7480201', cohort: 'K30', version: '2024' },
  revision: 1, source, rules: buildK30Rules(result.rows), sections: groupCurriculumCourses(result.rows)
};
const directory = path.dirname(fileURLToPath(import.meta.url));
fs.writeFileSync(path.join(directory, '../src/data/khungK30.json'), JSON.stringify(curriculum, null, 2) + '\n', 'utf8');
// Refresh only curriculum/catalog seed blocks, retaining student marks, users and stable identifiers.
const seedPath = path.join(directory, '../src/data/demo_seed.json');
const seed = JSON.parse(fs.readFileSync(seedPath, 'utf8').replace(/^\uFEFF/, ''));
const previousCurriculum = seed.curriculum.find(item => item.program === curriculum.program) || {};
seed.curriculum = [...seed.curriculum.filter(item => item.program !== curriculum.program), { ...previousCurriculum, ...curriculum, _id: previousCurriculum._id || 'cur_k30_cntt' }];
const existingCatalog = new Map(seed.courses.map(course => [course.code, course]));
for (const section of curriculum.sections) for (const course of section.courses) {
  const before = existingCatalog.get(course.code) || {};
  existingCatalog.set(course.code, { ...before, ...course, _id: before._id || `crs_${course.code}`, sectionName: section.name, program: curriculum.program });
}
seed.courses = [...existingCatalog.values()];
fs.writeFileSync(seedPath, JSON.stringify(seed, null, 2) + '\n', 'utf8');
console.log(JSON.stringify({ memberships: result.rows.length, unresolvedConflicts: result.rows.filter(row => row.conflicts.length).map(row => ({ code: row.code, fields: row.conflicts.map(item => item.field) })) }, null, 2));
