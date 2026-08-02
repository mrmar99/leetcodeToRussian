import type { Layout } from "@/dom/layout";
import { observeDom } from "@/dom/observeDom";
import * as S from "./selectors";

const SUGGEST_URL = "https://leetcode-to-russian-api.vercel.app/suggest/";
/** Номер в начале заголовка LeetCode: «42. Trapping Rain Water». */
const LEADING_NUMBER = /^\s*\d+\.\s*/;

export interface SuggestParams {
  problemId: number;
  /** Английское название без номера. */
  title: string;
  uuid: string;
}

/** Отрезает номер задачи: форме нужно только название. */
export function problemTitleFrom(fullTitle: string): string {
  return fullTitle.replace(LEADING_NUMBER, "").trim();
}

function buildUrl({ problemId, title, uuid }: SuggestParams): string {
  // Именно encodeURIComponent, а не URLSearchParams: последний кодирует пробел
  // как `+`, и это уже зависит от того, как форма разбирает параметры.
  const query = [
    `id=${encodeURIComponent(problemId)}`,
    `title=${encodeURIComponent(title)}`,
    `uuid=${encodeURIComponent(uuid)}`,
  ].join("&");

  return `${SUGGEST_URL}?${query}`;
}

function mount(layout: Layout, params: SuggestParams) {
  if (document.querySelector(`.${S.SUGGEST_BTN_CLASS}`)) return;

  const bar = layout.find("suggestBar");

  // Панель не нашлась — страница должна работать дальше, просто без кнопки.
  if (!bar) return;

  const link = document.createElement("a");

  link.href = buildUrl(params);
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.className = `${S.SUGGEST_BTN_CLASS} relative inline-flex items-center justify-center text-caption px-2 py-1 gap-1 rounded-full`;
  link.textContent = "Предложить перевод";
  bar.append(link);
}

/**
 * Ставит кнопку «Предложить перевод» и возвращает её на место после перерисовки React.
 *
 * Форма на стороне API принимает предложение только от известного сервером
 * пользователя, поэтому вызывать это можно лишь после успешно отправленного визита.
 */
export function keepSuggestButtonMounted(
  layout: Layout,
  params: SuggestParams,
  signal: AbortSignal
) {
  mount(layout, params);
  observeDom(() => mount(layout, params), { signal });
}
