import { defineConfig } from "wxt";

export default defineConfig({
  srcDir: "src",
  publicDir: "src/public",
  manifest: {
    name: "LeetCode to Russian",
    description: "Перевод задач LeetCode на русский язык",
    permissions: ["storage"],
    icons: {
      16: "icons/icon16.png",
      32: "icons/icon32.png",
      48: "icons/icon48.png",
      128: "icons/icon128.png",
    },
  },
});
