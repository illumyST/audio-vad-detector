import React, { useRef, useEffect, useState } from 'react';
import { Play, Pause, Volume2, RotateCcw } from 'lucide-react';
import type { DecodedAudio } from '../services/audio/audio-decoder';
import type { SpeechSegment } from '../services/audio/speech-detection';

interface WaveformVisualizerProps {
  decodedAudio: DecodedAudio;
  segments: SpeechSegment[];
  audioBlob: Blob | File;
  activeSegmentId?: string | null;
  onSelectSegment?: (segment: SpeechSegment) => void;
}

export const WaveformVisualizer: React.FC<WaveformVisualizerProps> = ({
  decodedAudio,
  segments,
  audioBlob,
  activeSegmentId,
  onSelectSegment,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string>('');
  const playheadAnimationRef = useRef<number | null>(null);

  // 產生音訊播放 URL
  useEffect(() => {
    const url = URL.createObjectURL(audioBlob);
    setAudioUrl(url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [audioBlob]);

  // 更新播放進度與動畫
  const updatePlayhead = () => {
    if (audioRef.current) {
      setCurrentTimeMs(audioRef.current.currentTime * 1000);
      if (!audioRef.current.paused && !audioRef.current.ended) {
        playheadAnimationRef.current = requestAnimationFrame(updatePlayhead);
      }
    }
  };

  const handlePlayPause = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
      playheadAnimationRef.current = requestAnimationFrame(updatePlayhead);
    }
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
    if (playheadAnimationRef.current) {
      cancelAnimationFrame(playheadAnimationRef.current);
    }
  };

  // 繪製波形與語音區間標記
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 處理 high-DPI 螢幕
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    const centerY = height / 2;

    ctx.clearRect(0, 0, width, height);

    // 1. 繪製背景網格與中線
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    ctx.lineTo(width, centerY);
    ctx.stroke();

    const totalDuration = decodedAudio.durationMs || 1;

    // 2. 繪製語音高亮區間 (Speech Segments Overlays)
    segments.forEach((seg) => {
      const startX = (seg.startMs / totalDuration) * width;
      const endX = (seg.endMs / totalDuration) * width;
      const segWidth = Math.max(2, endX - startX);
      const isActive = seg.id === activeSegmentId;

      // 漸層覆蓋區域
      const segGradient = ctx.createLinearGradient(0, 0, 0, height);
      if (isActive) {
        segGradient.addColorStop(0, 'rgba(6, 182, 212, 0.45)');
        segGradient.addColorStop(1, 'rgba(99, 102, 241, 0.45)');
      } else {
        segGradient.addColorStop(0, 'rgba(16, 185, 129, 0.25)');
        segGradient.addColorStop(1, 'rgba(6, 182, 212, 0.15)');
      }

      ctx.fillStyle = segGradient;
      ctx.fillRect(startX, 0, segWidth, height);

      // 上下邊緣邊線
      ctx.strokeStyle = isActive ? '#06b6d4' : '#10b981';
      ctx.lineWidth = isActive ? 2 : 1;
      ctx.strokeRect(startX, 0, segWidth, height);
    });

    // 3. 繪製音訊波形柱 (Peaks Bars)
    const peaks = decodedAudio.peaks;
    const barCount = peaks.length;
    const barWidth = Math.max(1.5, (width / barCount) * 0.7);
    const gap = (width - barCount * barWidth) / (barCount - 1);

    for (let i = 0; i < barCount; i++) {
      const x = i * (barWidth + gap);
      const barHeight = Math.max(3, peaks[i] * (centerY - 8));
      const timeAtBar = (i / barCount) * totalDuration;

      // 檢查此點是否在任何 speech segment 內
      const isInSpeech = segments.some(
        (seg) => timeAtBar >= seg.startMs && timeAtBar <= seg.endMs
      );

      ctx.beginPath();
      if (isInSpeech) {
        ctx.fillStyle = '#34d399'; // 人聲處為亮綠翡翠色
      } else {
        ctx.fillStyle = 'rgba(148, 163, 184, 0.35)'; // 無人聲為柔和灰藍
      }

      // 上下對稱柱
      ctx.roundRect(x, centerY - barHeight, barWidth, barHeight * 2, 1.5);
      ctx.fill();
    }

    // 4. 繪製當前播放指針 (Playhead)
    const playheadX = (currentTimeMs / totalDuration) * width;
    if (playheadX >= 0 && playheadX <= width) {
      ctx.strokeStyle = '#f43f5e';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(playheadX, 0);
      ctx.lineTo(playheadX, height);
      ctx.stroke();

      // 指針頂部微光圓球
      ctx.fillStyle = '#f43f5e';
      ctx.beginPath();
      ctx.arc(playheadX, 6, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [decodedAudio, segments, currentTimeMs, activeSegmentId]);

  // 點擊波形進行播放尋軌 (Seek)
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !audioRef.current) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    const targetMs = ratio * decodedAudio.durationMs;

    audioRef.current.currentTime = targetMs / 1000;
    setCurrentTimeMs(targetMs);

    // 若點在特定 segment 上，通知父層
    const clickedSegment = segments.find(
      (s) => targetMs >= s.startMs && targetMs <= s.endMs
    );
    if (clickedSegment && onSelectSegment) {
      onSelectSegment(clickedSegment);
    }
  };

  const formatTime = (ms: number) => {
    const totalSec = ms / 1000;
    const mins = Math.floor(totalSec / 60);
    const secs = (totalSec % 60).toFixed(2);
    return `${mins.toString().padStart(2, '0')}:${secs.padStart(5, '0')}`;
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
          <Volume2 size={18} color="var(--accent-emerald)" />
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>音訊波形與人聲區間時間軸</h3>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '2px',
                background: '#34d399',
                display: 'inline-block',
              }}
            />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              人聲區間 (Speech Segment)
            </span>
          </div>
          <span className="font-mono" style={{ fontSize: '0.85rem', color: 'var(--accent-cyan)' }}>
            {formatTime(currentTimeMs)} / {formatTime(decodedAudio.durationMs)}
          </span>
        </div>
      </div>

      {/* Canvas 波形容器 */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '120px',
          background: 'rgba(9, 13, 22, 0.7)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)',
          cursor: 'crosshair',
          overflow: 'hidden',
          marginBottom: '16px',
        }}
      >
        <canvas
          ref={canvasRef}
          onClick={handleCanvasClick}
          style={{ width: '100%', height: '100%', display: 'block' }}
        />
      </div>

      {/* 播放控制列 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={handlePlayPause}
            className="btn btn-primary"
            style={{ padding: '8px 16px', borderRadius: '10px' }}
          >
            {isPlaying ? <Pause size={16} /> : <Play size={16} fill="white" />}
            {isPlaying ? '暫停播放' : '播放音訊'}
          </button>
          <button
            onClick={() => {
              if (audioRef.current) {
                audioRef.current.currentTime = 0;
                setCurrentTimeMs(0);
              }
            }}
            className="btn btn-secondary"
            style={{ padding: '8px 12px', borderRadius: '10px' }}
            title="回到開頭"
          >
            <RotateCcw size={15} />
          </button>
        </div>

        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          提示：點擊波形任何位置即可跳轉播放；高亮綠色區塊為 VAD 偵測到之語音區間
        </div>
      </div>

      {/* 隱藏原生 Audio 標籤 */}
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          onEnded={handleAudioEnded}
          onPause={() => setIsPlaying(false)}
        />
      )}
    </div>
  );
};
