import * as XLSX from 'xlsx';

let pdfParseModule = null;
async function getPdfParse() {
  if (!pdfParseModule) {
    try {
      const mod = await import('pdf-parse');
      pdfParseModule = mod.default || mod;
    } catch (err) {
      console.warn('pdf-parse fallback:', err.message);
    }
  }
  return pdfParseModule;
}

/**
 * Excel and PDF Parser Utility for Admin Import
 * - Strict String Formatting (preserves leading zeros in MSSV, Course Codes)
 * - Safe formula/macro prevention (raw text values only)
 * - Template generator
 */

export const DATA_TYPES = {
  COURSES: 'courses',
  CURRICULUM: 'curriculum',
  SCHEDULES: 'schedules',
  STUDENTS: 'students',
  GRADES: 'grades'
};

// Column definitions and mapping aliases for each dataType
export const FIELD_DEFINITIONS = {
  courses: {
    title: 'Danh mục môn học',
    fields: [
      { key: 'code', label: 'Mã Môn Học', required: true, aliases: ['mã môn', 'ma mon', 'mã học phần', 'ma hoc phan', 'course code', 'code'] },
      { key: 'name', label: 'Tên Môn Học', required: true, aliases: ['tên môn', 'ten mon', 'tên học phần', 'ten hoc phan', 'course name', 'name'] },
      { key: 'credits', label: 'Số Tín Chỉ', required: true, aliases: ['số tc', 'so tc', 'tín chỉ', 'tin chi', 'credits', 'tc'] },
      { key: 'sectionName', label: 'Khối Kiến Thức', required: false, aliases: ['khối kiến thức', 'khoi kien thuc', 'chuyên ngành', 'chuyen nganh', 'loại môn', 'section'] },
      { key: 'prerequisites', label: 'Môn Tiên Quyết', required: false, aliases: ['tiên quyết', 'tien quyet', 'môn tiên quyết', 'prerequisites', 'prereq'] },
      { key: 'semesterRecommended', label: 'Học Kỳ Đề Xuất', required: false, aliases: ['học kỳ', 'hoc ky', 'kỳ đề xuất', 'semester'] },
      { key: 'required', label: 'Môn Bắt Buộc (1/0)', required: false, aliases: ['bắt buộc', 'bat buoc', 'required'] }
    ]
  },
  curriculum: {
    title: 'Khung chương trình đào tạo',
    fields: [
      { key: 'program', label: 'Chương Trình Đào Tạo', required: true, aliases: ['chương trình', 'chuong trinh', 'khóa/ngành', 'program'] },
      { key: 'sectionName', label: 'Khối Kiến Thức', required: true, aliases: ['khối', 'khoi', 'khối kiến thức', 'khoi kien thuc', 'section'] },
      { key: 'code', label: 'Mã Môn Học', required: true, aliases: ['mã môn', 'ma mon', 'mã học phần', 'course code', 'code'] },
      { key: 'name', label: 'Tên Môn Học', required: true, aliases: ['tên môn', 'ten mon', 'tên học phần', 'course name', 'name'] },
      { key: 'credits', label: 'Số Tín Chỉ', required: true, aliases: ['số tc', 'so tc', 'tín chỉ', 'tin chi', 'credits', 'tc'] },
      { key: 'prerequisites', label: 'Môn Tiên Quyết', required: false, aliases: ['tiên quyết', 'tien quyet', 'prerequisites'] }
    ]
  },
  schedules: {
    title: 'Thời khóa biểu',
    fields: [
      { key: 'semester', label: 'Học Kỳ', required: true, aliases: ['học kỳ', 'hoc ky', 'semester'] },
      { key: 'courseCode', label: 'Mã Môn Học', required: true, aliases: ['mã môn', 'ma mon', 'mã học phần', 'course code', 'code'] },
      { key: 'courseName', label: 'Tên Học Phần', required: true, aliases: ['tên môn', 'ten mon', 'tên học phần', 'course name', 'name'] },
      { key: 'classSection', label: 'Lớp Học Phần', required: true, aliases: ['lớp', 'lop', 'lớp học phần', 'lop hoc phan', 'class section', 'class'] },
      { key: 'dayOfWeek', label: 'Thứ (2-8)', required: true, aliases: ['thứ', 'thu', 'ngày trong tuần', 'day of week', 'day'] },
      { key: 'startPeriod', label: 'Tiết Bắt Đầu', required: true, aliases: ['tiết đầu', 'tiet dau', 'tiết bđ', 'start period', 'from period'] },
      { key: 'endPeriod', label: 'Tiết Kết Thúc', required: true, aliases: ['tiết cuối', 'tiet cuoi', 'tiết kt', 'end period', 'to period'] },
      { key: 'room', label: 'Phòng Học', required: false, aliases: ['phòng', 'phong', 'phòng học', 'room'] },
      { key: 'lecturer', label: 'Giảng Viên', required: false, aliases: ['giảng viên', 'giang vien', 'gv', 'lecturer', 'teacher'] },
      { key: 'dateRange', label: 'Thời Gian Học', required: false, aliases: ['thời gian', 'thoi gian', 'tuần học', 'date range'] }
    ]
  },
  students: {
    title: 'Danh sách sinh viên',
    fields: [
      { key: 'mssv', label: 'MSSV', required: true, aliases: ['mssv', 'mã sinh viên', 'ma sinh vien', 'mã sv', 'student id', 'id'] },
      { key: 'fullName', label: 'Họ và Tên', required: true, aliases: ['họ và tên', 'ho va ten', 'họ tên', 'ho ten', 'full name', 'name'] },
      { key: 'email', label: 'Email', required: true, aliases: ['email', 'thư điện tử', 'email sv'] },
      { key: 'className', label: 'Lớp', required: false, aliases: ['lớp', 'lop', 'lớp sinh hoạt', 'class'] },
      { key: 'major', label: 'Chuyên Ngành', required: false, aliases: ['ngành', 'nganh', 'chuyên ngành', 'major'] },
      { key: 'cohort', label: 'Khóa Học', required: false, aliases: ['khóa', 'khoa', 'niên khóa', 'cohort'] },
      { key: 'phone', label: 'Số Điện Thoại', required: false, aliases: ['điện thoại', 'dien thoai', 'sđt', 'phone'] },
      { key: 'dob', label: 'Ngày Sinh', required: false, aliases: ['ngày sinh', 'ngay sinh', 'dob', 'birth date'] },
      { key: 'gender', label: 'Giới Tính', required: false, aliases: ['giới tính', 'gioi tinh', 'gender'] }
    ]
  },
  grades: {
    title: 'Bảng điểm sinh viên',
    fields: [
      { key: 'mssv', label: 'MSSV', required: true, aliases: ['mssv', 'mã sinh viên', 'ma sinh vien', 'student id'] },
      { key: 'courseCode', label: 'Mã Môn Học', required: true, aliases: ['mã môn', 'ma mon', 'mã học phần', 'course code', 'code'] },
      { key: 'courseName', label: 'Tên Học Phần', required: true, aliases: ['tên môn', 'ten mon', 'tên học phần', 'course name'] },
      { key: 'credits', label: 'Số Tín Chỉ', required: true, aliases: ['số tc', 'so tc', 'tín chỉ', 'tin chi', 'tc', 'credits'] },
      { key: 'score', label: 'Điểm Hệ 10', required: false, aliases: ['điểm 10', 'diem 10', 'điểm tổng kết', 'score', 'mark'] },
      { key: 'point4', label: 'Điểm Hệ 4', required: false, aliases: ['điểm 4', 'diem 4', 'point 4', 'gpa'] },
      { key: 'letter', label: 'Điểm Chữ', required: false, aliases: ['điểm chữ', 'diem chu', 'grade letter', 'letter'] },
      { key: 'semester', label: 'Học Kỳ', required: false, aliases: ['học kỳ', 'hoc ky', 'kỳ học', 'semester'] }
    ]
  }
};

/**
 * Generate Excel Template with sample rows
 */
export function generateExcelTemplate(dataType) {
  const def = FIELD_DEFINITIONS[dataType];
  if (!def) {
    throw new Error(`Loại dữ liệu không hợp lệ: ${dataType}`);
  }

  const wb = XLSX.utils.book_new();
  const headers = def.fields.map(f => f.label);

  const sampleRows = {
    courses: [
      ['71ITSE30503', 'Lập trình ứng dụng Web', '3', 'Chuyên ngành', '71ITBS10103', 'HK03', '1'],
      ['71ITBS10103', 'Cơ sở lập trình', '3', 'Cơ sở ngành', '', 'HK01', '1'],
      ['71ITBS10203', 'Kỹ thuật lập trình', '3', 'Cơ sở ngành', '71ITBS10103', 'HK02', '1']
    ],
    curriculum: [
      ['K30 CNTT', 'Cơ sở ngành', '71ITBS10103', 'Cơ sở lập trình', '3', ''],
      ['K30 CNTT', 'Cơ sở ngành', '71ITBS10203', 'Kỹ thuật lập trình', '3', '71ITBS10103'],
      ['K30 CNTT', 'Chuyên ngành', '71ITSE30503', 'Lập trình ứng dụng Web', '3', '71ITBS10203']
    ],
    schedules: [
      ['2025-2026 HK01', '71ITSE30503', 'Lập trình ứng dụng Web', 'K30 CNTT 01', '2', '1', '3', 'F5.01 - Đặng Thùy Trâm', 'TS. Nguyễn Văn A', '08/09/2025 - 27/12/2025'],
      ['2025-2026 HK01', '71ITBS10203', 'Kỹ thuật lập trình', 'K30 CNTT 02', '4', '4', '6', 'Lab 3.02 - Đặng Thùy Trâm', 'ThS. Trần Thị B', '08/09/2025 - 27/12/2025']
    ],
    students: [
      ['2474802010999', 'Nguyễn Văn Minh', 'minh.2474802010999@vanlanguni.vn', 'K30 CNTT 01', 'Kỹ thuật Phần mềm', '2024 - 2028', '0912345678', '15/05/2006', 'Nam'],
      ['2474802010998', 'Trần Thị Thu Hà', 'ha.2474802010998@vanlanguni.vn', 'K30 CNTT 02', 'Trí tuệ nhân tạo', '2024 - 2028', '0987654321', '22/08/2006', 'Nữ']
    ],
    grades: [
      ['2474802010458', '71ITBS10103', 'Cơ sở lập trình', '3', '8.5', '3.5', 'B+', '2024-2025 HK01'],
      ['2474802010458', '71ITSE30503', 'Lập trình ứng dụng Web', '3', '9.0', '4.0', 'A', '2024-2025 HK02']
    ]
  };

  const rows = [headers, ...(sampleRows[dataType] || [])];
  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Set column widths
  ws['!cols'] = headers.map(() => ({ wch: 24 }));

  XLSX.utils.book_append_sheet(wb, ws, 'Mau_Du_Lieu');

  // Return binary buffer
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

/**
 * Automatically match raw header strings to defined field keys
 */
export function autoMapColumns(rawHeaders, dataType) {
  const def = FIELD_DEFINITIONS[dataType];
  if (!def) return {};

  const mapping = {};
  const normalizedRaw = rawHeaders.map(h => String(h || '').trim().toLowerCase());

  def.fields.forEach(field => {
    // 1. Check exact key match
    let matchIdx = normalizedRaw.findIndex(h => h === field.key.toLowerCase());
    
    // 2. Check label match
    if (matchIdx === -1) {
      matchIdx = normalizedRaw.findIndex(h => h === field.label.toLowerCase());
    }

    // 3. Check aliases
    if (matchIdx === -1 && field.aliases) {
      for (const alias of field.aliases) {
        matchIdx = normalizedRaw.findIndex(h => h.includes(alias) || alias.includes(h));
        if (matchIdx !== -1) break;
      }
    }

    if (matchIdx !== -1) {
      mapping[field.key] = rawHeaders[matchIdx];
    }
  });

  return mapping;
}

/**
 * Parse an Excel buffer safely
 */
export function parseExcelBuffer(buffer, sheetName = null) {
  // Read workbook safely without executing macros or formulas
  const wb = XLSX.read(buffer, {
    type: 'buffer',
    cellDates: false,
    cellNF: false,
    cellText: true,
    raw: false
  });

  const availableSheets = wb.SheetNames || [];
  if (availableSheets.length === 0) {
    throw new Error('File Excel không có bất kỳ sheet nào');
  }

  const activeSheetName = (sheetName && availableSheets.includes(sheetName))
    ? sheetName
    : availableSheets[0];

  const ws = wb.Sheets[activeSheetName];
  if (!ws) {
    throw new Error(`Không tìm thấy sheet: ${activeSheetName}`);
  }

  // Convert to 2D array of strings preserving leading zeros
  const rawRows = XLSX.utils.sheet_to_json(ws, {
    header: 1,
    defval: '',
    raw: false
  });

  if (!rawRows || rawRows.length === 0) {
    return { availableSheets, activeSheetName, headers: [], rows: [] };
  }

  // Identify first non-empty row as headers
  let headerRowIndex = 0;
  while (headerRowIndex < rawRows.length && (!rawRows[headerRowIndex] || rawRows[headerRowIndex].filter(Boolean).length === 0)) {
    headerRowIndex++;
  }

  if (headerRowIndex >= rawRows.length) {
    return { availableSheets, activeSheetName, headers: [], rows: [] };
  }

  const rawHeaders = (rawRows[headerRowIndex] || []).map(h => String(h || '').trim()).filter(Boolean);

  const dataRows = [];
  for (let r = headerRowIndex + 1; r < rawRows.length; r++) {
    const row = rawRows[r];
    if (!row || row.length === 0 || !row.some(cell => String(cell || '').trim() !== '')) {
      continue; // Skip empty row
    }

    const rowObj = {};
    rawHeaders.forEach((header, colIdx) => {
      // Force cell string representation
      const cellVal = row[colIdx];
      rowObj[header] = cellVal !== undefined && cellVal !== null ? String(cellVal).trim() : '';
    });
    dataRows.push(rowObj);
  }

  return {
    availableSheets,
    activeSheetName,
    headers: rawHeaders,
    rows: dataRows
  };
}

/**
 * Parse a text-based PDF buffer safely
 */
export async function parsePdfBuffer(buffer, dataType) {
  try {
    const parser = await getPdfParse();
    if (!parser) {
      return {
        isScanned: true,
        message: 'Trình đọc PDF chưa tải được. Vui lòng sử dụng file Excel (.xlsx) để đảm bảo độ chính xác.',
        headers: [],
        rows: []
      };
    }
    const data = await parser(buffer);
    const text = (data.text || '').trim();

    if (!text || text.length < 30) {
      return {
        isScanned: true,
        message: 'Tài liệu PDF là dạng quét ảnh (scan) hoặc không có lớp văn bản điện tử. Vui lòng chuyển sang định dạng Excel (.xlsx) để bảo toàn dữ liệu.',
        headers: [],
        rows: []
      };
    }

    // Split text lines
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const def = FIELD_DEFINITIONS[dataType];
    const headers = def ? def.fields.map(f => f.label) : ['Dòng dữ liệu'];

    // Convert structured lines into rows
    const rows = [];
    lines.forEach((line, idx) => {
      if (line.length > 5 && !line.toLowerCase().startsWith('trang') && !line.toLowerCase().startsWith('bộ giáo dục')) {
        const parts = line.split(/\t+|\s{2,}/).map(p => p.trim());
        if (parts.length >= 2) {
          const rowObj = {};
          parts.forEach((p, pIdx) => {
            const h = headers[pIdx] || `Cột ${pIdx + 1}`;
            rowObj[h] = p;
          });
          rows.push(rowObj);
        }
      }
    });

    return {
      isScanned: false,
      availableSheets: ['Trang PDF'],
      activeSheetName: 'Trang PDF',
      headers: headers.slice(0, Math.max(2, rows[0] ? Object.keys(rows[0]).length : 2)),
      rows
    };
  } catch (err) {
    return {
      isScanned: true,
      message: 'Không thể đọc nội dung PDF: ' + err.message,
      headers: [],
      rows: []
    };
  }
}
