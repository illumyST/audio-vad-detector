/**
 * Sample Generator & In-Browser Audio Recorder
 * 提供測試音檔生成器 (FE-4 測試 Dataset)：
 * 1. 完全靜音 (Silence)
 * 2. 模擬風扇/環境白噪音 (Ambient Fan Noise)
 * 3. 純單音頻率 (440Hz Beep)
 * 4. 麥克風即時錄音工具 (即時說話測試)
 */

function writeString(view: DataView, offset: number, string: string): void {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

/**
 * 將 Float32Array 音訊 samples 編碼為標準 16-bit PCM WAV Blob
 */
export function encodeWAV(
  samples: Float32Array,
  sampleRate: number = 16000
): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  // RIFF identifier
  writeString(view, 0, 'RIFF');
  // RIFF chunk length
  view.setUint32(4, 36 + samples.length * 2, true);
  // RIFF type
  writeString(view, 8, 'WAVE');
  // format chunk identifier
  writeString(view, 12, 'fmt ');
  // format chunk length
  view.setUint32(16, 16, true);
  // sample format (raw PCM = 1)
  view.setUint16(20, 1, true);
  // channel count (1 = mono)
  view.setUint16(22, 1, true);
  // sample rate
  view.setUint32(24, sampleRate, true);
  // byte rate (sample rate * block align)
  view.setUint32(28, sampleRate * 2, true);
  // block align (channel count * bytes per sample)
  view.setUint16(32, 2, true);
  // bits per sample
  view.setUint16(34, 16, true);
  // data chunk identifier
  writeString(view, 36, 'data');
  // data chunk length
  view.setUint32(40, samples.length * 2, true);

  // write 16-bit samples
  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

export interface PresetSample {
  id: string;
  name: string;
  description: string;
  expectedSpeech: boolean;
  createBlob: () => Promise<Blob>;
}

/**
 * 生成 3 秒完全靜音 (預期 hasSpeech: false)
 */
export function createSilenceSample(durationSec: number = 3): Blob {
  const sampleRate = 16000;
  const samples = new Float32Array(sampleRate * durationSec);
  return encodeWAV(samples, sampleRate);
}

/**
 * 生成 3 秒模擬風扇白噪音 (預期 hasSpeech: false)
 */
export function createFanNoiseSample(durationSec: number = 3): Blob {
  const sampleRate = 16000;
  const length = sampleRate * durationSec;
  const samples = new Float32Array(length);

  // 產生低振幅平滑雜音
  let lastOut = 0.0;
  for (let i = 0; i < length; i++) {
    const white = Math.random() * 2 - 1;
    // 一階低通濾波，模擬低頻風扇呼呼聲
    lastOut = lastOut * 0.95 + white * 0.05;
    samples[i] = lastOut * 0.15;
  }
  return encodeWAV(samples, sampleRate);
}

/**
 * 生成 2 秒單音訊號音 (440Hz Sine，預期 hasSpeech: false)
 */
export function createSineToneSample(
  frequency: number = 440,
  durationSec: number = 2
): Blob {
  const sampleRate = 16000;
  const length = sampleRate * durationSec;
  const samples = new Float32Array(length);

  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    samples[i] = Math.sin(2 * Math.PI * frequency * t) * 0.3;
  }
  return encodeWAV(samples, sampleRate);
}

/**
 * 預設測試音訊集合清單
 */
export const PRESET_SAMPLES: PresetSample[] = [
  {
    id: 'silence',
    name: '🔇 純靜音 (Silence)',
    description: '3秒完全靜音，振幅為0',
    expectedSpeech: false,
    createBlob: async () => createSilenceSample(3),
  },
  {
    id: 'fan-noise',
    name: '💨 模擬風扇雜音 (Fan Noise)',
    description: '3秒低頻模擬冷氣/風扇背景音',
    expectedSpeech: false,
    createBlob: async () => createFanNoiseSample(3),
  },
  {
    id: 'tone',
    name: '🔔 440Hz 單音 (Pure Tone)',
    description: '2秒機械式正弦單音，無人聲',
    expectedSpeech: false,
    createBlob: async () => createSineToneSample(440, 2),
  },
];

/**
 * 瀏覽器麥克風即時錄音器控制器
 */
export class AudioRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private stream: MediaStream | null = null;

  async start(): Promise<void> {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('此瀏覽器不支援麥克風錄音功能');
    }

    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.audioChunks = [];
    this.mediaRecorder = new MediaRecorder(this.stream);

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.audioChunks.push(event.data);
      }
    };

    this.mediaRecorder.start();
  }

  stop(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error('MediaRecorder 未啟動'));
        return;
      }

      this.mediaRecorder.onstop = () => {
        const mimeType = this.mediaRecorder?.mimeType || 'audio/webm';
        const audioBlob = new Blob(this.audioChunks, { type: mimeType });
        if (this.stream) {
          this.stream.getTracks().forEach((track) => track.stop());
        }
        resolve(audioBlob);
      };

      this.mediaRecorder.stop();
    });
  }
}
