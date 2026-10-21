import React, { useState, useEffect } from 'react';
import { 
  GraduationCap, 
  Search, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Calendar, 
  Award, 
  AlertCircle,
  FileCheck,
  ShieldCheck,
  Activity
} from 'lucide-react';
import { api } from '../services/api';

export default function GraduationPage() {
  const [mssvInput, setMssvInput] = useState('2474802010458');
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLookup = async (code = mssvInput) => {
    if (!code) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.getStudentByMssv(code.trim());
      if (res.success) {
        setStudent(res.data);
      }
    } catch (err) {
      setError(err.message || "Kh├┤ng t├¼m thß║Ñy dß╗» liß╗çu sinh vi├¬n");
      setStudent(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handleLookup('2474802010458');
  }, []);

  const totalCredits = 126;
  const currentCredits = student?.officialCumulativeCredits || 0;
  const progressPercent = Math.min(100, Math.round((currentCredits / totalCredits) * 100));

  // Kiß╗âm tra c├íc m├┤n GDQP (NAD)
  const hasGdqp = student?.courses?.some(c => c.code.startsWith('71NAD') && c.status === '─Éß║ít');
  // Kiß╗âm tra GDTC (PE)
  const hasGdtc = student?.courses?.some(c => c.code.startsWith('71PE') && c.status === '─Éß║ít');
  // Chuß║⌐n AV (AV4/AV5)
  const hasAvPass = student?.courses?.some(c => (c.code.includes('ENG4') || c.code.includes('ENG5')) && (c.status === '─Éß║ít' || c.status === '─Éß║ít thß║Ñp'));

  const conditions = [
    {
      id: 1,
      title: "T├¡ch l┼⌐y tß╗æi thiß╗âu 126 T├¡n chß╗ë Khung K30",
      status: currentCredits >= 126 ? "passed" : "in_progress",
      desc: `Hiß╗çn ─æ├ú t├¡ch l┼⌐y ${currentCredits}/126 t├¡n chß╗ë (${progressPercent}%)`,
      icon: Award
    },
    {
      id: 2,
      title: "Chß╗⌐ng chß╗ë Chuß║⌐n ─æß║ºu ra Ngoß║íi ngß╗» (TOEIC 500+ / IELTS 5.0+)",
      status: hasAvPass ? "passed" : "pending",
      desc: hasAvPass ? "─É├ú ho├án th├ánh c├íc hß╗ìc phß║ºn Anh v─ân chuy├¬n ngß╗» c╞í sß╗ƒ" : "Cß║ºn nß╗Öp chß╗⌐ng chß╗ë tr╞░ß╗¢c ─æß╗út x├⌐t tß╗æt nghiß╗çp",
      icon: FileCheck
    },
    {
      id: 3,
      title: "Chß╗⌐ng chß╗ë Tin hß╗ìc Quß╗æc tß║┐ MOS (Word, Excel, PowerPoint)",
      status: "in_progress",
      desc: "Khoa CNTT x├⌐t miß╗àn mß╗Öt sß╗æ phß║ºn hoß║╖c nß╗Öp chß╗⌐ng chß╗ë chuß║⌐n",
      icon: ShieldCheck
    },
    {
      id: 4,
      title: "Chß╗⌐ng chß╗ë Gi├ío dß╗Ñc Quß╗æc ph├▓ng & An ninh (GDQP 1-4)",
      status: hasGdqp ? "passed" : "pending",
      desc: hasGdqp ? "─É├ú ho├án tß║Ñt 4 hß╗ìc phß║ºn GDQP tß║íi Trung t├óm" : "Ch╞░a ho├án th├ánh ─æß╗º 4 hß╗ìc phß║ºn GDQP",
      icon: CheckCircle2
    },
    {
      id: 5,
      title: "Ho├án th├ánh c├íc hß╗ìc phß║ºn Gi├ío dß╗Ñc Thß╗â chß║Ñt",
      status: hasGdtc ? "passed" : "pending",
      desc: hasGdtc ? "─É├ú ─æß║ít c├íc m├┤n thß╗â chß║Ñt theo quy ─æß╗ïnh" : "Cß║ºn t├¡ch l┼⌐y ─æß╗º c├íc m├┤n thß╗â chß║Ñt",
      icon: Activity
    }
  ];

  return (
    <div className="page-container" style={{ maxWidth: '1100px', margin: '0 auto', width: '100%' }}>
      {/* Header */}
      <div style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-lg)',
        padding: '24px',
        marginBottom: '24px',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '18px' }}>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-main)', marginBottom: '4px' }}>
              Dß╗▒ B├ío & X├⌐t Tiß║┐n ─Éß╗Ö Tß╗æt Nghiß╗çp
            </h1>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              ─É├ính gi├í 5 ─æiß╗üu kiß╗çn tß╗æt nghiß╗çp cß╗æt l├╡i v├á dß╗▒ b├ío thß╗¥i gian ra tr╞░ß╗¥ng ─Éß║íi hß╗ìc V─ân Lang
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            {['2474802010458', '2474802010414', '2474802010071'].map(code => (
              <button
                key={code}
                onClick={() => {
                  setMssvInput(code);
                  handleLookup(code);
                }}
                className="btn-secondary"
                style={{ fontSize: '12px', padding: '4px 10px' }}
              >
                MSSV: {code.slice(-5)}
              </button>
            ))}
          </div>
        </div>

        {/* Input Bar */}
        <div style={{ display: 'flex', gap: '10px', maxWidth: '540px' }}>
          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            background: 'var(--bg-primary)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-sm)',
            padding: '8px 14px'
          }}>
            <Search size={16} color="var(--text-muted)" />
            <input 
              type="text"
              placeholder="Nhß║¡p MSSV ─æß╗â kiß╗âm tra tiß║┐n ─æß╗Ö tß╗æt nghiß╗çp..."
              value={mssvInput}
              onChange={(e) => setMssvInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
              style={{
                border: 'none',
                background: 'transparent',
                outline: 'none',
                width: '100%',
                fontSize: '14px',
                color: 'var(--text-main)'
              }}
            />
          </div>

          <button onClick={() => handleLookup()} className="btn-vlu-primary">
            <Search size={16} /> Kiß╗âm tra
          </button>
        </div>
      </div>

      {student && (
        <>
          {/* Summary Forecast Banner */}
          <div className="vlu-card" style={{
            background: 'linear-gradient(135deg, rgba(196, 18, 48, 0.06) 0%, rgba(30, 41, 59, 0.04) 100%)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-lg)',
            padding: '24px',
            marginBottom: '24px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
              <div>
                <span className="badge badge-red" style={{ marginBottom: '8px' }}>
                  Dß╗▒ b├ío thß╗¥i gian ra tr╞░ß╗¥ng
                </span>
                <h2 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-main)', marginTop: '4px' }}>
                  Dß╗▒ kiß║┐n Tß╗æt nghiß╗çp: <span style={{ color: 'var(--vlu-red)' }}>─Éß╗út 1 / N─âm 2028</span>
                </h2>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Sinh vi├¬n: <strong>{student.name}</strong> ΓÇó Ni├¬n kh├│a 2024 - 2028 ({student.major})
                </p>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Tiß║┐n ─æß╗Ö t├¡ch l┼⌐y t├¡n chß╗ë</div>
                <div style={{ fontSize: '28px', fontWeight: 800, color: '#16a34a' }}>
                  {currentCredits} / {totalCredits} TC
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  C├▓n thiß║┐u: <strong>{totalCredits - currentCredits} t├¡n chß╗ë</strong>
                </div>
              </div>
            </div>

            {/* Progress bar */}
            <div style={{
              width: '100%',
              height: '10px',
              borderRadius: '9999px',
              background: 'var(--border-color)',
              overflow: 'hidden',
              marginTop: '20px'
            }}>
              <div style={{
                width: `${progressPercent}%`,
                height: '100%',
                background: 'linear-gradient(90deg, var(--vlu-red) 0%, #16a34a 100%)',
                borderRadius: '9999px'
              }} />
            </div>
          </div>

          {/* Conditions Checklist */}
          <div className="vlu-card" style={{ padding: '24px', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-main)', marginBottom: '18px' }}>
              Bß║úng ─É├ính Gi├í C├íc ─Éiß╗üu Kiß╗çn Tß╗æt Nghiß╗çp Chuß║⌐n VLU
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {conditions.map((item) => {
                const Icon = item.icon;
                const isPassed = item.status === 'passed';
                const isInProgress = item.status === 'in_progress';
                return (
                  <div
                    key={item.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '14px 18px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--bg-tertiary)',
                      border: '1px solid var(--border-color)',
                      flexWrap: 'wrap',
                      gap: '12px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        background: isPassed ? 'rgba(34, 197, 94, 0.15)' : isInProgress ? 'rgba(59, 130, 246, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: isPassed ? '#16a34a' : isInProgress ? '#3b82f6' : '#ef4444'
                      }}>
                        <Icon size={18} />
                      </div>
                      <div>
                        <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '2px' }}>
                          {item.title}
                        </h4>
                        <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                          {item.desc}
                        </p>
                      </div>
                    </div>

                    <div>
                      {isPassed ? (
                        <span className="badge badge-green" style={{ fontSize: '12px' }}>
                          <CheckCircle2 size={14} /> ─Éß║ít ti├¬u chuß║⌐n
                        </span>
                      ) : isInProgress ? (
                        <span className="badge badge-blue" style={{ fontSize: '12px' }}>
                          <Clock size={14} /> ─Éang ho├án thiß╗çn
                        </span>
                      ) : (
                        <span className="badge badge-orange" style={{ fontSize: '12px' }}>
                          <AlertCircle size={14} /> Cß║ºn bß╗ò sung
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
