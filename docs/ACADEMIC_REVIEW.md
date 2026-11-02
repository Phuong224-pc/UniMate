# Rà soát và kiểm chứng học vụ UniMate

Đã rà soát models, repositories demo/Mongo, dịch vụ và API hồ sơ/chuyên ngành, nhập Excel/PDF/OCR, xác thực, chatbot, seed/migration và các trang hồ sơ, bảng điểm, GPA, lộ trình, cố vấn, xét tốt nghiệp. Không sửa điểm hoặc tín chỉ của sinh viên nguồn để làm khớp kết quả.

## Nguyên nhân và thay đổi

| Vấn đề trong mã cũ | Thay đổi |
| --- | --- |
| Cộng từng dòng, không loại trùng theo mã/lần học; mọi điểm chữ khác F được coi đạt; không tách môn điều kiện | `server/src/utils/gradeUtils.js` chuẩn hóa kết quả, loại lặp theo mã/kỳ và tín chỉ theo mã môn duy nhất, tách nhóm, GPA, nguồn và dữ liệu chưa xác minh |
| Ghi đè `officialCumulative*` bằng số tính lại, frontend tự tính GPA/tín chỉ và tự kiểm tra chuẩn tốt nghiệp | `server/src/services/academicService.js` giải quyết phiên bản khung và cung cấp `academicProgress`; hồ sơ, bảng điểm, lộ trình, tốt nghiệp và chatbot cùng dùng kết quả này; giữ `transcriptSourceTotals` riêng |
| Không có chuyên ngành riêng; sinh viên có thể tự đánh dấu hoàn thành qua API | `studentService.js`, models/controllers/routes: chọn/đổi có xác nhận, đổi có lịch sử học tập cần admin, khóa BB nhánh khác tại backend, `plannedCourses` tách khỏi kết quả điểm |
| Parser PDF gộp dòng chân trang vào tên môn, không đọc tổng nguồn; gọi sai API pdf-parse v2 và `findAll` không tồn tại | `ocrService.js`, `excelParser.js`: đọc text PDF trực tiếp, giữ học kỳ qua trang, loại lặp, giữ điểm null và tổng nguồn, đóng parser; OCR ảnh/scan có cấu hình và không tự quy đổi điểm chữ |
| Import Excel lệch cột trống, mặc định tín chỉ, mất nhóm/điều kiện, không có diff và phạm vi phiên bản | `curriculumWorkbook.js`, `curriculumImportService.js`: chọn sheet, nguồn file/hash/sheet/dòng, diff + giải quyết mâu thuẫn, preview phía server, kiểm tra revision, giữ ID/điểm/tài khoản/môn không có trong file |
| Khung được dựng lại từ danh mục toàn cục; dữ liệu hardcode có thể thay thế database hiện tại | Repositories không dựng khung từ catalog; phân biệt danh mục với membership theo scope; đọc tiến độ trực tiếp từ repository, frontend làm mới sau cập nhật và khi quay lại cửa sổ |
| Chat tra cứu hồ sơ từ MSSV không kiểm tra quyền và có thể đưa ra số khác dashboard | Chat có xác thực tùy chọn cho thông tin chung, bắt buộc quyền khi tra cứu cá nhân; trả lời số học vụ bằng service xác định, những lời khuyên khác được cấp snapshot cùng service |
| Seed/migration có thể tính lại tổng nguồn và ghi đè bảng điểm đang có | Migration tạo hồ sơ mới bằng `$setOnInsert`, giữ quan sát nguồn và ID; cập nhật khung cũ đi qua preview/confirm; không tự chạy migration trên database thật |

## Đối chiếu PDF thực tế

Nguồn được đọc: `Cổng thông tin đào tạo - 02.pdf`, ba trang, 45 dòng học phần sau khi loại tiêu đề/tổng kết/chân trang. Fixture văn bản tại `server/tests/fixtures/vlu-transcript.txt` được trích từ tài liệu này. Các giá trị bên dưới chỉ là kết quả đối chiếu và kỳ vọng kiểm thử, không phải hằng số trong mã ứng dụng.

| Chỉ số | Tổng nguồn | Service tự tính |
| --- | --- | --- |
| Tín chỉ tích lũy thuộc khung | 88 | 88/126 |
| GPA hệ 4 | 3.28 | 3.28 từ 288.92 điểm trọng số / 88 tín chỉ GPA, làm tròn hai số |
| Còn phải hoàn thành | — | 38 tín chỉ, gồm cả các môn đang học |
| HK01 2026–2027 chưa có điểm | 7 môn, 19 tín chỉ theo các dòng | 7 môn, 19 tín chỉ |
| TC209 | 3 môn đã có điểm đạt | 9/9 tín chỉ |
| TC309 | Di động đã đạt; Python nâng cao chưa có điểm | 3/9 đạt, 3 đang học, thiếu 6 |
| Thể chất | Cờ vua TC002 và Võ thuật TC102 | 4 tín chỉ riêng, hoàn thành hai nhóm |
| Quốc phòng | Bốn học phần đã có điểm | 11 tín chỉ riêng |

AV0 miễn 2 tín chỉ và bài kiểm tra tiếng Anh đầu khóa 0 tín chỉ không tăng tích lũy khung. Tổng nguồn “đăng ký” được giữ là quan sát của PDF, không suy thành tổng các môn đã đạt cộng các môn chưa có kết quả. Không có chênh lệch tổng tích lũy hoặc GPA trong ca này; việc khớp số không thay thế quy chế GPA/học lại chính thức.

## Kiểm chứng đã thực hiện

- 41 kiểm thử `node:test` đạt khi cung cấp đường dẫn PDF nguồn; gồm trích PDF thật, admin nhập PDF/Excel, nhập lặp, học lại, chuyển điểm đang học sang đạt, nhóm riêng, TC406 một phần/phương án đầy đủ, khóa chuyên ngành qua HTTP, bảo toàn dữ liệu, phiên bản, chênh lệch nguồn và tính tương đương khi dữ liệu đi qua schema Mongoose.
- Hai script tích hợp cũ đã được sửa cho đúng quy tắc mới và dùng kho demo tạm: 8 kiểm tra dữ liệu/phân quyền + 4 kiểm tra admin/OCR đều đạt.
- Khởi động entry point backend thật ở demo với kho tạm; gọi HTTP đăng nhập, tạo hồ sơ thử, xác nhận chuyên ngành, tải PDF, xác nhận điểm, tra cứu hồ sơ/chat cùng kết quả; tải workbook chọn sheet khoa 2025 cho 89 mã và 8 mâu thuẫn; backend phục vụ bản build React thành công.
- `npm.cmd run build --prefix client` và `npm.cmd run lint --prefix client` thành công. Lint còn cảnh báo unused/hook; build cảnh báo kích thước chunk, không có lỗi build.
- `git diff --check` sạch.

Chạy lại từ thư mục dự án bằng PowerShell:

```powershell
$env:SAMPLE_TRANSCRIPT_PDF = 'C:\Users\Admin\Downloads\Cổng thông tin đào tạo - 02.pdf'
npm.cmd test --prefix server
npm.cmd run test:integration --prefix server
npm.cmd run build --prefix client
npm.cmd run lint --prefix client
```

Không có biến `SAMPLE_TRANSCRIPT_PDF`, các ca còn lại vẫn dùng fixture; hai ca đọc PDF gốc trực tiếp được đánh dấu skip. Mỗi kiểm thử có ghi dữ liệu đều dùng kho tạm, không sửa kho demo người dùng.

## Phần cần xác nhận hoặc chưa kiểm chứng

Chi tiết tám mâu thuẫn học kỳ, hai môn TC306 và cách chọn sheet xem `K30_EXCEL_REVIEW.md`. Sheet 2024 có 87 mã; mẫu khoa 2025 có 89 mã. Import cho phép chọn rõ sheet khung; các môn không có trong sheet được giữ nguyên, không tự xóa. Phương án TC406 có kiểm tra cấu trúc 6 hoặc 3+3 nhưng quyền chọn theo quy định khoa vẫn chưa xác minh. Quy tắc miễn/bảo lưu cần công nhận rõ; chính sách GPA học lại, GPA tốt nghiệp tối thiểu và chuẩn đầu ra còn thiếu. Hệ thống không kết luận đủ điều kiện tốt nghiệp chỉ từ 126 tín chỉ.

Chưa thực hiện thao tác trên MongoDB thật hoặc migration index thật. Đã kiểm tra schema, serialization và service dùng chung; điều này không thay thế kiểm thử kết nối/ghi MongoDB. Chưa kiểm tra ảnh OCR/scan qua Gemini hoặc kiểm tra giao diện trực quan trong trình duyệt; đã kiểm tra build, JSX/CSS responsive và HTTP phục vụ frontend. Không tự áp dụng workbook vào kho hiện hữu khi tám mâu thuẫn chưa được admin xác nhận.
