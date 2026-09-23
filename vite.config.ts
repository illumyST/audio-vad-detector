import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * 自訂 Vite 插件中間件：處理 VAD 靜態資源
 *
 * 用途：
 * 攔截 `/vad/` 開頭的靜態資源請求（例如 @ricky0123/vad-web 所需的 ONNX 模型、WASM 與 JS/MJS 腳本），
 * 並確保正確設定 Content-Type、SharedArrayBuffer 跨域隔離標頭 (COOP/COEP) 及快取設定。
 */
function vadStaticMiddleware(): Plugin {
  return {
    name: 'vad-static-middleware',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url) return next();

        // 移除 URL 中的 query parameters，取得純路徑
        const cleanUrl = req.url.split('?')[0];

        // 僅處理以 /vad/ 開頭的請求
        if (cleanUrl.startsWith('/vad/')) {
          // 取得相對於 public/vad/ 的檔案路徑
          const relPath = cleanUrl.replace(/^\/vad\//, '');
          const filePath = path.resolve(__dirname, 'public/vad', relPath);

          // 確認檔案存在且為常規檔案
          if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
            // 依副檔名設定正確的 MIME Type，避免瀏覽器解析錯誤
            if (filePath.endsWith('.mjs') || filePath.endsWith('.js')) {
              res.setHeader('Content-Type', 'text/javascript');
            } else if (filePath.endsWith('.wasm')) {
              res.setHeader('Content-Type', 'application/wasm');
            } else if (filePath.endsWith('.onnx')) {
              res.setHeader('Content-Type', 'application/octet-stream');
            }

            // 設定跨域隔離標頭以支援 WebAssembly / SharedArrayBuffer 多執行緒特性
            res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
            res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');

            // 開發環境下停用快取，確保模型或腳本變更即時生效
            res.setHeader('Cache-Control', 'no-cache');

            // 串流回傳檔案內容
            return fs.createReadStream(filePath).pipe(res);
          }
        }

        // 若不是 /vad/ 請求或檔案不存在，則交由下一個 Vite 中間件處理
        next();
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), vadStaticMiddleware()],
  server: {
    port: 5173,
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
  optimizeDeps: {
    include: ['@ricky0123/vad-web'],
    needsInterop: ['@ricky0123/vad-web'],
  },
})
