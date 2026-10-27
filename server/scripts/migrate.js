import 'dotenv/config';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { User } from '../src/models/User.js';
import { StudentProfile } from '../src/models/StudentProfile.js';
import { Curriculum } from '../src/models/Curriculum.js';
import { Course } from '../src/models/Course.js';
import { Schedule } from '../src/models/Schedule.js';
import { SystemPrompt } from '../src/models/SystemPrompt.js';
import { hashPassword } from '../src/utils/passwordUtils.js';
import { calculateAcademicStats } from '../src/utils/gradeUtils.js';
import { config } from '../src/config/environment.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isDryRun = process.argv.includes('--dry-run');

async function runMigration() {
  console.log('\n======================================================');
  console.log(`🚀 [VLU Assistant] BẮT ĐẦU MIGRATION DỮ LIỆU SANG MONGODB ${isDryRun ? '(CHẾ ĐỘ DRY-RUN)' : ''}`);
  console.log('======================================================\n');

  if (isDryRun) {
    console.log('🔍 [DRY-RUN] Chế độ kiểm tra mô phỏng: Đọc và xác thực dữ liệu, KHÔNG ghi đè cơ sở dữ liệu thật.\n');
  }

  const uri = process.env.MONGODB_URI || config.mongodbUri;
  console.log(`🔌 Kết nối MongoDB: ${uri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')}`);

  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 6000 });
    console.log('✅ Kết nối MongoDB thành công!\n');
  } catch (err) {
    console.error('❌ Không thể kết nối tới MongoDB để chạy migration:', err.message);
    console.log('\n💡 Gợi ý khắc phục:');
    console.log('1. Khởi động dịch vụ MongoDB tại máy tính của bạn (Local MongoDB trên cổng 27017).');
    console.log('2. Hoặc cấu hình biến MONGODB_URI trong file server/.env trỏ tới MongoDB Atlas (Cloud).');
    process.exit(1);
  }

  // 1. MIGRATION KHUNG CHƯƠNG TRÌNH ĐÀO TẠO K30
  console.log('📦 [1/5] Đang nạp Khung Chương Trình Đào Tạo K30 (khungK30.json)...');
  const k30Path = path.join(__dirname, '../src/data/khungK30.json');
  if (fs.existsSync(k30Path)) {
    const k30Raw = fs.readFileSync(k30Path, 'utf8').replace(/^\uFEFF/, '');
    const k30Data = JSON.parse(k30Raw);

    const programName = k30Data.program || 'K30 CNTT';

    if (!isDryRun) {
      await Curriculum.findOneAndUpdate(
        { program: programName },
        {
          program: programName,
          major: 'Công nghệ thông tin',
          totalCredits: 126,
          sections: k30Data.sections || []
        },
        { upsert: true, new: true }
      );
    }

    let courseCount = 0;
    for (const section of k30Data.sections || []) {
      for (const c of section.courses || []) {
        if (c.code) {
          if (!isDryRun) {
            await Course.findOneAndUpdate(
              { code: c.code.toUpperCase() },
              {
                code: c.code.toUpperCase(),
                name: c.name,
                credits: c.credits,
                prerequisites: c.prerequisites || [],
                sectionName: section.name,
                program: programName,
                required: true
              },
              { upsert: true, new: true }
            );
          }
          courseCount++;
        }
      }
    }
    console.log(`   ✅ Đã đồng bộ 1 Khung CTĐT (${programName}) & ${courseCount} học phần K30 vào MongoDB (không tạo trùng).`);
  } else {
    console.warn('   ⚠️ Không tìm thấy file khungK30.json');
  }

  // 2. MIGRATION SYSTEM PROMPTS AI
  console.log('\n🧠 [2/5] Đang nạp System Prompts AI (prompts.json)...');
  const promptsPath = path.join(__dirname, '../src/data/prompts.json');
  if (fs.existsSync(promptsPath)) {
    const promptsRaw = fs.readFileSync(promptsPath, 'utf8').replace(/^\uFEFF/, '');
    const promptsData = JSON.parse(promptsRaw);

    const titles = {
      default: '1. AI Trợ Lý Sinh Viên (Trang Chủ)',
      advisor: '2. Cố Vấn Lộ Trình Học Tập (Advisor)',
      roadmap: '3. Lộ Trình Cá Nhân Hóa (Roadmap)',
      results: '4. Phân Tích Kết Quả Học Tập (GPA)',
      graduation: '5. Cố Vấn Tốt Nghiệp (Graduation)',
      future: '6. Định Hướng Nghề Nghiệp (Career)'
    };

    let promptCount = 0;
    for (const [key, content] of Object.entries(promptsData)) {
      if (typeof content === 'string') {
        if (!isDryRun) {
          await SystemPrompt.findOneAndUpdate(
            { key },
            { key, title: titles[key] || key, content },
            { upsert: true, new: true }
          );
        }
        promptCount++;
      }
    }
    console.log(`   ✅ Đã đồng bộ ${promptCount} System Prompts chuyên gia vào MongoDB.`);
  }

  // 3. MIGRATION TÀI KHOẢN & HỒ SƠ SINH VIÊN
  console.log('\n👤 [3/5] Đang nạp Tài khoản & Hồ sơ Sinh viên (students.json)...');
  const studentsPath = path.join(__dirname, '../src/data/students.json');
  if (fs.existsSync(studentsPath)) {
    const studentsRaw = fs.readFileSync(studentsPath, 'utf8').replace(/^\uFEFF/, '');
    const studentsData = JSON.parse(studentsRaw);
    let studentCount = 0;

    const defaultStudentPasswordHash = await hashPassword('Vlu@2025!');

    for (const [mssv, s] of Object.entries(studentsData)) {
      const email = `${mssv}@vanlanguni.vn`;

      let user = null;
      if (!isDryRun) {
        user = await User.findOneAndUpdate(
          { $or: [{ mssv }, { email }] },
          {
            $setOnInsert: {
              email,
              mssv,
              passwordHash: defaultStudentPasswordHash,
              role: 'student',
              status: 'active'
            }
          },
          { upsert: true, new: true }
        );
      }

      // Tính toán lại thống kê GPA & Tín chỉ chuẩn hóa
      const stats = calculateAcademicStats(s.courses || []);
      const completed = (s.courses || [])
        .filter(c => c.status === 'Đạt' || (c.letter && c.letter !== 'F'))
        .map(c => c.code);

      if (!isDryRun) {
        await StudentProfile.findOneAndUpdate(
          { mssv },
          {
            $set: {
              userId: user?._id || null,
              mssv,
              fullName: s.name,
              email,
              className: s.className || 'K30 CNTT',
              faculty: 'Khoa Công Nghệ Thông Tin',
              major: s.major || 'Kỹ thuật Phần mềm',
              cohort: s.cohort || '2024 - 2028',
              trainingCourse: 'K30',
              officialCumulativeGpa4: stats.cumulativeGpa4 || s.officialCumulativeGpa4 || 0,
              officialCumulativeCredits: stats.cumulativeCredits || s.officialCumulativeCredits || 0,
              officialRating: stats.rating || s.officialRating || 'Khá',
              source: s.source || 'Bảng điểm sinh viên cung cấp',
              courses: s.courses || [],
              completedCourses: completed
            },
            $setOnInsert: {
              activities: [
                { id: 1, type: 'activity', name: 'CLB Tin học Văn Lang IT Club', role: 'Thành viên', year: '2024', icon: '💻' },
                { id: 2, type: 'skill', name: 'Phát triển Web React & Node.js', level: 'Trung cấp', icon: '⚛️' }
              ],
              certs: [
                { id: 1, name: 'TOEIC Chuẩn đầu ra', score: '650/990', issuer: 'IIG', date: '2024', status: 'Đạt chuẩn' },
                { id: 2, name: 'Tin học chuẩn MOS', score: 'Đạt', issuer: 'Microsoft', date: '2024', status: 'Đạt chuẩn' }
              ],
              docs: []
            }
          },
          { upsert: true, new: true }
        );
      }
      studentCount++;
    }
    console.log(`   ✅ Đã đồng bộ ${studentCount} hồ sơ sinh viên kèm bảng điểm đầy đủ vào MongoDB.`);
  }

  // 4. TÀI KHOẢN ADMIN MẪU
  console.log('\n🛡️ [4/5] Đang kiểm tra tài khoản Quản Trị Viên Admin...');
  const adminEmail = 'admin@vanlanguni.vn';
  const adminPasswordHash = await hashPassword('Admin@2025!');

  if (!isDryRun) {
    const adminUser = await User.findOneAndUpdate(
      { email: adminEmail },
      {
        $setOnInsert: {
          email: adminEmail,
          mssv: 'ADMIN001',
          passwordHash: adminPasswordHash,
          role: 'admin',
          status: 'active'
        }
      },
      { upsert: true, new: true }
    );

    await StudentProfile.findOneAndUpdate(
      { email: adminEmail },
      {
        $set: {
          userId: adminUser._id,
          mssv: 'ADMIN001',
          fullName: 'Quản Trị Viên Hệ Thống VLU',
          email: adminEmail,
          className: 'Ban Chủ Nhiệm Khoa',
          faculty: 'Khoa Công Nghệ Thông Tin',
          major: 'Hệ Thống Thông Tin & AI',
          cohort: '2024 - 2028'
        }
      },
      { upsert: true, new: true }
    );
  }
  console.log(`   ✅ Tài khoản Admin: ${adminEmail} (Mật khẩu: Admin@2025!)`);

  // 5. SEED THỜI KHÓA BIỂU
  console.log('\n📅 [5/5] Đang khởi tạo Dữ Liệu Thời Khóa Biểu (Schedule Collection)...');
  const allStudentMssvs = ['2474802010458', '2474802010414', '2474802010071', '2474802010419', '2474802010118'];

  const sampleSchedules = [
    // 2024-2025 HK01
    {
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
      notes: 'Lý thuyết khối ngành'
    },
    {
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
      notes: 'Thực hành lập trình C++ / Python'
    },
    {
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
      notes: 'Kỹ năng mềm thiết yếu'
    },
    {
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
      notes: 'Ngoại ngữ chuyên ngữ'
    },

    // 2024-2025 HK02
    {
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
      notes: 'Đại số và giải tích toán học'
    },
    {
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
      notes: 'Thực hành Packet Tracer & Cloud AWS'
    },
    {
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
      notes: 'Ngoại ngữ tăng cường'
    },
    {
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
      notes: 'Học phần tiếp nối Cơ sở lập trình'
    },

    // 2025-2026 HK01
    {
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
      notes: 'Tiên quyết cho các môn phát triển phần mềm'
    },
    {
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
      notes: 'Thực hành SQL Server & MongoDB'
    },
    {
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
      notes: 'Chuyên ngành Kỹ thuật Phần mềm'
    },
    {
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
      notes: 'Môn lý luận chính trị'
    }
  ];

  let scheduleCount = 0;
  for (const s of sampleSchedules) {
    if (!isDryRun) {
      await Schedule.findOneAndUpdate(
        {
          semester: s.semester,
          courseCode: s.courseCode,
          classSection: s.classSection,
          dayOfWeek: s.dayOfWeek,
          startPeriod: s.startPeriod
        },
        s,
        { upsert: true, new: true }
      );
    }
    scheduleCount++;
  }
  console.log(`   ✅ Đã chuẩn bị ${scheduleCount} tiết học thời khóa biểu liên kết cho MongoDB.`);

  console.log('\n======================================================');
  console.log(`🎉 HOÀN TẤT ${isDryRun ? 'KIỂM TRA DRY-RUN' : 'MIGRATION SANG MONGODB'} THÀNH CÔNG!`);
  console.log('======================================================\n');

  await mongoose.disconnect();
  process.exit(0);
}

runMigration().catch((err) => {
  console.error('Lỗi khi thực hiện migration:', err.message);
  process.exit(1);
});
