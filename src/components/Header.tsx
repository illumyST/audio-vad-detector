import React from 'react';
import { Waves, Cpu, ShieldCheck, Zap } from 'lucide-react';

export const Header: React.FC = () => {
  return (
    <header style={{ marginBottom: '28px' }}>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          marginBottom: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, #06b6d4, #6366f1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 20px rgba(99, 102, 241, 0.4)',
            }}
          >
            <Waves size={26} color="#ffffff" />
          </div>
          <div>
            <h1
              style={{
                fontSize: '1.65rem',
                fontWeight: 800,
                letterSpacing: '-0.02em',
                background: 'linear-gradient(to right, #ffffff, #cbd5e1)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                lineHeight: 1.2,
              }}
            >
              NonRealTimeVAD 語音活動偵測
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              直接在前端瀏覽器分析音檔 samples，精確判定是否有人講話並標記片段時間
            </p>
          </div>
        </div>

        {/* Tech Badges */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          <span className="badge badge-cyan">
            <Cpu size={13} />
            Silero VAD + ONNX WASM
          </span>
          <span className="badge badge-indigo">
            <Zap size={13} />
            @ricky0123/vad-web
          </span>
          <span className="badge badge-emerald">
            <ShieldCheck size={13} />
            純前端零伺服端傳輸
          </span>
        </div>
      </div>
    </header>
  );
};
