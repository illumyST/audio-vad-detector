# 🎙️ Audio VAD Detector (純前端語音活動檢測系統)

基於 **React 19**、**Web Audio API** 與 **Silero VAD (ONNX Runtime WASM)** 的純瀏覽器端語音活動檢測工具。無需後端，100% 本地運算與隱私保護。

---

## ⚡ 快速開始 (Quick Start)

三步完成本地啟動：

```bash
# 1. 安裝依賴（自動複製 WASM / ONNX 模型至 public/vad）
pnpm install

# 2. 啟動開發伺服器
pnpm dev

# 3. 開啟瀏覽器造訪
open http://localhost:5173
```

> **環境需求**：Node.js >= 18、pnpm（CLI 批次轉檔可選安裝 ffmpeg）。

---

## 🎯 核心特色 (Highlights)

- **100% 純前端神經網路推論**：內建 Silero VAD (ONNX)，透過 WASM 本地執行 16kHz 特徵分析，零 API 開銷。
- **微弱音量自適應增益 (Safe AGC)**：針對 RMS < -50dBFS 自動補償，設定 5.0 倍安全保護上限，靜音自動防底噪。
- **互動波形與人聲片段試聽**：HTML5 Canvas 繪製音訊包絡線，翡翠綠遮罩標示人聲，支援任意點擊跳轉與單段獨立播放。
- **記憶體快取秒級重算**：即時調整正/負向門檻（6 種參數），直接調用記憶體 PCM 數據重算，免重新解碼。
- **內建基準測試集與 CLI 工具**：預載微弱音、純靜音、風扇雜訊、440Hz 單音，並提供 CLI 批次檢測工具。

---

## 🏗️ 系統流程 (Architecture)

```
[音訊輸入 (檔案 / 麥克風 / 測試音檔)]
  │
  ▼
[Web Audio API: decodeAudioData] ───► [Sinc 重取樣至 16kHz]
  │
  ▼
[自適應增益 (Safe AGC)] ──────────────┐
  │                                   │
  ▼                                   ▼
[Silero VAD (WASM 神經網路推論)]    [Canvas 波形繪製 (Peaks 240點)]
  │                                   │
  ▼                                   ▼
[語音區段分析 (SpeechSegments)]     [互動波形與高亮覆蓋]
  │                                   │
  └─────────────────┬─────────────────┘
                    ▼
          [DetectionResultCard (指標儀表板 & 區段試聽)]
```

---

## 🧰 技術棧 (Tech Stack)

| 領域 | 核心技術 | 說明 |
| :--- | :--- | :--- |
| **框架 & 建置** | React 19 + TypeScript + Vite 8 | 最新 React 架構與極速 HMR 開發中間件 |
| **AI 推論核心** | `@ricky0123/vad-web` + `onnxruntime-web` | Silero VAD WebAssembly 本地推論 |
| **音訊處理** | Web Audio API | `decodeAudioData`、自適應增益與切片試聽 |
| **視覺呈現** | HTML5 Canvas + Modern Vanilla CSS | 深色模式、Glassmorphism 玻璃擬態與無依賴純 CSS |
| **品質檢查** | Oxlint | 高效能 Rust-based Linter |

---

## 📁 專案目錄結構 (Project Structure)

```text
audio-vad-detector/
├── public/
│   ├── audioTest/         # 實體測試音訊庫與 CLI 批次報告 (batch-report.json)
│   └── vad/               # Silero VAD 模型 (.onnx) 與 ONNX Runtime (.wasm)
├── scripts/
│   ├── batch-vad.mjs      # CLI 批次 VAD 分析腳本
│   └── generate-fan-noise.mjs # 模擬風扇雜音生成腳本
├── src/
│   ├── components/        # UI 元件 (Uploader, Waveform, ResultCard, Controls)
│   ├── services/audio/    # 核心演算法 (解碼、重取樣、AGC、VAD 封裝、合成音訊)
│   ├── App.tsx            # 主頁面狀態協調
│   └── index.css          # 設計系統 Token 與全域樣式
├── vite.config.ts         # Vite 設定 (含 vadStaticMiddleware 與 COOP/COEP 安全標頭)
└── package.json
```

---

## ⚙️ 關鍵技術細節 (Key Details)

1. **WASM 跨域隔離 (COOP / COEP)**：在 `vite.config.ts` 配置 `vadStaticMiddleware`，自動為 `/vad/` 提供正確 MIME Type 並注入 `same-origin` 與 `require-corp` 標頭。
2. **零解碼開銷參數調優**：初次上傳解碼為 `Float32Array` 保留在記憶體中，調整門檻滑桿時直接重新傳入推論，響應時間達毫秒級。
3. **無縫切片片段播放**：透過微型 `AudioBufferSourceNode` 綁定片段起訖時間戳，精準試聽指定語音區間。
