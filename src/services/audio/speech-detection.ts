/**
 * Speech Detection Service using @ricky0123/vad-web (NonRealTimeVAD)
 * 封裝非即時語音活動檢測 (VAD)，提供純淨的 API 供上層呼叫
 */

import * as vadWeb from '@ricky0123/vad-web';
import type { NonRealTimeVAD as NonRealTimeVADClass } from '@ricky0123/vad-web';
import { decodeAudioFile, type DecodedAudio } from './audio-decoder';

export type NonRealTimeVAD = NonRealTimeVADClass;

// 相容 Vite / 瀏覽器環境下的 CJS 與 ESM 互操作 (解決 named export 缺漏問題)
const NonRealTimeVAD = (
  vadWeb.NonRealTimeVAD ??
  (vadWeb as unknown as { default?: { NonRealTimeVAD?: typeof NonRealTimeVADClass } }).default?.NonRealTimeVAD
)!;

export interface SpeechSegment {
  id: string;
  /** 語音開始時間 (毫秒) */
  startMs: number;
  /** 語音結束時間 (毫秒) */
  endMs: number;
  /** 語音時長 (毫秒) */
  durationMs: number;
  /** 該語音區段的音訊資料 (選填) */
  audio?: Float32Array;
}

export interface SpeechDetectionOptions {
  /** 語音正向門檻 (0.1 ~ 0.9，預設 0.5) */
  positiveSpeechThreshold?: number;
  /** 語音負向結束門檻 (0.05 ~ 0.85，預設 0.35) */
  negativeSpeechThreshold?: number;
  /** 單一段落最短說話時長 (毫秒，低於此判定為誤觸噪聲，預設 250) */
  minSpeechMs?: number;
  /** 說話結束寬限期 (毫秒，避免講話斷句被切碎，預設 500) */
  redemptionMs?: number;
  /** 前置音訊填充 (毫秒，保留開頭音節，預設 192) */
  preSpeechPadMs?: number;
  /** 整個檔案總語音判定門檻 (毫秒，預設 250，只要累積語音大於此值即判定 hasSpeech: true) */
  minTotalSpeechMs?: number;
}

export interface SpeechDetectionResult {
  /** 核心判定：是否有人說話 */
  hasSpeech: boolean;
  /** 音訊總時長 (毫秒) */
  totalAudioDurationMs: number;
  /** 偵測到的語音總時長 (毫秒) */
  totalSpeechDurationMs: number;
  /** 語音時間佔比百分比 (0 ~ 100) */
  speechRatio: number;
  /** 所有人聲片段清單 */
  segments: SpeechSegment[];
  /** 演算法分析花費時間 (毫秒) */
  analysisTimeMs: number;
  /** 解碼後的音訊資訊 (供視覺化波形使用) */
  decodedAudio?: DecodedAudio;
}

export const DEFAULT_VAD_OPTIONS: Required<SpeechDetectionOptions> = {
  positiveSpeechThreshold: 0.6,
  negativeSpeechThreshold: 0.45,
  minSpeechMs: 250,
  redemptionMs: 500,
  preSpeechPadMs: 192,
  minTotalSpeechMs: 250,
};

/**
 * 取得或建立 NonRealTimeVAD 實例
 */
export async function createVADInstance(
  options: SpeechDetectionOptions = {}
): Promise<NonRealTimeVAD> {
  const basePath = import.meta.env.BASE_URL.endsWith('/')
    ? import.meta.env.BASE_URL
    : `${import.meta.env.BASE_URL}/`;

  const modelURL = `${basePath}vad/silero_vad_legacy.onnx`;

  const merged = { ...DEFAULT_VAD_OPTIONS, ...options };

  return await NonRealTimeVAD.new({
    modelURL,
    ortConfig: (ort) => {
      // 指定 wasm 檔案路徑與單執行緒模式
      ort.env.wasm.wasmPaths = `${basePath}vad/`;
      ort.env.wasm.numThreads = 1;
    },
    positiveSpeechThreshold: merged.positiveSpeechThreshold,
    negativeSpeechThreshold: merged.negativeSpeechThreshold,
    minSpeechMs: merged.minSpeechMs,
    redemptionMs: merged.redemptionMs,
    preSpeechPadMs: merged.preSpeechPadMs,
  });
}

/**
 * 直接從解碼後的音訊樣本執行語音活動檢測
 */
export async function detectSpeechFromSamples(
  samples: Float32Array,
  sampleRate: number,
  totalDurationMs: number,
  options: SpeechDetectionOptions = {}
): Promise<SpeechDetectionResult> {
  const startTime = performance.now();
  const mergedOptions = { ...DEFAULT_VAD_OPTIONS, ...options };

  // 初始化 NonRealTimeVAD
  const vad = await createVADInstance(mergedOptions);

  const rawSegments: { audio: Float32Array; start: number; end: number }[] = [];

  // 執行非即時 VAD 分析 (自動 resampling 為 16kHz 並由 Silero 模型處理)
  for await (const segment of vad.run(samples, sampleRate)) {
    rawSegments.push(segment);
  }

  const segments: SpeechSegment[] = rawSegments.map((seg, idx) => {
    const startMs = Math.round(seg.start);
    const endMs = Math.round(seg.end);
    return {
      id: `seg-${idx + 1}-${startMs}`,
      startMs,
      endMs,
      durationMs: Math.max(0, endMs - startMs),
      audio: seg.audio,
    };
  });

  const totalSpeechDurationMs = segments.reduce(
    (acc, seg) => acc + seg.durationMs,
    0
  );

  const speechRatio =
    totalDurationMs > 0
      ? Number(((totalSpeechDurationMs / totalDurationMs) * 100).toFixed(1))
      : 0;

  // 核心判定規則：累積語音時長是否達到設定門檻
  const hasSpeech = totalSpeechDurationMs >= mergedOptions.minTotalSpeechMs;
  const analysisTimeMs = Math.round(performance.now() - startTime);

  return {
    hasSpeech,
    totalAudioDurationMs: totalDurationMs,
    totalSpeechDurationMs,
    speechRatio,
    segments,
    analysisTimeMs,
  };
}

/**
 * 主要高階服務 API：傳入音檔 File 或 Blob，直接回傳語音偵測結果
 * @param fileOrBlob 音訊檔案 (支援 WebM, MP3, WAV, M4A 等)
 * @param options 可自訂之門檻參數
 */
export async function detectSpeech(
  fileOrBlob: File | Blob,
  options: SpeechDetectionOptions = {}
): Promise<SpeechDetectionResult> {
  // 1. 解碼音檔為 Float32Array
  const decoded = await decodeAudioFile(fileOrBlob);

  // 2. 執行 VAD 分析
  const result = await detectSpeechFromSamples(
    decoded.samples,
    decoded.sampleRate,
    decoded.durationMs,
    options
  );

  return {
    ...result,
    decodedAudio: decoded,
  };
}
