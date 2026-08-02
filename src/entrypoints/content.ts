import { defineContentScript } from "wxt/utils/define-content-script";
import { Fetcher } from "@/api/Fetcher";
import { ApiException } from "@/api/exceptions";
import type { Translation } from "@/api/types";
import { LocalStorageManager } from "@/storage/LocalStorageManager";
import type { KeywordsMap } from "@/storage/types";
import { Layout } from "@/dom/layout";
import { observeDom } from "@/dom/observeDom";
import { onLocationChange } from "@/dom/watchLocation";
import { waitFor } from "@/dom/waitFor";
import { UIEditor, type Lang } from "@/ui/UIEditor";
import { authOrOldAlert, networkErrorAlert } from "@/ui/alerts";
import { DEFAULT_LAYOUT } from "@/ui/defaultLayout";
import { keepSuggestButtonMounted, problemTitleFrom } from "@/ui/suggestButton";
import * as S from "@/ui/selectors";
import "@/assets/style.css";

const PROBLEM_PATH = /^\/problems\/([^/]+)/;
const PAGE_TIMEOUT = 8000;
/** Предел подряд идущих неудачных попыток перемонтирования. */
const MAX_MOUNT_FAILURES = 5;

type Route =
  | { kind: "problem"; slug: string }
  | { kind: "problemset" }
  | null;

/** Текущая страница определяется по URL, а не по разметке. */
function currentRoute(): Route {
  const slug = PROBLEM_PATH.exec(location.pathname)?.[1];

  if (slug) {
    return { kind: "problem", slug };
  }

  if (location.pathname.startsWith("/problemset")) {
    return { kind: "problemset" };
  }

  return null;
}

function routeKey(route: Route): string | null {
  if (!route) return null;

  return route.kind === "problem" ? `problem:${route.slug}` : "problemset";
}

/**
 * Ищет заголовок и описание задачи, но только если они уже относятся к `slug`:
 * при клиентском переходе разметка предыдущей задачи какое-то время ещё висит в DOM.
 */
function detectProblemPage(slug: string, layout: Layout) {
  const title = layout.find("title");
  const description = layout.find("description");

  if (!title || !description) return null;

  // Заголовок — ссылка на саму задачу. Если разметка изменится и ссылки не окажется,
  // проверка пропускается, остаётся сам факт наличия заголовка.
  const link = title.querySelector("a[href*='/problems/']");
  const href = link?.getAttribute("href");

  if (href && !href.includes(`/problems/${slug}`)) return null;

  return { title, description };
}

let mountedKey: string | null = null;
let pending: AbortController | null = null;

async function route() {
  const current = currentRoute();
  const key = routeKey(current);

  // Переключение вкладок внутри одной задачи (описание / решения / отправки)
  // меняет URL, но заново загружать перевод не нужно.
  if (key === mountedKey) return;

  mountedKey = key;

  // Работа по предыдущей странице отменяется: пользователь мог уйти, пока
  // грузилась разметка или шёл запрос.
  pending?.abort();

  const abort = new AbortController();

  pending = abort;

  const isCurrent = () => !abort.signal.aborted;

  UIEditor.removeInjectedUI();

  if (!current) return;

  const fetcher = new Fetcher();
  const LSM = new LocalStorageManager(fetcher);
  // Конфиг берётся из кеша, чтобы не ждать сеть перед первой отрисовкой.
  // Свежий приезжает в sync() и применяется со следующей навигации.
  const layout = new Layout((await LSM.getLayout()) ?? DEFAULT_LAYOUT);

  if (!isCurrent()) return;

  if (current.kind === "problem") {
    const found = await waitFor(() => detectProblemPage(current.slug, layout), {
      timeout: PAGE_TIMEOUT,
      signal: abort.signal,
    });

    if (!isCurrent()) return;

    if (!found) {
      authOrOldAlert();
      reportLayout(fetcher, layout);

      return;
    }

    await problemPage(fetcher, LSM, layout, isCurrent, abort.signal);
  } else {
    const topicBar = await waitFor(() => layout.find("problemsetTopicBar"), {
      timeout: PAGE_TIMEOUT,
      signal: abort.signal,
    });

    if (!isCurrent()) return;

    if (!topicBar) {
      authOrOldAlert();
    } else {
      problemsetPage(layout, abort.signal);
    }
  }

  reportLayout(fetcher, layout);
}

async function problemPage(
  fetcher: Fetcher,
  LSM: LocalStorageManager,
  layout: Layout,
  isCurrent: () => boolean,
  signal: AbortSignal
) {
  try {
    const engTitle = layout.find("title")!.textContent ?? "";
    const id = parseInt(engTitle);

    await LSM.sync();

    // uuid возвращается только если визит дошёл — без него форма предложения
    // не примет отправку, и предлагать перевод бессмысленно.
    const uuid = await LSM.reportVisit(id);

    const translations = (await LSM.getTranslations()) ?? {};
    let t: Translation | null;

    try {
      t = translations[id] ?? await fetcher.translation(id);
    } catch (e) {
      // Пока шёл запрос, пользователь мог уйти на другую задачу.
      if (!isCurrent()) return;

      // Сбой связи — не то же самое, что отсутствие перевода.
      if (e instanceof ApiException) {
        console.error(e);
        networkErrorAlert();

        return;
      }

      throw e;
    }

    if (!isCurrent()) return;

    // Задача не переведена. Вместо плашки показывается кнопка «Предложить перевод».
    if (!t) {
      if (uuid) {
        keepSuggestButtonMounted(
          layout,
          { problemId: id, title: problemTitleFrom(engTitle), uuid },
          signal
        );
      }

      return;
    }

    await LSM.setTranslations([t], translations);

    const keywords = (await LSM.getKeywords()) ?? {};

    if (!isCurrent()) return;

    keepProblemMounted(t, keywords, layout, signal);
  } catch (e) {
    console.error(e);
  }
}

/**
 * Рисует перевод и следит, чтобы он не пропал: React пересоздаёт описание при
 * возврате с вкладки решений, унося с собой и текст перевода, и тумблер.
 */
function keepProblemMounted(
  t: Translation,
  keywords: KeywordsMap,
  layout: Layout,
  signal: AbortSignal
) {
  const rusDescription = t.description.replace(/\\n/g, "\n");

  const render = (lang: Lang) => {
    const editor = new UIEditor(layout, keywords);

    editor.initProblemPage(t.rusTitle, rusDescription);
    editor.render(lang);
    editor.setToggler();

    return editor;
  };

  let ui = render("ru");
  let failures = 0;

  observeDom(() => {
    if (ui.isMounted()) {
      failures = 0;

      return;
    }

    if (failures >= MAX_MOUNT_FAILURES) return;

    const live = layout.find("description");

    // Описания нет вовсе — открыта другая вкладка задачи.
    if (!live) return;

    failures++;

    try {
      if (live === ui.mountedDescription) {
        // Описание на месте, пропал только тумблер: текст перерисовывать не нужно.
        ui.setToggler();
      } else {
        const lang = ui.lang;

        UIEditor.removeInjectedUI();
        ui = render(lang);
      }
    } catch (e) {
      console.error(e);
    }
  }, { signal });
}

function problemsetPage(layout: Layout, signal: AbortSignal) {
  const mount = () => {
    if (document.querySelector(`.${S.TRANSLATIONS_BTN_CLASS}`)) return;

    const topicBar = layout.find("problemsetTopicBar");

    if (!topicBar) return;

    new UIEditor(layout, {}).initProblemsetPage(topicBar);
  };

  mount();
  observeDom(mount, { signal });
}

/** Сообщает, какие стратегии сработали: `-1` — сигнал о смене вёрстки LeetCode. */
function reportLayout(fetcher: Fetcher, layout: Layout) {
  fetcher
    .layoutTelemetry(layout.version, layout.results())
    .catch((e) => console.warn("Телеметрия разметки не отправлена", e));
}

export default defineContentScript({
  matches: ["https://*.leetcode.com/problems/*", "https://*.leetcode.com/problemset/"],
  main() {
    route();
    onLocationChange(route);
  },
});
