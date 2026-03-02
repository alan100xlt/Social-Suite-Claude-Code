import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: true,
    },
  },
  plugins: [react()].filter(Boolean),
  optimizeDeps: {
    include: [
      '@nivo/bar',
      '@nivo/bump',
      '@nivo/funnel',
      '@nivo/heatmap',
      '@nivo/line',
      '@nivo/pie',
      '@nivo/radar',
      '@nivo/scatterplot',
      '@nivo/sunburst',
      '@nivo/theming',
      '@nivo/treemap',
    ],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
