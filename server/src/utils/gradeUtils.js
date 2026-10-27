/**
 * Quy tắc tính toán thống nhất cho Bảng điểm, Tín chỉ tích lũy & GPA
 * Đại học Văn Lang (Thang điểm 4 & Quy chế đào tạo tín chỉ)
 */

export function calculateAcademicStats(courses = []) {
  if (!Array.isArray(courses) || courses.length === 0) {
    return {
      cumulativeCredits: 0,
      cumulativeGpa4: 0,
      cumulativeGpa10: 0,
      rating: 'Chưa xếp loại',
      passedCoursesCount: 0,
      failedCoursesCount: 0,
      inProgressCoursesCount: 0
    };
  }

  let totalGpaCredits = 0;
  let totalWeightedPoint4 = 0;
  let totalWeightedPoint10 = 0;
  let accumulatedCredits = 0;

  let passedCount = 0;
  let failedCount = 0;
  let inProgressCount = 0;

  for (const c of courses) {
    const credits = Number(c.credits) || 0;
    const isUngraded = c.status === 'Đang học' || c.score === null || c.score === undefined || c.point4 === null || c.point4 === undefined;

    if (isUngraded) {
      inProgressCount++;
      continue; // Điểm chưa nhập khác với điểm 0, không đưa vào tính GPA
    }

    const point4 = Number(c.point4);
    const score10 = Number(c.score);
    const isPassed = c.status === 'Đạt' || c.status === 'Đạt thấp' || (c.letter && c.letter !== 'F') || point4 >= 1.0;

    if (isPassed) {
      passedCount++;
      if (c.countCredit !== false) {
        accumulatedCredits += credits;
      }
    } else {
      failedCount++;
    }

    // Tính điểm trung bình tích lũy (GPA)
    if (c.countGpa !== false && credits > 0) {
      totalGpaCredits += credits;
      totalWeightedPoint4 += point4 * credits;
      if (!isNaN(score10)) {
        totalWeightedPoint10 += score10 * credits;
      }
    }
  }

  const cumulativeGpa4 = totalGpaCredits > 0
    ? Number((totalWeightedPoint4 / totalGpaCredits).toFixed(2))
    : 0;

  const cumulativeGpa10 = totalGpaCredits > 0
    ? Number((totalWeightedPoint10 / totalGpaCredits).toFixed(2))
    : 0;

  let rating = 'Chưa xếp loại';
  if (totalGpaCredits > 0) {
    if (cumulativeGpa4 >= 3.6) rating = 'Xuất sắc';
    else if (cumulativeGpa4 >= 3.2) rating = 'Giỏi';
    else if (cumulativeGpa4 >= 2.5) rating = 'Khá';
    else if (cumulativeGpa4 >= 2.0) rating = 'Trung bình';
    else rating = 'Yếu';
  }

  return {
    cumulativeCredits: accumulatedCredits,
    cumulativeGpa4,
    cumulativeGpa10,
    rating,
    passedCoursesCount: passedCount,
    failedCoursesCount: failedCount,
    inProgressCoursesCount: inProgressCount
  };
}

export default calculateAcademicStats;
