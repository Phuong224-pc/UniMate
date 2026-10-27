import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const adminPasswordHash = '$2b$10$BFU4D3JXR2xDUlLub9aNUeqapPIcWbzldCwYtI9TeDyyzXmXbgYrS'; // Admin@2025!
const studentPasswordHash = '$2b$10$DCdnfH/VEj3Pvk46pExvZOrIcNpY3H.M0RpSZ8A88caC/tTgO8t1S'; // Vlu@2025!
const lecturerPasswordHash = '$2b$10$UeezySNsTyeP.qnA5.OQZeNgI7Uwr9b6gBpI/ntjD0Y7duCOJjvEe'; // Gv@2025!

const now = new Date().toISOString();

// 1. Users
const users = [
  {
    _id: 'usr_admin_001',
    email: 'admin@vanlanguni.vn',
    mssv: 'ADMIN001',
    passwordHash: adminPasswordHash,
    role: 'admin',
    status: 'active',
    lastLogin: now,
    createdAt: now,
    updatedAt: now
  },
  {
    _id: 'usr_gv_001',
    email: 'gv.hoangnam@vanlanguni.vn',
    mssv: 'GV001',
    passwordHash: lecturerPasswordHash,
    role: 'lecturer',
    status: 'active',
    lastLogin: null,
    createdAt: now,
    updatedAt: now
  },
  {
    _id: 'usr_sv_2474802010458',
    email: '2474802010458@vanlanguni.vn',
    mssv: '2474802010458',
    passwordHash: studentPasswordHash,
    role: 'student',
    status: 'active',
    lastLogin: now,
    createdAt: now,
    updatedAt: now
  },
  {
    _id: 'usr_sv_2474802010414',
    email: '2474802010414@vanlanguni.vn',
    mssv: '2474802010414',
    passwordHash: studentPasswordHash,
    role: 'student',
    status: 'active',
    lastLogin: null,
    createdAt: now,
    updatedAt: now
  },
  {
    _id: 'usr_sv_2474802010071',
    email: '2474802010071@vanlanguni.vn',
    mssv: '2474802010071',
    passwordHash: studentPasswordHash,
    role: 'student',
    status: 'active',
    lastLogin: null,
    createdAt: now,
    updatedAt: now
  },
  {
    _id: 'usr_sv_2474802010419',
    email: '2474802010419@vanlanguni.vn',
    mssv: '2474802010419',
    passwordHash: studentPasswordHash,
    role: 'student',
    status: 'active',
    lastLogin: null,
    createdAt: now,
    updatedAt: now
  },
  {
    _id: 'usr_sv_2474802010118',
    email: '2474802010118@vanlanguni.vn',
    mssv: '2474802010118',
    passwordHash: studentPasswordHash,
    role: 'student',
    status: 'active',
    lastLogin: null,
    createdAt: now,
    updatedAt: now
  }
];

// 2. Load raw students
const rawStudents = JSON.parse(fs.readFileSync(path.join(__dirname, '../src/data/students.json'), 'utf8'));

const students = [
  {
    _id: 'prof_admin_001',
    userId: 'usr_admin_001',
    mssv: 'ADMIN001',
    fullName: 'Quản Trị Viên Hệ Thống VLU',
    email: 'admin@vanlanguni.vn',
    phone: '028 7109 9221',
    dob: '01/01/1985',
    gender: 'Nam',
    className: 'Ban Quản Trị Hệ Thống',
    faculty: 'Khoa Công Nghệ Thông Tin',
    major: 'Kỹ thuật Phần mềm & AI',
    cohort: '2024 - 2028',
    trainingCourse: 'K30',
    ethnicity: 'Kinh',
    nationality: 'Việt Nam',
    address: '69/68 Đặng Thùy Trâm, P. 13, Q. Bình Thạnh, TP.HCM',
    idNumber: '079085001234',
    officialCumulativeGpa4: 4.0,
    officialCumulativeCredits: 126,
    officialRating: 'Xuất sắc',
    source: 'Hệ thống Quản trị Đại học Văn Lang',
    avatarUrl: null,
    completedCourses: [],
    courses: [],
    activities: [
      { id: 1, type: 'activity', name: 'Ban cố vấn học tập VLU Assistant', role: 'Trưởng ban', year: '2024', icon: '🛡️' }
    ],
    certs: [
      { id: 1, name: 'Quản trị hệ thống Cloud AWS Certified', score: 'Đạt', issuer: 'Amazon Web Services', date: '2024', status: 'Đạt chuẩn' }
    ],
    docs: [],
    createdAt: now,
    updatedAt: now
  },
  {
    _id: 'prof_gv_001',
    userId: 'usr_gv_001',
    mssv: 'GV001',
    fullName: 'ThS. Hoàng Trọng Nam',
    email: 'gv.hoangnam@vanlanguni.vn',
    phone: '0912 345 678',
    dob: '15/08/1988',
    gender: 'Nam',
    className: 'Khoa CNTT - Giảng viên',
    faculty: 'Khoa Công Nghệ Thông Tin',
    major: 'Công nghệ thông tin',
    cohort: 'K30',
    trainingCourse: 'K30',
    ethnicity: 'Kinh',
    nationality: 'Việt Nam',
    address: 'Cơ sở 3 - Đặng Thùy Trâm, Bình Thạnh, TP.HCM',
    idNumber: '079088009876',
    officialCumulativeGpa4: 3.9,
    officialCumulativeCredits: 126,
    officialRating: 'Xuất sắc',
    source: 'Hồ sơ Cán bộ Giảng viên VLU',
    avatarUrl: null,
    completedCourses: [],
    courses: [],
    activities: [
      { id: 1, type: 'activity', name: 'Bộ môn Kỹ thuật Phần mềm VLU', role: 'Giảng viên chính', year: '2024', icon: '👨‍🏫' }
    ],
    certs: [],
    docs: [],
    createdAt: now,
    updatedAt: now
  }
];

// Add students from students.json
for (const [mssv, s] of Object.entries(rawStudents)) {
  const user = users.find(u => u.mssv === mssv);
  const email = `${mssv}@vanlanguni.vn`;

  const completed = (s.courses || [])
    .filter(c => c.status === 'Đạt' || (c.letter && c.letter !== 'F'))
    .map(c => c.code);

  students.push({
    _id: `prof_sv_${mssv}`,
    userId: user ? user._id : null,
    mssv,
    fullName: s.name,
    email,
    phone: mssv === '2474802010458' ? '0901 234 567' : '0918 000 ' + mssv.slice(-3),
    dob: mssv === '2474802010458' ? '02/01/2006' : '15/05/2006',
    gender: mssv === '2474802010419' ? 'Nữ' : 'Nam',
    className: s.className || 'K30 CNTT',
    faculty: 'Khoa Công Nghệ Thông Tin',
    major: s.major || 'Kỹ thuật Phần mềm',
    cohort: s.cohort || '2024 - 2028',
    trainingCourse: 'K30',
    ethnicity: 'Kinh',
    nationality: 'Việt Nam',
    address: 'TP. Hồ Chí Minh, Việt Nam',
    idNumber: '079206' + mssv.slice(-6),
    officialCumulativeGpa4: s.officialCumulativeGpa4 || 0,
    officialCumulativeCredits: s.officialCumulativeCredits || 0,
    officialRating: s.officialRating || 'Khá',
    source: s.source || 'Bảng điểm sinh viên cung cấp - cập nhật 2025-2026',
    avatarUrl: null,
    completedCourses: completed,
    courses: s.courses || [],
    activities: [
      { id: 1, type: 'activity', name: 'CLB Tin học Văn Lang IT Club', role: 'Thành viên', year: '2024', icon: '💻' },
      { id: 2, type: 'skill', name: 'Phát triển Web React & Node.js', level: 'Trung cấp', icon: '⚛️' }
    ],
    certs: [
      { id: 1, name: 'TOEIC Chuẩn đầu ra', score: '650/990', issuer: 'IIG', date: '2024', status: 'Đạt chuẩn' },
      { id: 2, name: 'Tin học chuẩn MOS', score: 'Đạt', issuer: 'Microsoft', date: '2024', status: 'Đạt chuẩn' }
    ],
    docs: [],
    createdAt: now,
    updatedAt: now
  });
}

// 3. Curriculum & Courses
const rawK30 = JSON.parse(fs.readFileSync(path.join(__dirname, '../src/data/khungK30.json'), 'utf8'));

const curriculum = [
  {
    _id: 'cur_k30_cntt',
    program: rawK30.program || 'K30 CNTT',
    major: 'Công nghệ thông tin',
    totalCredits: 126,
    sections: rawK30.sections || [],
    createdAt: now,
    updatedAt: now
  }
];

const courses = [];
let cIdx = 1;
for (const sec of rawK30.sections || []) {
  for (const c of sec.courses || []) {
    if (c.code) {
      courses.push({
        _id: `crs_${c.code}`,
        code: c.code.toUpperCase(),
        name: c.name,
        credits: c.credits,
        prerequisites: c.prerequisites || [],
        sectionName: sec.name,
        program: rawK30.program || 'K30 CNTT',
        semesterRecommended: c.semesterRecommended || '',
        required: true,
        createdAt: now,
        updatedAt: now
      });
      cIdx++;
    }
  }
}

// 4. Prompts (strip BOM)
const rawPromptsStr = fs.readFileSync(path.join(__dirname, '../src/data/prompts.json'), 'utf8').replace(/^\uFEFF/, '');
const rawPrompts = JSON.parse(rawPromptsStr);

const promptTitles = {
  default: '1. AI Trợ Lý Sinh Viên (Trang Chủ)',
  advisor: '2. Cố Vấn Lộ Trình Học Tập (Advisor)',
  roadmap: '3. Lộ Trình Cá Nhân Hóa (Roadmap)',
  results: '4. Phân Tích Kết Quả Học Tập (GPA)',
  graduation: '5. Cố Vấn Tốt Nghiệp (Graduation)',
  future: '6. Định Hướng Nghề Nghiệp (Career)'
};

const prompts = Object.entries(rawPrompts).map(([key, content], idx) => ({
  _id: `pmt_${key}`,
  key,
  title: promptTitles[key] || key,
  content,
  createdAt: now,
  updatedAt: now
}));

// 5. Schedules
const allStudentMssvs = ['2474802010458', '2474802010414', '2474802010071', '2474802010419', '2474802010118'];

const schedules = [
  // 2024-2025 HK01
  {
    _id: 'sch_2024_hk1_1',
    semester: '2024-2025 HK01',
    academicYear: '2024-2025',
    courseCode: '71ITBS10103',
    courseName: 'Nhập môn công nghệ thông tin',
    classSection: 'K30 CNTT',
    lecturer: 'ThS. Hoàng Trọng Nam',
    dayOfWeek: 2,
    dayOfWeekText: 'Thứ Hai',
    startPeriod: 1,
    endPeriod: 3,
    startTime: '07:30',
    endTime: '10:00',
    room: 'A.06.01 - CS3 Đặng Thùy Trâm',
    dateRange: '09/09/2024 - 28/12/2024',
    mssvList: allStudentMssvs,
    notes: 'Lý thuyết khối ngành',
    createdAt: now,
    updatedAt: now
  },
  {
    _id: 'sch_2024_hk1_2',
    semester: '2024-2025 HK01',
    academicYear: '2024-2025',
    courseCode: '71ITBS10203',
    courseName: 'Cơ sở lập trình',
    classSection: 'K30 CNTT',
    lecturer: 'TS. Lê Thành An',
    dayOfWeek: 3,
    dayOfWeekText: 'Thứ Ba',
    startPeriod: 4,
    endPeriod: 6,
    startTime: '10:15',
    endTime: '12:45',
    room: 'Lab B.03.04 - CS3 Đặng Thùy Trâm',
    dateRange: '09/09/2024 - 28/12/2024',
    mssvList: allStudentMssvs,
    notes: 'Thực hành lập trình C++ / Python',
    createdAt: now,
    updatedAt: now
  },
  {
    _id: 'sch_2024_hk1_3',
    semester: '2024-2025 HK01',
    academicYear: '2024-2025',
    courseCode: '71SSK11023',
    courseName: 'Kỹ năng công dân toàn cầu',
    classSection: 'K30 CNTT',
    lecturer: 'ThS. Đỗ Minh Trí',
    dayOfWeek: 5,
    dayOfWeekText: 'Thứ Năm',
    startPeriod: 7,
    endPeriod: 9,
    startTime: '13:15',
    endTime: '15:45',
    room: 'A.02.05 - CS3 Đặng Thùy Trâm',
    dateRange: '09/09/2024 - 28/12/2024',
    mssvList: allStudentMssvs,
    notes: 'Kỹ năng mềm thiết yếu',
    createdAt: now,
    updatedAt: now
  },
  {
    _id: 'sch_2024_hk1_4',
    semester: '2024-2025 HK01',
    academicYear: '2024-2025',
    courseCode: '71ENG11013',
    courseName: 'Anh văn 1 (AV1)',
    classSection: 'K30 CNTT',
    lecturer: 'ThS. Trần Phương Lan',
    dayOfWeek: 6,
    dayOfWeekText: 'Thứ Sáu',
    startPeriod: 1,
    endPeriod: 3,
    startTime: '07:30',
    endTime: '10:00',
    room: 'A.05.08 - CS3 Đặng Thùy Trâm',
    dateRange: '09/09/2024 - 28/12/2024',
    mssvList: allStudentMssvs,
    notes: 'Ngoại ngữ chuyên ngữ',
    createdAt: now,
    updatedAt: now
  },

  // 2024-2025 HK02
  {
    _id: 'sch_2024_hk2_1',
    semester: '2024-2025 HK02',
    academicYear: '2024-2025',
    courseCode: '71ITMA10104',
    courseName: 'Toán cao cấp và ứng dụng',
    classSection: 'K30 CNTT',
    lecturer: 'TS. Nguyễn Thị Hoa',
    dayOfWeek: 2,
    dayOfWeekText: 'Thứ Hai',
    startPeriod: 1,
    endPeriod: 4,
    startTime: '07:30',
    endTime: '10:50',
    room: 'C.04.02 - CS3 Đặng Thùy Trâm',
    dateRange: '13/01/2025 - 17/05/2025',
    mssvList: allStudentMssvs,
    notes: 'Đại số và giải tích toán học',
    createdAt: now,
    updatedAt: now
  },
  {
    _id: 'sch_2024_hk2_2',
    semester: '2024-2025 HK02',
    academicYear: '2024-2025',
    courseCode: '71ITNW30103',
    courseName: 'Nhập môn mạng máy tính và điện toán đám mây',
    classSection: 'K30 CNTT',
    lecturer: 'ThS. Vũ Hoàng Long',
    dayOfWeek: 3,
    dayOfWeekText: 'Thứ Ba',
    startPeriod: 7,
    endPeriod: 9,
    startTime: '13:15',
    endTime: '15:45',
    room: 'Lab B.02.01 - CS3 Đặng Thùy Trâm',
    dateRange: '13/01/2025 - 17/05/2025',
    mssvList: allStudentMssvs,
    notes: 'Thực hành Packet Tracer & Cloud AWS',
    createdAt: now,
    updatedAt: now
  },
  {
    _id: 'sch_2024_hk2_3',
    semester: '2024-2025 HK02',
    academicYear: '2024-2025',
    courseCode: '71ENG21023',
    courseName: 'Anh văn 2 (AV2)',
    classSection: 'K30 CNTT',
    lecturer: 'ThS. Nguyễn Mai Linh',
    dayOfWeek: 4,
    dayOfWeekText: 'Thứ Tư',
    startPeriod: 4,
    endPeriod: 6,
    startTime: '10:15',
    endTime: '12:45',
    room: 'A.05.02 - CS3 Đặng Thùy Trâm',
    dateRange: '13/01/2025 - 17/05/2025',
    mssvList: allStudentMssvs,
    notes: 'Ngoại ngữ tăng cường',
    createdAt: now,
    updatedAt: now
  },
  {
    _id: 'sch_2024_hk2_4',
    semester: '2024-2025 HK02',
    academicYear: '2024-2025',
    courseCode: '71ITPR20103',
    courseName: 'Kỹ thuật lập trình',
    classSection: 'K30 CNTT',
    lecturer: 'TS. Lê Thành An',
    dayOfWeek: 6,
    dayOfWeekText: 'Thứ Sáu',
    startPeriod: 7,
    endPeriod: 9,
    startTime: '13:15',
    endTime: '15:45',
    room: 'Lab B.03.04 - CS3 Đặng Thùy Trâm',
    dateRange: '13/01/2025 - 17/05/2025',
    mssvList: allStudentMssvs,
    notes: 'Học phần tiếp nối Cơ sở lập trình',
    createdAt: now,
    updatedAt: now
  },

  // 2025-2026 HK01
  {
    _id: 'sch_2025_hk1_1',
    semester: '2025-2026 HK01',
    academicYear: '2025-2026',
    courseCode: '71ITBS20103',
    courseName: 'Cấu trúc dữ liệu và giải thuật',
    classSection: 'K30 CNTT',
    lecturer: 'TS. Nguyễn Thanh Sơn',
    dayOfWeek: 2,
    dayOfWeekText: 'Thứ Hai',
    startPeriod: 1,
    endPeriod: 3,
    startTime: '07:30',
    endTime: '10:00',
    room: 'Lab B.03.02 - CS3 Đặng Thùy Trâm',
    dateRange: '08/09/2025 - 27/12/2025',
    mssvList: allStudentMssvs,
    notes: 'Tiên quyết cho các môn phát triển phần mềm',
    createdAt: now,
    updatedAt: now
  },
  {
    _id: 'sch_2025_hk1_2',
    semester: '2025-2026 HK01',
    academicYear: '2025-2026',
    courseCode: '71ITDB20103',
    courseName: 'Cơ sở dữ liệu (Database Systems)',
    classSection: 'K30 CNTT',
    lecturer: 'ThS. Phạm Quốc Tuấn',
    dayOfWeek: 3,
    dayOfWeekText: 'Thứ Ba',
    startPeriod: 4,
    endPeriod: 6,
    startTime: '10:15',
    endTime: '12:45',
    room: 'Lab B.01.05 - CS3 Đặng Thùy Trâm',
    dateRange: '08/09/2025 - 27/12/2025',
    mssvList: allStudentMssvs,
    notes: 'Thực hành SQL Server & MongoDB',
    createdAt: now,
    updatedAt: now
  },
  {
    _id: 'sch_2025_hk1_3',
    semester: '2025-2026 HK01',
    academicYear: '2025-2026',
    courseCode: '71ITSE20103',
    courseName: 'Lập trình Web hiện đại (React & Node.js)',
    classSection: 'K30 CNTT',
    lecturer: 'ThS. Trương Trần Thanh Phương',
    dayOfWeek: 5,
    dayOfWeekText: 'Thứ Năm',
    startPeriod: 7,
    endPeriod: 9,
    startTime: '13:15',
    endTime: '15:45',
    room: 'Lab B.03.01 - CS3 Đặng Thùy Trâm',
    dateRange: '08/09/2025 - 27/12/2025',
    mssvList: allStudentMssvs,
    notes: 'Chuyên ngành Kỹ thuật Phần mềm',
    createdAt: now,
    updatedAt: now
  },
  {
    _id: 'sch_2025_hk1_4',
    semester: '2025-2026 HK01',
    academicYear: '2025-2026',
    courseCode: '71POLP10013',
    courseName: 'Triết học Mác - Lênin',
    classSection: 'K30 CNTT',
    lecturer: 'TS. Trần Văn Nam',
    dayOfWeek: 6,
    dayOfWeekText: 'Thứ Sáu',
    startPeriod: 1,
    endPeriod: 3,
    startTime: '07:30',
    endTime: '10:00',
    room: 'A.03.01 - CS3 Đặng Thùy Trâm',
    dateRange: '08/09/2025 - 27/12/2025',
    mssvList: allStudentMssvs,
    notes: 'Môn lý luận chính trị',
    createdAt: now,
    updatedAt: now
  }
];

const seedData = {
  users,
  students,
  curriculum,
  courses,
  prompts,
  schedules
};

const outputPath = path.join(__dirname, '../src/data/demo_seed.json');
fs.writeFileSync(outputPath, JSON.stringify(seedData, null, 2), 'utf8');

console.log('✅ Đã tạo file demo_seed.json thành công!');
console.log(`- Users: ${users.length}`);
console.log(`- Students: ${students.length}`);
console.log(`- Curricula: ${curriculum.length}`);
console.log(`- Courses: ${courses.length}`);
console.log(`- Prompts: ${prompts.length}`);
console.log(`- Schedules: ${schedules.length}`);
