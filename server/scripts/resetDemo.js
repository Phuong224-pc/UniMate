import { demoStorage } from '../src/repositories/demo/demoStorage.js';

console.log('\n==========================================================');
console.log('🔄 [VLU Assistant] TIẾN HÀNH RESET DỮ LIỆU DEMO LOCAL');
console.log('==========================================================\n');

try {
  demoStorage.resetStore();

  console.log('🎉 ĐÃ KHÔI PHỤC KHO DỮ LIỆU DEMO LOCAL VỀ TRẠNG THÁI MẪU BAN ĐẦU!');
  console.log(`📁 File lưu trữ: ${demoStorage.storePath}`);
  console.log('\n👤 TÀI KHOẢN MẪU KHẢ DỤNG:');
  console.log('1. Admin:    admin@vanlanguni.vn        | Mật khẩu: Admin@2025!');
  console.log('2. Sinh viên: 2474802010458              | Mật khẩu: Vlu@2025!');
  console.log('3. Sinh viên: 2474802010414              | Mật khẩu: Vlu@2025!');
  console.log('4. Sinh viên: 2474802010071              | Mật khẩu: Vlu@2025!');
  console.log('5. Giảng viên: gv.hoangnam@vanlanguni.vn | Mật khẩu: Gv@2025!');
  console.log('\n💡 Lưu ý: Lệnh này CHỈ tác động tới kho demo local, tuyệt đối không đụng chạm đến cơ sở dữ liệu MongoDB.\n');
  process.exit(0);
} catch (error) {
  console.error('❌ Lỗi khi reset dữ liệu demo:', error.message);
  process.exit(1);
}
