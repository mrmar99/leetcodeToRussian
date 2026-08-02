import js from "@eslint/js";
import stylistic from "@stylistic/eslint-plugin";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [".wxt/**", ".output/**", "node_modules/**"],
  },
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx,js,mjs}"],
    plugins: { "@stylistic": stylistic },
    rules: {
      // TypeScript сам проверяет существование идентификаторов
      "no-undef": "off",
      // `!` расставлены там, где код полагается на наличие узлов в разметке
      "@typescript-eslint/no-non-null-assertion": "off",

      "@stylistic/padding-line-between-statements": [
        "error",
        // блок объявлений отделяется пустой строкой с обеих сторон,
        // но внутри блока объявления идут вплотную
        { blankLine: "always", prev: ["const", "let", "var"], next: "*" },
        { blankLine: "always", prev: "*", next: ["const", "let", "var"] },
        { blankLine: "any", prev: ["const", "let", "var"], next: ["const", "let", "var"] },
        // пустая строка вокруг блочных конструкций
        { blankLine: "always", prev: "*", next: ["if", "for", "while", "do", "switch", "try", "function", "class"] },
        { blankLine: "always", prev: ["block-like"], next: "*" },
        // и перед выходом из функции
        { blankLine: "always", prev: "*", next: "return" },
      ],
    },
  },
);
