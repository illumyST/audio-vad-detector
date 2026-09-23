import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import * as vadWeb from '@ricky0123/vad-web';

// 與 src/services/audio/speech-detection.ts 中的預設設定完全一致
const DEFAULT_VAD_OPTIONS = {
  positiveSpeechThreshold: 0.6,
  negativeSpeechThreshold: 0.45,
  minSpeechMs: 250,
  redemptionMs: 500,
  preSpeechPadMs: 192,
  minTotalSpeechMs: 250,
};

async function createVAD(options = {}) {
  const merged = { ...DEFAULT_VAD_OPTIONS, ...options };
  const NonRealTimeVAD = vadWeb.NonRealTimeVAD;
  return await NonRealTimeVAD.new({
    modelURL: 'public/vad/silero_vad_legacy.onnx',
    modelFetcher: async (url) => {
      const buf = fs.readFileSync(url);
      return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
    },
    positiveSpeechThreshold: merged.positiveSpeechThreshold,
    negativeSpeechThreshold: merged.negativeSpeechThreshold,
    minSpeechMs: merged.minSpeechMs,
    redemptionMs: merged.redemptionMs,
    preSpeechPadMs: merged.preSpeechPadMs,
  });
}

function decodeAudioWithFfmpeg(filePath, targetSampleRate = 48000) {
  return new Promise((resolve, reject) => {
    const ff = spawn('ffmpeg', [
      '-v', 'error',
      '-i', filePath,
      '-f', 'f32le',
      '-ac', '1',
      '-ar', String(targetSampleRate),
      'pipe:1',
    ]);

    const chunks = [];
    ff.stdout.on('data', (chunk) => {
      chunks.push(chunk);
    });

    ff.stderr.on('data', (err) => {
      console.error(`ffmpeg stderr (${path.basename(filePath)}):`, err.toString());
    });

    ff.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`ffmpeg exited with code ${code}`));
        return;
      }
      const fullBuffer = Buffer.concat(chunks);
      const samples = new Float32Array(
        fullBuffer.buffer,
        fullBuffer.byteOffset,
        fullBuffer.byteLength / 4
      );
      const durationMs = Math.round((samples.length / targetSampleRate) * 1000);

      // 微弱音量自適應增益 (上限 5 倍)
      let peak = 0;
      for (let i = 0; i < samples.length; i++) {
        const abs = Math.abs(samples[i]);
        if (abs > peak) peak = abs;
      }
      let finalSamples = samples;
      if (peak < 0.15 && peak >= 0.001) {
        const gain = Math.min(5.0, 0.6 / peak);
        finalSamples = new Float32Array(samples.length);
        for (let i = 0; i < samples.length; i++) {
          finalSamples[i] = Math.max(-1, Math.min(1, samples[i] * gain));
        }
      }

      resolve({ samples: finalSamples, sampleRate: targetSampleRate, durationMs });
    });

    ff.on('error', reject);
  });
}

async function analyzeFile(filePath, vad, options = DEFAULT_VAD_OPTIONS) {
  const startT = performance.now();
  const filename = path.basename(filePath);
  const stats = fs.statSync(filePath);
  const sizeBytes = stats.size;

  const { samples, sampleRate, durationMs } = await decodeAudioWithFfmpeg(filePath, 48000);

  const rawSegments = [];
  for await (const segment of vad.run(samples, sampleRate)) {
    rawSegments.push(segment);
  }

  const segments = rawSegments.map((seg, idx) => {
    const startMs = Math.round(seg.start);
    const endMs = Math.round(seg.end);
    return {
      id: `seg-${idx + 1}-${startMs}`,
      startMs,
      endMs,
      durationMs: Math.max(0, endMs - startMs),
      startSecFormatted: (startMs / 1000).toFixed(2) + 's',
      endSecFormatted: (endMs / 1000).toFixed(2) + 's',
    };
  });

  const totalSpeechDurationMs = segments.reduce(
    (acc, seg) => acc + seg.durationMs,
    0
  );

  const speechRatio =
    durationMs > 0
      ? Number(((totalSpeechDurationMs / durationMs) * 100).toFixed(1))
      : 0;

  const hasSpeech = totalSpeechDurationMs >= options.minTotalSpeechMs;
  const analysisTimeMs = Math.round(performance.now() - startT);

  return {
    filename,
    sizeBytes,
    sizeFormatted: (sizeBytes / 1024).toFixed(1) + ' KB',
    hasSpeech,
    totalAudioDurationMs: durationMs,
    totalAudioDurationSec: Number((durationMs / 1000).toFixed(2)),
    totalSpeechDurationMs,
    totalSpeechDurationSec: Number((totalSpeechDurationMs / 1000).toFixed(2)),
    speechRatio,
    segmentCount: segments.length,
    segments,
    analysisTimeMs,
  };
}

async function main() {
  console.log('========================================================');
  console.log('音訊 VAD 批次檢測工具 (Batch Voice Activity Detector)');
  console.log('========================================================');
  console.log('使用模型: Silero VAD (legacy ONNX)');
  console.log('套用參數:', JSON.stringify(DEFAULT_VAD_OPTIONS));
  console.log('--------------------------------------------------------');

  console.log('正在載入 Silero VAD 核心...');
  const vad = await createVAD();
  console.log('✅ 模型載入完成！\n');

  const audioDir = path.resolve('public/audioTest');
  const files = fs
    .readdirSync(audioDir)
    .filter((f) => f.endsWith('.webm') && !f.startsWith('.'))
    .sort();

  console.log(`在 public/audioTest 中找到 ${files.length} 個音訊檔案：\n`);

  const results = [];
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const fullPath = path.join(audioDir, file);
    process.stdout.write(`[${i + 1}/${files.length}] 分析中: ${file} ... `);
    const res = await analyzeFile(fullPath, vad);
    results.push(res);

    const statusTag = res.hasSpeech ? '✅ 【檢測到人聲】' : '❌ 【無人聲】';
    console.log(
      `${statusTag} 總長: ${res.totalAudioDurationSec}s | 人聲: ${res.totalSpeechDurationSec}s (${res.speechRatio}%) | 片段: ${res.segmentCount} | 耗時: ${res.analysisTimeMs}ms`
    );
  }

  // 寫入報告
  const reportPath = path.resolve('public/audioTest/batch-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2), 'utf-8');
  console.log(`\n🎉 批次分析完成！完整結果已儲存至: ${reportPath}`);
}

main().catch(console.error);
