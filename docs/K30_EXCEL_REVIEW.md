# Đối chiếu khung K30 từ workbook được cung cấp

Nguồn: `Khung chương trình đào tạo K30.xlsx`, SHA-256 được lưu đầy đủ tại `server/src/data/khungK30.json` trong trường `source.fileHash`. Script tái tạo: `node server/scripts/extractK30Curriculum.js <đường-dẫn-workbook> "CTĐT_CNTT_K30 (2025 Mẫu Khoa)"`.

Workbook thực tế có **bốn sheet**: kế hoạch giảng dạy; khung 2024; mẫu khoa 2025; bảng tra cứu MaBoMon. Hai sheet khung là hai nguồn của cùng danh mục, không phải hai chương trình độc lập. Bộ dữ liệu trích xuất gồm 89 mã duy nhất, trong đó hai môn TC306 được lưu riêng; MaBoMon không được nhập thành môn học.

Các nhóm được lấy từ cột BB/TC. Ví dụ Hệ Quản trị CSDL `71ITIS30203` vẫn thuộc TC309 dù được liệt kê dưới hướng dẫn chọn môn cơ sở ngành trong kế hoạch. Toán rời rạc `71ITMA10403` giữ **4 tín chỉ** từ cột dữ liệu, không suy từ mã.

## Những học kỳ cần admin xác nhận

| Mã học phần | Học phần | Các kỳ mâu thuẫn |
| --- | --- | --- |
| 71ENVH10012 | Môi trường và con người | 7, 9 |
| 71POLS10032 | Chủ nghĩa xã hội khoa học | 4, 5 |
| 71POLH10042 | Tư tưởng Hồ Chí Minh | 5, 9 |
| 71POLC10052 | Lịch sử Đảng Cộng sản Việt Nam | 6, 9 |
| 71ITSE30603 | Lập trình ứng dụng di động | 6, 7 |
| 71ITSE31003 | Lập trình Python nâng cao | 7, 8 |
| 71ITIS30203 | Hệ Quản trị Cơ sở dữ liệu | 5, 6 |
| 71ITSE30703 | Lập trình di động nâng cao | 7, 8 |

Mỗi môn giữ `semesterSources` và `conflicts` với tên file, hash, sheet, dòng và cột nguồn. Bản dữ liệu nguồn không tự chọn một kỳ khi mâu thuẫn. Khi cập nhật từ Excel, admin chọn một giá trị nguồn trong bản xem trước hoặc bỏ chọn dòng đó. Các cột công thức phụ W/X không thay thế hai cột điều kiện tiên quyết/học trước chính K/L.

## Những quy tắc chưa có căn cứ xác nhận

- `71ITIS30503` và `71ITIS30603` thuộc TC306. Không gộp vào TC309 và không cộng vào yêu cầu 126 khi chưa có quyết định áp dụng.
- Điều kiện khoa để được chọn đồ án 6 tín chỉ hoặc hai chuyên đề 3+3 được ghi là chưa xác minh; chỉ lưu cấu trúc phương án từ yêu cầu người dùng.
- Workbook không cung cấp đầy đủ ngưỡng điểm đạt, chính sách chọn lần học lại để tính GPA, GPA tốt nghiệp tối thiểu hoặc chuẩn đầu ra. Các trường cấu hình tương ứng giữ `null`/`unverified`.
- Mã GDQP xuất hiện dưới BB trong khung 2024 và BBKTL trong mẫu khoa 2025. Cả hai được phân loại rõ `requirementGroup: defense`, không cộng vào 126; mã nhóm nguyên gốc của sheet được chọn vẫn được giữ.

## Các lỗi đã tìm thấy ở luồng cũ

Parser chọn dòng tiêu đề báo cáo làm header, đồng thời bỏ cột header trống khiến các cột còn lại bị lệch. Import đặt mặc định 3 tín chỉ, đánh dấu tất cả môn là bắt buộc, đối chiếu mã chỉ trong từng section, thay điều kiện có sẵn bằng ô trống và không có revision/source hoặc diff. Repository còn dựng khung từ danh mục toàn cục khi không thấy membership, làm mất ranh giới chương trình.

Luồng mới đối chiếu theo mã và khung được chọn, giữ ID và mọi môn không có trong file mới, bảo vệ ô trống/#N/A, dùng bản xem trước phía server có thời hạn và kiểm tra revision khi xác nhận. Danh mục toàn cục không bị ghi đè tín chỉ/điều kiện chỉ vì sửa membership của một phiên bản.

MongoDB cũ có thể còn index unique `program_1`; khối curriculum trong script migration thay index này bằng index scope, giữ nguyên document/ID và không ghi đè khung đã tồn tại bằng seed. Không tự chạy migration vào database thật trong quá trình đối chiếu này.
