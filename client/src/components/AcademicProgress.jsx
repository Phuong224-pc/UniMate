import React from 'react';

export const SPECIALIZATIONS = [
  { id: 'software', name: 'Công nghệ Phần mềm', description: 'Thiết kế, phát triển, kiểm thử và quản lý hệ thống phần mềm.' },
  { id: 'data', name: 'Công nghệ Dữ liệu', description: 'Xây dựng, quản trị và phân tích các hệ thống dữ liệu.' },
  { id: 'ai', name: 'Trí tuệ Nhân tạo', description: 'Học máy, mô hình thông minh và ứng dụng trí tuệ nhân tạo.' }
];

export const specializationName = id => SPECIALIZATIONS.find(item => item.id === id)?.name || 'Chưa chọn chuyên ngành';
export const formatAcademicNumber = value => value === null || value === undefined ? '—' : Number(value).toFixed(2);

const groupLabels = {
  commonRequired: 'Bắt buộc chung', specializationRequired: 'Bắt buộc chuyên ngành',
  TC209: 'TC209 · Tự chọn cơ sở ngành', TC309: 'TC309 · Tự chọn chuyên ngành',
  TC306: 'TC306 · Chờ xác nhận quy tắc', TC406: 'Phương án tốt nghiệp',
  TC002: 'Thể chất TC002', TC102: 'Thể chất TC102', defense: 'Quốc phòng', internship: 'Thực tập'
};

export default function AcademicProgress({ progress, error, compact = false }) {
  if (!progress) return <div role="status" style={{ padding: '12px', color: 'var(--text-secondary)', fontSize: '13px' }}>{error || 'Đang tải tiến độ học tập từ máy chủ…'}</div>;
  const source = progress.sourceTotals;
  const groups = Object.entries(progress.groups || {}).filter(([, group]) => group.active !== false);
  const hasSpecialization = progress.groups?.specializationRequired?.active !== false && (progress.groups?.specializationRequired?.requiredCredits > 0 || progress.courseStates?.some(course => course.specialization));
  return (
    <section className="vlu-card" style={{ padding: '18px', marginBottom: '18px', minWidth: 0 }} aria-label="Tiến độ học tập">
      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginBottom: '12px' }}>
        <strong>{hasSpecialization ? specializationName(progress.specialization) : 'Tiến độ theo khung đang áp dụng'}</strong>
        <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{progress.curriculum?.program || 'Chưa xác định khung'} · phiên bản {progress.curriculum?.scope?.version || 'chưa xác minh'} · cập nhật {progress.curriculum?.revision ?? '—'}</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 140px), 1fr))', gap: '12px' }}>
        {[
          ['Tích lũy thuộc khung', `${progress.earnedCredits ?? '—'} / ${progress.totalCredits ?? '—'} TC`],
          ['Chưa hoàn thành', `${progress.remainingCredits ?? '—'} TC`],
          ['Đang học / chưa có điểm', `${progress.inProgressCredits ?? '—'} TC`],
          ['GPA hệ 10 tự tính', formatAcademicNumber(progress.calculatedGpa10)],
          ['GPA hệ 4 tự tính', formatAcademicNumber(progress.calculatedGpa4)]
        ].map(([label, value]) => <div key={label} style={{ background: 'var(--bg-tertiary)', padding: '12px', borderRadius: '8px' }}><div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{label}</div><strong style={{ display: 'block', marginTop: '5px', color: 'var(--vlu-red)', fontSize: '18px' }}>{value}</strong></div>)}
      </div>
      {!compact && groups.length > 0 && <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 230px), 1fr))', gap: '10px', marginTop: '14px' }}>
        {groups.map(([key, group]) => <div key={key} style={{ border: '1px solid var(--border-color)', padding: '10px', borderRadius: '8px', fontSize: '12px', minWidth: 0 }}>
          <strong>{groupLabels[key] || key}</strong>
          <div style={{ marginTop: '5px', color: 'var(--text-secondary)' }}>{group.passedCoursesCount ?? 0}{group.requiredCourses != null ? ` / ${group.requiredCourses}` : ''} môn · {group.earnedCredits ?? 0}{group.requiredCredits != null ? ` / ${group.requiredCredits}` : ''} TC</div>
          {group.missingCourseCodes?.length > 0 && <div style={{ color: 'var(--text-muted)', marginTop: '5px', overflowWrap: 'anywhere' }}>Còn thiếu: {group.missingCourseCodes.join(', ')}</div>}
          {group.inProgressCredits > 0 && <div style={{ marginTop: '4px' }}>Đang học: {group.inProgressCredits} TC</div>}
          {group.complete && <div style={{ color: '#16a34a', marginTop: '4px' }}>Đã hoàn thành yêu cầu nhóm</div>}
        </div>)}
      </div>}
      {source && (source.cumulativeCredits != null || source.cumulativeGpa4 != null) && <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '12px 0 0' }}>Nguồn bảng điểm ghi: {source.cumulativeCredits ?? '—'} TC tích lũy · GPA {formatAcademicNumber(source.cumulativeGpa4)}. Các giá trị này được giữ riêng để đối chiếu với kết quả tự tính.</p>}
      {!compact && <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: 0 }}>Thể chất: {progress.physicalCredits ?? '—'} TC · Quốc phòng: {progress.defenseCredits ?? '—'} TC · Miễn / bảo lưu được công nhận: {progress.recognizedCredits ?? '—'} TC · Đăng ký theo nguồn: {progress.registeredCredits ?? 'chưa có nguồn'}{progress.registeredCredits != null ? ' TC' : ''}. Thể chất và quốc phòng được theo dõi riêng với tín chỉ thuộc khung.</p>}
      {(progress.discrepancies || []).map((item, index) => <p key={`difference-${index}`} style={{ fontSize: '12px', color: '#b45309', margin: '8px 0 0' }}>Chênh lệch {item.field === 'cumulativeGpa4' ? 'GPA hệ 4' : item.field === 'cumulativeCredits' ? 'tín chỉ tích lũy' : item.field}: nguồn ghi {item.source ?? '—'}, tự tính {item.calculated ?? 'chưa xác minh'}. {item.reason}</p>)}
      {!compact && progress.unmappedCourses?.length > 0 && <p style={{ fontSize: '12px', color: '#b45309', overflowWrap: 'anywhere' }}>Chưa ánh xạ vào khung: {progress.unmappedCourses.map(course => typeof course === 'string' ? course : course.code).join(', ')}.</p>}
      {!compact && progress.unverifiedCourses?.length > 0 && <p style={{ fontSize: '12px', color: '#b45309', overflowWrap: 'anywhere' }}>Môn chưa xác minh: {progress.unverifiedCourses.map(course => typeof course === 'string' ? course : `${course.code}${course.reason ? ` (${course.reason})` : ''}`).join('; ')}.</p>}
      {(progress.warnings || []).map((warning, index) => <p key={index} style={{ fontSize: '12px', color: '#b45309', margin: '8px 0 0' }}>{typeof warning === 'string' ? warning : warning.message || JSON.stringify(warning)}</p>)}
    </section>
  );
}
