/**
 * Audio File Decoder Service
 * 負責將使用者傳入的 File / Blob 轉為 Float32Array samples 與取樣率
 * 並計算振幅包絡 (peaks) 以利於前端視覺化呈現
 */

export interface DecodedAudio {
  /** Channel 0 音訊浮點數數據 (-1.0 ~ 1.0，已標準化為 16000Hz) */
  samples: Float32Array;
  /** 音訊取樣率 (標準化為 16000Hz 以供 Silero VAD 完美輸入) */
  sampleRate: number;
  /** 總時長 (毫秒) */
  durationMs: number;
  /** 原始聲道數 */
  channelCount: number;
  /** 用於繪製波形的振幅高峰數據 (正規化 0.0 ~ 1.0) */
  peaks: number[];
}

/** 目標 VAD 模型標準取樣率 (Silero VAD 原生為 16000Hz) */
export const VAD_SAMPLE_RATE = 16000;

/**
 * 將 AudioBuffer 透過瀏覽器底層的高精度 Sinc 內插與低通濾波重取樣至 16000Hz 單聲道
 * 徹底解決 @ricky0123/vad-web 內建簡易 Resampler 在 44.1kHz 非整數取樣比率下產生的混疊諧波與偽振幅調變
 * （該混疊會導致 440Hz 等單音被 Silero 神經網路誤判為說話人聲）
 */
export async function resampleAudioBuffer(
  audioBuffer: AudioBuffer,
  targetRate: number = VAD_SAMPLE_RATE
): Promise<Float32Array> {
  if (audioBuffer.sampleRate === targetRate && audioBuffer.numberOfChannels === 1) {
    return audioBuffer.getChannelData(0);
  }

  const OfflineAudioContextClass =
    window.OfflineAudioContext ||
    (window as unknown as { webkitOfflineAudioContext: typeof OfflineAudioContext })
      .webkitOfflineAudioContext;

  if (OfflineAudioContextClass) {
    try {
      const targetFrames = Math.max(
        1,
        Math.round(audioBuffer.duration * targetRate)
      );
      const offlineCtx = new OfflineAudioContextClass(
        1, // 混音為單聲道
        targetFrames,
        targetRate
      );
      const source = offlineCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(offlineCtx.destination);
      source.start(0);
      const renderedBuffer = await offlineCtx.startRendering();
      return renderedBuffer.getChannelData(0);
    } catch (err) {
      console.warn('OfflineAudioContext 重取樣失敗，切換至線性插值備援：', err);
    }
  }

  // 線性插值降採樣備援方案
  const origChannel = audioBuffer.getChannelData(0);
  const origRate = audioBuffer.sampleRate;
  const targetLength = Math.max(1, Math.round(audioBuffer.duration * targetRate));
  const result = new Float32Array(targetLength);
  const ratio = origRate / targetRate;

  for (let i = 0; i < targetLength; i++) {
    const srcIndex = i * ratio;
    const i1 = Math.floor(srcIndex);
    const i2 = Math.min(i1 + 1, origChannel.length - 1);
    const frac = srcIndex - i1;
    result[i] = origChannel[i1] * (1 - frac) + origChannel[i2] * frac;
  }
  return result;
}

/**
 * 微弱音量自適應增益處理 (含上限保護)
 * 若音訊最大振幅過小 (< 0.15)，在避免過度放大底噪與削波失真前提下，適度放大至理想動態範圍
 * @param samples 原始 Float32Array 音訊數據
 * @param targetPeak 目標理想最大振幅 (預設 0.6)
 * @param maxGain 最大允許放大倍數 (上限保護，預設 5.0 倍)
 * @param minPeakThreshold 略過完全靜音/底噪極值 (若最大振幅小於 0.001 則視為純靜音不處理)
 */
export function applyAdaptiveGain(
  samples: Float32Array,
  targetPeak: number = 0.6,
  maxGain: number = 5.0,
  minPeakThreshold: number = 0.001
): Float32Array {
  let peak = 0;
  for (let i = 0; i < samples.length; i++) {
    const abs = Math.abs(samples[i]);
    if (abs > peak) peak = abs;
  }

  // 若最大音量已經正常 (>= 0.15) 或近乎絕對靜音 (< minPeakThreshold)，不需增益
  if (peak >= 0.15 || peak < minPeakThreshold) {
    return samples;
  }

  const gain = Math.min(maxGain, targetPeak / peak);
  const amplified = new Float32Array(samples.length);
  for (let i = 0; i < samples.length; i++) {
    amplified[i] = Math.max(-1, Math.min(1, samples[i] * gain));
  }
  return amplified;
}

/**
 * 解碼音訊檔案 (支援 WebM, WAV, MP3, M4A, OGG 等瀏覽器原生支援格式)
 * 自動標準化取樣率至 16000Hz 單聲道以符合 Silero VAD 原生精度
 * @param fileOrBlob 音訊檔案或 Blob 物件
 * @param peaksCount 欲提取的波形採樣點數量 (預設 240)
 */
export async function decodeAudioFile(
  fileOrBlob: Blob | File,
  peaksCount: number = 240
): Promise<DecodedAudio> {
  const arrayBuffer = await fileOrBlob.arrayBuffer();

  const AudioContextClass =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext })
      .webkitAudioContext;

  if (!AudioContextClass) {
    throw new Error('此瀏覽器不支援 Web Audio API (AudioContext)');
  }

  const audioCtx = new AudioContextClass();

  try {
    // decodeAudioData 會在瀏覽器背景解碼各大音訊格式
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    const durationMs = Math.round(audioBuffer.duration * 1000);
    const channelCount = audioBuffer.numberOfChannels;

    // 原生高品質重取樣為 16000Hz 單聲道
    const resampled = await resampleAudioBuffer(audioBuffer, VAD_SAMPLE_RATE);
    // 微弱音量自適應增益 (最多放大 5 倍上限保護)
    const samples = applyAdaptiveGain(resampled, 0.6, 5.0, 0.001);
    const sampleRate = VAD_SAMPLE_RATE;

    // 計算波形可視化所需的振幅 peaks
    const peaks: number[] = new Array(peaksCount).fill(0);
    const step = Math.max(1, Math.floor(samples.length / peaksCount));

    for (let i = 0; i < peaksCount; i++) {
      const start = i * step;
      const end = Math.min(start + step, samples.length);
      let peak = 0;
      for (let j = start; j < end; j++) {
        const val = Math.abs(samples[j]);
        if (val > peak) peak = val;
      }
      peaks[i] = Math.min(1, peak);
    }

    return {
      samples,
      sampleRate,
      durationMs,
      channelCount,
      peaks,
    };
  } catch (err) {
    console.error('Audio decoding error:', err);
    throw new Error(
      `無法解碼音訊檔案：${err instanceof Error ? err.message : '格式不支援或檔案損毀'}`
    );
  } finally {
    try {
      await audioCtx.close();
    } catch {
      // 確保資源釋放
    }
  }
}
