import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vite.dev/config/
export default defineConfig({
  base: "/snl-hr-app/",
  plugins: [react()],
   resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build:{
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;

          const normalizedId = id.toString();
          const packageMatch = normalizedId.match(/node_modules[\\/](?:@[^\\/]+[\\/][^\\/]+|[^\\/]+)/);
          const packageName = packageMatch?.[0]
            ? packageMatch[0]
                .replace('node_modules\\', '')
                .replace('node_modules/', '')
                .replace(/[\\/]/g, '-')
            : 'vendor';

          if (normalizedId.includes('face-api.js')) return 'chunk-faceapi';
          if (normalizedId.includes('recharts')) return 'chunk-recharts';
          if (normalizedId.includes('jspdf') || normalizedId.includes('html2canvas')) return 'chunk-pdf';
          if (normalizedId.includes('@tiptap') || normalizedId.includes('prosemirror')) return 'chunk-tiptap';
          if (normalizedId.includes('react-bootstrap') || normalizedId.includes('bootstrap')) return 'chunk-bootstrap';
          if (normalizedId.includes('react-router')) return 'chunk-router';
          if (normalizedId.includes('axios')) return 'chunk-axios';
          if (normalizedId.includes('react-bootstrap-icons') || normalizedId.includes('react-icons')) return 'chunk-icons';
          if (normalizedId.includes('dompurify')) return 'chunk-dompurify';

          return `chunk-${packageName}`;
        },
      },
    },
  },
})
