import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, Sparkles } from 'lucide-react';
import { api } from '../services/api';

export default function AiChatSidebar({ mode, title, subtitle, placeholder, quickReplies, systemContext }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    const g = { results: 'Xin chao! Hay nhap MSSV hoac cho toi biet ket qua hoc tap, toi se phan tich GPA va mon can cai thien.', graduation: 'Xin chao! Hay nhap MSSV, toi se biet sinh vien con thieu gi de tot nghiep.' };
    setMessages([{ role: 'assistant', content: g[mode] || g.results, ts: Date.now() }]);
  }, [mode]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = async (text) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;
    const userMsg = { role: 'user', content: msg, ts: Date.now() };
    const newMsgs = [...messages, userMsg];
    setMessages(newMsgs); setInput(''); setLoading(true);
    try {
      const apiMessages = newMsgs.filter((m, i) => !(m.role === 'assistant' && i === 0)).map(m => ({ role: m.role, content: m.content }));
      const res = await api.chat({ messages: apiMessages, mode, systemPromptOverride: systemContext || undefined });
      setMessages(prev => [...prev, { role: 'assistant', content: res.reply, ts: Date.now() }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Loi: ' + err.message, ts: Date.now(), isError: true }]);
    } finally { setLoading(false); }
  };

  const md = (t) => t.replace(/\*\*(.*?)\*\*/g, '<strong>\</strong>').replace(/\n/g, '<br/>');

  const qrs = quickReplies || [];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: '400px', maxHeight: '580px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-color)', background: 'linear-gradient(135deg, var(--vlu-red) 0%, #c41230 100%)', display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
        <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Bot size={18} color="white" /></div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'white' }}>{title}</div>
          {subtitle && <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.75)' }}>{subtitle}</div>}
        </div>
        <Sparkles size={14} color="rgba(255,255,255,0.6)" />
      </div>
      {qrs.length > 0 && <div style={{ display: 'flex', gap: '6px', padding: '8px 12px', flexWrap: 'wrap', borderBottom: '1px solid var(--border-color)', flexShrink: 0, background: 'var(--bg-primary)' }}>{qrs.map((qr, i) => <button key={i} onClick={() => send(qr.text)} style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '20px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-secondary)', cursor: 'pointer' }}>{qr.label}</button>)}</div>}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {messages.map((msg, i) => <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}><div style={{ maxWidth: '88%', padding: '9px 13px', borderRadius: msg.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px', background: msg.role === 'user' ? 'linear-gradient(135deg, var(--vlu-red) 0%, #c41230 100%)' : msg.isError ? 'rgba(239,68,68,0.1)' : 'var(--bg-primary)', color: msg.role === 'user' ? 'white' : msg.isError ? '#ef4444' : 'var(--text-main)', fontSize: '13px', lineHeight: '1.55', border: msg.role === 'user' ? 'none' : '1px solid var(--border-color)' }}>{msg.role === 'assistant' ? <span dangerouslySetInnerHTML={{ __html: md(msg.content) }} /> : msg.content}</div></div>)}
        {loading && <div style={{ display: 'flex' }}><div style={{ padding: '10px 14px', borderRadius: '14px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', display: 'flex', gap: '5px' }}>{[0,1,2].map(d=><div key={d} style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--vlu-red)', animation: 'bounce 1.2s infinite', animationDelay: (d*0.2)+'s' }}/>)}</div></div>}
        <div ref={bottomRef} />
      </div>
      <div style={{ padding: '10px 12px', borderTop: '1px solid var(--border-color)', background: 'var(--bg-primary)', flexShrink: 0, display: 'flex', gap: '8px', alignItems: 'center' }}>
        <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&!e.shiftKey&&send()} placeholder={placeholder} disabled={loading} style={{ flex: 1, padding: '8px 12px', fontSize: '13px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-main)', outline: 'none' }} />
        <button onClick={()=>send()} disabled={loading||!input.trim()} style={{ width: '36px', height: '36px', borderRadius: '10px', background: loading||!input.trim() ? 'var(--bg-tertiary)' : 'var(--vlu-red)', border: 'none', cursor: loading||!input.trim() ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Send size={15} color={loading||!input.trim() ? 'var(--text-muted)' : 'white'} /></button>
      </div>
    </div>
  );
}
