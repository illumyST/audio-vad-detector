import React, { useState } from 'react';
import './App.css';
import { Header } from './components/Header';
import { AudioUploader } from './components/AudioUploader';
import { WaveformVisualizer } from './components/WaveformVisualizer';
import { ParameterControls } from './components/ParameterControls';
import { DetectionResultCard } from './components/DetectionResultCard';
import {
  detectSpeech,
  detectSpeechFromSamples,
  DEFAULT_VAD_OPTIONS,
  type SpeechDetectionOptions,
  type SpeechDetectionResult,
  type SpeechSegment,
} from './services/audio/speech-detection';
import type { DecodedAudio } from './services/audio/audio-decoder';
import { Loader2, AlertTriangle, Sparkles } from 'lucide-react';

export const App: React.FC = () => {
  const [file, setFile] = useState<Blob | File | null>(null);
  const [filename, setFilename] = useState<string>('');
  const [decodedAudio, setDecodedAudio] = useState<DecodedAudio | null>(null);
  const [result, setResult] = useState<SpeechDetectionResult | null>(null);
  const [options, setOptions] = useState<SpeechDetectionOptions>(DEFAULT_VAD_OPTIONS);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [activeSegmentId, setActiveSegmentId] = useState<string | null>(null);

  // 處理上傳或選取音檔
  const handleFileSelected = async (selectedFile: File | Blob, name: string) => {
    setFile(selectedFile);
    setFilename(name);
    setError(null);
    setIsAnalyzing(true);
    setStatusMessage('正在透過 Web Audio API 解碼音訊為 Float32Array...');

    try {
      // 步驟 1 & 2: 解碼音檔並執行 NonRealTimeVAD 分析
      setStatusMessage('正在載入 Silero VAD 模型並由 ONNX WASM 執行語音分析...');
      const detectionResult = await detectSpeech(selectedFile, options);

      setResult(detectionResult);
      if (detectionResult.decodedAudio) {
        setDecodedAudio(detectionResult.decodedAudio);
      }
      setActiveSegmentId(null);
    } catch (err) {
      console.error('Analysis failed:', err);
      setError(
        err instanceof Error ? err.message : '分析過程發生未知錯誤，請檢視主控台'
      );
    } finally {
      setIsAnalyzing(false);
      setStatusMessage('');
    }
  };

  // 處理以新參數重新分析 (毋須重新讀取檔案，直接使用記憶體中的 samples)
  const handleReanalyze = async () => {
    if (!decodedAudio) return;

    setIsAnalyzing(true);
    setError(null);
    setStatusMessage('正在以新設定之閥值重新計算語音區段...');

    try {
      const updatedResult = await detectSpeechFromSamples(
        decodedAudio.samples,
        decodedAudio.sampleRate,
        decodedAudio.durationMs,
        options
      );

      setResult({
        ...updatedResult,
        decodedAudio,
      });
      setActiveSegmentId(null);
    } catch (err) {
      console.error('Re-analysis failed:', err);
      setError(err instanceof Error ? err.message : '重新分析失敗');
    } finally {
      setIsAnalyzing(false);
      setStatusMessage('');
    }
  };

  const handleSelectSegment = (seg: SpeechSegment) => {
    setActiveSegmentId(seg.id);
  };

  return (
    <div className="app-container">
      <Header />

      {/* 錯誤通知 Banner */}
      {error && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '14px 18px',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(244, 63, 94, 0.15)',
            border: '1px solid rgba(244, 63, 94, 0.3)',
            color: '#fda4af',
            marginBottom: '20px',
            fontSize: '0.875rem',
          }}
        >
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* 上傳與測試音檔區塊 */}
      <AudioUploader
        onFileSelected={handleFileSelected}
        isAnalyzing={isAnalyzing}
        currentFilename={filename}
      />

      {/* 分析中載入狀態 */}
      {isAnalyzing && (
        <div
          className="glass-panel"
          style={{
            padding: '36px 24px',
            textAlign: 'center',
            marginBottom: '24px',
            borderColor: 'rgba(99, 102, 241, 0.3)',
          }}
        >
          <Loader2
            size={36}
            color="var(--accent-indigo)"
            className="animate-spin"
            style={{ margin: '0 auto 16px auto' }}
          />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '6px' }}>
            語音特徵提取與分析中
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            {statusMessage || '請稍候，模型正在瀏覽器本機端 WASM 核心計算中...'}
          </p>
        </div>
      )}

      {/* 分析結果與視覺化呈現 */}
      {result && decodedAudio && file && !isAnalyzing && (
        <>
          {/* 波形與播放時間軸 */}
          <WaveformVisualizer
            decodedAudio={decodedAudio}
            segments={result.segments}
            audioBlob={file}
            activeSegmentId={activeSegmentId}
            onSelectSegment={handleSelectSegment}
          />

          {/* 判定結果卡片與片段清單 */}
          <DetectionResultCard
            result={result}
            decodedAudio={decodedAudio}
            activeSegmentId={activeSegmentId}
            onPlaySegment={handleSelectSegment}
          />

          {/* 閥值微調面板 */}
          <ParameterControls
            options={options}
            onOptionsChange={setOptions}
            onReanalyze={handleReanalyze}
            isAnalyzing={isAnalyzing}
            hasAudio={!!decodedAudio}
          />
        </>
      )}

      {/* 未上傳檔案時之導引提示卡片 */}
      {!result && !isAnalyzing && (
        <div
          className="glass-panel"
          style={{
            padding: '28px',
            background: 'rgba(18, 24, 38, 0.4)',
            borderStyle: 'dashed',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <Sparkles size={18} color="var(--accent-cyan)" />
            <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>如何使用本工具驗證？</h3>
          </div>
          <ul
            style={{
              paddingLeft: '20px',
              fontSize: '0.85rem',
              color: 'var(--text-secondary)',
              lineHeight: 1.8,
            }}
          >
            <li>
              <strong>快速驗證 (FE-4)</strong>：點選上方「純靜音」、「風扇雜音」或「440Hz 單音」預設集，預期判定皆為「未檢測到人聲 (No Speech)」。
            </li>
            <li>
              <strong>真人語音測試</strong>：點擊「麥克風即時錄製人聲測試」，對著麥克風說話 3~5 秒後停止，系統將立即解碼並精確框出人聲區段。
            </li>
            <li>
              <strong>本機音檔分析</strong>：拖曳您手邊既有的音訊檔案（如 <code>.webm</code>, <code>.m4a</code>, <code>.mp3</code>, <code>.wav</code>）即可完全在前端分析，不用擔心資料隱私外洩。
            </li>
            <li>
              <strong>參數微調 (FE-5)</strong>：分析完成後可透過下方滑桿即時調節門檻，直接測試不同雜訊環境下的最佳判定參數。
            </li>
          </ul>
        </div>
      )}

      {/* Footer */}
      <footer
        style={{
          marginTop: '48px',
          paddingTop: '20px',
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          fontSize: '0.78rem',
          color: 'var(--text-muted)',
        }}
      >
        <div>
          基於 <strong>@ricky0123/vad-web</strong> (Silero VAD) 與 Web Audio API 實現
        </div>
        <div style={{ display: 'flex', gap: '16px' }}>
          <span>純客戶端運算 (WASM)</span>
          <span>零伺服端延遲</span>
          <span>高相容性 AudioDecoder</span>
        </div>
      </footer>
    </div>
  );
};

export default App;
