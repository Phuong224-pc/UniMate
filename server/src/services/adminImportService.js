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
  curriculumRepo,
  userRepo,
  getDataMode
} from '../repositories/index.js';
import { hashPassword } from '../utils/passwordUtils.js';

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
  async previewImport({ buffer, filename, mimetype, dataType, sheetName = null, customMapping = null }) {
    if (!FIELD_DEFINITIONS[dataType]) {
      throw new Error(`Loại dữ liệu không hỗ trợ: ${dataType}`);
    }

    const def = FIELD_DEFINITIONS[dataType];
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
        data: mappedData,
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
  async confirmImport({ dataType, rows, conflictMode = 'skip', defaultProgram = 'K30 CNTT' }) {
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
            credits: Number(data.credits) || 3,
            sectionName: data.sectionName || 'Đại cương',
            prerequisites: data.prerequisites
              ? (typeof data.prerequisites === 'string' ? data.prerequisites.split(/[,;\s]+/).filter(Boolean) : data.prerequisites)
              : [],
            semesterRecommended: data.semesterRecommended || '',
            required: data.required === '1' || data.required === true || data.required === 1,
            program: defaultProgram
          };

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

        } else if (dataType === 'curriculum') {
          const program = data.program || defaultProgram;
          let curr = await curriculumRepo.findByProgram(program);
          if (!curr || !curr.sections) {
            curr = { program, major: 'Công nghệ thông tin', totalCredits: 126, sections: [] };
          }

          const secName = data.sectionName || 'Môn học chung';
          let sec = curr.sections.find(s => s.name === secName);
          if (!sec) {
            sec = { name: secName, courses: [] };
            curr.sections.push(sec);
          }

          const existingCourseIdx = sec.courses.findIndex(c => c.code === data.code);
          const courseEntry = {
            code: data.code,
            name: data.name,
            credits: Number(data.credits) || 3,
            prerequisites: data.prerequisites
              ? (typeof data.prerequisites === 'string' ? data.prerequisites.split(/[,;\s]+/).filter(Boolean) : data.prerequisites)
              : []
          };

          if (existingCourseIdx !== -1) {
            if (conflictMode === 'update') {
              sec.courses[existingCourseIdx] = courseEntry;
              updatedCount++;
            } else {
              skippedCount++;
            }
          } else {
            sec.courses.push(courseEntry);
            addedCount++;
          }

          await curriculumRepo.upsert(curr);

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
            major: data.major || 'Kỹ thuật Phần mềm',
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
                password: hashedPassword,
                role: 'student',
                mssv,
                status: 'active',
                activationNote: `Mật khẩu khởi tạo: ${activationPassword}`
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
          const courseIdx = existingCourses.findIndex(c => c.code === data.courseCode);

          const courseGrade = {
            code: data.courseCode,
            name: data.courseName,
            credits: Number(data.credits) || 3,
            score: data.score !== '' && data.score !== null ? Number(data.score) : null,
            point4: data.point4 !== '' && data.point4 !== null ? Number(data.point4) : null,
            letter: data.letter || '',
            semester: data.semester || '2024-2025 HK01',
            status: (data.score >= 5.0 || data.point4 >= 2.0) ? 'Dat' : 'Khong dat'
          };

          if (courseIdx !== -1) {
            if (conflictMode === 'update') {
              existingCourses[courseIdx] = { ...existingCourses[courseIdx], ...courseGrade };
              updatedCount++;
            } else {
              skippedCount++;
              continue;
            }
          } else {
            existingCourses.push(courseGrade);
            addedCount++;
          }

          // Recalculate student GPA
          let totalCredits = 0;
          let earnedCredits = 0;
          let totalPoints10 = 0;
          let totalPoints4 = 0;

          existingCourses.forEach(c => {
            const cr = Number(c.credits) || 0;
            if (c.score !== null && c.score !== undefined) {
              totalCredits += cr;
              totalPoints10 += c.score * cr;
              if (c.point4 !== null && c.point4 !== undefined) {
                totalPoints4 += c.point4 * cr;
              }
              if (c.score >= 5.0) {
                earnedCredits += cr;
              }
            }
          });

          const gpa10 = totalCredits > 0 ? parseFloat((totalPoints10 / totalCredits).toFixed(2)) : 0;
          const gpa4 = totalCredits > 0 ? parseFloat((totalPoints4 / totalCredits).toFixed(2)) : 0;

          await studentRepo.updateByMssv(mssv, {
            courses: existingCourses,
            officialCumulativeGpa10: gpa10,
            officialCumulativeGpa4: gpa4,
            officialCumulativeCredits: earnedCredits
          });
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
      storageMode: mode,
      addedCount,
      updatedCount,
      skippedCount,
      errorCount,
      errors,
      message: `Đã nhập dữ liệu thành công vào ${mode === 'mongodb' ? 'MongoDB' : 'Demo Local'}: ${addedCount} thêm mới, ${updatedCount} cập nhật, ${skippedCount} bỏ qua, ${errorCount} lỗi.`
    };
  }
};
