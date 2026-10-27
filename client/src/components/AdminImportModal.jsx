import React, { useState, useEffect, useRef } from 'react';
import {
  UploadCloud, FileSpreadsheet, FileText, CheckCircle2, AlertTriangle,
  X, Download, ArrowRight, ArrowLeft, RefreshCw, Loader2, Save, Trash2,
  Check, AlertCircle, HelpCircle, Eye, Settings2, Database
} from 'lucide-react';
import { api } from '../services/api';

const DATA_TYPES = [
  { id: 'courses', label: 'Danh mục môn học', desc: 'Mã môn, tên học phần, số tín chỉ, tiên quyết' },
  { id: 'curriculum', label: 'Chương trình đào tạo', desc: 'Khung 126 tín chỉ K30 CNTT theo khối kiến thức' },
  { id: 'schedules', label: 'Thời khóa biểu', desc: 'Lịch học theo học kỳ, phòng, thứ, tiết, giảng viên' },
  { id: 'students', label: 'Danh sách sinh viên', desc: 'MSSV, họ tên, email, lớp, chuyên ngành' },
  { id: 'grades', label: 'Bảng điểm sinh viên', desc: 'Điểm hệ 10, điểm hệ 4, điểm chữ theo môn học' }
];

export default function AdminImportModal({
  isOpen,
  onClose,
  initialDataType = 'courses',
  onImportSuccess
}) {
  const [dataType, setDataType] = useState(initialDataType);
  const [step, setStep] = useState(1); // 1: Upload, 2: Preview & Edit, 3: Result
  const [file, setFile] = useState(null);
  const [conflictMode, setConflictMode] = useState('skip'); // 'skip' | 'update'
  const [defaultProgram, setDefaultProgram] = useState('K30 CNTT');

  // Loading states
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [loadingConfirm, setLoadingConfirm] = useState(false);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);

  // Preview data from backend
  const [previewData, setPreviewData] = useState(null);
  const [selectedSheet, setSelectedSheet] = useState('');
  const [customMapping, setCustomMapping] = useState({});
  const [showMappingConfig, setShowMappingConfig] = useState(false);
  const [previewRows, setPreviewRows] = useState([]);
  const [errorMsg, setErrorMsg] = useState('');

  // Result data after confirm
  const [importResult, setImportResult] = useState(null);

  const fileInputRef = useRef(null);

  useEffect(() => {
    if (initialDataType) {
      setDataType(initialDataType);
    }
  }, [initialDataType, isOpen]);

  // Reset when closing or opening
  useEffect(() => {
    if (!isOpen) {
      setStep(1);
      setFile(null);
      setPreviewData(null);
      setPreviewRows([]);
      setImportResult(null);
      setErrorMsg('');
      setShowMappingConfig(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDownloadTemplate = async () => {
    setDownloadingTemplate(true);
    setErrorMsg('');
    try {
      await api.downloadAdminImportTemplate(dataType);
    } catch (err) {
      setErrorMsg('Lỗi tải file mẫu: ' + err.message);
    } finally {
      setDownloadingTemplate(false);
    }
  };

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setErrorMsg('');
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) {
      setFile(dropped);
      setErrorMsg('');
    }
  };

  // Step 1 -> Step 2: Upload and Preview
  const handlePreview = async (sheetToRead = null, mappingToUse = null) => {
    if (!file) {
      setErrorMsg('Vui lòng chọn hoặc kéo thả file Excel / PDF');
      return;
    }

    setLoadingPreview(true);
    setErrorMsg('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('dataType', dataType);
      if (sheetToRead) formData.append('sheetName', sheetToRead);
      if (mappingToUse) formData.append('customMapping', JSON.stringify(mappingToUse));

      const res = await api.previewAdminImport(formData);
      if (!res.success) {
        throw new Error(res.message || 'Không thể đọc nội dung file');
      }

      setPreviewData(res.data);
      setSelectedSheet(res.data.activeSheetName || '');
      setCustomMapping(res.data.detectedMapping || {});
      setPreviewRows(res.data.rows || []);

      if (res.data.isScanned) {
        setErrorMsg(res.data.message || 'Tài liệu PDF là dạng scan, không có văn bản.');
      } else if (!res.data.rows || res.data.rows.length === 0) {
        setErrorMsg('Không tìm thấy dòng dữ liệu nào trong file hoặc sheet đã chọn.');
      } else {
        setStep(2);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Lỗi xử lý file');
    } finally {
      setLoadingPreview(false);
    }
  };

  // Switch sheet inside preview
  const handleSheetChange = (newSheet) => {
    setSelectedSheet(newSheet);
    handlePreview(newSheet, customMapping);
  };

  // Update cell in preview table
  const handleCellChange = (rowIdx, fieldKey, newVal) => {
    setPreviewRows(prev => {
      const updated = [...prev];
      const r = { ...updated[rowIdx] };
      r.data = { ...r.data, [fieldKey]: newVal };

      // Re-evaluate required
      const defField = previewData?.fields?.find(f => f.key === fieldKey);
      if (defField?.required && !String(newVal).trim()) {
        if (!r.errors.includes(`Thiếu ${defField.label}`)) {
          r.errors = [...r.errors, `Thiếu ${defField.label}`];
        }
        r.status = 'invalid';
      } else {
        r.errors = r.errors.filter(e => !e.includes(defField?.label));
        if (r.errors.length === 0) {
          r.status = r.warnings?.length > 0 ? 'duplicate' : 'valid';
        }
      }

      updated[rowIdx] = r;
      return updated;
    });
  };

  // Toggle row selection
  const toggleRowSelect = (rowIdx) => {
    setPreviewRows(prev => {
      const updated = [...prev];
      updated[rowIdx] = { ...updated[rowIdx], selected: !updated[rowIdx].selected };
      return updated;
    });
  };

  // Select / Deselect All
  const handleSelectAll = (select) => {
    setPreviewRows(prev => prev.map(r => ({
      ...r,
      selected: select && r.status !== 'invalid'
    })));
  };

  // Delete row from preview
  const handleDeleteRow = (rowIdx) => {
    setPreviewRows(prev => prev.filter((_, idx) => idx !== rowIdx));
  };

  // Step 2 -> Step 3: Confirm and save to DB
  const handleConfirm = async () => {
    const selectedRows = previewRows.filter(r => r.selected);
    if (selectedRows.length === 0) {
      setErrorMsg('Vui lòng tích chọn ít nhất 1 dòng hợp lệ để nhập vào hệ thống');
      return;
    }

    setLoadingConfirm(true);
    setErrorMsg('');

    try {
      const res = await api.confirmAdminImport({
        dataType,
        rows: selectedRows,
        conflictMode,
        defaultProgram
      });

      if (!res.success) {
        throw new Error(res.message || 'Lỗi lưu dữ liệu');
      }

      setImportResult(res.data);
      setStep(3);
      if (typeof onImportSuccess === 'function') {
        onImportSuccess(res.data);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Lỗi khi lưu dữ liệu vào hệ thống');
    } finally {
      setLoadingConfirm(false);
    }
  };

  const selectedCount = previewRows.filter(r => r.selected).length;
  const validCount = previewRows.filter(r => r.status === 'valid').length;
  const duplicateCount = previewRows.filter(r => r.status === 'duplicate').length;
  const invalidCount = previewRows.filter(r => r.status === 'invalid').length;

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1200 }}>
      <div
        className="modal-box chatgpt-scroll"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '95vw',
          maxWidth: step === 2 ? '1100px' : '720px',
          maxHeight: '90vh',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          transition: 'max-width 0.25s ease'
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingBottom: '16px',
          borderBottom: '1px solid var(--border-color)',
          marginBottom: '20px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '10px',
              background: 'linear-gradient(135deg, var(--vlu-red) 0%, #a80f28 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white'
            }}>
              <UploadCloud size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                Nhập Dữ Liệu Hàng Loạt (PDF / Excel)
              </h2>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Bước {step}/3: {step === 1 ? 'Chọn loại dữ liệu & Tải file' : step === 2 ? 'Kiểm tra & Hiệu chỉnh xem trước' : 'Kết quả thực hiện'}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Global Error Banner */}
        {errorMsg && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '12px 16px', borderRadius: '8px',
            background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444',
            color: '#ef4444', fontSize: '13px', marginBottom: '16px'
          }}>
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <div style={{ flex: 1 }}>{errorMsg}</div>
          </div>
        )}

        {/* ─── STEP 1: CHỌN LOẠI DỮ LIỆU & TẢI FILE ─── */}
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* 1. Data Type Selection */}
            <div>
              <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '8px', display: 'block' }}>
                1. Chọn phân hệ dữ liệu cần nhập:
              </label>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                gap: '10px'
              }}>
                {DATA_TYPES.map(t => {
                  const isSelected = dataType === t.id;
                  return (
                    <div
                      key={t.id}
                      onClick={() => { setDataType(t.id); setFile(null); setErrorMsg(''); }}
                      style={{
                        padding: '12px',
                        borderRadius: '10px',
                        border: isSelected ? '2px solid var(--vlu-red)' : '1px solid var(--border-color)',
                        background: isSelected ? 'var(--vlu-red-light)' : 'var(--bg-tertiary)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: isSelected ? 'var(--vlu-red)' : 'var(--text-main)' }}>
                          {t.label}
                        </span>
                        {isSelected && <Check size={16} color="var(--vlu-red)" />}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                        {t.desc}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 2. Download Template Bar */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 16px', borderRadius: '10px',
              background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)',
              flexWrap: 'wrap', gap: '10px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <FileSpreadsheet size={20} color="#10b981" />
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>
                    File Excel mẫu chuẩn cho: {DATA_TYPES.find(t => t.id === dataType)?.label}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Có sẵn cấu trúc cột, kiểu dữ liệu và các dòng ví dụ minh họa
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleDownloadTemplate}
                disabled={downloadingTemplate}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '7px 14px', borderRadius: '8px',
                  background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
                  color: 'var(--text-main)', fontSize: '12px', fontWeight: 600,
                  cursor: downloadingTemplate ? 'not-allowed' : 'pointer'
                }}
              >
                {downloadingTemplate ? <Loader2 size={14} className="spin" /> : <Download size={14} />}
                <span>Tải file Excel mẫu (.xlsx)</span>
              </button>
            </div>

            {/* 3. Drag & Drop Upload Zone */}
            <div>
              <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '8px', display: 'block' }}>
                2. Chọn file từ máy tính (.xlsx, .xls, .pdf):
              </label>
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: '2px dashed var(--border-color)',
                  borderRadius: '12px',
                  padding: '32px 20px',
                  textAlign: 'center',
                  background: 'var(--bg-primary)',
                  cursor: 'pointer',
                  transition: 'border-color 0.2s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--vlu-red)'}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-color)'}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls, .pdf, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel, application/pdf"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />

                <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--bg-tertiary)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px', color: 'var(--vlu-red)' }}>
                  <UploadCloud size={24} />
                </div>

                {file ? (
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-main)' }}>
                      📄 {file.name}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                      Dung lượng: {(file.size / 1024).toFixed(1)} KB &bull; Bấm để đổi file khác
                    </div>
                  </div>
                ) : (
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-main)' }}>
                      Kéo thả file Excel hoặc PDF vào đây, hoặc <span style={{ color: 'var(--vlu-red)' }}>bấm để duyệt file</span>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px' }}>
                      Hỗ trợ định dạng .xlsx, .xls và PDF có văn bản (tối đa 25MB)
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 4. Conflict Handling Option */}
            <div style={{
              padding: '14px 16px',
              borderRadius: '10px',
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-color)'
            }}>
              <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '8px', display: 'block' }}>
                Xử lý khi phát hiện dữ liệu trùng (cùng MSSV, mã môn hoặc lịch học):
              </label>
              <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="conflictMode"
                    value="skip"
                    checked={conflictMode === 'skip'}
                    onChange={() => setConflictMode('skip')}
                  />
                  <span>Bỏ qua bản ghi trùng (Giữ nguyên dữ liệu cũ)</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="conflictMode"
                    value="update"
                    checked={conflictMode === 'update'}
                    onChange={() => setConflictMode('update')}
                  />
                  <span>Cập nhật bản ghi mới (Ghi đè thông tin mới)</span>
                </label>
              </div>
            </div>

            {/* Footer Buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: '9px 18px', borderRadius: '8px',
                  background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)',
                  color: 'var(--text-main)', fontSize: '13px', cursor: 'pointer'
                }}
              >
                Hủy bỏ
              </button>

              <button
                type="button"
                onClick={() => handlePreview()}
                disabled={!file || loadingPreview}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '9px 24px', borderRadius: '8px',
                  background: (!file || loadingPreview) ? 'var(--bg-tertiary)' : 'var(--vlu-red)',
                  color: (!file || loadingPreview) ? 'var(--text-muted)' : 'white',
                  border: 'none', fontSize: '13px', fontWeight: 700,
                  cursor: (!file || loadingPreview) ? 'not-allowed' : 'pointer',
                  boxShadow: (!file || loadingPreview) ? 'none' : '0 2px 8px rgba(196, 18, 48, 0.3)'
                }}
              >
                {loadingPreview ? <Loader2 size={16} className="spin" /> : <ArrowRight size={16} />}
                <span>Đọc & Kiểm tra file</span>
              </button>
            </div>
          </div>
        )}

        {/* ─── STEP 2: PREVIEW, MAPPING & EDITING TABLE ─── */}
        {step === 2 && previewData && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1, minHeight: 0 }}>
            {/* Top Toolbar: Sheet selector & Mapping button & Conflict Option */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              flexWrap: 'wrap', gap: '12px', padding: '12px 16px',
              background: 'var(--bg-tertiary)', borderRadius: '10px', border: '1px solid var(--border-color)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                {previewData.availableSheets && previewData.availableSheets.length > 1 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600 }}>Sheet:</span>
                    <select
                      value={selectedSheet}
                      onChange={(e) => handleSheetChange(e.target.value)}
                      style={{ padding: '4px 8px', borderRadius: '6px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', fontSize: '12px', color: 'var(--text-main)' }}
                    >
                      {previewData.availableSheets.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Summary badges */}
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-main)' }}>
                    Tổng: {previewRows.length} dòng
                  </span>
                  <span style={{ background: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 700 }}>
                    ✓ {validCount} hợp lệ
                  </span>
                  {duplicateCount > 0 && (
                    <span style={{ background: '#fef3c7', color: '#b45309', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 700 }}>
                      ⚠️ {duplicateCount} trùng lặp
                    </span>
                  )}
                  {invalidCount > 0 && (
                    <span style={{ background: '#fee2e2', color: '#dc2626', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 700 }}>
                      ✕ {invalidCount} lỗi
                    </span>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowMappingConfig(!showMappingConfig)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '5px',
                    padding: '6px 12px', borderRadius: '6px',
                    background: showMappingConfig ? 'var(--vlu-red-light)' : 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                    fontSize: '12px', cursor: 'pointer', color: 'var(--text-main)'
                  }}
                >
                  <Settings2 size={14} />
                  <span>Ánh xạ cột ({Object.keys(customMapping).length})</span>
                </button>

                <div style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>Trùng:</span>
                  <select
                    value={conflictMode}
                    onChange={(e) => setConflictMode(e.target.value)}
                    style={{ padding: '4px 8px', borderRadius: '6px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', fontSize: '12px', color: 'var(--text-main)' }}
                  >
                    <option value="skip">Bỏ qua bản ghi trùng</option>
                    <option value="update">Cập nhật bản ghi mới</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Column Mapping Panel (Collapsible) */}
            {showMappingConfig && (
              <div style={{
                background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
                borderRadius: '10px', padding: '16px', animation: 'fadeIn 0.2s ease'
              }}>
                <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '10px', color: 'var(--text-main)' }}>
                  Khớp nối cột từ file với trường trong cơ sở dữ liệu:
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '10px' }}>
                  {previewData.fields?.map(f => (
                    <div key={f.key}>
                      <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '2px' }}>
                        {f.label} {f.required && <span style={{ color: 'var(--vlu-red)' }}>*</span>}
                      </label>
                      <select
                        value={customMapping[f.key] || ''}
                        onChange={(e) => {
                          const updated = { ...customMapping, [f.key]: e.target.value };
                          setCustomMapping(updated);
                          handlePreview(selectedSheet, updated);
                        }}
                        style={{ width: '100%', padding: '5px 8px', borderRadius: '6px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', fontSize: '12px', color: 'var(--text-main)' }}
                      >
                        <option value="">-- Chưa chọn --</option>
                        {previewData.headers?.map(h => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Select Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px' }}>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => handleSelectAll(true)}
                  style={{ background: 'none', border: 'none', color: 'var(--vlu-red)', cursor: 'pointer', fontWeight: 600, padding: 0 }}
                >
                  ✓ Chọn tất cả hợp lệ
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectAll(false)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0 }}
                >
                  Bỏ chọn tất cả
                </button>
              </div>

              <div style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                * Bạn có thể sửa trực tiếp nội dung trong các ô trước khi xác nhận lưu
              </div>
            </div>

            {/* Editable Preview Table with Horizontal Scroll */}
            <div style={{
              flex: 1, minHeight: '260px', maxHeight: '420px',
              overflowY: 'auto', overflowX: 'auto',
              border: '1px solid var(--border-color)', borderRadius: '10px',
              background: 'var(--bg-secondary)'
            }} className="chatgpt-scroll">
              <table style={{ width: '100%', minWidth: '820px', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-color)', position: 'sticky', top: 0, zIndex: 10 }}>
                    <th style={{ padding: '8px 10px', width: '36px', textAlign: 'center' }}>Chọn</th>
                    <th style={{ padding: '8px 10px', width: '45px', textAlign: 'center' }}>#</th>
                    <th style={{ padding: '8px 10px', width: '100px' }}>Trạng thái</th>
                    {previewData.fields?.map(f => (
                      <th key={f.key} style={{ padding: '8px 10px' }}>
                        {f.label} {f.required && <span style={{ color: 'var(--vlu-red)' }}>*</span>}
                      </th>
                    ))}
                    <th style={{ padding: '8px 10px', width: '40px', textAlign: 'center' }}>Bỏ</th>
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((row, rIdx) => {
                    const isSelected = row.selected;
                    const isInvalid = row.status === 'invalid';
                    const isDuplicate = row.status === 'duplicate';

                    return (
                      <tr
                        key={rIdx}
                        style={{
                          borderBottom: '1px solid var(--border-color)',
                          background: isInvalid ? 'rgba(239, 68, 68, 0.04)' : isDuplicate ? 'rgba(245, 158, 11, 0.04)' : 'transparent',
                          opacity: isSelected ? 1 : 0.45
                        }}
                      >
                        <td style={{ padding: '6px 10px', textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            disabled={isInvalid}
                            onChange={() => toggleRowSelect(rIdx)}
                          />
                        </td>
                        <td style={{ padding: '6px 10px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '11px' }}>
                          {row.rowIndex}
                        </td>
                        <td style={{ padding: '6px 10px' }}>
                          {isInvalid ? (
                            <span style={{ color: '#dc2626', fontWeight: 700, fontSize: '11px', display: 'flex', alignItems: 'center', gap: '3px' }} title={row.errors?.join('\n')}>
                              <AlertCircle size={12} /> Lỗi
                            </span>
                          ) : isDuplicate ? (
                            <span style={{ color: '#b45309', fontWeight: 700, fontSize: '11px', display: 'flex', alignItems: 'center', gap: '3px' }} title={row.warnings?.join('\n')}>
                              <AlertTriangle size={12} /> Trùng
                            </span>
                          ) : (
                            <span style={{ color: '#16a34a', fontWeight: 700, fontSize: '11px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                              <CheckCircle2 size={12} /> Hợp lệ
                            </span>
                          )}
                        </td>

                        {previewData.fields?.map(f => {
                          const val = row.data?.[f.key] ?? '';
                          return (
                            <td key={f.key} style={{ padding: '4px 6px' }}>
                              <input
                                type="text"
                                value={val}
                                onChange={(e) => handleCellChange(rIdx, f.key, e.target.value)}
                                style={{
                                  width: '100%',
                                  padding: '4px 6px',
                                  fontSize: '11.5px',
                                  borderRadius: '4px',
                                  border: '1px solid var(--border-color)',
                                  background: 'var(--bg-primary)',
                                  color: 'var(--text-main)',
                                  fontFamily: (f.key === 'code' || f.key === 'mssv' || f.key === 'courseCode') ? 'monospace' : 'inherit'
                                }}
                              />
                            </td>
                          );
                        })}

                        <td style={{ padding: '6px 10px', textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={() => handleDeleteRow(rIdx)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                            title="Xóa dòng này"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Bottom Actions */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              paddingTop: '10px', borderTop: '1px solid var(--border-color)'
            }}>
              <button
                type="button"
                onClick={() => setStep(1)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '8px 16px', borderRadius: '8px',
                  background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)',
                  color: 'var(--text-main)', fontSize: '13px', cursor: 'pointer'
                }}
              >
                <ArrowLeft size={15} />
                <span>Quay lại tải file</span>
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>
                  Sẽ nhập: <strong style={{ color: 'var(--vlu-red)' }}>{selectedCount}</strong> dòng
                </span>

                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={loadingConfirm || selectedCount === 0}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '9px 24px', borderRadius: '8px',
                    background: (loadingConfirm || selectedCount === 0) ? 'var(--bg-tertiary)' : '#10b981',
                    color: (loadingConfirm || selectedCount === 0) ? 'var(--text-muted)' : 'white',
                    border: 'none', fontSize: '13px', fontWeight: 700,
                    cursor: (loadingConfirm || selectedCount === 0) ? 'not-allowed' : 'pointer',
                    boxShadow: (loadingConfirm || selectedCount === 0) ? 'none' : '0 2px 8px rgba(16, 185, 129, 0.3)'
                  }}
                >
                  {loadingConfirm ? <Loader2 size={16} className="spin" /> : <Save size={16} />}
                  <span>Xác nhận & Lưu vào hệ thống</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─── STEP 3: KẾT QUẢ THỰC HIỆN ─── */}
        {step === 3 && importResult && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '10px 0' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: '56px', height: '56px', borderRadius: '50%',
                background: '#dcfce7', color: '#16a34a',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: '12px'
              }}>
                <CheckCircle2 size={32} />
              </div>
              <h3 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 6px 0', color: 'var(--text-main)' }}>
                Nhập Dữ Liệu Thành Công!
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
                {importResult.message}
              </p>
            </div>

            {/* Result Stats Grid */}
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px'
            }}>
              <div style={{ padding: '14px', borderRadius: '10px', background: '#dcfce7', textAlign: 'center' }}>
                <div style={{ fontSize: '22px', fontWeight: 800, color: '#15803d' }}>
                  {importResult.addedCount || 0}
                </div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#15803d' }}>
                  Thêm mới
                </div>
              </div>

              <div style={{ padding: '14px', borderRadius: '10px', background: '#e0e7ff', textAlign: 'center' }}>
                <div style={{ fontSize: '22px', fontWeight: 800, color: '#4338ca' }}>
                  {importResult.updatedCount || 0}
                </div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#4338ca' }}>
                  Cập nhật
                </div>
              </div>

              <div style={{ padding: '14px', borderRadius: '10px', background: '#fef3c7', textAlign: 'center' }}>
                <div style={{ fontSize: '22px', fontWeight: 800, color: '#b45309' }}>
                  {importResult.skippedCount || 0}
                </div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#b45309' }}>
                  Bỏ qua
                </div>
              </div>

              <div style={{ padding: '14px', borderRadius: '10px', background: '#fee2e2', textAlign: 'center' }}>
                <div style={{ fontSize: '22px', fontWeight: 800, color: '#dc2626' }}>
                  {importResult.errorCount || 0}
                </div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#dc2626' }}>
                  Lỗi
                </div>
              </div>
            </div>

            {/* Storage Info */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '10px 14px', borderRadius: '8px',
              background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)',
              fontSize: '12px', color: 'var(--text-secondary)'
            }}>
              <Database size={15} color="var(--vlu-red)" />
              <span>
                Kho lưu trữ: <strong>{importResult.storageMode === 'mongodb' ? 'MongoDB (Dữ liệu thật)' : 'Demo Local Storage'}</strong> &bull; Dữ liệu được bảo toàn khi làm mới trang hoặc khởi động lại server.
              </span>
            </div>

            {/* Error Details if any */}
            {importResult.errors && importResult.errors.length > 0 && (
              <div style={{
                maxHeight: '160px', overflowY: 'auto', padding: '12px',
                background: 'rgba(239, 68, 68, 0.05)', border: '1px solid #ef4444',
                borderRadius: '8px', fontSize: '12px'
              }}>
                <div style={{ fontWeight: 700, color: '#dc2626', marginBottom: '6px' }}>
                  Chi tiết lỗi theo dòng:
                </div>
                {importResult.errors.map((err, i) => (
                  <div key={i} style={{ color: '#ef4444', marginBottom: '4px' }}>
                    &bull; Dòng {err.rowIndex}: {err.message}
                  </div>
                ))}
              </div>
            )}

            {/* Close Button */}
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '10px' }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: '10px 32px', borderRadius: '8px',
                  background: 'var(--vlu-red)', color: 'white',
                  border: 'none', fontSize: '14px', fontWeight: 700,
                  cursor: 'pointer', boxShadow: '0 2px 8px rgba(196, 18, 48, 0.3)'
                }}
              >
                Hoàn tất & Đóng
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
