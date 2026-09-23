# 🎙️ Audio VAD Detector (純前端語音活動檢測系統)

基於 **React 19**、**Web Audio API** 與 **Silero VAD (ONNX Runtime WebAssembly)** 打造的現代化純客戶端語音活動檢測（Voice Activity Detection, VAD）應用程式。

無需後端伺服器，所有音訊解碼、類神經網路特徵提取與語音區間判定均在使用者瀏覽器本地端完成，兼具**極致低延遲**與**100% 隱私安全**。

---

## 🌟 核心功能特色 (Features)

### 1. 多元音訊輸入來源
- **本機檔案上傳 / 拖放**：支援 `.mp3`, `.wav`, `.m4a`, `.webm`, `.ogg` 等瀏覽器原生支援格式。
- **內建測試基準音檔 (Test Dataset)**：一鍵載入實體測試集，包含微弱人聲（`d1fe6a98`）、純靜音（`無人聲音檔`）、低頻機械雜訊（`純背景噪音`）與單音（`440Hz_純單音`），可立即驗證雜訊抑制與防誤觸能力。
- **合成音訊預設集 (In-Browser Synthesis)**：可在記憶體中即時演算生成純靜音、一階低通濾波模擬風扇白噪音及 440Hz 機械單音。
- **麥克風即時錄製**：內建基於 `MediaStream` 與 `MediaRecorder` 的錄音功能，點擊即可錄下語音立即進行即時分析。

### 2. 瀏覽器本地神經網路推論 (Silero VAD via WASM)
- 採用業界廣受好評的 **Silero VAD** 類神經網路模型（ONNX 格式）。
- 透過 **ONNX Runtime Web (WASM)** 在本機端執行推論，自動將各取樣率音訊高品質重取樣為 16kHz 特徵向量進行分析。
- 零 API 呼叫、零雲端資料外洩風險。

### 3. 微弱音量自適應增益 (Safe Adaptive Gain Normalization)
- **微弱人聲自動校準**：針對收音距離較遠、輕聲細語（RMS < -50dBFS、Peak < 0.15）之音訊，自動進行動態範圍增益。
- **5 倍安全上限保護 (Max Gain Clamp)**：設定最大放大倍數為 5.0 倍（目標 Peak 0.6），杜絕過度放大引發的波形削波（Clipping）失真。
- **純靜音防噪底門檻**：若最大振幅小於 0.001 則自動跳過增益，防止將純電路熱雜訊放大成噪音，在提升微弱人聲檢測率的同時，徹底保持對風扇與環境底噪的強固抑制力。

### 4. 互動式波形視覺化與時間軸播放 (Waveform Visualizer)
- **HTML5 Canvas 振幅波形**：精確繪製音訊波形包絡線（Peaks）。
- **人聲區段高亮標記**：以半透明翡翠綠遮罩精確框出偵測到人聲的起訖時間區間。
- **播放控制與時間軸定位**：支援波形任意點擊跳轉 (Seek)、播放/暫停、播放進度指示線 (Playhead)。
- **單一片段獨立試聽**：支援點擊單個人聲片段直接跳轉或單獨播放該區間。

### 5. 完整分析指標與詳細區段列表
- **核心判定**：清楚標示「檢測到人聲 (Speech Detected)」或「未檢測到人聲 (No Speech)」。
- **指標儀表板**：
  - 音訊總時長 (Total Duration)
  - 人聲累計時長 (Total Speech Duration)
  - 語音佔比 (Speech Ratio %)
  - WASM 分析耗時 (Analysis Latency ms)
- **區段列表 (Segments List)**：列出每段發話的起訖時間（分:秒.毫秒）及持續時長。

### 6. 靈活的 VAD 門檻微調控制台 (Parameter Controls)
- 支援即時調節 Silero VAD 的關鍵決策參數：
  - **語音正向門檻 (`positiveSpeechThreshold`)**：觸發語音判定的機率閥值（預設 0.6）。
  - **語音負向門檻 (`negativeSpeechThreshold`)**：判定語音結束的機率閥值（預設 0.45）。
  - **最短發話時長 (`minSpeechMs`)**：過濾短暫突波雜音（預設 250ms）。
  - **斷句寬限期 (`redemptionMs`)**：避免正常說話停頓被切碎（預設 500ms）。
  - **前置音訊補償 (`preSpeechPadMs`)**：保留語音開頭音節（預設 192ms）。
  - **總語音判定門檻 (`minTotalSpeechMs`)**：整首音訊判定有聲的累積時長（預設 250ms）。
- **記憶體快取秒級重算**：調整參數後，直接調用記憶體中已解碼的 PCM 樣本重算，**毋須重新讀檔或再次解碼**。

---

## 🏗️ 技術架構 (Technical Architecture)

```
[使用者音訊來源]
   │ (File / Blob / 麥克風錄音 / 預設音檔)
   ▼
[Web Audio API: decodeAudioData]
   │
   ▼
[Sinc/線性重取樣至 16000Hz]
   │
   ▼
[微弱音量自適應增益 (Safe AGC, Max 5.0x)]
   │
   ├──────────────────────────────┐
   ▼                              ▼
[Float32Array PCM Samples]    [波形 Peaks 計算 (240點)]
   │                              │
   ▼                              ▼
[Silero VAD (ONNX Runtime Web)]   [WaveformVisualizer (Canvas)]
   │ (WebAssembly 推論)           │ (繪製波形與高亮區間)
   ▼                              │
[SpeechSegments 語音片段分析]      │
   │                              │
   └──────────────┬───────────────┘
                  ▼
          [DetectionResultCard]
       (指標儀表板 & 分段播放試聽)
```

### 核心技術選型

| 領域 | 技術 / 套件 | 說明 |
| :--- | :--- | :--- |
| **前端框架** | [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/) | 採用最新 React 19 與嚴格型別定義 |
| **構建工具** | [Vite 8](https://vite.dev/) | 輕量極速 HMR 與自訂開發中間件 |
| **VAD 模型核心** | [@ricky0123/vad-web](https://github.com/ricky0123/vad) | Silero VAD 封裝庫，支援 NonRealTimeVAD 非即時批次檢測 |
| **推論引擎** | [onnxruntime-web](https://onnxruntime.ai/) | 瀏覽器端 WebAssembly (WASM) 類神經網路推論加速 |
| **音訊處理** | [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API) | `AudioContext.decodeAudioData` 多格式解碼、重取樣與自適應增益處理 |
| **圖示庫** | [Lucide React](https://lucide.dev/) | 現代簡約圖示風格 |
| **靜態檢查** | [Oxlint](https://oxc.rs/) | 高性能 Rust-based JavaScript/TypeScript Linter |
| **UI 風格** | 原生 Modern CSS | 採用深色模式（Dark Mode）、Glassmorphism 玻璃擬態與無依賴純 CSS 系統 |

---

## 📁 專案目錄結構 (Project Structure)

```text
audio-vad-detector/
├── public/
│   ├── audioTest/                # 本地實體測試音訊庫與批次報告
│   │   ├── d1fe6a98-e440-40a7-bc03-2d41a621b347_5-18s.webm # 微弱人聲樣本
│   │   ├── 純背景噪音.webm        # 低頻風扇雜訊基準檔
│   │   ├── 440Hz_純單音.webm     # 機械正弦單音檔
│   │   ├── 無人聲音檔.webm        # 純靜音基準檔
│   │   ├── batch-report.json     # CLI 批次檢測統計報告
│   │   └── ...                   # 各式真實錄音測試樣本
│   └── vad/                      # Silero VAD 模型檔案與 ONNX Runtime WASM 靜態資源
│       ├── silero_vad_legacy.onnx# Silero VAD 神經網路模型
│       ├── ort-wasm-simd-threaded.wasm
│       ├── ort-wasm-simd.wasm
│       └── ...
├── scripts/                      # 自動化工具與 CLI 檢測腳本
│   ├── batch-vad.mjs             # CLI 批次 VAD 分析工具 (生成 batch-report.json)
│   └── generate-fan-noise.mjs    # 模擬風扇雜音 WebM 音訊生成腳本
├── src/
│   ├── components/               # UI 元件層
│   │   ├── Header.tsx            # 頁首品牌與技術標籤
│   │   ├── AudioUploader.tsx     # 音訊上傳、拖放、麥克風錄音、測試音檔選單
│   │   ├── WaveformVisualizer.tsx# HTML5 Canvas 波形繪製、時間軸、播放進度與人聲覆蓋
│   │   ├── DetectionResultCard.tsx# 判定結果徽章、指標儀表板、語音區段列表與單段播放
│   │   └── ParameterControls.tsx # VAD 閥值與決策參數滑桿控制台
│   ├── services/
│   │   └── audio/                # 音訊與演算法核心服務層
│   │       ├── audio-decoder.ts  # 音訊解碼、Sinc重取樣、Peaks計算與自適應增益 (applyAdaptiveGain)
│   │       ├── speech-detection.ts# NonRealTimeVAD 實例封裝、區段判斷與統計匯整
│   │       └── sample-generator.ts# 記憶體音訊即時生成器 (靜音/雜訊/單音) 與麥克風錄音器
│   ├── App.tsx                   # 應用程式主進入點與狀態協調器
│   ├── App.css                   # 全域樣式與佈局
│   ├── index.css                 # 設計系統 Token、CSS 變數、玻璃擬態樣式
│   └── main.tsx                  # React 應用程式掛載點
├── vite.config.ts                # Vite 設定檔 (含 vadStaticMiddleware 與 COOP/COEP 安全標頭)
└── package.json
```

---

## 🛠️ CLI 批次檢測工具 (Batch Processing CLI)

專案提供命令列批次處理工具，可在無需啟動瀏覽器的情況下對 `public/audioTest/` 中的所有音檔執行 VAD 檢測：

```bash
# 執行全體測試音檔批次檢測
node scripts/batch-vad.mjs
```

執行後會即時輸出各音檔的判定結果（總長度、人聲長度、人聲佔比 %、語音片段數與分析耗時），並將詳細數據寫入 `public/audioTest/batch-report.json`。

若需重新生成模擬風扇雜音 WebM 檔案，可執行：
```bash
node scripts/generate-fan-noise.mjs
```

---

## 🚀 快速上手 (Getting Started)

### 1. 系統需求
- Node.js >= 18
- pnpm (或 npm / yarn)
- ffmpeg（選用，僅執行 CLI 批次檢測與格式生成時需要）

### 2. 安裝依賴與準備模型檔案
本專案的 `prepare` 腳本會自動將 `@ricky0123/vad-web` 與 `onnxruntime-web` 所需的 `.onnx` 與 `.wasm` 資源複製至 `public/vad/` 目錄：

```bash
# 安裝依賴 (會自動觸發 prepare 腳本)
pnpm install
```

如需手動重新複製模型資源，可執行：
```bash
pnpm run prepare
```

### 3. 啟動本地開發伺服器
```bash
pnpm dev
```
啟動後於瀏覽器開啟 `http://localhost:5173` 即可開始使用。

### 4. 建置生產版本
```bash
pnpm build
```

---

## ⚙️ 關鍵技術細節 (Key Implementation Details)

### 1. 靜態資源 MIME Type 與跨域隔離 (COOP / COEP)
ONNX Runtime Web 在執行 WebAssembly 與多執行緒時，瀏覽器要求具備跨域隔離環境。本專案在 `vite.config.ts` 中自訂了 `vadStaticMiddleware`：
- 為 `/vad/` 目錄下的 `.wasm` 指定 `application/wasm`、`.mjs`/`.js` 指定 `text/javascript`、`.onnx` 指定 `application/octet-stream`。
- 自動注入以下 HTTP Header：
  ```http
  Cross-Origin-Opener-Policy: same-origin
  Cross-Origin-Embedder-Policy: require-corp
  ```

### 2. 音訊解碼與記憶體快取架構
- 使用者上傳音檔時，系統利用 `AudioContext.decodeAudioData` 一次性將各類壓縮格式解碼為標準單聲道 `Float32Array`，並留存於 React 記憶體狀態中。
- 當使用者在 `ParameterControls` 調整靈敏度時，直接呼叫 `detectSpeechFromSamples`，省略重複解碼開銷，達成毫秒級參數重調響應。

### 3. 人聲區段播放精準定位
- `WaveformVisualizer` 透過 `requestAnimationFrame` 同步原聲 `<audio>` 播放進度與 Canvas 時間指示線（Playhead）。
- 亦支援透過建立微型 `AudioBufferSourceNode`，直接對選定的單一語音片段（例如 `startMs: 1200` 至 `endMs: 2400`）進行無縫切片試聽。
