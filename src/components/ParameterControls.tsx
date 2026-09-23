import React from 'react';
import { Sliders, RefreshCw, RotateCcw, HelpCircle } from 'lucide-react';
import { DEFAULT_VAD_OPTIONS, type SpeechDetectionOptions } from '../services/audio/speech-detection';

interface ParameterControlsProps {
  options: SpeechDetectionOptions;
  onOptionsChange: (options: SpeechDetectionOptions) => void;
  onReanalyze: () => void;
  isAnalyzing: boolean;
  hasAudio: boolean;
}

export const ParameterControls: React.FC<ParameterControlsProps> = ({
  options,
  onOptionsChange,
  onReanalyze,
  isAnalyzing,
  hasAudio,
}) => {
  const current = { ...DEFAULT_VAD_OPTIONS, ...options };

  const handleChange = (key: keyof SpeechDetectionOptions, value: number) => {
    onOptionsChange({
      ...options,
      [key]: value,
    });
  };

  const handleReset = () => {
    onOptionsChange(DEFAULT_VAD_OPTIONS);
  };

  return (
    <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sliders size={18} color="var(--accent-indigo)" />
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>
            VAD 閥值與偵測規則控制台 (FE-5)
          </h3>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={handleReset}
            disabled={isAnalyzing}
            className="btn btn-secondary"
            style={{ fontSize: '0.78rem', padding: '6px 12px' }}
          >
            <RotateCcw size={13} />
            重置預設值
          </button>
          <button
            onClick={onReanalyze}
            disabled={isAnalyzing || !hasAudio}
            className="btn btn-primary"
            style={{ fontSize: '0.78rem', padding: '6px 14px' }}
          >
            <RefreshCw size={13} className={isAnalyzing ? 'animate-spin' : ''} />
            以新閥值重新分析
          </button>
        </div>
      </div>

      {/* Grid of Sliders */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '18px',
        }}
      >
        {/* 1. Positive Speech Threshold */}
        <div
          style={{
            background: 'rgba(12, 17, 29, 0.4)',
            padding: '14px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '6px',
            }}
          >
            <label
              style={{
                fontSize: '0.82rem',
                fontWeight: 600,
                color: 'var(--text-primary)',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              說話判定門檻 (positive)
              <HelpCircle size={12} color="var(--text-muted)" />
            </label>
            <span
              className="font-mono"
              style={{
                fontSize: '0.85rem',
                fontWeight: 700,
                color: 'var(--accent-cyan)',
              }}
            >
              {current.positiveSpeechThreshold.toFixed(2)}
            </span>
          </div>
          <input
            type="range"
            min="0.10"
            max="0.90"
            step="0.05"
            value={current.positiveSpeechThreshold}
            onChange={(e) =>
              handleChange('positiveSpeechThreshold', parseFloat(e.target.value))
            }
            style={{ width: '100%', accentColor: 'var(--accent-cyan)' }}
          />
          <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            數值愈高愈嚴格，降低背景雜音誤判；數值愈低愈敏感（預設 0.60）
          </p>
        </div>

        {/* 2. Negative Speech Threshold */}
        <div
          style={{
            background: 'rgba(12, 17, 29, 0.4)',
            padding: '14px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '6px',
            }}
          >
            <label
              style={{
                fontSize: '0.82rem',
                fontWeight: 600,
                color: 'var(--text-primary)',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              靜音判定門檻 (negative)
              <HelpCircle size={12} color="var(--text-muted)" />
            </label>
            <span
              className="font-mono"
              style={{
                fontSize: '0.85rem',
                fontWeight: 700,
                color: 'var(--accent-indigo)',
              }}
            >
              {current.negativeSpeechThreshold.toFixed(2)}
            </span>
          </div>
          <input
            type="range"
            min="0.05"
            max="0.85"
            step="0.05"
            value={current.negativeSpeechThreshold}
            onChange={(e) =>
              handleChange('negativeSpeechThreshold', parseFloat(e.target.value))
            }
            style={{ width: '100%', accentColor: 'var(--accent-indigo)' }}
          />
          <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            低於此值結束該段說話，官方建議比 positive 低約 0.15（預設 0.45）
          </p>
        </div>

        {/* 3. Min Speech Ms */}
        <div
          style={{
            background: 'rgba(12, 17, 29, 0.4)',
            padding: '14px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '6px',
            }}
          >
            <label
              style={{
                fontSize: '0.82rem',
                fontWeight: 600,
                color: 'var(--text-primary)',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              最短說話時長 (minSpeechMs)
              <HelpCircle size={12} color="var(--text-muted)" />
            </label>
            <span
              className="font-mono"
              style={{
                fontSize: '0.85rem',
                fontWeight: 700,
                color: 'var(--accent-emerald)',
              }}
            >
              {current.minSpeechMs} ms
            </span>
          </div>
          <input
            type="range"
            min="50"
            max="1500"
            step="50"
            value={current.minSpeechMs}
            onChange={(e) =>
              handleChange('minSpeechMs', parseInt(e.target.value, 10))
            }
            style={{ width: '100%', accentColor: 'var(--accent-emerald)' }}
          />
          <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            短於此時長之脈衝聲音（如敲擊鍵盤）將被過濾拋棄（預設 250ms）
          </p>
        </div>

        {/* 4. Redemption Ms */}
        <div
          style={{
            background: 'rgba(12, 17, 29, 0.4)',
            padding: '14px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '6px',
            }}
          >
            <label
              style={{
                fontSize: '0.82rem',
                fontWeight: 600,
                color: 'var(--text-primary)',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              中斷寬限期 (redemptionMs)
              <HelpCircle size={12} color="var(--text-muted)" />
            </label>
            <span
              className="font-mono"
              style={{
                fontSize: '0.85rem',
                fontWeight: 700,
                color: '#e879f9',
              }}
            >
              {current.redemptionMs} ms
            </span>
          </div>
          <input
            type="range"
            min="100"
            max="1500"
            step="50"
            value={current.redemptionMs}
            onChange={(e) =>
              handleChange('redemptionMs', parseInt(e.target.value, 10))
            }
            style={{ width: '100%', accentColor: '#e879f9' }}
          />
          <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            說話中途稍微停頓的寬限時間，避免連續講話被切成碎段（預設 500ms）
          </p>
        </div>

        {/* 5. Min Total Speech for hasSpeech */}
        <div
          style={{
            background: 'rgba(12, 17, 29, 0.4)',
            padding: '14px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-subtle)',
            gridColumn: '1 / -1',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '6px',
            }}
          >
            <label
              style={{
                fontSize: '0.82rem',
                fontWeight: 600,
                color: 'var(--text-primary)',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              全檔有人講話最終門檻 (minTotalSpeechMs)
              <HelpCircle size={12} color="var(--text-muted)" />
            </label>
            <span
              className="font-mono"
              style={{
                fontSize: '0.85rem',
                fontWeight: 700,
                color: 'var(--accent-amber)',
              }}
            >
              {current.minTotalSpeechMs} ms
            </span>
          </div>
          <input
            type="range"
            min="50"
            max="2000"
            step="50"
            value={current.minTotalSpeechMs}
            onChange={(e) =>
              handleChange('minTotalSpeechMs', parseInt(e.target.value, 10))
            }
            style={{ width: '100%', accentColor: 'var(--accent-amber)' }}
          />
          <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            整個音檔累計的人聲總時長必須達到此門檻，hasSpeech 才會被判定為 true（預設 250ms）
          </p>
        </div>
      </div>
    </div>
  );
};
