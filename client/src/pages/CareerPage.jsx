import React, { useState, useMemo } from 'react';
import { 
  Compass, 
  Code, 
  Briefcase, 
  CheckCircle2, 
  Sparkles, 
  Calendar, 
  Layers, 
  ChevronRight,
  RotateCcw,
  Bot,
  Send,
  Loader2,
  Map
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import AiChatSidebar from '../components/AiChatSidebar';

export default function CareerPage() {
  const navigate = useNavigate();
  const [year, setYear] = useState('2');
  const [codingLevel, setCodingLevel] = useState('intermediate');
  const [selectedInterests, setSelectedInterests] = useState(['web_dev', 'qa_qc']);
  const [isMobileChatOpen, setIsMobileChatOpen] = useState(false);

  const interestsList = [
    { id: 'web_frontend', label: 'Frontend (React, Vue, CSS)', icon: '🎨' },
    { id: 'web_backend', label: 'Backend (Node.js, Express, Java)', icon: '⚙️' },
    { id: 'qa_qc', label: 'QA / QC / Software Testing', icon: '🛡️' },
    { id: 'ai_ml', label: 'Trí tuệ nhân tạo (AI / Machine Learning)', icon: '🤖' },
    { id: 'data_analyst', label: 'Phân tích dữ liệu (Data / SQL)', icon: '📊' },
    { id: 'mobile_dev', label: 'Lập trình Di động (Flutter, React Native)', icon: '📱' },
    { id: 'devops', label: 'Cloud & DevOps (Docker, AWS)', icon: '☁️' }
  ];

  const toggleInterest = (id) => {
    setSelectedInterests(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleReset = () => {
    setYear('2');
    setCodingLevel('intermediate');
    setSelectedInterests(['web_dev', 'qa_qc']);
  };

  // Tính toán gợi ý nghề nghiệp
  const careerRecommendations = useMemo(() => {
    const recs = [];

    if (selectedInterests.includes('qa_qc')) {
      recs.push({
        title: "Kỹ sư Đảm bảo chất lượng (QA/QC Engineer)",
        tag: "Rất phù hợp với sinh viên năm 2-3 KTPM",
        desc: "Kiểm thử phần mềm thủ công (Manual Testing), viết Test Case, Test Plan, và tự động hóa với Cypress/Selenium. Cơ hội thực tập mở rộng tại FPT Software, TMA, KMS.",
        stack: ["Postman (API Testing)", "Jira / Bugzilla", "SQL cơ bản", "Cypress / Playwright", "Selenium"],
        plan90: [
          "Tháng 1: Học vững quy trình kiểm thử phần mềm (STLC), các loại kiểm thử (Blackbox, Whitebox, Regression) và cách viết Test Case chuẩn.",
          "Tháng 2: Thực hành kiểm thử API với Postman, viết kịch bản Automation Test cơ bản với Playwright hoặc Cypress.",
          "Tháng 3: Hoàn thiện Portfolio/Project đồ án đã kiểm thử kỹ lưỡng, chuẩn bị CV tiếng Anh và phỏng vấn vị trí QA Intern."
        ]
      });
    }

    if (selectedInterests.includes('web_frontend')) {
      recs.push({
        title: "Lập trình viên Frontend (Frontend React Developer)",
        tag: "Nhu cầu tuyển dụng cao",
        desc: "Xây dựng giao diện web người dùng hiện đại, tương tác mượt mà, chuẩn UI/UX với React, Vite, TypeScript và TailwindCSS.",
        stack: ["React.js", "JavaScript (ES6+)", "TypeScript", "TailwindCSS / CSS3", "RESTful API Integration", "Git"],
        plan90: [
          "Tháng 1: Thành thạo React Hooks (useState, useEffect, useMemo), React Router và Component-driven architecture.",
          "Tháng 2: Xây dựng 2 Single Page Apps (SPA) hoàn chỉnh kết nối RESTful API hoặc Firebase.",
          "Tháng 3: Tối ưu hiệu năng web (Lighthouse), deploy Vercel/Netlify, đóng gói Portfolio GitHub và ứng tuyển Fresher."
        ]
      });
    }

    if (selectedInterests.includes('web_backend')) {
      recs.push({
        title: "Lập trình viên Backend (Backend Node.js / Java)",
        tag: "Kỹ năng nền tảng vững chắc",
        desc: "Thiết kế kiến trúc hệ thống, xây dựng RESTful APIs, quản lý cơ sở dữ liệu MySQL, PostgreSQL hoặc MongoDB, xác thực bảo mật JWT.",
        stack: ["Node.js (Express)", "Java (Spring Boot)", "MySQL / PostgreSQL", "MongoDB", "Docker cơ bản", "JWT Auth"],
        plan90: [
          "Tháng 1: Thiết kế Database Relational chuẩn 3NF, thành thạo CRUD và ORM (Prisma / Hibernate).",
          "Tháng 2: Xây dựng hệ thống Backend API đa chức năng có phân quyền người dùng (Role-based access), caching với Redis.",
          "Tháng 3: Viết tài liệu Swagger/Postman Docs, triển khai server lên Render/Railway/AWS, chuẩn bị phỏng vấn thuật toán."
        ]
      });
    }

    if (selectedInterests.includes('ai_ml')) {
      recs.push({
        title: "Kỹ sư Trí tuệ nhân tạo (AI / LLM Engineer)",
        tag: "Xu hướng tương lai dẫn đầu",
        desc: "Ứng dụng các mô hình ngôn ngữ lớn (LLM như Llama 3, Gemini, OpenAI), kỹ thuật RAG (Retrieval-Augmented Generation) và Fine-tuning.",
        stack: ["Python", "Groq Cloud API / OpenAI API", "LangChain / LlamaIndex", "Vector Database (Chroma, Pinecone)", "Hugging Face"],
        plan90: [
          "Tháng 1: Nắm vững Python nâng cao, xử lý dữ liệu với Pandas/NumPy và gọi API mô hình ngôn ngữ lớn.",
          "Tháng 2: Xây dựng hệ thống RAG chatbot tra cứu tài liệu nội bộ kết hợp Vector Database.",
          "Tháng 3: Tối ưu Prompt Engineering, tích hợp AI Assistant vào sản phẩm Web thực chiến."
        ]
      });
    }

    // Nếu chưa chọn mục nào hoặc còn trống
    if (recs.length === 0) {
      recs.push({
        title: "Lập trình viên Phần mềm Fullstack (Fullstack Web Developer)",
        tag: "Định hướng toàn diện cho SV Khoa CNTT",
        desc: "Nắm vững cả Frontend (React) và Backend (Node.js/Express) để tự mình phát triển trọn vẹn sản phẩm từ ý tưởng đến triển khai.",
        stack: ["React.js", "Node.js (Express)", "MySQL", "Git / GitHub", "Docker"],
        plan90: [
          "Tháng 1: Nắm chắc nền tảng JavaScript ES6+, HTML5/CSS3 và React căn bản.",
          "Tháng 2: Kết hợp React Frontend với Express API và Database.",
          "Tháng 3: Đưa ứng dụng lên môi trường Production, làm đẹp GitHub Profile và CV."
        ]
      });
    }

    return recs;
  }, [selectedInterests, year, codingLevel]);

  return (
    <>
      <div className="two-column-split" style={{ width: '100%', height: 'calc(100vh - 120px)', borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
      {/* Cột trái: Nội dung chính */}
      <div className="chatgpt-scroll fade-in" style={{ flex: 1, padding: '24px', overflowY: 'auto', borderRight: '1px solid var(--border-color)', background: 'var(--bg-main)' }}>
        {/* Header */}
      <div style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-lg)',
        padding: '24px',
        marginBottom: '24px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Compass size={24} />
            </div>
            <div>
              <h1 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-main)' }}>
                Định Hướng Nghề Nghiệp & Tương Lai
              </h1>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                Khảo sát sở thích, kỹ năng để AI thiết lập lộ trình phát triển và kế hoạch thực chiến 90 ngày
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button onClick={handleReset} className="btn-secondary" style={{ fontSize: '12px' }}>
              <RotateCcw size={14} /> Thiết lập lại
            </button>
            <button
              onClick={() => setIsMobileChatOpen(true)}
              className="mobile-only-chat-btn"
              title="Mở Chat box Định hướng tương lai"
            >
              <Bot size={15} />
              <span>Chat box định hướng</span>
            </button>
          </div>
        </div>

        {/* Survey Controls */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '20px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
              Bạn đang là sinh viên năm mấy?
            </label>
            <select
              value={year}
              onChange={(e) => setYear(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-primary)',
                color: 'var(--text-main)',
                fontSize: '14px'
              }}
            >
              <option value="1">Năm 1 (Mới bắt đầu tìm hiểu)</option>
              <option value="2">Năm 2 (Đang học môn cơ sở ngành)</option>
              <option value="3">Năm 3 (Chuẩn bị đi thực tập doanh nghiệp)</option>
              <option value="4">Năm 4 (Làm khóa luận & chuẩn bị tốt nghiệp)</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
              Mức độ tự tin lập trình hiện tại
            </label>
            <select
              value={codingLevel}
              onChange={(e) => setCodingLevel(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-primary)',
                color: 'var(--text-main)',
                fontSize: '14px'
              }}
            >
              <option value="beginner">Mới bắt đầu (Chưa nắm vững code)</option>
              <option value="basic">Biết cơ bản (Làm được bài tập trên lớp)</option>
              <option value="intermediate">Khá (Tự làm được project mini)</option>
              <option value="advanced">Tốt (Sẵn sàng phỏng vấn thực tập)</option>
            </select>
          </div>
        </div>

        {/* Interests Chips */}
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '10px' }}>
            Lĩnh vực bạn quan tâm nhất (chọn 1 hoặc nhiều):
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {interestsList.map(item => {
              const active = selectedInterests.includes(item.id);
              return (
                <button
                  key={item.id}
                  onClick={() => toggleInterest(item.id)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 14px',
                    borderRadius: '20px',
                    border: active ? '1px solid var(--vlu-red)' : '1px solid var(--border-color)',
                    background: active ? 'var(--vlu-red-light)' : 'var(--bg-primary)',
                    color: active ? 'var(--vlu-red)' : 'var(--text-main)',
                    fontSize: '13px',
                    fontWeight: active ? 600 : 500,
                    cursor: 'pointer',
                    transition: 'var(--transition)'
                  }}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Recommendations Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {careerRecommendations.map((career, idx) => (
          <div key={idx} className="vlu-card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '12px' }}>
              <div>
                <span className="badge badge-red" style={{ marginBottom: '6px' }}>{career.tag}</span>
                <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-main)', marginTop: '4px' }}>
                  {career.title}
                </h2>
              </div>

              <button
                onClick={() => navigate(`/?ask=${encodeURIComponent(`Tôi muốn tìm hiểu lộ trình chi tiết trở thành ${career.title}`)}`)}
                className="btn-vlu-primary"
                style={{ fontSize: '13px', padding: '6px 14px' }}
              >
                <Sparkles size={15} /> Hỏi AI thêm về hướng này
              </button>
            </div>

            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '16px' }}>
              {career.desc}
            </p>

            {/* Tech Stack Required */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Code size={16} color="var(--vlu-red)" />
                <span>Stack công nghệ cốt lõi doanh nghiệp yêu cầu:</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {career.stack.map((tech, i) => (
                  <span key={i} style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-color)',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: 'var(--text-main)'
                  }}>
                    {tech}
                  </span>
                ))}
              </div>
            </div>

            {/* 90 Days Plan */}
            <div style={{
              background: 'var(--bg-primary)',
              borderRadius: 'var(--radius-sm)',
              padding: '16px',
              border: '1px solid var(--border-color)'
            }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Calendar size={16} color="#16a34a" />
                <span>Lộ trình thực chiến 90 ngày bứt phá:</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {career.plan90.map((step, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                    <CheckCircle2 size={16} color="#16a34a" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <span>{step}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
      </div>

      {/* Cột phải: Chatbot Trợ lý định hướng nghề nghiệp (Chỉ hiện trên desktop, mobile mở qua nút bấm) */}
      <div className="desktop-only-chat-column" style={{ width: '380px', flexShrink: 0, height: '100%', padding: '16px', boxSizing: 'border-box' }}>
        <AiChatSidebar
          mode="advisor"
          title="Trợ lý Định hướng Nghề nghiệp"
          subtitle={`Sinh viên Năm ${year} • ${codingLevel.toUpperCase()}`}
          placeholder="Hỏi về Frontend, Backend, AI/Data, QA, BA..."
          quickReplies={[
            { label: 'Nên theo hướng nào?', text: `Dựa trên sở thích (${selectedInterests.join(', ')}) và năm học ${year}, bạn gợi ý tôi nên chuyên sâu theo hướng nào?` },
            { label: 'Lộ trình 90 ngày?', text: 'Hãy lập cho tôi lộ trình 90 ngày chi tiết để sẵn sàng ứng tuyển thực tập.' },
            { label: 'Project thực tập?', text: 'Những dự án thực tế nào nên có trong CV để gây ấn tượng với nhà tuyển dụng?' }
          ]}
          systemContext={`Sinh viên năm ${year}, trình độ lập trình: ${codingLevel}. Các lĩnh vực đang quan tâm: ${selectedInterests.join(', ')}. Hãy tư vấn hướng đi, lộ trình 90 ngày, kỹ năng còn thiếu và dự án thực tế phù hợp.`}
          initialMessage="Xin chào! Mình là Trợ lý Định hướng Nghề nghiệp. Bạn hãy chọn sở thích và trình độ bên trái, mình sẽ tư vấn lộ trình 90 ngày, kỹ năng và dự án thực tập phù hợp nhất!"
        />
      </div>
    </div>

    {/* Nút nổi (FAB) trên Mobile để mở Chatbox ngay mà không cần lướt */}
    <button
      onClick={() => setIsMobileChatOpen(true)}
      className="mobile-floating-chat-btn"
      title="Mở Chat box Định hướng tương lai"
    >
      <Bot size={18} />
      <span>Chat box định hướng</span>
    </button>

    {/* Modal Drawer Chatbox trên Mobile khi bấm nút */}
    {isMobileChatOpen && (
      <div className="mobile-chat-drawer-overlay" onClick={() => setIsMobileChatOpen(false)}>
        <div className="mobile-chat-drawer-container" onClick={e => e.stopPropagation()}>
          <AiChatSidebar
            mode="advisor"
            title="Trợ lý Định hướng Nghề nghiệp"
            subtitle={`Sinh viên Năm ${year} • ${codingLevel.toUpperCase()}`}
            placeholder="Hỏi về Frontend, Backend, AI/Data, QA, BA..."
            quickReplies={[
              { label: 'Nên theo hướng nào?', text: `Dựa trên sở thích (${selectedInterests.join(', ')}) và năm học ${year}, bạn gợi ý tôi nên chuyên sâu theo hướng nào?` },
              { label: 'Lộ trình 90 ngày?', text: 'Hãy lập cho tôi lộ trình 90 ngày chi tiết để sẵn sàng ứng tuyển thực tập.' },
              { label: 'Project thực tập?', text: 'Những dự án thực tế nào nên có trong CV để gây ấn tượng với nhà tuyển dụng?' }
            ]}
            systemContext={`Sinh viên năm ${year}, trình độ lập trình: ${codingLevel}. Các lĩnh vực đang quan tâm: ${selectedInterests.join(', ')}. Hãy tư vấn hướng đi, lộ trình 90 ngày, kỹ năng còn thiếu và dự án thực tế phù hợp.`}
            initialMessage="Xin chào! Mình là Trợ lý Định hướng Nghề nghiệp. Bạn hãy chọn sở thích và trình độ bên trái, mình sẽ tư vấn lộ trình 90 ngày, kỹ năng và dự án thực tập phù hợp nhất!"
            onClose={() => setIsMobileChatOpen(false)}
          />
        </div>
      </div>
    )}
    </>
  );
}
