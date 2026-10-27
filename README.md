# VLU Smart Assistant (AI-Powered Academic Platform) 🎓🤖

Hệ thống Trợ lý Học tập Thông minh VLU dành cho sinh viên Trường Đại học Văn Lang. Kiến trúc Fullstack gồm **Frontend (React + Vite)** và **Backend (Node.js + Express + MongoDB)** với đầy đủ dữ liệu thời khóa biểu, khung chương trình đào tạo K30 (126 tín chỉ), hồ sơ sinh viên, bảng điểm GPA và trợ lý AI thông minh.

Dự án hỗ trợ **2 chế độ dữ liệu hoàn chỉnh** dùng chung toàn bộ API, Validation, Phân quyền và Giao diện:
1. **Chế độ DEMO LOCAL:** Chạy ngay trên localhost mà **không cần cài đặt hay bật MongoDB**. Toàn bộ dữ liệu nghiệp vụ (hồ sơ, điểm số, thời khóa biểu, khung CTĐT) được lưu trữ an toàn, tuần tự dạng tệp JSON tại `server/data/demo/demo_store.json`. Thêm/sửa/xóa đều được giữ nguyên sau khi refresh trang hoặc khởi động lại server.
2. **Chế độ MONGODB:** Lưu trữ và quản lý tập trung toàn bộ dữ liệu nghiệp vụ trên MongoDB thật (Local hoặc Cloud Atlas), đảm bảo index, quan hệ và toàn vẹn dữ liệu.

---

## 🌟 Tính Năng Nổi Bật

1. **Trợ lý AI Học Vụ Đa Năng (Gemini AI):**
   - Tích hợp 6 module AI chuyên sâu: AI Tổng quát, Cố vấn Lộ trình (Advisor), Lộ trình cá nhân hóa (Roadmap), Kết quả học tập (GPA), Dự báo tốt nghiệp (Graduation), Định hướng nghề nghiệp (Career).
   - Hệ thống Prompt chuyên gia được quản lý tập trung trong database, cấu hình được từ trang Admin.
   - Hỗ trợ OCR trích xuất thông tin sinh viên từ ảnh chụp (CCCD, Thẻ SV, Bảng điểm).

2. **Quản Lý Hồ Sơ Sinh Viên & Bảng Điểm:**
   - Đăng ký, đăng nhập bảo mật với JWT và mật khẩu được mã hóa chuẩn `bcryptjs` (salt 10 rounds).
   - Hồ sơ cá nhân: MSSV, họ tên, email, lớp, khoa, ngành, niên khóa, điểm GPA tích lũy, tín chỉ tích lũy, chứng chỉ ngoại ngữ/tin học, hoạt động ngoại khóa.
   - Bảng điểm chi tiết: Điểm hệ 10, điểm hệ 4, điểm chữ, học kỳ, trạng thái đạt/chưa đạt. Môn chưa có điểm khác biệt với điểm 0.
   - Quy tắc tính toán thống nhất: GPA và tín chỉ tích lũy được tự động tính từ dữ liệu gốc các môn học (`calculateAcademicStats`), tránh lệch số liệu.

3. **Thời Khóa Biểu Học Kỳ (Timetable Management):**
   - Xem lịch học trực quan theo thứ trong tuần (Thứ 2 - Chủ Nhật) và theo tiết học.
   - Lọc theo học kỳ (`2024-2025 HK01`, `2024-2025 HK02`, `2025-2026 HK01`).
   - Hiển thị đầy đủ: Môn học, mã lớp học phần, giảng viên, phòng học, tiết học, ngày học.
   - Phân quyền: Sinh viên chỉ thấy lịch học của lớp mình/môn mình đăng ký. Quản trị viên (Admin) có quyền Thêm / Sửa / Xóa lịch học.

4. **Lộ Trình Đào Tạo K30 (Curriculum & Roadmap):**
   - Khung chương trình đào tạo K30 ngành CNTT đầy đủ 87 môn học (126 tín chỉ).
   - Kiểm tra điều kiện tiên quyết trước khi đánh dấu môn đã học.
   - Lưu trữ và đồng bộ môn đã hoàn thành trực tiếp vào hồ sơ sinh viên trong database.

5. **Dự Báo Tốt Nghiệp & GPA Simulator:**
   - Tự động đánh giá 5 điều kiện tốt nghiệp cốt lõi (126 tín chỉ, TOEIC/IELTS, MOS, GDQP, GDTC).
   - Giả lập GPA kỳ tới: Dự báo mức điểm cần đạt để nâng GPA mục tiêu.

6. **Trang Quản Trị Hệ Thống (Admin Dashboard):**
   - Quản lý danh sách sinh viên, tìm kiếm, phân trang.
   - Thêm sinh viên mới (tự động tạo tài khoản đăng nhập).
   - Xóa an toàn: Xóa mềm (soft-delete) nếu sinh viên đã có lịch sử học tập để bảo toàn dữ liệu học vụ; xóa cứng nếu yêu cầu force.
   - Quản lý và chỉnh sửa nội dung System Prompts của AI Chatbot.

---

## 🏗️ Cấu Trúc Dự Án (Project Structure)

```text
VLU-Bot - AI - CNH/
├── frontend/                  # Ứng dụng React + Vite
│   ├── public/                # Tài nguyên tĩnh, logo Văn Lang, favicon
│   ├── src/
│   │   ├── components/        # Header (kèm badge Demo), Sidebar, AuthModal, AiChatSidebar...
│   │   ├── context/           # AuthContext (quản lý phiên đăng nhập & JWT)
│   │   ├── hooks/             # useAuth...
│   │   ├── layouts/           # MainLayout bọc header, sidebar
│   │   ├── pages/             # Chat, Schedule, Profile, Roadmap, Gpa, Graduation, Career, Admin
│   │   ├── services/          # api.js tập trung các API calls tới backend (/status, /auth, /schedule...)
│   │   └── styles/            # CSS tokens, theme sáng/tối
│   ├── package.json
│   └── vite.config.js
│
├── server/                    # Backend API Node.js (Express)
│   ├── data/
│   │   └── demo/
│   │       └── demo_store.json # Kho lưu trữ dữ liệu Demo Local (JSON an toàn, tuần tự)
│   ├── scripts/
│   │   ├── buildDemoSeed.js   # Script tạo demo_seed.json từ source data
│   │   ├── resetDemo.js       # Script khôi phục dữ liệu Demo về bộ mẫu ban đầu (npm run demo:reset)
│   │   ├── migrate.js         # Script migration & seed vào MongoDB (hỗ trợ --dry-run)
│   │   └── testDataModes.js   # Bộ kiểm thử tích hợp tự động cho cả 2 chế độ dữ liệu
│   ├── src/
│   │   ├── config/            # Cấu hình db.js, environment.js
│   │   ├── controllers/       # auth, profile, schedule, curriculum, admin, student, chat
│   │   ├── data/              # demo_seed.json, khungK30.json, students.json, prompts.json
│   │   ├── middlewares/       # authenticate, optionalAuth, requireAdmin, requireSelfOrAdmin
│   │   ├── models/            # Mongoose Models (User, StudentProfile, Curriculum, Course, Schedule, SystemPrompt)
│   │   ├── repositories/      # Data Access Layer (Repository Pattern):
│   │   │   ├── demo/          # Demo Provider (demoStorage, userDemoRepo, studentDemoRepo...)
│   │   │   ├── mongo/         # MongoDB Provider (userMongoRepo, studentMongoRepo...)
│   │   │   └── index.js       # Master Provider & Auto Probe Selector
│   │   ├── routes/            # /api/auth, /api/profile, /api/schedule, /api/curriculum, /api/status...
│   │   ├── services/          # Business logic (dùng chung cho cả MongoDB và Demo)
│   │   ├── utils/             # gradeUtils (tính GPA/tín chỉ), passwordUtils (bcrypt), tokenUtils (JWT)
│   │   ├── validators/        # Validation dữ liệu đầu vào
│   │   └── index.js           # Server entry point
│   ├── .env.example
│   └── package.json
│
├── .env.example               # Biến môi trường mẫu gốc
├── package.json               # Root scripts điều phối toàn dự án
├── run-dev.mjs                # Script khởi chạy đồng thời Frontend & Backend
└── README.md
```

---

## 🗄️ Thiết Kế Mô Hình Dữ Liệu (Collections / Entities)

Cả hai chế độ **MongoDB** và **Demo Local** đều tổ chức theo cùng một cấu trúc thực thể chuẩn hóa:

| Collection / Entity | Mô Tả & Quan Hệ | Trường Dữ Liệu Chính |
| :--- | :--- | :--- |
| `users` | Tài khoản đăng nhập hệ thống | `_id`, `email` (unique), `mssv`, `passwordHash` (bcrypt), `role` (`student`/`admin`/`lecturer`), `status` (`active`/`inactive`), `lastLogin` |
| `students` (hoặc `StudentProfile`) | Hồ sơ sinh viên, liên kết với `users` qua `userId` | `_id`, `userId`, `mssv` (unique), `fullName`, `email`, `className`, `faculty`, `major`, `cohort`, `trainingCourse`, `officialCumulativeGpa4`, `officialCumulativeCredits`, `officialRating`, `courses` (bảng điểm), `completedCourses`, `activities`, `certs`, `docs` |
| `curriculum` | Khung chương trình đào tạo theo ngành và khóa | `_id`, `program` (unique, ví dụ: 'K30 CNTT'), `major`, `totalCredits` (126), `sections` (các nhóm học phần) |
| `courses` | Danh mục từng học phần để tra cứu nhanh | `_id`, `code` (unique, ví dụ: '71ITBS10103'), `name`, `credits`, `prerequisites`, `sectionName`, `program`, `required` |
| `schedules` | Lịch học thời khóa biểu theo học kỳ | `_id`, `semester`, `academicYear`, `courseCode`, `courseName`, `classSection`, `lecturer`, `dayOfWeek` (2-8), `startPeriod`, `endPeriod`, `room`, `mssvList`, `notes` |
| `prompts` (`SystemPrompt`) | Cấu hình prompt chuyên gia cho 6 module AI | `_id`, `key` (unique: `default`, `advisor`, `roadmap`, `results`, `graduation`, `future`), `title`, `content` |

---

## 🚀 Hướng Dẫn Chạy Dự Án

### 1. Cài Đặt Dependencies (Nếu chưa cài)
```bash
# Cài đặt từ thư mục gốc:
npm install
npm --prefix frontend install
npm --prefix server install
```

---

### 2. CHẾ ĐỘ 1: CHẠY DEMO LOCAL (Không cần bật MongoDB)

Bạn có thể chạy toàn bộ dự án trên localhost mà không cần cài hoặc khởi động MongoDB. Hệ thống sẽ tự động sử dụng kho dữ liệu demo local độc lập tại `server/data/demo/demo_store.json`.

```bash
# Khởi động cả Frontend & Backend ở chế độ DEMO:
npm run dev:demo
```

Hoặc nếu dùng 2 cửa sổ terminal:
- **Terminal 1 (Backend Demo):**
  ```bash
  npm run dev:demo --prefix server
  # Backend chạy tại: http://localhost:5001
  ```
- **Terminal 2 (Frontend):**
  ```bash
  npm run dev --prefix frontend
  # Frontend chạy tại: http://localhost:5173
  ```

> **Đặc điểm Chế độ Demo:**
> - Giao diện hiển thị nhãn nhận biết: `Chế độ demo — dữ liệu mẫu`.
> - Mọi thao tác Thêm / Sửa / Xóa sinh viên, đổi thông tin hồ sơ, tick chọn môn đã học, thêm lịch học đều được lưu an toàn vào `demo_store.json`.
> - Khởi động lại server hoặc tải lại trang web (F5) **không làm mất** dữ liệu bạn vừa thao tác.
> - Khi muốn đưa dữ liệu demo về trạng thái ban đầu:
>   ```bash
>   npm run demo:reset
>   ```

---

### 3. CHẾ ĐỘ 2: CHẠY VỚI MONGODB (Database Thật)

Khi bạn muốn sử dụng MongoDB làm nguồn dữ liệu chính thức:

1. Đảm bảo MongoDB đang chạy cục bộ tại `mongodb://127.0.0.1:27017/vlu_bot` hoặc cấu hình chuỗi kết nối Cloud Atlas trong `server/.env`:
   ```env
   DATA_MODE=mongodb
   MONGODB_URI=mongodb://127.0.0.1:27017/vlu_bot
   ```

2. Chạy lệnh migration để đồng bộ dữ liệu vào MongoDB:
   ```bash
   # Kiểm tra thử nghiệm trước (không ghi đè thật):
   npm run migrate --prefix server -- --dry-run

   # Thực hiện nạp dữ liệu chính thức vào MongoDB:
   npm run migrate
   ```

3. Khởi động dự án ở chế độ MongoDB:
   ```bash
   npm run dev:mongo
   ```
   *(Nếu MongoDB không thể kết nối, server sẽ báo lỗi rõ ràng và dừng lại, tuyệt đối không âm thầm chuyển sang demo).*

---

### 4. CHẾ ĐỘ 3: CHẾ ĐỘ AUTO (Phát triển linh hoạt)

```bash
npm run dev
```
- Server sẽ thử kết nối MongoDB trong tối đa 3.5 giây.
- Nếu MongoDB có sẵn -> Kích hoạt chế độ MongoDB.
- Nếu chưa bật MongoDB -> Tự động chuyển sang chế độ DEMO LOCAL an toàn, thông báo rõ ràng trong console.

---

## 👥 Danh Sách Tài Khoản Mẫu Có Sẵn

Các tài khoản dưới đây được thiết lập sẵn đầy đủ hồ sơ liên kết, lịch học và bảng điểm trong cả **Chế độ Demo** lẫn **Chế độ MongoDB**:

| Vai Trò | Email / Tên Đăng Nhập | Mật Khẩu | Họ Tên | Ghi Chú |
| :--- | :--- | :--- | :--- | :--- |
| **Quản trị viên (Admin)** | `admin@vanlanguni.vn` | `Admin@2025!` | Quản Trị Viên Hệ Thống VLU | Toàn quyền quản trị sinh viên, xem mọi hồ sơ/điểm, thêm/sửa/xóa lịch học, sửa System Prompts |
| **Sinh viên 1** | `2474802010458` *(hoặc `2474802010458@vanlanguni.vn`)* | `Vlu@2025!` | Trương Trần Thanh Phương | K30 CNTT, 31 môn học, GPA: 3.24, Tín chỉ: 72/126 |
| **Sinh viên 2** | `2474802010414` *(hoặc `2474802010414@vanlanguni.vn`)* | `Vlu@2025!` | Võ Thành Trung | K30 CNTT, 30 môn học, GPA: 3.09, Tín chỉ: 72/126 |
| **Sinh viên 3** | `2474802010071` *(hoặc `2474802010071@vanlanguni.vn`)* | `Vlu@2025!` | Võ Ngọc Duy | K30 CNTT, 31 môn học, GPA: 3.25, Tín chỉ: 69/126 |
| **Giảng viên** | `gv.hoangnam@vanlanguni.vn` | `Gv@2025!` | ThS. Hoàng Trọng Nam | Khoa Công Nghệ Thông Tin |

*(Trong modal Đăng nhập, có sẵn các nút bấm chọn nhanh tài khoản mẫu để bạn kiểm thử ngay lập tức).*

---

## 🛡️ Bảo Mật & Quy Tắc Nghiệp Vụ

1. **Mã Hóa Mật Khẩu:** Mật khẩu của mọi tài khoản (kể cả tài khoản demo) đều được băm bằng thuật toán `bcryptjs` với salt 10 vòng. API không bao giờ lưu trữ hay trả về mật khẩu thô.
2. **Kiểm Tra Quyền Trên Từng Bản Ghi:**
   - Sinh viên chỉ được phép xem hồ sơ cá nhân, lịch học và kết quả học tập của chính mình.
   - Sinh viên không được phép tra cứu hồ sơ điểm của sinh viên khác (backend trả về mã lỗi `403 Forbidden`).
   - Sinh viên không thể tự sửa điểm GPA hay tự nâng quyền thành admin.
   - Quản trị viên chỉ được cập nhật các trường học vụ theo đúng thẩm quyền.
3. **An Toàn Dữ Liệu:**
   - Hai kho dữ liệu MongoDB và Demo Local hoàn toàn độc lập, không trộn lẫn dữ liệu.
   - Khi xóa sinh viên đã có lịch sử học tập, hệ thống tự động thực hiện **xóa mềm (soft-delete)** để bảo toàn dữ liệu học vụ, trừ khi có cờ `force=true`.
   - Lệnh `npm run demo:reset` chỉ tác động vào kho demo local, tuyệt đối không chạm vào MongoDB.