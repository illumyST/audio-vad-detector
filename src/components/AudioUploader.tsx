import React, { useState, useRef } from 'react';
import { Upload, Mic, Square, PlayCircle, FileAudio, CheckCircle2 } from 'lucide-react';
import { PRESET_SAMPLES, AudioRecorder, type PresetSample } from '../services/audio/sample-generator';

interface AudioUploaderProps {
  onFileSelected: (file: File | Blob, filename: string) => void;
  isAnalyzing: boolean;
  currentFilename?: string;
}

const AUDIO_TEST_FILES = [
  { name: 'd1fe6a98-e440-40a7-bc03-2d41a621b347_5-18s.webm', label: 'd1fe6a98 (13s, 擷取5-18秒, 有人聲)' },
  { name: '1e8aef73-9791-4481-b64b-31be7b0484e2.webm', label: '1e8aef73 (80s, 無人聲)' },
  { name: '2697dc1c-91c4-4081-bbbc-8d0dc3fd5d13.webm', label: '2697dc1c (67s, 有人聲)' },
  { name: '4b34bb9d-65ab-4362-8de9-4c48e709d85b.webm', label: '4b34bb9d (463s, 無人聲)' },
  { name: '72277662-6cd4-45bd-9486-ccb390fa0ba7.webm', label: '72277662 (90s, 有人聲)' },
  { name: '7b0ddf92-ab92-4c72-8d97-41d35e4d4f7b.webm', label: '7b0ddf92 (59s, 有人聲)' },
  { name: '928d684a-a0c9-4806-aec0-7f03d1c56d4c.webm', label: '928d684a (78s, 有人聲)' },
  { name: 'cee55f7a-0c8d-454f-8a42-160ced6f148b.webm', label: 'cee55f7a (51s, 有人聲)' },
  { name: '7a3108ba-a528-4c27-9496-481fe5a1c2a6.webm', label: '7a3108ba (20m, 無人聲)' },
  { name: '9b44bf90-04c5-4612-8f23-00a126efa13d.webm', label: '9b44bf90 (31m, 有人聲)' },
];

export const AudioUploader: React.FC<AudioUploaderProps> = ({
  onFileSelected,
  isAnalyzing,
  currentFilename,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recorderRef = useRef<AudioRecorder | null>(null);
  const timerRef = useRef<number | null>(null);

  const handleAudioTestSelect = async (filename: string) => {
    if (!filename) return;
    try {
      const basePath = import.meta.env.BASE_URL.endsWith('/')
        ? import.meta.env.BASE_URL
        : `${import.meta.env.BASE_URL}/`;
      const res = await fetch(`${basePath}audioTest/${filename}`);
      if (!res.ok) throw new Error(`載入失敗 (${res.status})`);
      const blob = await res.blob();
      onFileSelected(blob, filename);
    } catch (err) {
      alert(`載入 audioTest 測試音檔失敗：${err instanceof Error ? err.message : '未知錯誤'}`);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      onFileSelected(file, file.name);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      onFileSelected(file, file.name);
    }
  };

  const handlePresetSelect = async (preset: PresetSample) => {
    try {
      const blob = await preset.createBlob();
      onFileSelected(blob, `${preset.id}.wav`);
    } catch (err) {
      console.error('Failed to load preset:', err);
    }
  };

  const startRecording = async () => {
    try {
      const recorder = new AudioRecorder();
      await recorder.start();
      recorderRef.current = recorder;
      setIsRecording(true);
      setRecordSeconds(0);

      timerRef.current = window.setInterval(() => {
        setRecordSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      alert(`無法啟動麥克風錄音：${err instanceof Error ? err.message : '未知錯誤'}`);
    }
  };

  const stopRecording = async () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (recorderRef.current) {
      try {
        const audioBlob = await recorderRef.current.stop();
        setIsRecording(false);
        const filename = `mic-record-${new Date().toISOString().slice(11, 19).replace(/:/g, '')}.webm`;
        onFileSelected(audioBlob, filename);
      } catch (err) {
        console.error('Stop recording error:', err);
        setIsRecording(false);
      }
    }
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
          <FileAudio size={18} color="var(--accent-cyan)" />
          <h2 style={{ fontSize: '1.05rem', fontWeight: 700 }}>選擇或錄製音訊檔案</h2>
        </div>
        {currentFilename && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <CheckCircle2 size={14} color="#34d399" />
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              目前檔案：
              <span className="font-mono" style={{ color: 'var(--text-primary)', marginLeft: '4px' }}>
                {currentFilename}
              </span>
            </span>
          </div>
        )}
      </div>

      {/* Drag & Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        style={{
          border: `2px dashed ${
            isDragging ? 'var(--accent-cyan)' : 'var(--border-subtle)'
          }`,
          borderRadius: 'var(--radius-md)',
          padding: '36px 20px',
          textAlign: 'center',
          background: isDragging
            ? 'rgba(6, 182, 212, 0.08)'
            : 'rgba(12, 17, 29, 0.5)',
          cursor: isAnalyzing ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s ease',
          marginBottom: '18px',
        }}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileInput}
          accept="audio/*,.webm,.mp3,.wav,.m4a,.ogg,.flac"
          style={{ display: 'none' }}
          disabled={isAnalyzing}
        />
        <div
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            background: 'rgba(99, 102, 241, 0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 12px auto',
          }}
        >
          <Upload size={22} color="var(--accent-indigo)" />
        </div>
        <p style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '4px' }}>
          點擊上傳 或 拖曳音檔至此處
        </p>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
          支援 WebM, MP3, WAV, M4A, OGG 等常見音訊格式 (前端直接解碼)
        </p>
      </div>

      {/* Preset Dataset & Microphone Recording (Phase 6 / FE-4) */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          paddingTop: '12px',
          borderTop: '1px solid var(--border-subtle)',
        }}
      >
        {/* Preset Buttons */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginRight: '4px' }}>
            快速測試集 (FE-4):
          </span>
          {PRESET_SAMPLES.map((preset) => (
            <button
              key={preset.id}
              onClick={() => handlePresetSelect(preset)}
              disabled={isAnalyzing || isRecording}
              className="btn btn-secondary"
              style={{
                fontSize: '0.78rem',
                padding: '6px 12px',
                borderRadius: '8px',
              }}
              title={preset.description}
            >
              <PlayCircle size={14} />
              {preset.name}
            </button>
          ))}

          {/* audioTest 資料夾音檔選單 */}
          <div style={{ display: 'inline-flex', alignItems: 'center', marginLeft: '6px' }}>
            <select
              defaultValue=""
              onChange={(e) => {
                if (e.target.value) {
                  handleAudioTestSelect(e.target.value);
                  e.target.value = '';
                }
              }}
              disabled={isAnalyzing || isRecording}
              style={{
                fontSize: '0.78rem',
                padding: '6px 10px',
                borderRadius: '8px',
                background: 'rgba(30, 41, 59, 0.7)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-subtle)',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="" disabled>
                📂 選擇 audioTest 測試音檔...
              </option>
              {AUDIO_TEST_FILES.map((item) => (
                <option key={item.name} value={item.name}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Microphone Quick Recorder */}
        <div>
          {isRecording ? (
            <button
              onClick={stopRecording}
              className="btn btn-danger"
              style={{ fontSize: '0.82rem', padding: '6px 14px' }}
            >
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: '#f43f5e',
                  display: 'inline-block',
                }}
                className="animate-pulse-glow"
              />
              <Square size={14} fill="#fda4af" />
              停止錄音 ({recordSeconds}s) 並分析
            </button>
          ) : (
            <button
              onClick={startRecording}
              disabled={isAnalyzing}
              className="btn btn-secondary"
              style={{
                fontSize: '0.82rem',
                padding: '6px 14px',
                borderColor: 'rgba(244, 63, 94, 0.3)',
              }}
            >
              <Mic size={14} color="#f43f5e" />
              麥克風即時錄製人聲測試
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
