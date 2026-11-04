import test from 'node:test';
import assert from 'node:assert/strict';
import { handleTuitionScheduleQuery, buildCourseRoadmapReply } from '../src/controllers/chatController.js';

test('tuition query: exact sample question returns grounded official notice without hallucinations', () => {
  const query = 'Lịch đóng học phí trường Văn Lang năm học 2025-2026';
  const reply = handleTuitionScheduleQuery(query);

  assert.ok(reply, 'Phải có phản hồi từ handleTuitionScheduleQuery');
  assert.ok(
    reply.includes('Hiện dữ liệu UniMate đang có chưa chứa lịch đóng học phí năm học 2025–2026 của VLU.'),
    'Phải chứa đúng thông điệp theo quy chuẩn'
  );
  assert.ok(
    !reply.includes('08-09') && !reply.includes('tháng 8') && !reply.includes('tháng 08'),
    'Không được tự bịa đặt mốc tháng 08-09'
  );
  assert.ok(
    !reply.includes('01-02') && !reply.includes('tháng 1') && !reply.includes('tháng 01'),
    'Không được tự bịa đặt mốc tháng 01-02'
  );
  assert.ok(
    !reply.includes('05-06') && !reply.includes('tháng 5') && !reply.includes('tháng 05'),
    'Không được tự bịa đặt mốc tháng 05-06'
  );
  assert.ok(
    !reply.includes('http://') && !reply.includes('https://'),
    'Không được tự tạo URL giả'
  );
  assert.ok(
    reply.includes('Phòng Kế toán - Tài chính'),
    'Phải hướng dẫn kênh xác thực từ Phòng Kế toán - Tài chính'
  );
});

test('tuition query: handles punctuation, en-dash and case variants consistently', () => {
  const variants = [
    'Lịch đóng học phí trường Văn Lang năm học 2025–2026',
    'lịch nộp học phí 2025-2026 VLU',
    'Thời hạn đóng học phí năm học 2025-2026 khi nào?',
    'hạn nộp học phí 2025 2026',
    'Khi nào đóng học phí năm 2025-2026?'
  ];

  for (const v of variants) {
    const reply = handleTuitionScheduleQuery(v);
    assert.ok(reply, `Phải nhận diện được biến thể: "${v}"`);
    assert.ok(
      reply.includes('Hiện dữ liệu UniMate đang có chưa chứa lịch đóng học phí năm học 2025–2026 của VLU.'),
      `Biến thể "${v}" phải trả về câu trả lời chuẩn xác`
    );
  }
});

test('tuition query: unrelated questions return null so other handlers can process', () => {
  const unrelated = [
    'Khung chương trình đào tạo Khoa CNTT K30',
    'Điều kiện xét tốt nghiệp gồm những gì?',
    'Môn Java nâng cao có tiên quyết gì không?'
  ];

  for (const u of unrelated) {
    const reply = handleTuitionScheduleQuery(u);
    assert.equal(reply, null, `Không được bắt nhầm câu hỏi không liên quan: "${u}"`);
  }
});

test('branding: course roadmap greeting introduces as UniMate smart assistant', () => {
  const reply = buildCourseRoadmapReply({
    code: '71ITSE30803',
    name: 'Lập trình Java nâng cao',
    credits: 3,
    prerequisites: ['71ITSE30403']
  }, []);

  assert.ok(
    reply.includes('UniMate — trợ lý học tập thông minh'),
    'Lời chào phải định danh là UniMate — trợ lý học tập thông minh'
  );
  assert.ok(
    !reply.includes('Mình là Cố vấn Lộ trình Học tập AI của Khoa CNTT'),
    'Không dùng định danh cũ gây mâu thuẫn thương hiệu'
  );
});
