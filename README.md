# [LeetCode to Russian](https://chromewebstore.google.com/detail/leetcode-to-russian/omcekcjkhekdifemjbknfbijiabbjhmm) (ctrl+click)

Расширение переводит задачи LeetCode на русский язык. В отличие от автоматических средств, расширение предоставляет понятные и адаптированные переводы задач, так как они выполняются вручную.

При входе на страницу задачи, расширение меняет ее заголовок и описание задачи на вариант на русском языке (если перевод имеется в базе данных).

Также расширение добавляет на страницу задачи специальный переключатель между английским и русским языками.

Поддерживает только новый интерфейс.

## Разработка

Расширение собирается через [WXT](https://wxt.dev) (Vite + TypeScript). `manifest.json` генерируется при сборке из `wxt.config.ts` и версии в `package.json`.

```bash
npm install          # + wxt prepare (генерация типов в .wxt/)
npm run dev          # запуск Chrome с автоперезагрузкой расширения
npm run build        # сборка в .output/chrome-mv3
npm run zip          # архив для Chrome Web Store
npm run compile      # проверка типов
```

Для Firefox: `npm run dev:firefox`, `npm run build:firefox`, `npm run zip:firefox`.
