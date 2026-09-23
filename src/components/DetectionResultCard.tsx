import React from 'react';
import {
  CheckCircle,
  XCircle,
  Clock,
  Activity,
  Layers,
  Sparkles,
  Play,
} from 'lucide-react';
import type { SpeechDetectionResult, SpeechSegment } from '../services/audio/speech-detection';
import type { DecodedAudio } from '../services/audio/audio-decoder';

interface DetectionResultCardProps {
  result: SpeechDetectionResult;
  decodedAudio?: DecodedAudio | null;
  onPlaySegment?: (segment: SpeechSegment) => void;
  activeSegmentId?: string | null;
}

export const DetectionResultCard: React.FC<DetectionResultCardProps> = ({
  result,
  decodedAudio,
  onPlaySegment,
  activeSegmentId,
}) => {
  const formatTime = (ms: number) => {
    const totalSec = ms / 1000;
    const mins = Math.floor(totalSec / 60);
    const secs = (totalSec % 60).toFixed(3);
    return `${mins.toString().padStart(2, '0')}:${secs.padStart(6, '0')}`;
  };

  // 單獨播放該區間音訊
  const playSegmentAudio = (segment: SpeechSegment) => {
    if (onPlaySegment) {
      onPlaySegment(segment);
    } else if (decodedAudio) {
      try {
        const AudioContextClass =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext })
            .webkitAudioContext;
        const ctx = new AudioContextClass();
        const startSample = Math.floor((segment.startMs / 1000) * decodedAudio.sampleRate);
        const endSample = Math.floor((segment.endMs / 1000) * decodedAudio.sampleRate);
        const length = Math.max(1, endSample - startSample);

        const buffer = ctx.createBuffer(1, length, decodedAudio.sampleRate);
        const channel = buffer.getChannelData(0);
        for (let i = 0; i < length; i++) {
          channel[i] = decodedAudio.samples[startSample + i] || 0;
        }

        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.start();
      } catch (err) {
        console.error('Play segment error:', err);
      }
    }
  };

  return (
    <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px' }}>
      {/* 核心判定 Banner */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          padding: '20px 24px',
          borderRadius: 'var(--radius-md)',
          background: result.hasSpeech
            ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.18), rgba(6, 182, 212, 0.12))'
            : 'linear-gradient(135deg, rgba(148, 163, 184, 0.1), rgba(30, 41, 59, 0.2))',
          border: `1px solid ${
            result.hasSpeech
              ? 'rgba(16, 185, 129, 0.4)'
              : 'rgba(148, 163, 184, 0.2)'
          }`,
          boxShadow: result.hasSpeech
            ? '0 0 30px -5px rgba(16, 185, 129, 0.2)'
            : 'none',
          marginBottom: '20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          {result.hasSpeech ? (
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                background: 'rgba(16, 185, 129, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CheckCircle size={28} color="#34d399" />
            </div>
          ) : (
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                background: 'rgba(148, 163, 184, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <XCircle size={28} color="#94a3b8" />
            </div>
          )}

          <div>
            <div
              style={{
                fontSize: '0.78rem',
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: result.hasSpeech ? '#34d399' : '#94a3b8',
                marginBottom: '2px',
              }}
            >
              VAD 分析判定結果
            </div>
            <div
              style={{
                fontSize: '1.45rem',
                fontWeight: 800,
                color: result.hasSpeech ? '#ffffff' : '#cbd5e1',
              }}
            >
              {result.hasSpeech ? '✅ 檢測到人聲 (Speech Detected)' : '⚪ 未檢測到人聲 (No Speech)'}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="badge badge-indigo">
            <Sparkles size={13} />
            分析耗時 {result.analysisTimeMs} ms
          </span>
          <span className={result.hasSpeech ? 'badge badge-emerald' : 'badge badge-slate'}>
            語音佔比 {result.speechRatio}%
          </span>
        </div>
      </div>

      {/* 4 個關鍵統計卡片 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: '12px',
          marginBottom: '20px',
        }}
      >
        <div
          style={{
            background: 'rgba(12, 17, 29, 0.5)',
            padding: '14px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '4px' }}>
            <Clock size={13} />
            音訊總時長
          </div>
          <div className="font-mono" style={{ fontSize: '1.15rem', fontWeight: 700 }}>
            {formatTime(result.totalAudioDurationMs)}
          </div>
        </div>

        <div
          style={{
            background: 'rgba(12, 17, 29, 0.5)',
            padding: '14px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '4px' }}>
            <Activity size={13} />
            人聲總時長
          </div>
          <div className="font-mono" style={{ fontSize: '1.15rem', fontWeight: 700, color: result.hasSpeech ? '#34d399' : 'inherit' }}>
            {formatTime(result.totalSpeechDurationMs)}
          </div>
        </div>

        <div
          style={{
            background: 'rgba(12, 17, 29, 0.5)',
            padding: '14px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '4px' }}>
            <Layers size={13} />
            偵測人聲片段數
          </div>
          <div className="font-mono" style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>
            {result.segments.length} <span style={{ fontSize: '0.75rem', fontWeight: 400 }}>段</span>
          </div>
        </div>

        <div
          style={{
            background: 'rgba(12, 17, 29, 0.5)',
            padding: '14px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '4px' }}>
            <Sparkles size={13} />
            語音佔比
          </div>
          <div className="font-mono" style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--accent-indigo)' }}>
            {result.speechRatio}%
          </div>
        </div>
      </div>

      {/* 語音片段清單表格 */}
      <div>
        <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '12px' }}>
          人聲片段明細列表 (Speech Segments)
        </h4>

        {result.segments.length === 0 ? (
          <div
            style={{
              padding: '24px',
              textAlign: 'center',
              background: 'rgba(12, 17, 29, 0.3)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-muted)',
              fontSize: '0.85rem',
            }}
          >
            本音檔未偵測到任何符合門檻的人聲片段（如屬微弱語音，可嘗試降低 positiveSpeechThreshold）
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '0.82rem',
                textAlign: 'left',
              }}
            >
              <thead>
                <tr
                  style={{
                    borderBottom: '1px solid var(--border-subtle)',
                    color: 'var(--text-muted)',
                  }}
                >
                  <th style={{ padding: '8px 12px' }}>#</th>
                  <th style={{ padding: '8px 12px' }}>起始時間</th>
                  <th style={{ padding: '8px 12px' }}>結束時間</th>
                  <th style={{ padding: '8px 12px' }}>時長</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right' }}>操作</th>
                </tr>
              </thead>
              <tbody>
                {result.segments.map((seg, idx) => {
                  const isCurrent = seg.id === activeSegmentId;
                  return (
                    <tr
                      key={seg.id}
                      style={{
                        borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                        background: isCurrent ? 'rgba(6, 182, 212, 0.08)' : 'transparent',
                        transition: 'background 0.15s ease',
                      }}
                    >
                      <td style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>
                        {idx + 1}
                      </td>
                      <td className="font-mono" style={{ padding: '10px 12px', color: '#38bdf8' }}>
                        {formatTime(seg.startMs)}
                      </td>
                      <td className="font-mono" style={{ padding: '10px 12px', color: '#818cf8' }}>
                        {formatTime(seg.endMs)}
                      </td>
                      <td className="font-mono" style={{ padding: '10px 12px', color: '#34d399', fontWeight: 600 }}>
                        {seg.durationMs} ms
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                        <button
                          onClick={() => playSegmentAudio(seg)}
                          className="btn btn-secondary"
                          style={{
                            fontSize: '0.72rem',
                            padding: '4px 10px',
                            borderRadius: '6px',
                          }}
                        >
                          <Play size={11} fill="currentColor" />
                          單段試聽
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
