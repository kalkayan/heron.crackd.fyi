import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import monacoEditorPlugin from "vite-plugin-monaco-editor";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const API_TARGET = env.HERON_API_TARGET || "http://localhost:8080";
  return {
    plugins: [react(), tailwindcss(), monacoEditorPlugin.default({ languageWorkers: [] })],
    server: {
      proxy: {
        "/api": { target: API_TARGET, changeOrigin: true },
      },
    },
  };
});
