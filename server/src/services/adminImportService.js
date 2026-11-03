import crypto from 'crypto';
import {
  DATA_TYPES,
  FIELD_DEFINITIONS,
  generateExcelTemplate,
  parseExcelBuffer,
  parsePdfBuffer,
  autoMapColumns
} from '../utils/excelParser.js';
import {
  courseRepo,
  studentRepo,
  scheduleRepo,
  userRepo,
  getDataMode
} from '../repositories/index.js';
import { hashPassword } from '../utils/passwordUtils.js';
import { confirmTranscriptCourses } from './studentService.js';
import { numericGrade } from '../utils/gradeUtils.js';
import { previewCurriculumImport, confirmCurriculumImport } from './curriculumImportService.js';

export const adminImportService = {
  /**
   * 1. Get downloadable Excel template
   */
  getTemplate(dataType) {
    if (!FIELD_DEFINITIONS[dataType]) {
      throw new Error(`Loại dữ liệu không hỗ trợ: ${dataType}`);
    }
    const buffer = generateExcelTemplate(dataType);
    const filename = `Mau_Nhap_${dataType}_UniMate.xlsx`;
    return { buffer, filename };
  },

  /**
   * 2. Preview & Validate Import File
   */
  async previewImport({ buffer, filename, mimetype, dataType, sheetName = null, customMapping = null, defaultProgram = 'K30 CNTT', curriculumId = null, scope = null, targetMssv = null }) {
    if (dataType === 'curriculum') {
      if (String(filename || '').toLowerCase().endsWith('.pdf')) throw new Error('Cập nhật khung cần bảng Excel có mã nhóm và cột điều kiện riêng.');
      return previewCurriculumImport({ buffer, filename, defaultProgram, curriculumId, scope, sheetName, customMapping });
    }
    if (!FIELD_DEFINITIONS[dataType]) {
      throw new Error(`Loại dữ liệu không hỗ trợ: ${dataType}`);
    }

    const def = FIELD_DEFINITIONS[dataType];
    if (dataType === 'grades' && targetMssv && !await studentRepo.findByMssv(String(targetMssv).trim())) {
      throw Object.assign(new Error('Không tìm thấy hồ sơ MSSV đích để nhập bảng điểm.'), { statusCode: 404 });
    }
    const isPdf = (mimetype && mimetype.includes('pdf')) || (filename && filename.toLowerCase().endsWith('.pdf'));

    let parsedResult;
    if (isPdf) {
      parsedResult = await parsePdfBuffer(buffer, dataType);
      if (parsedResult.isScanned) {
        return {
          isScanned: true,
          message: parsedResult.message,
          availableSheets: [],
          headers: [],
          rows: [],
          summary: { total: 0, valid: 0, duplicate: 0, invalid: 0 }
        };
      }
    } else {
      parsedResult = parseExcelBuffer(buffer, sheetName);
    }

    const { availableSheets, activeSheetName, headers, rows: rawRows } = parsedResult;

    if (!rawRows || rawRows.length === 0) {
      return {
        isScanned: false,
        availableSheets,
        activeSheetName,
        headers,
        detectedMapping: {},
        fields: def.fields,
        rows: [],
        summary: { total: 0, valid: 0, duplicate: 0, invalid: 0 }
      };
    }

    // Determine column mapping
    const detectedMapping = customMapping && Object.keys(customMapping).length > 0
      ? customMapping
      : autoMapColumns(headers, dataType);

    // Fetch existing records for duplicate detection
    let existingItemsMap = new Set();
    try {
      if (dataType === 'courses') {
        const existing = await courseRepo.findMany();
        existing.forEach(c => {
          if (c.code) existingItemsMap.add(c.code.toUpperCase().trim());
        });
      } else if (dataType === 'students') {
        const existing = await studentRepo.findMany({ limit: 1000 });
        (existing.students || []).forEach(s => {
          if (s.mssv) existingItemsMap.add(s.mssv.trim());
        });
      }
    } catch (err) {
      console.warn('Lưu ý khi tra cứu bản ghi trùng:', err.message);
    }

    // Validate and format each row
    const validatedRows = [];
    let validCount = 0;
    let duplicateCount = 0;
    let invalidCount = 0;

    for (let i = 0; i < rawRows.length; i++) {
      const raw = rawRows[i];
      const mappedData = {};
      const rowErrors = [];
      const rowWarnings = [];

      // Map raw headers to defined keys
      def.fields.forEach(f => {
        const headerName = detectedMapping[f.key];
        let val = headerName && raw[headerName] !== undefined ? raw[headerName] : '';
        val = String(val).trim();

        // Type coercion & validation
        if (f.key === 'code' || f.key === 'courseCode') {
          val = val.toUpperCase().replace(/\s+/g, '');
        } else if (f.key === 'mssv') {
          val = val.replace(/\s+/g, '');
          if (dataType === 'grades' && targetMssv) {
            if (val && val !== String(targetMssv).trim()) rowErrors.push('MSSV trong file khác MSSV đích đã chọn.');
            if (!val) val = String(targetMssv).trim();
          }
        } else if (f.key === 'credits') {
          const num = parseInt(val, 10);
          val = isNaN(num) ? '' : num;
        } else if (f.key === 'score' || f.key === 'point4') {
          if (val !== '') {
            const num = parseFloat(val);
            val = isNaN(num) ? '' : num;
          }
        } else if (f.key === 'dayOfWeek') {
          const num = parseInt(val, 10);
          val = isNaN(num) ? '' : num;
        }

        mappedData[f.key] = val;

        // Check required fields
        if (f.required && (val === '' || val === null || val === undefined)) {
          rowErrors.push(`Thiếu trường bắt buộc: ${f.label}`);
        }
      });

      // Business logic validations & duplicate check
      let status = 'valid';

      if (dataType === 'courses') {
        if (mappedData.code && existingItemsMap.has(mappedData.code)) {
          status = 'duplicate';
          rowWarnings.push(`Môn học mã ${mappedData.code} đã tồn tại trong hệ thống.`);
        }
      } else if (dataType === 'students') {
        if (mappedData.mssv && existingItemsMap.has(mappedData.mssv)) {
          status = 'duplicate';
          rowWarnings.push(`Sinh viên MSSV ${mappedData.mssv} đã có hồ sơ.`);
        }
        if (mappedData.email && !mappedData.email.includes('@')) {
          rowErrors.push('Địa chỉ email không hợp lệ.');
        }
      } else if (dataType === 'schedules') {
        if (mappedData.dayOfWeek && (mappedData.dayOfWeek < 2 || mappedData.dayOfWeek > 8)) {
          rowErrors.push('Thứ trong tuần phải từ 2 đến 8 (hoặc Chủ nhật).');
        }
      } else if (dataType === 'grades') {
        if (mappedData.score !== '' && (mappedData.score < 0 || mappedData.score > 10)) {
          rowErrors.push('Điểm hệ 10 phải từ 0.0 đến 10.0.');
        }
      }

      if (rowErrors.length > 0) {
        status = 'invalid';
        invalidCount++;
      } else if (status === 'duplicate') {
        duplicateCount++;
      } else {
        validCount++;
      }

      validatedRows.push({
        rowIndex: i + 1,
        selected: status !== 'invalid',
        status,
        data: dataType === 'grades' ? { ...mappedData, _sourceTotals: parsedResult.sourceTotals,
          _source: { filename, sheet: activeSheetName, row: raw.__sourceRow || i + 1,
            fileHash: crypto.createHash('sha256').update(buffer).digest('hex') } } : mappedData,
        errors: rowErrors,
        warnings: rowWarnings,
        originalRaw: raw
      });
    }

    return {
      isScanned: false,
      availableSheets,
      activeSheetName,
      headers,
      detectedMapping,
      fields: def.fields,
      sourceTotals: parsedResult.sourceTotals,
      warnings: parsedResult.warnings || [],
      rows: validatedRows,
      summary: {
        total: validatedRows.length,
        valid: validCount,
        duplicate: duplicateCount,
        invalid: invalidCount
      }
    };
  },

  /**
   * 3. Confirm & Save Validated Rows to Database / Demo Storage
   */
  async confirmImport({ dataType, rows, conflictMode = 'skip', defaultProgram = 'K30 CNTT', previewToken, selectedRowIndices, resolutions }) {
    if (dataType === 'curriculum') return confirmCurriculumImport({ previewToken, rows, selectedRowIndices, resolutions });
    if (!Array.isArray(rows) || rows.length === 0) {
      throw new Error('Không có dòng dữ liệu nào được gửi để lưu');
    }

    const mode = getDataMode();
    let addedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    const errors = [];

    for (const item of rows) {
      const { rowIndex, status, data } = item;

      // Skip invalid rows
      if (status === 'invalid') {
        skippedCount++;
        continue;
      }

      // Handle duplicates
      if (status === 'duplicate') {
        if (conflictMode === 'skip') {
          skippedCount++;
          continue;
        }
        // If conflictMode is 'update', proceed to update below
      }

      try {
        if (dataType === 'courses') {
          const courseData = {
            code: data.code,
            name: data.name,
            credits: numericGrade(data.credits),
            sectionName: data.sectionName || 'Đại cương',
            prerequisites: data.prerequisites
              ? (typeof data.prerequisites === 'string' ? data.prerequisites.split(/[,;\s]+/).filter(Boolean) : data.prerequisites)
              : [],
            semesterRecommended: data.semesterRecommended || '',
            required: data.required === '1' || data.required === true || data.required === 1,
            program: defaultProgram
          };

          if (courseData.credits === null || courseData.credits < 0) throw new Error('Thiếu hoặc sai cột tín chỉ của học phần.');
          const existing = await courseRepo.findByCode(courseData.code);
          if (existing) {
            if (conflictMode === 'update') {
              await courseRepo.updateByCode(courseData.code, courseData);
              updatedCount++;
            } else {
              skippedCount++;
            }
          } else {
            await courseRepo.create(courseData);
            addedCount++;
          }

        } else if (dataType === 'schedules') {
          const scheduleData = {
            semester: data.semester,
            courseCode: data.courseCode,
            courseName: data.courseName,
            classSection: data.classSection || 'K30 CNTT',
            dayOfWeek: Number(data.dayOfWeek) || 2,
            startPeriod: Number(data.startPeriod) || 1,
            endPeriod: Number(data.endPeriod) || 3,
            room: data.room || 'CS3 Đặng Thùy Trâm',
            lecturer: data.lecturer || 'Giảng viên khoa CNTT',
            dateRange: data.dateRange || '08/09/2025 - 27/12/2025'
          };

          // Check duplicate schedule
          const existingSchedules = await scheduleRepo.findMany({
            semester: scheduleData.semester,
            courseCode: scheduleData.courseCode,
            limit: 10
          });

          const duplicate = (existingSchedules.items || []).find(sc =>
            sc.dayOfWeek === scheduleData.dayOfWeek &&
            sc.startPeriod === scheduleData.startPeriod &&
            sc.classSection === scheduleData.classSection
          );

          if (duplicate) {
            if (conflictMode === 'update') {
              await scheduleRepo.updateById(duplicate._id, scheduleData);
              updatedCount++;
            } else {
              skippedCount++;
            }
          } else {
            await scheduleRepo.create(scheduleData);
            addedCount++;
          }

        } else if (dataType === 'students') {
          const mssv = data.mssv.trim();
          const existing = await studentRepo.findByMssv(mssv);

          const studentData = {
            mssv,
            fullName: data.fullName,
            email: data.email,
            className: data.className || 'K30 CNTT',
            major: data.major || 'Công nghệ thông tin',
            cohort: data.cohort || '2024 - 2028',
            phone: data.phone || '',
            dob: data.dob || '',
            gender: data.gender || 'Nam',
            status: 'active'
          };

          if (existing) {
            if (conflictMode === 'update') {
              await studentRepo.updateByMssv(mssv, studentData);
              updatedCount++;
            } else {
              skippedCount++;
            }
          } else {
            // Generate a secure unique activation code/password for each imported student, NEVER a single shared default password!
            const activationPassword = `Vlu@${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
            const hashedPassword = await hashPassword(activationPassword);

            // Create user account if not exists
            let user = await userRepo.findByEmail(studentData.email);
            if (!user) {
              user = await userRepo.create({
                email: studentData.email,
                passwordHash: hashedPassword,
                role: 'student',
                mssv,
                status: 'active',
              });
            }

            studentData.userId = user._id;
            await studentRepo.create(studentData);
            addedCount++;
          }

        } else if (dataType === 'grades') {
          const mssv = data.mssv.trim();
          const student = await studentRepo.findByMssv(mssv);
          if (!student) {
            throw new Error(`Không tìm thấy sinh viên có MSSV: ${mssv}`);
          }

          const existingCourses = student.courses || [];
          const courseIdx = existingCourses.findIndex(c => c.code === data.courseCode && (c.semester || '').trim() === (data.semester || '').trim());

          const courseGrade = {
            code: data.courseCode,
            name: data.courseName,
            credits: numericGrade(data.credits),
            score: numericGrade(data.score),
            point4: numericGrade(data.point4),
            letter: data.letter || '',
            semester: data.semester || '',
            status: ['MT', 'MIỄN'].includes(String(data.letter).toUpperCase()) ? 'Miễn/ bảo lưu' : numericGrade(data.score) === null && numericGrade(data.point4) === null ? 'Đang học' : String(data.letter).toUpperCase() === 'F' ? 'Không đạt' : /^[ABCD][+-]?$/i.test(data.letter || '') ? 'Đạt' : 'Chưa xác minh',
            source: data._source
          };

          if (courseIdx !== -1) {
            if (conflictMode === 'update') {
              updatedCount++;
            } else {
              skippedCount++;
              continue;
            }
          } else {
            addedCount++;
          }

          await confirmTranscriptCourses(mssv, [courseGrade], 'admin_excel_import', data._sourceTotals || null);
        }
      } catch (err) {
        errorCount++;
        errors.push({
          rowIndex,
          data: item.data,
          message: err.message
        });
      }
    }

    return {
      success: true,
      storageMode: 'mongodb',
      addedCount,
      updatedCount,
      skippedCount,
      errorCount,
      errors,
      message: `Đã nhập dữ liệu thành công vào MongoDB: ${addedCount} thêm mới, ${updatedCount} cập nhật, ${skippedCount} bỏ qua, ${errorCount} lỗi.`
    };
  }
};
